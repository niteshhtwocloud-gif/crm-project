const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { applyTenantFilter, applyTenantInsert } = require('../utils/tenant');
const { toISODate, calculateExpiryDate, calculateDaysLeft } = require('../utils/dateUtils');

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// @route   GET /api/users
// @desc    Get all customers
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.query.vendorId) {
      query.$or = [
        { vendorId: req.query.vendorId },
        { parentVendorId: req.query.vendorId }
      ];
    }
    const conditions = await applyTenantFilter(req.user, 'users', query);
    const rawUsers = await db.models.Customer.find(conditions).select('-password').sort({ created_at: -1 }).lean();
    const users = rawUsers.map(u => ({
      ...u,
      id: u.id || (u._id ? u._id.toString() : ''),
      customerName: u.name || u.customerName || '',
      name: u.name || u.customerName || '',
      domain: u.domain || u.domainName || '',
      domainName: u.domainName || u.domain || '',
      productService: u.productService || u.service || '',
      service: u.service || u.productService || '',
      product: u.productService || u.service || '',
      tallyNetId: u.tallyNetId || u.licenseId || '',
      tallyNetPassword: u.tallyNetPassword || u.licensePassword || '',
      licenseId: u.licenseId || u.tallyNetId || '',
      licensePassword: u.licensePassword || u.tallyNetPassword || '',
      license: u.license || u.licenseDetails || '',
      licenseDetails: u.licenseDetails || u.license || '',
      period: u.period || '',
      port: u.port || '',
      daysLeft: calculateDaysLeft(u.expiryDate),
      paymentStatus: u.paymentStatus || 'Pending',
      status: (() => {
        const dLeft = calculateDaysLeft(u.expiryDate);
        if (dLeft <= 0) return 'Expired';
        if (dLeft <= 7) return 'Expiring';
        return u.status || 'Active';
      })(),
      loginDate: u.loginDate || u.creationDate || '',
      creationDate: u.creationDate || u.loginDate || '',
      expiryDate: u.expiryDate ? (typeof u.expiryDate === 'object' && u.expiryDate.toISOString ? u.expiryDate.toISOString().slice(0, 10) : String(u.expiryDate).slice(0, 10)) : ''
    }));
    res.json(users);
  } catch (error) {
    console.error('Failed to get users:', error);
    res.status(500).json({ message: 'Error retrieving customers from database.' });
  }
});

// @route   POST /api/users
// @desc    Add a new customer (or update if duplicate)
router.post('/', auth, async (req, res) => {
  const vendorName = req.user.name || 'CRM Administrator';
  const vendorEmail = req.user.email || 'admin@vendorcrm.com';
  const id = String(Date.now());
  const phone = req.body.phone || req.body.mobile || '';
  const mobile = req.body.mobile || req.body.phone || '';

  // Auto-generate credentials
  let username = req.body.username || '';
  if (!username.trim()) {
    username = (req.body.email && req.body.email.split('@')[0]) || (req.body.name || 'user').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
  }

  const plainPassword = req.body.password || Math.random().toString(36).slice(-8);
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(plainPassword, salt);

  const parentVendorId = req.body.parentVendorId || null;
  const vendorIdStr = req.body.vendorId || null;

  // Normalized Creation Date & Period
  const rawCreation = req.body.creationDate || req.body.loginDate || '';
  const creationDate = toISODate(rawCreation) || new Date().toISOString().slice(0, 10);
  const period = req.body.period || '';

  // ALWAYS calculate Expiry Date automatically from Creation Date + Period
  let calculatedExpiry = calculateExpiryDate(creationDate, period);
  if (!calculatedExpiry && req.body.expiryDate) {
    calculatedExpiry = toISODate(req.body.expiryDate);
  }

  let parsedExpiryDate = null;
  if (calculatedExpiry) {
    const d = new Date(calculatedExpiry);
    if (!isNaN(d.getTime())) parsedExpiryDate = d;
  }
  const daysLeft = calculateDaysLeft(calculatedExpiry || parsedExpiryDate);

  // Check for duplicate customer under current vendor
  try {
    const dupQuery = {
      $or: [
        { username: username },
        ...(req.body.email && req.body.email.trim() !== '' ? [{ email: new RegExp(`^${escapeRegExp(req.body.email.trim())}$`, 'i') }] : [])
      ]
    };
    const dupConditions = await applyTenantFilter(req.user, 'users', dupQuery);
    const existingCust = await db.models.Customer.findOne(dupConditions);

    if (existingCust) {
      return res.status(409).json({ message: 'Customer with this username already exists.' });
    }
  } catch (dupErr) {
    console.error('Duplicate check error:', dupErr);
  }

  const newUser = {
    ...req.body,
    id,
    name: req.body.name || req.body.customerName || req.body.username || 'Customer',
    customerName: req.body.name || req.body.customerName || req.body.username || 'Customer',
    mobile,
    phone,
    email: req.body.email || '',
    vendor: req.body.vendor || req.body.parentVendorName || vendorName,
    parentVendorName: req.body.parentVendorName || req.body.vendor || vendorName,
    vendorEmail: req.body.vendorEmail || vendorEmail,
    parentVendorId,
    vendorId: vendorIdStr,
    service: req.body.service || req.body.productService || req.body.product || '',
    productService: req.body.productService || req.body.product || req.body.service || '',
    username,
    password: hashedPassword,
    loginDate: creationDate,
    creationDate: creationDate,
    expiryDate: parsedExpiryDate,
    paymentStatus: req.body.paymentStatus || 'Pending',
    pendingAmount: Number(req.body.pendingAmount || 0),
    dueDate: req.body.dueDate || '',
    remarks: req.body.remarks || '',
    servicesCount: Number(req.body.servicesCount || 0),
    status: req.body.status || 'Active',
    userStatus: req.body.userStatus || 'Active',
    domain: req.body.domain || req.body.domainName || '',
    domainName: req.body.domainName || req.body.domain || '',
    ip: req.body.ip || req.body.ipAddress || '',
    ipAddress: req.body.ipAddress || req.body.ip || '',
    port: req.body.port || '',
    subVendor: req.body.subVendor || '',
    serverId: req.body.serverId || '',
    serverPassword: req.body.serverPassword || '',
    renewalType: req.body.renewalType || req.body.renewalNew || '',
    period: period,
    daysLeft: daysLeft,
    billGenerated: req.body.billGenerated || 'No',
    billingDate: req.body.billingDate || '',
    licenseType: req.body.licenseType || '',
    license: req.body.license || req.body.licenseDetails || '',
    licenseDetails: req.body.licenseDetails || req.body.license || '',
    tallyNetId: req.body.tallyNetId || req.body.licenseId || '',
    tallyNetPassword: req.body.tallyNetPassword || req.body.licensePassword || '',
    salesPerson: req.body.salesPerson || '',
    reminderStatus: req.body.reminderStatus || 'Pending',
    purchaseType: req.body.purchaseType || '',
    demoTime: req.body.demoTime || '',
    dataPathLocation: req.body.dataPathLocation || req.body.dataPath || ''
  };

  try {
    const docToInsert = applyTenantInsert(req.user, 'users', newUser);
    const insertResult = await db.models.Customer.create(docToInsert);

    // Create system notification
    const notificationId = Date.now();
    const notificationDoc = applyTenantInsert(req.user, 'notifications', {
      id: notificationId,
      type: 'user',
      category: 'System Messages',
      text: `New customer registered - ${newUser.name} (Vendor: ${newUser.parentVendorName || vendorName})`,
      time: new Date().toLocaleString(),
      unread: true
    });
    await db.models.Notification.create(notificationDoc);

    const responseUser = {
      ...newUser,
      _id: insertResult._id,
      id: insertResult._id.toString(),
      password: plainPassword,
      expiryDate: calculatedExpiry || (parsedExpiryDate ? parsedExpiryDate.toISOString().slice(0, 10) : '')
    };
    res.status(201).json(responseUser);
  } catch (error) {
    console.error('Failed to add customer:', error);
    res.status(500).json({ message: 'Error adding customer to database.' });
  }
});

// @route   PUT /api/users/:id
// @desc    Edit a customer's details
router.put('/:id', auth, async (req, res) => {
  const targetId = String(req.params.id);

  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({ message: "Invalid Customer ID format." });
  }

  const phone = req.body.phone || req.body.mobile || '';
  const mobile = req.body.mobile || req.body.phone || '';

  try {
    const conditions = await applyTenantFilter(req.user, 'users', { _id: targetId });
    const existing = await db.models.Customer.findOne(conditions).lean();

    if (!existing) {
      return res.status(404).json({ message: "Customer not found." });
    }

    // Never let client-supplied immutable/identity fields into $set.
    // Mongo rejects an update touching _id, which made the whole PUT fail.
    const { _id, id, created_at, createdAt, __v, ...safeBody } = req.body || {};
    req.body = safeBody;

    const updatedUser = { ...existing, ...safeBody };

    const creationDate = toISODate(updatedUser.creationDate || updatedUser.loginDate);
    const period = updatedUser.period || '';
    let parsedExpiryDate = existing.expiryDate;

    if (creationDate && period) {
      const calcExp = calculateExpiryDate(creationDate, period);
      if (calcExp) parsedExpiryDate = new Date(calcExp);
    } else if (req.body.expiryDate !== undefined) {
      if (!req.body.expiryDate) {
        parsedExpiryDate = null;
      } else {
        const d = new Date(req.body.expiryDate);
        if (!isNaN(d.getTime())) parsedExpiryDate = d;
      }
    }

    const newSet = {
      ...safeBody,
      name: updatedUser.name,
      mobile: updatedUser.mobile,
      phone: updatedUser.phone,
      email: updatedUser.email,
      service: updatedUser.service,
      username: updatedUser.username,
      password: (req.body.password && req.body.password.trim() !== '') ? bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10)) : existing.password,
      loginDate: updatedUser.loginDate,
      expiryDate: parsedExpiryDate,
      paymentStatus: updatedUser.paymentStatus,
      pendingAmount: Number(updatedUser.pendingAmount || 0),
      dueDate: updatedUser.dueDate,
      remarks: updatedUser.remarks,
      servicesCount: Number(updatedUser.servicesCount || 0),
      status: updatedUser.status,

      // New Fields
      domainName: req.body.domainName !== undefined ? req.body.domainName : (req.body.domain !== undefined ? req.body.domain : existing.domainName || ''),
      port: req.body.port !== undefined ? String(req.body.port) : (existing.port || ''),
      productService: req.body.productService !== undefined ? req.body.productService : existing.productService || '',
      tallyNetId: req.body.tallyNetId !== undefined ? req.body.tallyNetId : (req.body.licenseId !== undefined ? req.body.licenseId : existing.tallyNetId || ''),
      tallyNetPassword: req.body.tallyNetPassword !== undefined ? req.body.tallyNetPassword : (req.body.licensePassword !== undefined ? req.body.licensePassword : existing.tallyNetPassword || ''),
      period: req.body.period !== undefined ? req.body.period : existing.period || '',
      daysLeft: calculateDaysLeft(parsedExpiryDate),
      license: req.body.license !== undefined ? req.body.license : (req.body.licenseDetails !== undefined ? req.body.licenseDetails : existing.license || ''),
      parentVendorId: req.body.parentVendorId !== undefined ? req.body.parentVendorId : existing.parentVendorId,
      vendorId: req.body.vendorId !== undefined ? req.body.vendorId : existing.vendorId
    };

    await db.models.Customer.updateOne(conditions, { $set: newSet });

    // Create system notification
    const notificationId = Date.now();
    const notificationDoc = applyTenantInsert(req.user, 'notifications', {
      id: notificationId,
      type: 'info',
      category: 'System Messages',
      text: `Customer profile updated for ${updatedUser.name} (Vendor: ${updatedUser.vendor || 'CRM Administrator'})`,
      time: new Date().toLocaleString(),
      unread: true
    });
    await db.models.Notification.create(notificationDoc);

    res.json(updatedUser);
  } catch (error) {
    console.error('Failed to update customer:', error);
    res.status(500).json({ message: 'Error updating customer in database.' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Remove a customer from CRM
router.delete('/:id', auth, async (req, res) => {
  const targetId = String(req.params.id);

  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({ message: "Invalid Customer ID format." });
  }

  try {
    const conditions = await applyTenantFilter(req.user, 'users', { _id: targetId });
    const existing = await db.models.Customer.findOne(conditions).lean();
    if (!existing) {
      return res.status(404).json({ message: "Customer not found." });
    }

    await db.models.Customer.deleteOne(conditions);
    res.json({ message: `Customer ${existing.name} removed successfully.` });
  } catch (error) {
    console.error('Failed to delete customer:', error);
    res.status(500).json({ message: 'Error deleting customer from database.' });
  }
});

module.exports = router;
