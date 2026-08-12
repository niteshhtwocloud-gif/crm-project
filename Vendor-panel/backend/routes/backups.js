const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const auth = require('../middleware/auth');
const { applyTenantFilter, applyTenantInsert } = require('../utils/tenant');

// @route   GET /api/backups
// @desc    Get backup history
router.get('/', auth, async (req, res) => {
  try {
    const conditions = await applyTenantFilter(req.user, 'backups', {});
    const backups = await db.models.Backup.find(conditions).sort({ id: -1 }).lean();
    res.json(backups);
  } catch (error) {
    console.error('Failed to get backups:', error);
    res.status(500).json({ message: 'Error retrieving backups.' });
  }
});

// @route   POST /api/backups
// @desc    Trigger a database backup snapshot
router.post('/', auth, async (req, res) => {
  try {
    const backupsDir = db.getBackupsDir();
    
    const now = new Date();
    const timestamp = now.getTime();
    const dateStr = now.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + ", " + now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // We only backup data relevant to the current user/tenant (or all if super admin)
    const userConditions = await applyTenantFilter(req.user, 'users', {});
    const servicesConditions = await applyTenantFilter(req.user, 'services', {});
    const paymentsConditions = await applyTenantFilter(req.user, 'payments', {});
    const settingsConditions = await applyTenantFilter(req.user, 'companySettings', { id: 1 });

    const users = await db.models.Customer.find(userConditions).lean();
    const services = await db.models.Service.find(servicesConditions).lean();
    const payments = await db.models.Payment.find(paymentsConditions).lean();
    const companySettings = await db.models.CompanySettings.findOne(settingsConditions).lean();

    const activeData = {
      users,
      services,
      payments,
      companySettings: companySettings || {}
    };

    const snapshotFilename = `snapshot-${timestamp}.json`;
    const snapshotPath = path.join(backupsDir, snapshotFilename);
    
    // Save snapshot file
    fs.writeFileSync(snapshotPath, JSON.stringify(activeData, null, 2));

    // Calculate size
    const stats = fs.statSync(snapshotPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    const sizeStr = `${sizeInMB} MB`;

    const newBackup = {
      id: timestamp,
      date: dateStr,
      size: sizeStr,
      status: "Completed",
      filename: snapshotFilename
    };

    const docToInsert = applyTenantInsert(req.user, 'backups', newBackup);
    await db.models.Backup.create(docToInsert);

    // Create system notification
    const notificationId = Date.now();
    const notificationDoc = applyTenantInsert(req.user, 'notifications', {
      id: notificationId,
      type: 'success',
      category: 'System Messages',
      text: 'Database backup completed successfully',
      time: dateStr,
      unread: true
    });
    await db.models.Notification.create(notificationDoc);

    res.status(201).json(newBackup);
  } catch (error) {
    console.error("Backup failed", error);
    res.status(500).json({ message: "Backup creation failed due to server error." });
  }
});

// @route   POST /api/backups/restore
// @desc    Restore database states from an uploaded backup snapshot or file
router.post('/restore', auth, async (req, res) => {
  const { backupId, payload } = req.body;

  try {
    let dataToRestore = null;

    if (payload) {
      dataToRestore = payload;
    } else if (backupId) {
      const conditions = await applyTenantFilter(req.user, 'backups', { id: Number(backupId) });
      const backupEntry = await db.models.Backup.findOne(conditions).lean();
      
      if (!backupEntry) {
        return res.status(404).json({ message: "Backup snapshot entry not found." });
      }

      const snapshotPath = path.join(db.getBackupsDir(), backupEntry.filename);
      if (!fs.existsSync(snapshotPath)) {
        return res.status(404).json({ message: "Snapshot file does not exist on disk." });
      }

      dataToRestore = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    } else {
      return res.status(400).json({ message: "Provide either payload or backupId to restore." });
    }

    // Since this is a multi-tenant DB, a restore from one user should only overwrite their data.
    // If it's a super_admin, it clears all.
    const userConditions = await applyTenantFilter(req.user, 'users', {});
    const servicesConditions = await applyTenantFilter(req.user, 'services', {});
    const paymentsConditions = await applyTenantFilter(req.user, 'payments', {});
    const settingsConditions = await applyTenantFilter(req.user, 'companySettings', { id: 1 });

    if (dataToRestore.users) {
      await db.models.Customer.deleteMany(userConditions);
      if (dataToRestore.users.length > 0) {
        // Enforce tenant scoping on restored documents
        const docs = dataToRestore.users.map(doc => {
          delete doc._id; // prevent duplicate key errors if ids overlap
          return applyTenantInsert(req.user, 'users', doc);
        });
        await db.models.Customer.insertMany(docs);
      }
    }

    if (dataToRestore.services) {
      await db.models.Service.deleteMany(servicesConditions);
      if (dataToRestore.services.length > 0) {
        const docs = dataToRestore.services.map(doc => {
          delete doc._id;
          return applyTenantInsert(req.user, 'services', doc);
        });
        await db.models.Service.insertMany(docs);
      }
    }

    if (dataToRestore.payments) {
      await db.models.Payment.deleteMany(paymentsConditions);
      if (dataToRestore.payments.length > 0) {
        const docs = dataToRestore.payments.map(doc => {
          delete doc._id;
          return applyTenantInsert(req.user, 'payments', doc);
        });
        await db.models.Payment.insertMany(docs);
      }
    }

    if (dataToRestore.companySettings) {
      await db.models.CompanySettings.deleteMany(settingsConditions);
      if (Object.keys(dataToRestore.companySettings).length > 0) {
        const doc = dataToRestore.companySettings;
        delete doc._id;
        const insertedDoc = applyTenantInsert(req.user, 'companySettings', { ...doc, id: 1 });
        await db.models.CompanySettings.create(insertedDoc);
      }
    }

    // Trigger notification
    const now = new Date();
    const timeStr = now.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + ", " + now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const notificationId = Date.now();
    const notificationDoc = applyTenantInsert(req.user, 'notifications', {
      id: notificationId,
      type: 'success',
      category: 'System Messages',
      text: 'Database successfully restored from backup snapshot',
      time: timeStr,
      unread: true
    });
    await db.models.Notification.create(notificationDoc);

    res.json({ message: "Database restore completed successfully." });
  } catch (error) {
    console.error("Restore failed", error);
    res.status(500).json({ message: "Database restore failed due to server error." });
  }
});

module.exports = router;
