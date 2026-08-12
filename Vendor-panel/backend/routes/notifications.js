const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { applyTenantFilter, applyTenantInsert } = require('../utils/tenant');

// @route   GET /api/notifications
// @desc    Get all notifications
router.get('/', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'notifications', {});
    const notifications = await db.models.Notification.find(conditions).sort({ id: -1 }).lean();
    res.json(notifications);
  } catch (error) {
    console.error('Failed to get notifications:', error);
    res.status(500).json({ message: 'Error retrieving notifications.' });
  }
});

// @route   POST /api/notifications
// @desc    Add a notification (Internal/Triggered)
router.post('/', auth, async (req, res) => {
  const newNotification = {
    id: Number(req.body.id || Date.now()),
    type: req.body.type || 'info',
    category: req.body.category || 'System Messages',
    text: req.body.text,
    time: req.body.time || new Date().toLocaleString(),
    unread: req.body.unread !== false
  };

  if (!newNotification.text) {
    return res.status(400).json({ message: "Notification text is required." });
  }

  try {
    const docToInsert = applyTenantInsert(req.user, 'notifications', newNotification);
    await db.models.Notification.create(docToInsert);
    res.status(201).json(newNotification);
  } catch (error) {
    console.error('Failed to create notification:', error);
    res.status(500).json({ message: 'Error creating notification.' });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'notifications', {});
    await db.models.Notification.updateMany(conditions, { $set: { unread: false } });
    const updated = await db.models.Notification.find(conditions).sort({ id: -1 }).lean();
    res.json(updated);
  } catch (error) {
    console.error('Failed to update notifications:', error);
    res.status(500).json({ message: 'Error marking notifications as read.' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark specific notification as read
router.put('/:id/read', auth, async (req, res) => {
  const targetId = Number(req.params.id);

  try {
    const conditions = await applyTenantFilter(req.user, 'notifications', { id: targetId });
    const existing = await db.models.Notification.findOne(conditions).lean();
    if (!existing) {
      return res.status(404).json({ message: "Notification not found." });
    }

    await db.models.Notification.updateOne(conditions, { $set: { unread: false } });
    existing.unread = false;
    res.json(existing);
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    res.status(500).json({ message: 'Error updating notification.' });
  }
});

// @route   DELETE /api/notifications
// @desc    Clear all notifications
router.delete('/', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'notifications', {});
    await db.models.Notification.deleteMany(conditions);
    res.json({ message: "All notifications cleared successfully." });
  } catch (error) {
    console.error('Failed to clear notifications:', error);
    res.status(500).json({ message: 'Error clearing notifications.' });
  }
});

module.exports = router;
