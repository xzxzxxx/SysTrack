require('dotenv').config();
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, username FROM Users');
    res.json(result.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Lightweight endpoint for async dropdown search, especially for PICs
router.get('/lookup', async (req, res) => {
  const { search } = req.query;

  try {
    let query = `
      SELECT user_id, username 
      FROM Users
      WHERE role = 'AE' OR role = 'admin' -- Typically, only AEs or admins can be PICs
    `;
    const values = [];

    if (search) {
      // Add search condition if a search term is provided
      query += ' AND username ILIKE $1';
      values.push(`%${search}%`);
    }

    query += ' ORDER BY username LIMIT 20';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error fetching user lookup data' });
  }
});

module.exports = router;