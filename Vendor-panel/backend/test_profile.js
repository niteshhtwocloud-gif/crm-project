const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { models } = require('./database/db');

async function testProfile() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vendorcrm', { useNewUrlParser: true, useUnifiedTopology: true });
  
  const Admin = models.Admin;
  const admin = await Admin.findOne({ email: 'admin@vendorcrm.com' });
  if (!admin) {
    console.log("Admin not found!");
    process.exit(1);
  }

  console.log("Found admin:", admin._id, admin.name, admin.email, admin.avatar);

  // simulate auth.js `/api/auth/me` logic
  const userId = admin.id || admin._id;
  console.log("User ID for lookup:", userId);

  let found = await Admin.findById(userId).lean();
  console.log("Lookup result:", found ? found.name : "Not found");

  process.exit(0);
}

testProfile();
