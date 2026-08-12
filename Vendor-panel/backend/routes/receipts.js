const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { applyTenantFilter, applyTenantInsert } = require('../utils/tenant');

// @route   GET /api/receipts
// @desc    Get all payment receipts
router.get('/', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'receipts', {});
    const receipts = await db.models.Receipt.find(conditions).sort({ created_at: -1 }).lean();
    res.json(receipts);
  } catch (error) {
    console.error('Failed to get receipts:', error);
    res.status(500).json({ message: 'Error retrieving payment receipts.' });
  }
});

// @route   POST /api/receipts
// @desc    Add a payment receipt
router.post('/', auth, async (req, res) => {
  const newReceipt = {
    id: String(Date.now()),
    invoiceNo: req.body.invoiceNo,
    customer: req.body.customer,
    date: req.body.date || new Date().toISOString().slice(0, 10),
    amount: Number(req.body.amount || 0),
    method: req.body.method || 'UPI'
  };

  if (!newReceipt.invoiceNo || !newReceipt.customer) {
    return res.status(400).json({ message: "Invoice number and customer are required." });
  }

  try {
    const docToInsert = applyTenantInsert(req.user, 'receipts', newReceipt);
    await db.models.Receipt.create(docToInsert);
    res.status(201).json(newReceipt);
  } catch (error) {
    console.error('Failed to create receipt:', error);
    res.status(500).json({ message: 'Error saving payment receipt.' });
  }
});

module.exports = router;
