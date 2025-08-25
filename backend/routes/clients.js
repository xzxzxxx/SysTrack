require('dotenv').config();
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// This route is specifically designed to be called by AsyncSelect components.
router.get('/lookup', async (req, res) => {
  // Get the search term from the query string, e.g., /lookup?search=some_name
  const { search } = req.query;
  
  try {
    // This is a simple and fast query, perfect for a typeahead search.
    let query = `
      SELECT client_id, client_name 
      FROM Clients
    `;
    const values = [];

    if (search) {
      // If a search term is provided, filter by client name or their dedicated number.
      // ILIKE is case-insensitive.
      query += ' WHERE client_name ILIKE $1 OR dedicated_number ILIKE $1';
      values.push(`%${search}%`);
    }

    // Always order by name and limit the results to keep the UI responsive.
    query += ' ORDER BY client_name LIMIT 20'; 

    const result = await pool.query(query, values);
    
    // Return the results as a simple JSON array.
    res.json(result.rows);
  } catch (err) {
    console.error('Error in client lookup:', err.stack);
    res.status(500).json({ error: 'Server error while fetching client lookup data' });
  }
});

// Get all clients (updated to include dynamic counts)
router.get('/', async (req, res) => {

  const { search, sortBy, sortOrder, page = 1, limit = 50, name_search } = req.query;
  const offset = (page - 1) * parseInt(limit);

  // --- Start of refactored logic ---
  const dataParams = [];
  const countParams = [];
  let whereClause = '';

  // only for dropdown search
  if (name_search) {

    const searchTerm = `%${name_search}%`;
    whereClause = ' WHERE client_name ILIKE $1';
    dataParams.push(searchTerm);
    countParams.push(searchTerm);
  } 

  // Handle the search parameter for both queries
  else if (search) {
    // The search term for ILIKE (case-insensitive)
    const searchTerm = `%${search}%`;
    
    // Use $1 as a placeholder for the search term
    whereClause = ' WHERE client_name ILIKE $1 OR dedicated_number ILIKE $1 OR email ILIKE $1';
    
    // Add the search term to both parameter arrays
    dataParams.push(searchTerm);
    countParams.push(searchTerm);
  }
  // --- End of search logic ---

  let orderByClause = '';
  if (sortBy === 'no_of_orders' || sortBy === 'no_of_renew') {
      const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
      orderByClause = ` ORDER BY ${sortBy} ${order}`;
  }

  // Add pagination parameters ONLY to the data query array
  dataParams.push(limit, offset);

  // Build the final queries
  const dataQuery = `
      SELECT
          c.*,
          (SELECT COUNT(*) FROM Contracts WHERE client_id = c.client_id) AS no_of_orders,
          (SELECT COUNT(*) FROM Contracts WHERE client_id = c.client_id AND previous_contract IS NOT NULL) AS no_of_renew
      FROM Clients c
      ${whereClause}
      ${orderByClause}
      LIMIT $${dataParams.length - 1}  -- Placeholder for limit
      OFFSET $${dataParams.length}    -- Placeholder for offset
  `;

  const countQuery = `
      SELECT COUNT(*) FROM Clients
      ${whereClause}
  `;
  try {
      const [dataResult, countResult] = await Promise.all([
          // Execute queries with their respective, separate parameter arrays
          pool.query(dataQuery, dataParams),
          pool.query(countQuery, countParams),
      ]);
      res.json({
          data: dataResult.rows,
          total: parseInt(countResult.rows[0].count, 10),
      });
  } catch (err) {
      console.error(err.stack);
      res.status(500).json({ error: 'Server error' });
  }
});

// Get a single client (updated with dynamic counts)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        c.*, 
        (SELECT COUNT(*) FROM Contracts WHERE client_id = c.client_id) AS no_of_orders,
        (SELECT COUNT(*) FROM Contracts WHERE client_id = c.client_id AND previous_contract IS NOT NULL) AS no_of_renew
      FROM Clients c 
      WHERE client_id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a client (updated for simplified input and auto-generation)
router.post('/', async (req, res) => {
  const { client_name, email } = req.body; // Only accept name and optional email
  if (!client_name) {
    return res.status(400).json({ error: 'Missing required field: client_name' });
  }

  // Optional: Basic email validation if provided (modern regex for format check)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Generate dedicated_number
    let firstChar = client_name.charAt(0).toUpperCase(); // Get first character, uppercase for consistency
    // If first character is not a letter, default to 'X' (handles cases like "123 Corp")
    if (!/[A-Z]/.test(firstChar)) {
      firstChar = 'X'; // Fallback for non-letter starts, e.g., numbers or symbols
    }

    // Count existing clients starting with this letter (for sequential numbering)
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM Clients WHERE dedicated_number LIKE $1',
      [`${firstChar}%`]
    );
    const count = parseInt(countResult.rows[0].count, 10);

    // Generate number with 2-digit padding (e.g., A01, A02)
    const number = String(count + 1).padStart(2, '0');
    const dedicated_number = `${firstChar}${number}`;

    // Insert into DB
    const result = await pool.query(
      'INSERT INTO Clients (client_name, dedicated_number, email) VALUES ($1, $2, $3) RETURNING *',
      [client_name, dedicated_number, email || null] // Use null if email not provided
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.stack);
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Client name or dedicated number already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a client
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { client_name, dedicated_number, no_of_orders, no_of_renew } = req.body;
  if (!client_name || !dedicated_number || no_of_orders == null || no_of_renew == null) {
    return res.status(400).json({ error: 'Missing required fields: client_name, dedicated_number, no_of_orders, no_of_renew' });
  }
  if (no_of_orders < 0 || no_of_renew < 0) {
    return res.status(400).json({ error: 'no_of_orders and no_of_renew must be non-negative' });
  }
  try {
    const result = await pool.query(
      'UPDATE Clients SET client_name = $1, dedicated_number = $2, no_of_orders = $3, no_of_renew = $4 WHERE client_id = $5 RETURNING *',
      [client_name, dedicated_number, no_of_orders, no_of_renew, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.stack);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Client name or dedicated number already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a client
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Clients WHERE client_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error(err.stack);
    if (err.code === '23503') { // Foreign key violation
      return res.status(400).json({ error: 'Cannot delete client with associated contracts' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;