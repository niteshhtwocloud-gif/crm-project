require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend communications
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '5mb' }));

// Import database initializer
const initDb = require('./database/initDb');

// Connect API Routes
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

// Serve frontend build static files in production (optional, if building)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../vendor-crm/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../vendor-crm/dist/index.html'));
  });
}

// Start Database and then Server
initDb()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${PORT} is already in use. Another instance is likely running.`);
        const fallbackPort = Number(PORT) + 1;
        const fallbackServer = app.listen(fallbackPort, () => {
          console.log(`Safe fallback: Server running on port ${fallbackPort} for development.`);
        });

        fallbackServer.on('error', (fallbackErr) => {
          console.error('Fallback server failed to start:', fallbackErr.message);
        });
      } else {
        console.error('Server error:', err);
      }
    });
  })
  .catch((err) => {
    console.error('Failed to start server due to database init failure:', err);
    process.exit(1);
  });


