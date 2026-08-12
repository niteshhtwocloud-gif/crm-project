const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const { applyTenantFilter, applyTenantInsert, getTenantFilter } = require('../utils/tenant');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function generateTempPassword() {
  const prefixes = ['Temp', 'Vendor', 'PV', 'Admin', 'Secure'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}@${num}`;
}

// @route   GET /api/vendors
// @desc    Get all vendors and dynamically aggregate their total payments from payments table
router.get('/', auth, async (req, res) => {
  try {
    const matchCondition = await applyTenantFilter(req.user, 'vendors', {});
    const paymentsFilter = await applyTenantFilter(req.user, 'payments', {});

    const rows = await db.models.Vendor.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: 'payments',
          let: { vName: { $toLower: "$name" }, vEmail: { $toLower: "$email" } },
          pipeline: [
            { $match: paymentsFilter },
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: [{ $toLower: { $ifNull: ["$vendor", ""] } }, "$$vName"] },
                    { $eq: [{ $toLower: { $ifNull: ["$vendorEmail", ""] } }, "$$vEmail"] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                dynamicPurchase: { $sum: { $toDouble: { $ifNull: ["$amount", 0] } } },
                dynamicPaid: { $sum: { $toDouble: { $ifNull: ["$paid", 0] } } }
              }
            }
          ],
          as: "paymentStats"
        }
      },
      {
        $addFields: {
          paymentStats: { $arrayElemAt: ["$paymentStats", 0] }
        }
      },
      {
        $addFields: {
          dynamicPurchase: { $ifNull: ["$paymentStats.dynamicPurchase", 0] },
          dynamicPaid: { $ifNull: ["$paymentStats.dynamicPaid", 0] }
        }
      },
      { $project: { paymentStats: 0, password: 0 } },
      { $sort: { name: 1 } }
    ]);

    const aggregatedVendors = rows.map(vendor => {
      const totalPurchase = Number(vendor.dynamicPurchase) || Number(vendor.totalPurchase) || 0;
      const totalPaid = Number(vendor.dynamicPaid) || Number(vendor.totalPaid) || 0;
      const pending = totalPurchase - totalPaid;
      const status = pending > 0 ? 'warning' : 'success';

      return {
        ...vendor,
        totalPurchase,
        totalPaid,
        pending,
        status
      };
    });

    res.json(aggregatedVendors);
  } catch (error) {
    console.error('Failed to get vendors:', error);
    res.status(500).json({ message: 'Error retrieving vendors.' });
  }
});

// @route   POST /api/vendors
// @desc    Create a new vendor and auto-provision their login credentials if needed
router.post('/', auth, async (req, res) => {
  if (req.user && req.user.role === 'sub_vendor') {
    return res.status(403).json({ message: "Sub vendors are not allowed to create vendors." });
  }

  const b = req.body;
  const newVendor = {
    id: String(Date.now()),

    // Basic Details
    parentVendorId: b.parentVendorId || null,
    parentVendorName: b.parentVendorName || "",
    vendorId: b.vendorId || "",
    name: b.name || b.vendorName || "",
    email: b.email || "",
    salesPerson: b.salesPerson || "",
    purchaseType: b.purchaseType || "",
    demoTime: b.demoTime || "",

    // Server Details
    domain: b.domain || "",
    ip: b.ip || b.ipAddress || "",
    port: b.port || "",
    serverId: b.serverId || "",
    serverPassword: b.serverPassword || "",
    dataPath: b.dataPath || b.dataPathLocation || "",

    // Product & Subscription
    productService: b.productService || "",
    username: b.username || "",
    password: b.password || "",
    tallyNetId: b.tallyNetId || "",
    tallyNetPassword: b.tallyNetPassword || "",
    renewalType: b.renewalType || "",
    period: b.period || "",
    creationDate: b.creationDate || "",
    expiryDate: b.expiryDate || "",

    // License
    licenseType: b.licenseType || "",
    licenseDetails: b.licenseDetails || "",

    // Billing
    paymentStatus: b.paymentStatus || "",
    billGenerated: b.billGenerated || "",
    billingDate: b.billingDate || "",
    reminderStatus: b.reminderStatus || "",

    // Status
    userStatus: b.userStatus || "",

    // Other
    remarks: b.remarks || "",
    mobile: b.mobile || "",
    phone: b.phone || "",

    // Financial calculations
    totalPurchase: Number(b.totalPurchase || 0),
    totalPaid: Number(b.totalPaid || 0),
    pending: Number(b.totalPurchase || 0) - Number(b.totalPaid || 0),
    status: b.status || ((Number(b.totalPurchase || 0) - Number(b.totalPaid || 0)) > 0 ? "warning" : "success"),

    role: b.role || "vendor",
    createdBy: req.user.name || "Admin"
  };

  console.log("=== VENDOR POST REQUEST START ===");
  console.log("Req Body:", JSON.stringify(req.body, null, 2));

  if (!newVendor.name || !newVendor.email) {
    console.log("Validation failed: name or email missing");
    return res.status(400).json({ message: "Vendor name and email are required." });
  }

  try {
    const existing = await db.models.Vendor.findOne({ email: new RegExp(`^${escapeRegExp(newVendor.email)}$`, 'i') }).lean();
    if (existing) {
      console.log("Validation failed: Vendor with email already exists", newVendor.email);
      return res.status(400).json({ message: "A vendor with this email already exists." });
    }


    const docToInsert = applyTenantInsert(req.user, 'vendors', newVendor);
    const createdVendor = await db.models.Vendor.create(docToInsert);
    newVendor._id = createdVendor._id;

    if (!newVendor.vendorId || newVendor.vendorId.trim() === '') {
      newVendor.vendorId = createdVendor._id.toString();
      await db.models.Vendor.updateOne(
        { _id: createdVendor._id },
        { $set: { vendorId: newVendor.vendorId } }
      );
    }

    // Auto-provision login account in admins table if not present
    const existingAdmin = await db.findAdminByEmail(newVendor.email);
    if (!existingAdmin) {
      const plainPassword = newVendor.password || generateTempPassword();
      const salt = bcrypt.genSaltSync(10);
      await db.addAdmin({
        name: newVendor.name,
        email: newVendor.email,
        password: bcrypt.hashSync(plainPassword, salt)
      });
      newVendor.password = plainPassword;
      await db.models.Vendor.updateOne({ _id: createdVendor._id }, { $set: { password: plainPassword } });

      // Update .env for development
      try {
        const envPath = path.join(__dirname, '../../.env');
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }

        let maxIndex = 0;
        const regex = /PARENT_VENDOR_(\d+)_EMAIL=/g;
        let match;
        while ((match = regex.exec(envContent)) !== null) {
          const index = parseInt(match[1], 10);
          if (index > maxIndex) maxIndex = index;
        }

        const newIndex = maxIndex + 1;
        const appendContent = `\nPARENT_VENDOR_${newIndex}_EMAIL=${newVendor.email}\nPARENT_VENDOR_${newIndex}_PASSWORD=${plainPassword}\n`;
        fs.appendFileSync(envPath, appendContent, 'utf8');
      } catch (err) {
        console.error("Failed to update .env", err);
      }
    }

    // Create system notification
    const notificationId = Date.now();
    const notificationDoc = applyTenantInsert(req.user, 'notifications', {
      id: notificationId,
      type: 'info',
      category: 'System Messages',
      text: `New vendor "${newVendor.name}" onboarded`,
      time: new Date().toLocaleString(),
      unread: true
    });
    await db.models.Notification.create(notificationDoc);

    console.log("=== VENDOR POST REQUEST SUCCESS ===", newVendor._id);
    res.status(201).json(newVendor);
  } catch (error) {
    console.error('=== VENDOR POST REQUEST FAILED ===', error.stack || error);
    res.status(500).json({ message: 'Error onboarding vendor.' });
  }
});

// @route   PUT /api/vendors/:id
// @desc    Update vendor info
router.put('/:id', auth, async (req, res) => {
  const targetId = String(req.params.id);
  const b = req.body;

  try {
    // Determine if targetId is an ObjectId or custom id string
    let queryCond = {};
    if (targetId.length === 24) {
      queryCond = { $or: [{ _id: targetId }, { id: targetId }] };
    } else {
      queryCond = { id: targetId };
    }

    const conditions = await applyTenantFilter(req.user, 'vendors', queryCond);
    const existing = await db.models.Vendor.findOne(conditions).lean();
    if (!existing) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    const totalPurchase = b.totalPurchase !== undefined ? Number(b.totalPurchase) : Number(existing.totalPurchase || 0);
    const totalPaid = b.totalPaid !== undefined ? Number(b.totalPaid) : Number(existing.totalPaid || 0);
    const pending = totalPurchase - totalPaid;
    const status = b.status !== undefined ? b.status : (pending > 0 ? 'warning' : 'success');

    const updatedVendor = {
      // Basic Details
      parentVendorId: b.parentVendorId !== undefined ? b.parentVendorId : existing.parentVendorId,
      parentVendorName: b.parentVendorName !== undefined ? b.parentVendorName : existing.parentVendorName,
      vendorId: (b.vendorId && b.vendorId.trim() !== '') ? b.vendorId : (existing.vendorId && existing.vendorId.trim() !== '' ? existing.vendorId : existing._id.toString()),
      name: b.name || b.vendorName || existing.name,
      email: b.email !== undefined ? b.email : existing.email,
      salesPerson: b.salesPerson !== undefined ? b.salesPerson : existing.salesPerson,
      purchaseType: b.purchaseType !== undefined ? b.purchaseType : existing.purchaseType,
      demoTime: b.demoTime !== undefined ? b.demoTime : existing.demoTime,

      // Server Details
      domain: b.domain !== undefined ? b.domain : existing.domain,
      ip: b.ip || b.ipAddress || existing.ip,
      port: b.port !== undefined ? b.port : existing.port,
      serverId: b.serverId !== undefined ? b.serverId : existing.serverId,
      serverPassword: b.serverPassword !== undefined ? b.serverPassword : existing.serverPassword,
      dataPath: b.dataPath || b.dataPathLocation || existing.dataPath,

      // Product & Subscription
      productService: b.productService !== undefined ? b.productService : existing.productService,
      username: b.username !== undefined ? b.username : existing.username,
      password: (b.password && b.password.trim() !== '') ? b.password : existing.password,
      tallyNetId: b.tallyNetId !== undefined ? b.tallyNetId : existing.tallyNetId,
      tallyNetPassword: b.tallyNetPassword !== undefined ? b.tallyNetPassword : existing.tallyNetPassword,
      renewalType: b.renewalType !== undefined ? b.renewalType : existing.renewalType,
      period: b.period !== undefined ? b.period : existing.period,
      creationDate: b.creationDate !== undefined ? b.creationDate : existing.creationDate,
      expiryDate: b.expiryDate !== undefined ? b.expiryDate : existing.expiryDate,

      // License
      licenseType: b.licenseType !== undefined ? b.licenseType : existing.licenseType,
      licenseDetails: b.licenseDetails !== undefined ? b.licenseDetails : existing.licenseDetails,

      // Billing
      paymentStatus: b.paymentStatus !== undefined ? b.paymentStatus : existing.paymentStatus,
      billGenerated: b.billGenerated !== undefined ? b.billGenerated : existing.billGenerated,
      billingDate: b.billingDate !== undefined ? b.billingDate : existing.billingDate,
      reminderStatus: b.reminderStatus !== undefined ? b.reminderStatus : existing.reminderStatus,

      // Status
      userStatus: b.userStatus !== undefined ? b.userStatus : existing.userStatus,
      status: status,

      // Other
      remarks: b.remarks !== undefined ? b.remarks : existing.remarks,
      mobile: b.mobile !== undefined ? b.mobile : existing.mobile,
      phone: b.phone !== undefined ? b.phone : existing.phone,

      totalPurchase,
      totalPaid,
      pending,
      role: b.role !== undefined ? b.role : (existing.role || 'vendor'),
      updatedBy: req.user.name || "Admin"
    };

    await db.models.Vendor.updateOne({ _id: existing._id }, { $set: updatedVendor });

    res.json({ ...existing, ...updatedVendor });
  } catch (error) {
    console.error('Failed to update vendor:', error);
    res.status(500).json({ message: 'Error updating vendor.' });
  }
});

// @route   DELETE /api/vendors/:id
// @desc    Delete vendor
router.delete('/:id', auth, async (req, res) => {
  if (req.user && req.user.role === 'sub_vendor') {
    return res.status(403).json({ message: "Sub vendors are not allowed to delete vendors." });
  }

  const targetId = String(req.params.id);

  try {
    let queryCond = {};
    if (targetId.length === 24) {
      queryCond = { $or: [{ _id: targetId }, { id: targetId }] };
    } else {
      queryCond = { id: targetId };
    }
    const conditions = await applyTenantFilter(req.user, 'vendors', queryCond);
    const existing = await db.models.Vendor.findOne(conditions).lean();
    if (!existing) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    await db.models.Vendor.deleteOne({ _id: existing._id });

    try {
      const envPath = path.join(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        const emailToFind = existing.email;
        const blockRegex = new RegExp(`PARENT_VENDOR_(\\d+)_EMAIL=${escapeRegExp(emailToFind)}\\r?\\nPARENT_VENDOR_\\1_PASSWORD=.*\\r?\\n?`, 'gi');
        envContent = envContent.replace(blockRegex, '');
        fs.writeFileSync(envPath, envContent, 'utf8');
      }
    } catch (err) {
      console.error("Failed to scrub .env", err);
    }

    res.json({ message: `Vendor "${existing.name}" removed successfully.` });
  } catch (error) {
    console.error('Failed to delete vendor:', error);
    res.status(500).json({ message: 'Error deleting vendor.' });
  }
});

module.exports = router;
