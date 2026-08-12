const jwt = require('jsonwebtoken');
const db = require('../database/db');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: "Access denied. No authorization header provided." });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: "Token format must be 'Bearer <token>'" });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkeyforvendorcrmapp2026');
    req.user = decoded; // { id, name, email }

    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired token." });
  }
};
