const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const { applyTenantFilter, applyTenantInsert, getTenantFilter } = require('../utils/tenant');

// @route   GET /api/services
// @desc    Get all vendor services
router.get('/', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'services', {});
    const services = await db.models.Service.find(conditions).sort({ name: 1 }).lean();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedServices = services.map(s => {
      const expiryStr = s.expiry || s.expiryDate;
      if (expiryStr) {
        const expDate = new Date(expiryStr);
        if (!isNaN(expDate.getTime())) {
          const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
          let computedStatus = "Active";
          if (daysLeft <= 0) computedStatus = "Expired";
          else if (daysLeft <= 7) computedStatus = "Expiring";
          return { ...s, daysLeft, status: computedStatus };
        }
      }
      return s;
    });
    res.json(updatedServices);
  } catch (error) {
    console.error('Failed to get services:', error);
    res.status(500).json({ message: 'Error retrieving services.' });
  }
});

// @route   POST /api/services
// @desc    Add a new service
router.post('/', auth, async (req, res) => {
  const vendorId = req.body.vendorId || null;

  const newService = {
    name: req.body.name,
    category: req.body.category || '',
    provider: req.body.provider || '',
    purchase: Number(req.body.purchase || 0),
    selling: Number(req.body.selling || 0),
    username: req.body.username || '',
    password: req.body.password || '',
    created: req.body.created || '',
    expiry: req.body.expiry || '',
    renewal: req.body.renewal || '',
    status: req.body.status || 'Active',
    vendorId
  };

  if (!newService.name) {
    return res.status(400).json({ message: "Service name is required." });
  }

  try {
    // Check if service with same name exists for this tenant
    const conditions = await applyTenantFilter(req.user, 'services', { name: new RegExp(`^${db.escapeRegExp(newService.name)}$`, 'i') });
    const exists = await db.models.Service.findOne(conditions).lean();
    if (exists) {
      return res.status(400).json({ message: "A service with this name already exists." });
    }

    const docToInsert = applyTenantInsert(req.user, 'services', newService);
    await db.models.Service.create(docToInsert);

    res.status(201).json(newService);
  } catch (error) {
    console.error('Failed to add service:', error);
    res.status(500).json({ message: 'Error saving service.' });
  }
});

// @route   PUT /api/services/:name
// @desc    Edit service details
router.put('/:name', auth, async (req, res) => {
  const serviceName = req.params.name;

  try {
    const conditions = await applyTenantFilter(req.user, 'services', { name: serviceName });
    const existing = await db.models.Service.findOne(conditions).lean();
    if (!existing) {
      return res.status(404).json({ message: "Service not found." });
    }

    const updatedService = {
      ...existing,
      ...req.body
    };

    await db.models.Service.updateOne(conditions, { $set: {
      category: updatedService.category,
      provider: updatedService.provider,
      purchase: Number(updatedService.purchase || 0),
      selling: Number(updatedService.selling || 0),
      username: updatedService.username,
      password: updatedService.password,
      created: updatedService.created,
      expiry: updatedService.expiry,
      renewal: updatedService.renewal,
      status: updatedService.status
    }});

    res.json(updatedService);
  } catch (error) {
    console.error('Failed to update service:', error);
    res.status(500).json({ message: 'Error updating service.' });
  }
});

// @route   DELETE /api/services/:name
// @desc    Delete a service
router.delete('/:name', auth, async (req, res) => {
  const serviceName = req.params.name;

  try {
    const conditions = await applyTenantFilter(req.user, 'services', { name: serviceName });
    const existing = await db.models.Service.findOne(conditions).lean();
    if (!existing) {
      return res.status(404).json({ message: "Service not found." });
    }

    await db.models.Service.deleteOne(conditions);
    res.json({ message: `Service ${existing.name} deleted successfully.` });
  } catch (error) {
    console.error('Failed to delete service:', error);
    res.status(500).json({ message: 'Error deleting service.' });
  }
});

module.exports = router;
