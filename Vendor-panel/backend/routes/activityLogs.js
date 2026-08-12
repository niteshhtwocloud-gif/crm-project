const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { applyTenantFilter, applyTenantInsert } = require('../utils/tenant');

// @route   GET /api/activity-logs
// @desc    Get all activity logs
router.get('/', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'activityLogs', {});
    const logs = await db.models.ActivityLog.find(conditions).sort({ id: -1 }).lean();
    res.json(logs);
  } catch (error) {
    console.error('Failed to get activity logs:', error);
    res.status(500).json({ message: 'Error retrieving activity logs.' });
  }
});

// @route   POST /api/activity-logs
// @desc    Create a new activity log
router.post('/', auth, async (req, res) => {
  const newLog = {
    id: String(Date.now()),
    user: req.user.name || 'Admin',
    action: req.body.action,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
  };

  if (!newLog.action) {
    return res.status(400).json({ message: "Action is required." });
  }

  try {
    const docToInsert = applyTenantInsert(req.user, 'activityLogs', newLog);
    await db.models.ActivityLog.create(docToInsert);
    res.status(201).json(newLog);
  } catch (error) {
    console.error('Failed to create activity log:', error);
    res.status(500).json({ message: 'Error logging activity.' });
  }
});

module.exports = router;
