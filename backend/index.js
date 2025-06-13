const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  //ssl: { rejectUnauthorized: false } // Needed for Neon.tech
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error connecting to database:', err.stack);
  }
  console.log('Connected to PostgreSQL!');
  release();
});

// Test route
app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

app.get('/api/clients', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM Clients');
      res.json(result.rows);
    } catch (err) {
      console.error(err.stack);
      res.status(500).send('Server error');
    }
  });
  
// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});