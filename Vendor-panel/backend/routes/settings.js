const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { applyTenantFilter, applyTenantInsert } = require('../utils/tenant');

// @route   GET /api/settings/company
// @desc    Get company settings
router.get('/company', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'companySettings', { id: 1 });
    const settings = await db.models.CompanySettings.findOne(conditions).lean();
    res.json(settings || {});
  } catch (error) {
    console.error('Failed to get company settings:', error);
    res.status(500).json({ message: 'Error retrieving company settings.' });
  }
});

// @route   PUT /api/settings/company
// @desc    Update company settings
router.put('/company', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'companySettings', { id: 1 });
    const existing = await db.models.CompanySettings.findOne(conditions).lean();
    const updated = {
      id: 1,
      companyName: req.body.companyName !== undefined ? req.body.companyName : (existing?.companyName || ''),
      email: req.body.email !== undefined ? req.body.email : (existing?.email || ''),
      phone: req.body.phone !== undefined ? req.body.phone : (existing?.phone || ''),
      gst: req.body.gst !== undefined ? req.body.gst : (existing?.gst || ''),
      logoText: req.body.logoText !== undefined ? req.body.logoText : (existing?.logoText || ''),
      currency: req.body.currency !== undefined ? req.body.currency : (existing?.currency || '₹'),
      paymentGateway: req.body.paymentGateway !== undefined ? req.body.paymentGateway : (existing?.paymentGateway || 'Razorpay')
    };

    if (existing) {
      await db.models.CompanySettings.updateOne(conditions, { $set: updated });
    } else {
      const docToInsert = applyTenantInsert(req.user, 'companySettings', updated);
      await db.models.CompanySettings.create(docToInsert);
    }

    res.json(updated);
  } catch (error) {
    console.error('Failed to update company settings:', error);
    res.status(500).json({ message: 'Error updating company settings.' });
  }
});

// @route   GET /api/settings/prefs
// @desc    Get system preferences (theme, language, etc.)
router.get('/prefs', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'prefs', { id: 1 });
    const prefs = await db.models.Prefs.findOne(conditions).lean();
    res.json(prefs || {});
  } catch (error) {
    console.error('Failed to get preferences:', error);
    res.status(500).json({ message: 'Error retrieving preferences.' });
  }
});

// @route   PUT /api/settings/prefs
// @desc    Update system preferences
router.put('/prefs', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'prefs', { id: 1 });
    const existing = await db.models.Prefs.findOne(conditions).lean();
    const updated = {
      id: 1,
      theme: req.body.theme !== undefined ? req.body.theme : (existing?.theme || 'Light'),
      language: req.body.language !== undefined ? req.body.language : (existing?.language || 'English'),
      timezone: req.body.timezone !== undefined ? req.body.timezone : (existing?.timezone || 'Asia/Kolkata (IST)')
    };

    if (existing) {
      await db.models.Prefs.updateOne(conditions, { $set: updated });
    } else {
      const docToInsert = applyTenantInsert(req.user, 'prefs', updated);
      await db.models.Prefs.create(docToInsert);
    }

    res.json(updated);
  } catch (error) {
    console.error('Failed to update preferences:', error);
    res.status(500).json({ message: 'Error updating preferences.' });
  }
});

module.exports = router;
