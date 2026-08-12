const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DATA_DIR = path.join(__dirname, '..', 'data');

// Import models
const { models } = require('./db');

const getModelByTable = (tableName) => {
  const map = {
    'users': models.Customer,
    'services': models.Service,
    'payments': models.Payment,
    'notifications': models.Notification,
    'backups': models.Backup,
    'vendors': models.Vendor,
    'subscriptions': models.Subscription,
    'supportTickets': models.SupportTicket,
    'activityLogs': models.ActivityLog,
    'systemUsers': models.SystemUser,
    'receipts': models.Receipt,
    'admins': models.Admin,
    'companysettings': models.CompanySettings,
    'companySettings': models.CompanySettings,
    'prefs': models.Prefs,
    'otps': models.OTP
  };
  return map[tableName];
};

async function initializeDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('CRITICAL: MONGODB_URI is not set in environment variables.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB server...');
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('CRITICAL: Failed to connect to MongoDB server. Please ensure MONGODB_URI is correct.', err.message);
    process.exit(1);
  }

  console.log('Setting up database collections and verification...');

  // Demo/sample data seeding is OPT-IN.
  //
  // Previously every empty collection was auto-filled from the JSON files in
  // backend/data (users.json -> "Rahul Sharma", vendors.json -> "Server
  // Basket", subscriptions.json -> "ABC Pvt Ltd", payments.json ->
  // "INV-2025-xxxx"). That is why the dashboard kept showing demo records
  // even though it reads live API data: the database genuinely contained
  // those rows.
  //
  // Set SEED_DEMO_DATA=true in .env only if you want the sample dataset back.
  const SEED_DEMO = String(process.env.SEED_DEMO_DATA || '').toLowerCase() === 'true';
  if (!SEED_DEMO) {
    console.log('SEED_DEMO_DATA is not "true" - skipping sample data seeding.');
  }

  // Helper function to seed collection if empty
  const loadAndSeedCollection = async (tableName, jsonFileName, mapRecord) => {
    if (!SEED_DEMO) return;
    const Model = getModelByTable(tableName);
    const count = await Model.countDocuments({});
    if (count === 0) {
      console.log(`Collection "${tableName}" is empty. Seeding from local JSON...`);
      const filePath = path.join(DATA_DIR, jsonFileName);
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const records = Array.isArray(data) ? data : [data];
          const mapped = records.map(mapRecord);
          await Model.insertMany(mapped);
          console.log(`Seeded ${records.length} records into collection "${tableName}".`);
        } catch (err) {
          console.error(`Failed to seed collection "${tableName}" from JSON file.`, err.message);
        }
      } else {
        console.log(`JSON file ${jsonFileName} not found, skipping seed.`);
      }
    }
  };

  // Seed default admin and vendor accounts if they do not exist
  const adminsModel = getModelByTable('admins');
  const adminCount = await adminsModel.countDocuments({});
  if (adminCount === 0) {
    console.log('Seeding default administrator and vendor accounts into admins...');
    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync("admin123", salt);

    const accountsToSeed = [
      { name: "CRM Administrator", email: "admin@vendorcrm.com", password: defaultPasswordHash },
      { name: "Admin", email: "admin@h2cloud.com", password: defaultPasswordHash },
      { name: "Server Basket Partner", email: "vendor@serverbasket.com", password: defaultPasswordHash },
      { name: "Hostinger Partner", email: "vendor@hostinger.com", password: defaultPasswordHash },
      { name: "Server Basket Billing", email: "billing@serverbasket.com", password: defaultPasswordHash },
      { name: "Hostinger Support", email: "support@hostinger.com", password: defaultPasswordHash },
      { name: "AWS Billing", email: "aws-billing@amazon.com", password: defaultPasswordHash },
      { name: "GoDaddy Domains", email: "domains@godaddy.com", password: defaultPasswordHash },
      { name: "DigitalOcean NOC", email: "noc@digitalocean.com", password: defaultPasswordHash }
    ];

    await adminsModel.insertMany(accountsToSeed);
    console.log(`Seeded default accounts.`);
  }

  // Seed customers (users)
  await loadAndSeedCollection(
    'users',
    'users.json',
    (u) => ({
      id: String(u.id),
      name: u.name,
      mobile: u.mobile || '',
      phone: u.phone || u.mobile || '',
      email: u.email || '',
      vendor: u.vendor || '',
      vendorEmail: u.vendorEmail || '',
      service: u.service || '',
      username: u.username || '',
      password: u.password || '',
      loginDate: u.loginDate || '',
      expiryDate: u.expiryDate || '',
      paymentStatus: u.paymentStatus || '',
      pendingAmount: Number(u.pendingAmount || 0),
      dueDate: u.dueDate || '',
      remarks: u.remarks || '',
      servicesCount: Number(u.servicesCount || 0),
      status: u.status || 'Active'
    })
  );

  // Seed services
  await loadAndSeedCollection(
    'services',
    'services.json',
    (s) => ({
      name: s.name,
      category: s.category || '',
      provider: s.provider || '',
      purchase: Number(s.purchase || 0),
      selling: Number(s.selling || 0),
      username: s.username || '',
      password: s.password || '',
      created: s.created || '',
      expiry: s.expiry || '',
      renewal: s.renewal || '',
      status: s.status || 'Active'
    })
  );

  // Seed payments
  await loadAndSeedCollection(
    'payments',
    'payments.json',
    (p) => ({
      invoice: p.invoice,
      customer: p.customer,
      service: p.service || '',
      amount: Number(p.amount || 0),
      paid: Number(p.paid || 0),
      pending: Number(p.pending || 0),
      paymentDate: p.paymentDate || '',
      dueDate: p.dueDate || '',
      status: p.status || 'Pending',
      mode: p.mode || '',
      vendor: p.vendor || '',
      vendorEmail: p.vendorEmail || ''
    })
  );

  // Seed notifications
  await loadAndSeedCollection(
    'notifications',
    'notifications.json',
    (n) => ({
      id: n.id || Date.now(),
      type: n.type || 'info',
      category: n.category || 'System Messages',
      text: n.text,
      time: n.time || '',
      unread: n.unread !== false
    })
  );

  // Seed backups
  await loadAndSeedCollection(
    'backups',
    'backups.json',
    (b) => ({
      id: b.id || Date.now(),
      date: b.date || '',
      size: b.size || '',
      status: b.status || 'Completed',
      filename: b.filename
    })
  );

  // Seed companySettings
  const companyModel = getModelByTable('companySettings');
  const compCount = await companyModel.countDocuments({});
  if (compCount === 0) {
    const filePath = path.join(DATA_DIR, 'companySettings.json');
    let settingsData = {
      companyName: "Vendor CRM Solutions",
      email: "admin@vendorcrm.com",
      phone: "+91 98765 43210",
      gst: "27ABCDE1234F1Z5",
      logoText: "VC"
    };
    if (fs.existsSync(filePath)) {
      settingsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    await companyModel.create({
      id: 1,
      companyName: settingsData.companyName,
      email: settingsData.email,
      phone: settingsData.phone,
      gst: settingsData.gst,
      logoText: settingsData.logoText
    });
  }

  // Seed prefs
  const prefsModel = getModelByTable('prefs');
  const prefsCount = await prefsModel.countDocuments({});
  if (prefsCount === 0) {
    const filePath = path.join(DATA_DIR, 'prefs.json');
    let prefsData = {
      theme: "Light",
      language: "English",
      timezone: "Asia/Kolkata (IST)"
    };
    if (fs.existsSync(filePath)) {
      prefsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    await prefsModel.create({
      id: 1,
      theme: prefsData.theme,
      language: prefsData.language,
      timezone: prefsData.timezone
    });
  }

  // Seed vendors
  await loadAndSeedCollection(
    'vendors',
    'vendors.json',
    (v) => ({
      id: String(v.id),
      name: v.name,
      email: v.email,
      totalPurchase: Number(v.totalPurchase || 0),
      totalPaid: Number(v.totalPaid || 0),
      pending: Number(v.pending || 0),
      status: v.status || 'success'
    })
  );

  // Seed subscriptions
  await loadAndSeedCollection(
    'subscriptions',
    'subscriptions.json',
    (s) => ({
      id: String(s.id),
      customer: s.customer,
      product: s.product,
      expiry: s.expiry,
      daysLeft: Number(s.daysLeft || 0),
      amount: Number(s.amount || 0),
      status: s.status || 'success'
    })
  );

  // Seed supportTickets
  await loadAndSeedCollection(
    'supportTickets',
    'supportTickets.json',
    (t) => ({
      id: String(t.id),
      customer: t.customer,
      subject: t.subject,
      category: t.category || '',
      priority: t.priority || 'Medium',
      status: t.status || 'Open',
      date: t.date || '',
      message: t.message
    })
  );

  // Seed activityLogs
  await loadAndSeedCollection(
    'activityLogs',
    'activityLogs.json',
    (l) => ({
      id: String(l.id),
      user: l.user,
      action: l.action,
      timestamp: l.timestamp || ''
    })
  );

  // Seed systemUsers
  await loadAndSeedCollection(
    'systemUsers',
    'systemUsers.json',
    (su) => ({
      id: String(su.id),
      name: su.name,
      email: su.email,
      role: su.role || 'Operator',
      status: su.status || 'Active'
    })
  );

  // Seed receipts
  await loadAndSeedCollection(
    'receipts',
    'receipts.json',
    (r) => ({
      id: String(r.id),
      invoiceNo: r.invoiceNo,
      customer: r.customer,
      date: r.date || '',
      amount: Number(r.amount || 0),
      method: r.method || 'UPI'
    })
  );

  // Run multi-vendor mapping and auto-generation of customer credentials
  console.log('Running MongoDB migration to generate unique credentials and map vendorIds...');
  try {
    const VendorModel = getModelByTable('vendors');
    const CustomerModel = getModelByTable('users');
    const PaymentModel = getModelByTable('payments');
    const ServiceModel = getModelByTable('services');
    const SubscriptionModel = getModelByTable('subscriptions');

    const vendorsList = await VendorModel.find({}).lean();
    const customersList = await CustomerModel.find({}).lean();

    const vendorByName = {};
    const vendorByEmail = {};
    vendorsList.forEach(v => {
      if (typeof v.name === 'string') {
        vendorByName[v.name.toLowerCase()] = v;
      }
      if (typeof v.email === 'string') {
        vendorByEmail[v.email.toLowerCase()] = v;
      }
    });

    const getVendorIdForNameOrEmail = (vendorName, vendorEmail) => {
      if (typeof vendorEmail === 'string') {
        const v = vendorByEmail[vendorEmail.toLowerCase()];
        if (v) return v.id || v._id;
      }
      if (typeof vendorName === 'string') {
        const v = vendorByName[vendorName.toLowerCase()];
        if (v) return v.id || v._id;
      }
      return null;
    };

    const usernameMap = new Set();
    customersList.forEach(c => {
      if (typeof c.username === 'string') usernameMap.add(c.username.toLowerCase());
    });

    const salt = bcrypt.genSaltSync(10);
    const credentialLogs = [];

    for (const customer of customersList) {
      const updateFields = {};

      const vId = getVendorIdForNameOrEmail(customer.vendor, customer.vendorEmail);
      if (vId && customer.vendorId !== String(vId)) {
        updateFields.vendorId = String(vId);
      }

      if (!customer.username || !customer.password || (typeof customer.password === 'string' && customer.password.startsWith('•'))) {
        const cName = typeof customer.name === 'string' ? customer.name : 'user';
        const nameParts = cName.trim().split(/\s+/);
        const firstName = nameParts[0].toLowerCase().replace(/[^a-z]/g, '') || 'user';
        let suffix = 1;
        let uniqueUsername = `${firstName}${String(suffix).padStart(2, '0')}`;
        while (usernameMap.has(uniqueUsername)) {
          suffix++;
          uniqueUsername = `${firstName}${String(suffix).padStart(2, '0')}`;
        }
        usernameMap.add(uniqueUsername);

        const char1 = firstName[0] ? firstName[0].toUpperCase() : 'U';
        const char2 = firstName[1] ? firstName[1].toLowerCase() : 's';
        const randDigits = Math.floor(1000 + Math.random() * 9000);
        const plainPassword = `${char1}${char2}@${randDigits}`;
        const hashedPassword = bcrypt.hashSync(plainPassword, salt);

        updateFields.username = uniqueUsername;
        updateFields.password = hashedPassword;

        credentialLogs.push({
          name: customer.name,
          username: uniqueUsername,
          password: plainPassword
        });
      }

      if (Object.keys(updateFields).length > 0) {
        await CustomerModel.updateOne({ _id: customer._id }, { $set: updateFields });
      }
    }

    if (credentialLogs.length > 0) {
      console.log('✅ Generated Credentials for Existing Customers:');
      console.log(JSON.stringify(credentialLogs, null, 2));
    }

    // Map vendorId to payments
    const paymentsList = await PaymentModel.find({}).lean();
    for (const payment of paymentsList) {
      if (!payment.vendorId) {
        const vId = getVendorIdForNameOrEmail(payment.vendor, payment.vendorEmail);
        if (vId) {
          await PaymentModel.updateOne({ _id: payment._id }, { $set: { vendorId: String(vId) } });
        }
      }
    }

    // Map vendorId to services
    const providerMapping = {
      'aws': '3',
      'digitalocean': '5',
      'ovh': '1',
      'hostinger': '2',
      'sectigo': '4',
      'godaddy': '4'
    };
    const servicesList = await ServiceModel.find({}).lean();
    for (const service of servicesList) {
      if (!service.vendorId) {
        const provider = typeof service.provider === 'string' ? service.provider.toLowerCase() : '';
        const vId = providerMapping[provider] || '1';
        await ServiceModel.updateOne({ _id: service._id }, { $set: { vendorId: String(vId) } });
      }
    }

    // Map vendorId to subscriptions
    const subscriptionsList = await SubscriptionModel.find({}).lean();
    for (const sub of subscriptionsList) {
      if (!sub.vendorId) {
        const cust = await CustomerModel.findOne({ name: sub.customer }).lean();
        if (cust && cust.vendorId) {
          await SubscriptionModel.updateOne({ _id: sub._id }, { $set: { vendorId: String(cust.vendorId) } });
        }
      }
    }
  } catch (migErr) {
    console.error('Migration failed during startup:', migErr.message);
  }

  console.log('Database verification and sync successfully completed.');
}

module.exports = initializeDatabase;
