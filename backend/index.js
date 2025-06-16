require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const contractRoutes = require('./routes/contracts');
const verifyToken = require('./middleware/auth');

const app = express();
const port = 3000;

// Middleware
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', verifyToken, clientRoutes);
app.use('/api/contracts', verifyToken, contractRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});