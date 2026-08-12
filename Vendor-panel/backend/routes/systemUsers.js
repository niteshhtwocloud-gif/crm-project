const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { applyTenantFilter, applyTenantInsert } = require('../utils/tenant');

// @route   GET /api/system-users
// @desc    Get all admin users/roles
router.get('/', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'systemUsers', {});
    const users = await db.models.SystemUser.find(conditions).sort({ created_at: -1 }).lean();
    res.json(users);
  } catch (error) {
    console.error('Failed to get system users:', error);
    res.status(500).json({ message: 'Error retrieving system users.' });
  }
});

// @route   POST /api/system-users
// @desc    Add a system user
router.post('/', auth, async (req, res) => {
  const newUser = {
    id: String(Date.now()),
    name: req.body.name,
    email: req.body.email,
    role: req.body.role || 'Operator',
    status: 'Active'
  };

  if (!newUser.name || !newUser.email) {
    return res.status(400).json({ message: "Name and email are required." });
  }

  try {
    const docToInsert = applyTenantInsert(req.user, 'systemUsers', newUser);
    await db.models.SystemUser.create(docToInsert);

    // Generate notification
    const notificationId = Date.now();
    const notificationDoc = applyTenantInsert(req.user, 'notifications', {
      id: notificationId,
      type: 'info',
      category: 'System Messages',
      text: `User "${newUser.name}" added successfully`,
      time: new Date().toLocaleString(),
      unread: true
    });
    await db.models.Notification.create(notificationDoc);

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Failed to create system user:', error);
    res.status(500).json({ message: 'Error creating system user.' });
  }
});

// @route   PUT /api/system-users/:id
// @desc    Update system user details
router.put('/:id', auth, async (req, res) => {
  const targetId = String(req.params.id);

  try {
    const conditions = await applyTenantFilter(req.user, 'systemUsers', { id: targetId });
    const existing = await db.models.SystemUser.findOne(conditions).lean();
    if (!existing) {
      return res.status(404).json({ message: "User not found." });
    }

    const updatedUser = {
      ...existing,
      ...req.body,
      id: targetId
    };

    await db.models.SystemUser.updateOne(conditions, { $set: {
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status
    }});

    res.json(updatedUser);
  } catch (error) {
    console.error('Failed to update system user:', error);
    res.status(500).json({ message: 'Error updating system user.' });
  }
});

// @route   DELETE /api/system-users/:id
// @desc    Delete system user
router.delete('/:id', auth, async (req, res) => {
  const targetId = String(req.params.id);

  try {
    const conditions = await applyTenantFilter(req.user, 'systemUsers', { id: targetId });
    const existing = await db.models.SystemUser.findOne(conditions).lean();
    if (!existing) {
      return res.status(404).json({ message: "User not found." });
    }

    await db.models.SystemUser.deleteOne(conditions);
    res.json({ message: `User "${existing.name}" deleted successfully.` });
  } catch (error) {
    console.error('Failed to delete system user:', error);
    res.status(500).json({ message: 'Error deleting system user.' });
  }
});

module.exports = router;
