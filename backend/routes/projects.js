const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Get projects with pagination, associated contracts, clients, and users
router.get('/', async (req, res) => {
  // Get page and limit from query parameters, with defaults
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    // Query for paginated projects
    const projectsQuery = await pool.query(`
      SELECT p.project_id, p.project_name, p.created_at,
             c.client_name, u.username,
             json_agg(c2.*) AS contracts
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.client_id
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN contracts c2 ON c2.project_id = p.project_id
      GROUP BY p.project_id, p.project_name, p.created_at, c.client_name, u.username
      ORDER BY p.project_id
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Query for total project count
    const totalQuery = await pool.query('SELECT COUNT(*) AS total FROM projects');
    const total = parseInt(totalQuery.rows[0].total);

    // Return paginated response
    res.json({
      data: projectsQuery.rows,
      total
    });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;