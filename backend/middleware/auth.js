require('dotenv').config();
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // --- Token Refresh Logic ---
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const tokenLifetime = decoded.exp - decoded.iat;
    const timeRemaining = decoded.exp - nowInSeconds;

    // Refresh if the token has less than half its lifetime remaining
    // (e.g., for a 1-hour token, refresh if less than 30 minutes are left)
    if (timeRemaining < tokenLifetime / 2) {
      // Create a new payload without the old 'iat' and 'exp' fields
      const newPayload = {
        userId: decoded.userId,
        email: decoded.email,
        // Add any other user data you originally put in the token
      };

      const newToken = jwt.sign(newPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
      
      // Send the new token back in a custom header
      res.setHeader('X-Refreshed-Token', newToken);
    }
    // --- END of Token Refresh Logic ---

    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;