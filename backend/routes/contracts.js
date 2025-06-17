require('dotenv').config();
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Generate contract code (e.g., CONTRACT-YYYYMMDD-NN)
// this is wrong
// categary(2letter)--YY-client_id--dedicated_number--no_of_orders
const generateContractCode = async (prefix) => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // e.g., 20250616
  const result = await pool.query(
    'SELECT COUNT(*) FROM Contracts WHERE client_code LIKE $1',
    [`${prefix}-${date}%`]
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `${prefix}-${date}-${String(count).padStart(2, '0')}`;
};

// Get all contracts with search
router.get('/', async (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM Contracts';
  const values = [];
  let whereClause = '';

  // Search by client_code or project_name
  if (search) {
    whereClause = ' WHERE client_code ILIKE $1 OR project_name ILIKE $1';
    values.push(`%${search}%`);
  }

  query += whereClause;

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single contract by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM Contracts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a contract
router.post('/', async (req, res) => {
  const {
    client_id,
    user_id,
    start_date,
    end_date,
    client,
    alias,
    jobnote,
    sales,
    project_name,
    location,
    category,
    t1,
    t2,
    t3,
    preventive,
    report,
    other,
    contract_status,
    remarks,
    period,
    response_time,
    service_time,
    spare_parts_provider
  } = req.body;

  if (!client_id || !user_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'Missing required fields: client_id, user_id, start_date, end_date' });
  }

  try {
    const clientCheck = await pool.query('SELECT 1 FROM Clients WHERE client_id = $1', [client_id]);
    if (clientCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }
    const userCheck = await pool.query('SELECT 1 FROM Users WHERE user_id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid user_id' });
    }

    const client_code = await generateContractCode('CONTRACT');
    const renew_code = await generateContractCode('RENEW');

    const result = await pool.query(
      `INSERT INTO Contracts (
        client_id, user_id, start_date, end_date, client_code, renew_code,
        client, alias, jobnote, sales, project_name, location, category,
        t1, t2, t3, preventive, report, other, contract_status, remarks,
        period, response_time, service_time, spare_parts_provider
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *`,
      [
        client_id,
        user_id,
        start_date,
        end_date,
        client_code,
        renew_code,
        client || null,
        alias || null,
        jobnote || null,
        sales || null,
        project_name || null,
        location || null,
        category || null,
        t1 || null,
        t2 || null,
        t3 || null,
        preventive || null,
        report || null,
        other || null,
        contract_status || null,
        remarks || null,
        period || null,
        response_time || null,
        service_time || null,
        spare_parts_provider || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.stack);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Contract code already exists' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid foreign key reference' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a contract
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    client_id,
    user_id,
    start_date,
    end_date,
    client,
    alias,
    jobnote,
    sales,
    project_name,
    location,
    category,
    t1,
    t2,
    t3,
    preventive,
    report,
    other,
    contract_status,
    remarks,
    period,
    response_time,
    service_time,
    spare_parts_provider
  } = req.body;

  if (!client_id || !user_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'Missing required fields: client_id, user_id, start_date, end_date' });
  }

  try {
    const clientCheck = await pool.query('SELECT 1 FROM Clients WHERE client_id = $1', [client_id]);
    if (clientCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }
    const userCheck = await pool.query('SELECT 1 FROM Users WHERE user_id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid user_id' });
    }

    const result = await pool.query(
      `UPDATE Contracts SET
        client_id = $1, user_id = $2, start_date = $3, end_date = $4,
        client = $5, alias = $6, jobnote = $7, sales = $8, project_name = $9,
        location = $10, category = $11, t1 = $12, t2 = $13, t3 = $14,
        preventive = $15, report = $16, other = $17, contract_status = $18,
        remarks = $19, period = $20, response_time = $21, service_time = $22,
        spare_parts_provider = $23
      WHERE id = $24 RETURNING *`,
      [
        client_id,
        user_id,
        start_date,
        end_date,
        client || null,
        alias || null,
        jobnote || null,
        sales || null,
        project_name || null,
        location || null,
        category || null,
        t1 || null,
        t2 || null,
        t3 || null,
        preventive || null,
        report || null,
        other || null,
        contract_status || null,
        remarks || null,
        period || null,
        response_time || null,
        service_time || null,
        spare_parts_provider || null,
        id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.stack);
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid foreign key reference' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a contract
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Contracts WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json({ message: 'Contract deleted successfully' });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;