require('dotenv').config();
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Get all clients with search and sort
router.get('/', async (req, res) => {
  const { search, sortBy, sortOrder } = req.query;
  let query = 'SELECT * FROM Clients';
  const values = [];
  let whereClause = '';

  // Search by client_name, dedicated_number, or client_id
  if (search) {
    whereClause = ' WHERE client_name ILIKE $1 OR dedicated_number ILIKE $1 OR client_id::text ILIKE $1';
    values.push(`%${search}%`);
  }

  // Sort by no_of_orders or no_of_renew
  if (sortBy === 'no_of_orders' || sortBy === 'no_of_renew') {
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
    query += whereClause + ` ORDER BY ${sortBy} ${order}`;
  } else {
    query += whereClause;
  }

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single client by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Clients WHERE client_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a client
router.post('/', async (req, res) => {
  const { client_name, dedicated_number, no_of_orders, no_of_renew } = req.body;
  if (!client_name || !dedicated_number || no_of_orders == null || no_of_renew == null) {
    return res.status(400).json({ error: 'Missing required fields: client_name, dedicated_number, no_of_orders, no_of_renew' });
  }
  if (no_of_orders < 0 || no_of_renew < 0) {
    return res.status(400).json({ error: 'no_of_orders and no_of_renew must be non-negative' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO Clients (client_name, dedicated_number, no_of_orders, no_of_renew) VALUES ($1, $2, $3, $4) RETURNING *',
      [client_name, dedicated_number, no_of_orders, no_of_renew]
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