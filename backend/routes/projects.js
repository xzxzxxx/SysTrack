const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Get all projects with associated contracts, clients, and users
router.get('/', async (req, res) => {
  try {
    const projects = await pool.query(`
      SELECT p.project_id, p.project_name, p.created_at,
             c.client_name, u.username,
             json_agg(c2.*) AS contracts
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.client_id
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN contracts c2 ON c2.project_id = p.project_id
      GROUP BY p.project_id, p.project_name, p.created_at, c.client_name, u.username
    `);
    res.json(projects.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;