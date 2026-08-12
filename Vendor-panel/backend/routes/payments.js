const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { applyTenantFilter, applyTenantInsert } = require('../utils/tenant');

// @route   GET /api/payments
// @desc    Get all payments / invoices
router.get('/', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'payments', {});
    const payments = await db.models.Payment.find(conditions).sort({ created_at: -1 }).lean();
    res.json(payments);
  } catch (error) {
    console.error('Failed to get payments:', error);
    res.status(500).json({ message: 'Error retrieving invoices.' });
  }
});

// @route   POST /api/payments
// @desc    Create a new invoice
router.post('/', auth, async (req, res) => {
  const vendorName = req.user.name || 'CRM Administrator';
  const vendorEmail = req.user.email || 'admin@vendorcrm.com';

  const vendorId = req.body.vendorId || null;

  const newPayment = {
    invoice: req.body.invoice,
    customer: req.body.customer,
    service: req.body.service || '',
    amount: Number(req.body.amount || 0),
    paid: Number(req.body.paid || 0),
    pending: Number(req.body.pending || 0),
    paymentDate: req.body.paymentDate || '',
    dueDate: req.body.dueDate || '',
    status: req.body.status || 'Pending',
    mode: req.body.mode || '',
    vendor: vendorName,
    vendorEmail,
    vendorId
  };

  if (!newPayment.invoice || !newPayment.customer) {
    return res.status(400).json({ message: "Invoice number and customer name are required." });
  }

  try {
    const docToInsert = applyTenantInsert(req.user, 'payments', newPayment);
    await db.models.Payment.create(docToInsert);

    // Create system notification
    const notificationId = Date.now();
    const notificationDoc = applyTenantInsert(req.user, 'notifications', {
      id: notificationId,
      type: 'info',
      category: 'Payment Alerts',
      text: `Invoice ${newPayment.invoice} generated for ${newPayment.customer} (₹${newPayment.amount})`,
      time: new Date().toLocaleString(),
      unread: true
    });
    await db.models.Notification.create(notificationDoc);

    res.status(201).json(newPayment);
  } catch (error) {
    console.error('Failed to create payment:', error);
    res.status(500).json({ message: 'Error creating invoice.' });
  }
});

// @route   PUT /api/payments/:invoice
// @desc    Update invoice status
router.put('/:invoice', auth, async (req, res) => {
  const invoiceNum = req.params.invoice;

  try {
    const conditions = await applyTenantFilter(req.user, 'payments', { invoice: invoiceNum });
    const existing = await db.models.Payment.findOne(conditions).lean();
    if (!existing) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    const updatedPayment = {
      ...existing,
      ...req.body
    };

    await db.models.Payment.updateOne(conditions, { $set: {
      customer: updatedPayment.customer,
      service: updatedPayment.service,
      amount: Number(updatedPayment.amount || 0),
      paid: Number(updatedPayment.paid || 0),
      pending: Number(updatedPayment.pending || 0),
      paymentDate: updatedPayment.paymentDate,
      dueDate: updatedPayment.dueDate,
      status: updatedPayment.status,
      mode: updatedPayment.mode,
      vendor: updatedPayment.vendor,
      vendorEmail: updatedPayment.vendorEmail
    }});

    // Create system notification
    const notificationId = Date.now();
    const notificationDoc = applyTenantInsert(req.user, 'notifications', {
      id: notificationId,
      type: updatedPayment.status === "Paid" ? "success" : "warning",
      category: 'Payment Alerts',
      text: `Invoice ${invoiceNum} status changed to ${updatedPayment.status}`,
      time: new Date().toLocaleString(),
      unread: true
    });
    await db.models.Notification.create(notificationDoc);

    res.json(updatedPayment);
  } catch (error) {
    console.error('Failed to update invoice:', error);
    res.status(500).json({ message: 'Error updating invoice.' });
  }
});

// @route   DELETE /api/payments/:invoice
// @desc    Remove an invoice
router.delete('/:invoice', auth, async (req, res) => {
  const invoiceNum = req.params.invoice;

  try {
    const conditions = await applyTenantFilter(req.user, 'payments', { invoice: invoiceNum });
    const existing = await db.models.Payment.findOne(conditions).lean();
    if (!existing) {
      return res.status(404).json({ message: "Invoice not found." });
    }

    await db.models.Payment.deleteOne(conditions);
    res.json({ message: `Invoice ${existing.invoice} removed successfully.` });
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    res.status(500).json({ message: 'Error deleting invoice.' });
  }
});

module.exports = router;
