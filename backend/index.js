require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const cookieParser = require('cookie-parser');
const verifyToken = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const contractRoutes = require('./routes/contracts');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const notificationsRouter = require('./routes/notifications');

const app = express();
const port = 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3001', // Your frontend URL
  exposedHeaders: ['X-Refreshed-Token'], // Allow this header to be read by the client
}));
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
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
app.use('/api/auth', authRoutes); // No middleware (public route for login/register)
app.use('/api/clients', verifyToken, clientRoutes);
app.use('/api/contracts', verifyToken, contractRoutes);
app.use('/api/users', verifyToken, userRoutes);
app.use('/api/projects', verifyToken, projectRoutes);
app.use('/api/notifications', notificationsRouter);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});