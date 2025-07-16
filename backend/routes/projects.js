const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Get projects with pagination and optional search by project_name
router.get('/', async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query; // Add search param
  const offset = (page - 1) * limit;
  let query = `
    SELECT p.project_id, p.project_name, p.created_at,
           c.client_name, u.username,
           json_agg(c2.*) AS contracts
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.client_id
    LEFT JOIN users u ON p.user_id = u.user_id
    LEFT JOIN contracts c2 ON c2.project_id = p.project_id
  `;
  let countQuery = 'SELECT COUNT(*) AS total FROM projects p';
  const values = [];
  let whereClause = '';

  if (search) {
    whereClause = ' WHERE p.project_name ILIKE $1';
    values.push(`%${search}%`);
  }

  query += `${whereClause} GROUP BY p.project_id, p.project_name, p.created_at, c.client_name, u.username
    ORDER BY p.project_id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
  countQuery += whereClause;

  values.push(limit, offset);

  try {
    const [projectsQuery, totalQuery] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, values.slice(0, -2))
    ]);
    res.json({
      data: projectsQuery.rows,
      total: parseInt(totalQuery.rows[0].total)
    });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new project
router.post('/', async (req, res) => {
  const { project_name, client_id, user_id } = req.body;

  // Basic validation
  if (!project_name || !client_id) {
    return res.status(400).json({ error: 'Missing required fields: project_name and client_id are required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO projects (project_name, client_id, user_id) VALUES ($1, $2, $3) RETURNING *',
      [project_name, client_id, user_id]
    );
    // Return the newly created project object
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.stack);
    // Handle potential foreign key violations or other DB errors
    res.status(500).json({ error: 'Server error while creating project' });
  }
});

module.exports = router;