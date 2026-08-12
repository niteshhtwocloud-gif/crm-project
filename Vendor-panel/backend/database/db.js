const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Define dynamic schema (strict: false) to preserve backwards compatibility exactly
const dynamicSchema = new mongoose.Schema({}, { strict: false, versionKey: false, timestamps: { createdAt: 'created_at', updatedAt: false } });

// Explicit Schema for Vendor
const vendorSchema = new mongoose.Schema({
  parentVendorId: { type: String, default: null },
  parentVendorName: { type: String, default: "" },
  vendorId: { type: String, default: "" },
  name: { type: String, required: true },
  email: { type: String, required: true },
  salesPerson: { type: String, default: "" },
  purchaseType: { type: String, default: "" },
  demoTime: { type: String, default: "" },
  domain: { type: String, default: "" },
  ip: { type: String, default: "" },
  port: { type: String, default: "" },
  serverId: { type: String, default: "" },
  serverPassword: { type: String, default: "" },
  dataPath: { type: String, default: "" },
  productService: { type: String, default: "" },
  username: { type: String, default: "" },
  password: { type: String, default: "" },
  tallyNetId: { type: String, default: "" },
  tallyNetPassword: { type: String, default: "" },
  renewalType: { type: String, default: "" },
  period: { type: String, default: "" },
  creationDate: { type: String, default: "" },
  expiryDate: { type: String, default: "" },
  licenseType: { type: String, default: "" },
  licenseDetails: { type: String, default: "" },
  paymentStatus: { type: String, default: "" },
  billGenerated: { type: String, default: "" },
  billingDate: { type: String, default: "" },
  reminderStatus: { type: String, default: "" },
  userStatus: { type: String, default: "" },
  status: { type: String, default: "success" },
  remarks: { type: String, default: "" },
  totalPurchase: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  role: { type: String, default: "vendor" },
  createdBy: { type: String, default: "" },
  updatedBy: { type: String, default: "" }
}, { strict: false, versionKey: false, timestamps: { createdAt: 'created_at', updatedAt: 'updatedAt' } });

// Explicit Schema for Customer (User)
const userSchema = new mongoose.Schema({
  parentVendorId: { type: String, default: null },
  vendorId: { type: String, default: null },
  vendor: { type: String, default: "" },
  vendorEmail: { type: String, default: "" },
  name: { type: String, required: true },
  username: { type: String, default: "" },
  email: { type: String, default: "" },
  password: { type: String, default: "" },
  mobile: { type: String, default: "" },
  phone: { type: String, default: "" },
  domain: { type: String, default: "" },
  domainName: { type: String, default: "" },
  ipAddress: { type: String, default: "" },
  port: { type: String, default: "" },
  service: { type: String, default: "" },
  productService: { type: String, default: "" },
  loginDate: { type: String, default: "" },
  expiryDate: { type: Date, default: null },
  period: { type: String, default: "" },
  paymentStatus: { type: String, enum: ["Paid", "Pending", "Overdue"], default: "Pending" },
  pendingAmount: { type: Number, default: 0 },
  dueDate: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Inactive", "Expired"], default: "Active" },
  remarks: { type: String, default: "" },
  servicesCount: { type: Number, default: 0 },
  tallyNetId: { type: String, default: "" },
  tallyNetPassword: { type: String, default: "" },
  daysLeft: { type: Number, default: 0 },
  license: { type: String, default: "" }
}, { strict: false, versionKey: false, timestamps: { createdAt: 'created_at', updatedAt: 'updatedAt' } });

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const renewalRequestSchema = new mongoose.Schema({
  serviceId: { type: String, required: true },
  customerId: { type: String, default: "" },
  customerName: { type: String, default: "" },
  username: { type: String, default: "" },
  vendorId: { type: String, default: "" },
  vendorName: { type: String, default: "" },
  serviceName: { type: String, default: "" },
  domain: { type: String, default: "" },
  currentExpiryDate: { type: String, default: "" },
  requestedAt: { type: Date, default: Date.now },
  requestedBy: { type: String, default: "" },
  requestStatus: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: String, default: "" }
}, { strict: false, versionKey: false, timestamps: { createdAt: 'created_at', updatedAt: 'updatedAt' } });

const models = {
  Admin: mongoose.models.Admin || mongoose.model('Admin', dynamicSchema, 'admins'),
  Customer: mongoose.models.Customer || mongoose.model('Customer', userSchema, 'users'),
  Service: mongoose.models.Service || mongoose.model('Service', dynamicSchema, 'services'),
  Payment: mongoose.models.Payment || mongoose.model('Payment', dynamicSchema, 'payments'),
  Notification: mongoose.models.Notification || mongoose.model('Notification', dynamicSchema, 'notifications'),
  Backup: mongoose.models.Backup || mongoose.model('Backup', dynamicSchema, 'backups'),
  CompanySettings: mongoose.models.CompanySettings || mongoose.model('CompanySettings', dynamicSchema, 'companysettings'),
  Prefs: mongoose.models.Prefs || mongoose.model('Prefs', dynamicSchema, 'prefs'),
  Vendor: mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema, 'vendors'),
  Subscription: mongoose.models.Subscription || mongoose.model('Subscription', dynamicSchema, 'subscriptions'),
  SupportTicket: mongoose.models.SupportTicket || mongoose.model('SupportTicket', dynamicSchema, 'supporttickets'),
  ActivityLog: mongoose.models.ActivityLog || mongoose.model('ActivityLog', dynamicSchema, 'activitylogs'),
  SystemUser: mongoose.models.SystemUser || mongoose.model('SystemUser', dynamicSchema, 'systemusers'),
  Receipt: mongoose.models.Receipt || mongoose.model('Receipt', dynamicSchema, 'receipts'),
  OTP: mongoose.models.OTP || mongoose.model('OTP', dynamicSchema, 'otps'),
  RenewalRequest: mongoose.models.RenewalRequest || mongoose.model('RenewalRequest', renewalRequestSchema, 'renewalrequests'),
};

module.exports = {
  models,
  getBackupsDir: () => BACKUPS_DIR,
  getDataDir: () => DATA_DIR,
  escapeRegExp,

  // Auth helper: find admin
  findAdminByEmail: async (email) => {
    const doc = await models.Admin.findOne({ email: new RegExp(`^${escapeRegExp(email)}$`, 'i') }).lean();
    return doc || null;
  },

  // Auth helper: add admin
  addAdmin: async (admin) => {
    const doc = await models.Admin.create({
      name: admin.name,
      email: admin.email,
      password: admin.password
    });
    admin.id = doc._id;
    return admin;
  }
};
