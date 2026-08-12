const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const db = require('./database/db');

async function resetDB() {
  console.log("Starting DB reset...");

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing from .env");
    process.exit(1);
  }
  
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  try {
    // db.js exports `models`, not a getModelByTable() helper. The old calls
    // threw "db.getModelByTable is not a function", so this script never ran.
    const VendorModel = db.models.Vendor;
    const UserModel = db.models.Customer;
    const AdminModel = db.models.Admin;
    const PaymentModel = db.models.Payment;
    const SubscriptionModel = db.models.Subscription;
    const ReceiptModel = db.models.Receipt;
    const ServiceModel = db.models.Service;
    const SupportTicketModel = db.models.SupportTicket;
    const ActivityLogModel = db.models.ActivityLog;
    const SystemUserModel = db.models.SystemUser;
    const NotificationModel = db.models.Notification;

    // 1. Wipe all collections
    console.log("Wiping collections...");
    await VendorModel.deleteMany({});
    await UserModel.deleteMany({});
    await AdminModel.deleteMany({});
    await PaymentModel.deleteMany({});
    await SubscriptionModel.deleteMany({});
    await ReceiptModel.deleteMany({});
    await ServiceModel.deleteMany({});
    await SupportTicketModel.deleteMany({});
    await ActivityLogModel.deleteMany({});
    await SystemUserModel.deleteMany({});
    await NotificationModel.deleteMany({});
    
    // 2. Insert Super Admin
    console.log("Inserting Super Admin...");
    const adminPass = bcrypt.hashSync("admin123", 10);
    await AdminModel.create({
      id: "admin-1",
      name: "Super Admin",
      email: "admin@vendorcrm.com",
      password: adminPass,
      created_at: new Date()
    });

    // 3. Insert Alpha Networks & BlueWave Infotech Parent Vendors
    console.log("Inserting Parent Vendors...");
    const alphaId = "vendor-alpha-" + Date.now();
    const bluewaveId = "vendor-bluewave-" + Date.now();
    
    const alphaVendor = await VendorModel.create({
      id: alphaId,
      name: "Alpha Networks",
      email: "niteshgupta919843@gmail.com",
      totalPurchase: 0,
      totalPaid: 0,
      pending: 0,
      status: "success",
      parentVendorId: null,
      role: "vendor",
      created_at: new Date()
    });

    const bluewaveVendor = await VendorModel.create({
      id: bluewaveId,
      name: "BlueWave Infotech",
      email: "hexdragon010@gmail.com",
      totalPurchase: 0,
      totalPaid: 0,
      pending: 0,
      status: "success",
      parentVendorId: null,
      role: "vendor",
      created_at: new Date()
    });

    // 4. Generate passwords and create admin logins for the vendors
    console.log("Creating Vendor Login Credentials...");
    const alphaPassStr = Math.random().toString(36).slice(-8) + "A1!";
    const bluewavePassStr = Math.random().toString(36).slice(-8) + "B2@";

    await AdminModel.create({
      id: "admin-alpha-" + Date.now(),
      name: "Alpha Networks",
      email: "niteshgupta919843@gmail.com",
      password: bcrypt.hashSync(alphaPassStr, 10),
      created_at: new Date()
    });

    await AdminModel.create({
      id: "admin-bluewave-" + Date.now(),
      name: "BlueWave Infotech",
      email: "hexdragon010@gmail.com",
      password: bcrypt.hashSync(bluewavePassStr, 10),
      created_at: new Date()
    });

    console.log("-----------------------------------------");
    console.log("SUCCESS! Database reset complete.");
    console.log("Super Admin Login -> admin@vendorcrm.com / admin123");
    console.log("Alpha Networks Login -> niteshgupta919843@gmail.com / " + alphaPassStr);
    console.log("BlueWave Infotech Login -> hexdragon010@gmail.com / " + bluewavePassStr);
    console.log("-----------------------------------------");

    process.exit(0);
  } catch (err) {
    console.error("Error during DB reset:", err);
    process.exit(1);
  }
}

resetDB();
