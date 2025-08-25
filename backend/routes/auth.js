require('dotenv').config();

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const verifyToken = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
  // SSL commented out for local PostgreSQL
});

const isAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
      if (req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Admin access required' });
      }
      next();
  });
};

// Register user
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!['admin', 'sales', 'ae'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin, sales, or ae' });
  }
  /*
  if (role === 'admin') {
    return res.status(403).json({ error: 'Admin accounts cannot be self-registered. Please contact an administrator.' });
  }
  */
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO pending_registrations (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, hashedPassword, role]
    );
    res.status(201).json({ message: 'Registration request submitted. Waiting for admin approval.', request: result.rows[0] });
  } catch (err) {
    console.error(err.stack);
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Username or email already exists or pending' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all pending registrations (admin only, for settings page)
router.get('/pending-registrations', isAdmin, async (req, res) => {
  try {
      const result = await pool.query('SELECT id, username, email, role, requested_at FROM pending_registrations WHERE status = $1', ['pending']);
      res.json(result.rows);
  } catch (err) {
      console.error(err.stack);
      res.status(500).json({ error: 'Server error' });
  }
});

// Approve or reject registration (admin only)
router.post('/approve-registration/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { approve } = req.body;  // approve: true/false

  try {
      const pendingResult = await pool.query('SELECT * FROM pending_registrations WHERE id = $1 AND status = $2', [id, 'pending']);
      if (pendingResult.rows.length === 0) {
          return res.status(404).json({ error: 'Pending registration not found' });
      }

      const pending = pendingResult.rows[0];

      if (approve) {
          // Move to Users table
          const result = await pool.query(
              'INSERT INTO Users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id, username, email, role',
              [pending.username, pending.email, pending.password_hash, pending.role]
          );

          // Update status
          await pool.query('UPDATE pending_registrations SET status = $1 WHERE id = $2', ['approved', id]);

          // Notify user (e.g., email them about approval)

          res.json({ message: 'Registration approved', user: result.rows[0] });
      } else {
          // Reject
          await pool.query('UPDATE pending_registrations SET status = $1 WHERE id = $2', ['rejected', id]);
          res.json({ message: 'Registration rejected' });
      }
  } catch (err) {
      console.error(err.stack);
      res.status(500).json({ error: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user.user_id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );
    res.json({ token, user: { userId: user.user_id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;