const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Generate contract code (e.g., CONTRACT-YYYYMMDD-NN)
// TODO: Fix format to category(2letter)--YY-client_id--dedicated_number--no_of_orders in future branch
const generateContractCode = async (prefix) => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // e.g., 20250616
  const result = await pool.query(
    'SELECT COUNT(*) FROM Contracts WHERE client_code LIKE $1',
    [`${prefix}-${date}%`]
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `${prefix}-${date}-${String(count).padStart(2, '0')}`;
};

// Get all contracts with search and pagination
router.get('/', async (req, res) => {
  const { search, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  let query = `
    SELECT c.*, p.project_name 
    FROM Contracts c 
    LEFT JOIN projects p ON c.project_id = p.project_id`;
  let countQuery = 'SELECT COUNT(*) FROM Contracts c';
  const values = [];
  let whereClause = '';

  // Search by contract_id, client_code, or contract_name
  if (search) {
    whereClause = ' WHERE c.contract_id::text ILIKE $1 OR c.client_code ILIKE $1 OR c.contract_name ILIKE $1';
    values.push(`%${search}%`);
  }

  query += whereClause + ' LIMIT $' + (values.length + 1) + ' OFFSET $' + (values.length + 2);
  countQuery += whereClause;
  values.push(limit, offset);

  try {
    const [dataResult, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, values.slice(0, values.length - 2))
    ]);
    res.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single contract by contract_id
router.get('/:contract_id', async (req, res) => {
  const { contract_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT c.*, p.project_name FROM Contracts c LEFT JOIN projects p ON c.project_id = p.project_id WHERE c.contract_id = $1',
      [contract_id]
    );
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
    contract_name,
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
    spare_parts_provider,
    project_id // New field
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

    // Check if project_id is valid if provided
    if (project_id) {
      const projectCheck = await pool.query('SELECT 1 FROM projects WHERE id = $1', [project_id]);
      if (projectCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid project_id' });
      }
    }

    const client_code = await generateContractCode('CONTRACT');
    const renew_code = await generateContractCode('RENEW');

    const result = await pool.query(
      `INSERT INTO Contracts (
        client_id, user_id, start_date, end_date, client_code, renew_code,
        client, alias, jobnote, sales, contract_name, location, category,
        t1, t2, t3, preventive, report, other, contract_status, remarks,
        period, response_time, service_time, spare_parts_provider, project_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
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
        contract_name || null,
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
        project_id || null
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
router.put('/:contract_id', async (req, res) => {
  const { contract_id } = req.params;
  const {
    client_id,
    user_id,
    start_date,
    end_date,
    client,
    alias,
    jobnote,
    sales,
    contract_name, // Renamed from project_name
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
    spare_parts_provider,
    project_id // New field
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

    // Check if project_id is valid if provided
    if (project_id) {
      const projectCheck = await pool.query('SELECT 1 FROM projects WHERE id = $1', [project_id]);
      if (projectCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid project_id' });
      }
    }

    const result = await pool.query(
      `UPDATE Contracts SET
        client_id = $1, user_id = $2, start_date = $3, end_date = $4,
        client = $5, alias = $6, jobnote = $7, sales = $8, contract_name = $9,
        location = $10, category = $11, t1 = $12, t2 = $13, t3 = $14,
        preventive = $15, report = $16, other = $17, contract_status = $18,
        remarks = $19, period = $20, response_time = $21, service_time = $22,
        spare_parts_provider = $23, project_id = $24
      WHERE contract_id = $25 RETURNING *`,
      [
        client_id,
        user_id,
        start_date,
        end_date,
        client || null,
        alias || null,
        jobnote || null,
        sales || null,
        contract_name || null,
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
        project_id || null,
        contract_id
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
router.delete('/:contract_id', async (req, res) => {
  const { contract_id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Contracts WHERE contract_id = $1 RETURNING *', [contract_id]);
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