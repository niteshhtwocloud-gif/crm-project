const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { applyTenantFilter, applyTenantInsert } = require('../utils/tenant');

// @route   GET /api/support-tickets
// @desc    Get all support tickets
router.get('/', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'supportTickets', {});
    const tickets = await db.models.SupportTicket.find(conditions).sort({ created_at: -1 }).lean();
    res.json(tickets);
  } catch (error) {
    console.error('Failed to get support tickets:', error);
    res.status(500).json({ message: 'Error retrieving support tickets.' });
  }
});

// @route   POST /api/support-tickets
// @desc    Add a new support ticket
router.post('/', auth, async (req, res) => {
  const newTicket = {
    id: String(Date.now()),
    customer: req.body.customer,
    subject: req.body.subject,
    category: req.body.category || 'service',
    priority: req.body.priority || 'Medium',
    status: 'Open',
    date: new Date().toISOString().slice(0, 10),
    message: req.body.message || ''
  };

  if (!newTicket.customer || !newTicket.subject) {
    return res.status(400).json({ message: "Customer and subject are required." });
  }

  try {
    const docToInsert = applyTenantInsert(req.user, 'supportTickets', newTicket);
    await db.models.SupportTicket.create(docToInsert);

    // Generate notification
    const notificationId = Date.now();
    const notificationDoc = applyTenantInsert(req.user, 'notifications', {
      id: notificationId,
      type: 'info',
      category: 'System Messages',
      text: `New support ticket filed: "${newTicket.subject}"`,
      time: new Date().toLocaleString(),
      unread: true
    });
    await db.models.Notification.create(notificationDoc);

    res.status(201).json(newTicket);
  } catch (error) {
    console.error('Failed to create support ticket:', error);
    res.status(500).json({ message: 'Error filing support ticket.' });
  }
});

// @route   PUT /api/support-tickets/:id
// @desc    Update support ticket details
router.put('/:id', auth, async (req, res) => {
  const targetId = String(req.params.id);

  try {
    const conditions = await applyTenantFilter(req.user, 'supportTickets', { id: targetId });
    const existing = await db.models.SupportTicket.findOne(conditions).lean();
    
    if (!existing) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const updatedTicket = {
      ...existing,
      ...req.body,
      id: targetId
    };

    await db.models.SupportTicket.updateOne(conditions, { $set: {
      customer: updatedTicket.customer,
      subject: updatedTicket.subject,
      category: updatedTicket.category,
      priority: updatedTicket.priority,
      status: updatedTicket.status,
      date: updatedTicket.date,
      message: updatedTicket.message
    }});

    res.json(updatedTicket);
  } catch (error) {
    console.error('Failed to update ticket:', error);
    res.status(500).json({ message: 'Error updating support ticket.' });
  }
});

// @route   DELETE /api/support-tickets/:id
// @desc    Delete support ticket
router.delete('/:id', auth, async (req, res) => {
  const targetId = String(req.params.id);

  try {
    const conditions = await applyTenantFilter(req.user, 'supportTickets', { id: targetId });
    const existing = await db.models.SupportTicket.findOne(conditions).lean();
    
    if (!existing) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    await db.models.SupportTicket.deleteOne(conditions);
    res.json({ message: `Ticket "${existing.subject}" deleted.` });
  } catch (error) {
    console.error('Failed to delete ticket:', error);
    res.status(500).json({ message: 'Error deleting support ticket.' });
  }
});

module.exports = router;
