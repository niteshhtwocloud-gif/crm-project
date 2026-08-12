const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { applyTenantFilter, applyTenantInsert } = require('../utils/tenant');

// @route   GET /api/subscriptions
// @desc    Get all subscriptions
router.get('/', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'subscriptions', {});
    const subscriptions = await db.models.Subscription.find(conditions).sort({ created_at: -1 }).lean();
    
    // Re-calculate daysLeft dynamically on retrieve
    const updatedSubscriptions = subscriptions.map(s => {
      const daysLeft = Math.ceil((new Date(s.expiry) - new Date()) / (1000 * 60 * 60 * 24));
      let status = 'success';
      if (daysLeft <= 3) status = 'danger';
      else if (daysLeft <= 8) status = 'warning';
      else if (daysLeft <= 12) status = 'info';

      return {
        ...s,
        daysLeft,
        status
      };
    });
    res.json(updatedSubscriptions);
  } catch (error) {
    console.error('Failed to get subscriptions:', error);
    res.status(500).json({ message: 'Error retrieving active subscriptions.' });
  }
});

// @route   POST /api/subscriptions
// @desc    Add a customer active subscription
router.post('/', auth, async (req, res) => {
  const daysLeft = Math.ceil((new Date(req.body.expiry) - new Date()) / (1000 * 60 * 60 * 24));
  let status = 'success';
  if (daysLeft <= 3) status = 'danger';
  else if (daysLeft <= 8) status = 'warning';
  else if (daysLeft <= 12) status = 'info';

  const vendorId = req.body.vendorId || null;

  const newSub = {
    id: String(Date.now()),
    customer: req.body.customer,
    product: req.body.product,
    expiry: req.body.expiry,
    daysLeft,
    amount: Number(req.body.amount || 0),
    status,
    vendorId
  };

  if (!newSub.customer || !newSub.product || !newSub.expiry) {
    return res.status(400).json({ message: "Customer, product, and expiry date are required." });
  }

  try {
    const docToInsert = applyTenantInsert(req.user, 'subscriptions', newSub);
    await db.models.Subscription.create(docToInsert);

    // Update customer service count in users table
    const userConditions = await applyTenantFilter(req.user, 'users', { name: newSub.customer });
    const customerRecord = await db.models.Customer.findOne(userConditions).lean();
    
    if (customerRecord) {
      const newCount = Number(customerRecord.servicesCount || 0) + 1;
      await db.models.Customer.updateOne({ _id: customerRecord._id }, { $set: { servicesCount: newCount } });
    }

    // Generate notification
    const notificationId = Date.now();
    const notificationDoc = applyTenantInsert(req.user, 'notifications', {
      id: notificationId,
      type: 'success',
      category: 'System Messages',
      text: `Added service "${newSub.product}" under "${newSub.customer}"`,
      time: new Date().toLocaleString(),
      unread: true
    });
    await db.models.Notification.create(notificationDoc);

    res.status(201).json(newSub);
  } catch (error) {
    console.error('Failed to create subscription:', error);
    res.status(500).json({ message: 'Error adding service subscription.' });
  }
});

// @route   PUT /api/subscriptions/:id
// @desc    Update/renew subscription details
router.put('/:id', auth, async (req, res) => {
  const targetId = String(req.params.id);

  try {
    const conditions = await applyTenantFilter(req.user, 'subscriptions', { id: targetId });
    const existing = await db.models.Subscription.findOne(conditions).lean();
    
    if (!existing) {
      return res.status(404).json({ message: "Subscription not found." });
    }

    const expiryDate = req.body.expiry || existing.expiry;
    const daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    let status = 'success';
    if (daysLeft <= 3) status = 'danger';
    else if (daysLeft <= 8) status = 'warning';
    else if (daysLeft <= 12) status = 'info';

    const updatedSub = {
      ...existing,
      ...req.body,
      id: targetId,
      expiry: expiryDate,
      daysLeft,
      status
    };

    await db.models.Subscription.updateOne(conditions, { $set: {
      customer: updatedSub.customer,
      product: updatedSub.product,
      expiry: updatedSub.expiry,
      daysLeft: updatedSub.daysLeft,
      amount: Number(updatedSub.amount || 0),
      status: updatedSub.status
    }});

    res.json(updatedSub);
  } catch (error) {
    console.error('Failed to update subscription:', error);
    res.status(500).json({ message: 'Error updating subscription.' });
  }
});

// @route   DELETE /api/subscriptions/:id
// @desc    Delete subscription
router.delete('/:id', auth, async (req, res) => {
  const targetId = String(req.params.id);

  try {
    const conditions = await applyTenantFilter(req.user, 'subscriptions', { id: targetId });
    const existing = await db.models.Subscription.findOne(conditions).lean();
    if (!existing) {
      return res.status(404).json({ message: "Subscription not found." });
    }

    await db.models.Subscription.deleteOne(conditions);

    // Decrement customer service count in users table
    const userConditions = await applyTenantFilter(req.user, 'users', { name: existing.customer });
    const customerRecord = await db.models.Customer.findOne(userConditions).lean();
    if (customerRecord) {
      const newCount = Math.max(0, Number(customerRecord.servicesCount || 0) - 1);
      await db.models.Customer.updateOne({ _id: customerRecord._id }, { $set: { servicesCount: newCount } });
    }

    res.json({ message: `Subscription for ${existing.product} removed.` });
  } catch (error) {
    console.error('Failed to delete subscription:', error);
    res.status(500).json({ message: 'Error deleting subscription.' });
  }
});

module.exports = router;
