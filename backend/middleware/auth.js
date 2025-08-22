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

    console.log('Server current time:', new Date(nowInSeconds * 1000).toUTCString());
    console.log('Token iat:', decoded.iat, 'exp:', decoded.exp);
    console.log('Calculated timeRemaining:', timeRemaining, 'tokenLifetime / 8:', tokenLifetime / 8);
    console.log('Response Headers after refresh:', res.getHeaders());

    // Refresh if the token has less than half its lifetime remaining
    // (e.g., for a 4-hour token, refresh if less than 30 minutes are left)
    if (timeRemaining < tokenLifetime / 8 && timeRemaining > 0) {
      // Prevent multiple header sets in the same response
      console.log('Refreshing token...');
      if (!res.headersSent) {
        // Create a new payload without the old 'iat' and 'exp' fields
        const newPayload = {
          userId: decoded.userId,
          email: decoded.email,
        };

        const newToken = jwt.sign(newPayload, process.env.JWT_SECRET, { expiresIn: '4h' });
        
        // Send the new token back in a custom header (lowercase for consistency)
        res.setHeader('x-refreshed-token', newToken);
        console.log('Token refreshed successfully');
        console.log('New token:', newToken);
      }
    }
    // --- END of Token Refresh Logic ---

    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;