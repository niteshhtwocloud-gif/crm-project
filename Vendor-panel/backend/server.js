require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env')
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// ======================================================
// CORS CONFIGURATION
// ======================================================

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://crm-project-7wvy.vercel.app',
  'https://crm-project-smoky-delta.vercel.app',
  'https://crm-project-7wvy-pv5fl4iar-ht-wo.vercel.app',
  'https://crm-project-7wvy-h8f4xen5t-ht-wo.vercel.app'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without Origin
      // Example: Postman, server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },

    credentials: true
  })
);

// ======================================================
// BODY PARSER
// ======================================================

app.use(
  express.json({
    limit: '5mb'
  })
);

// ======================================================
// DATABASE
// ======================================================

const initDb = require('./database/initDb');

// ======================================================
// ROOT ROUTE
// ======================================================

app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'CRM Backend API is running'
  });
});

// ======================================================
// API ROUTES
// ======================================================

// AUTH ROUTE
app.use('/api/auth', require('./routes/auth'));

app.use('/api/users', require('./routes/users'));
app.use('/api/services', require('./routes/services'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/backups', require('./routes/backups'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/support-tickets', require('./routes/supportTickets'));
app.use('/api/activity-logs', require('./routes/activityLogs'));
app.use('/api/system-users', require('./routes/systemUsers'));
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/renew', require('./routes/renew'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/renewal-requests', require('./routes/renewalRequests'));

// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date()
  });
});

// ======================================================
// START DATABASE + SERVER
// ======================================================

initDb()
  .then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });

    // ==================================================
    // SERVER ERROR HANDLING
    // ==================================================

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
      } else {
        console.error('Server error:', err);
      }
    });
  })
  .catch((err) => {
    console.error(
      'Failed to start server due to database init failure:',
      err
    );

    process.exit(1);
  });
