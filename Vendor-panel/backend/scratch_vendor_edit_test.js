require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const db = require('./database/db');
const express = require('express');
const cors = require('cors');

async function testVendorEditConsistency() {
  console.log("==========================================================");
  console.log("TESTING ADD VENDOR = EDIT VENDOR CONSISTENCY & INTEGRITY");
  console.log("==========================================================");

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/vendors', require('./routes/vendors'));
  app.use('/api/users', require('./routes/users'));

  const PORT = 5098;
  const server = app.listen(PORT);
  const API_BASE = `http://127.0.0.1:${PORT}/api`;

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    console.log("✅ MongoDB Connected");

    // 1. Setup Admin Token
    const adminEmail = `admin_test_${Date.now()}@example.com`;
    const salt = bcrypt.genSaltSync(10);
    await db.addAdmin({
      name: "Super Admin Test",
      email: adminEmail,
      password: bcrypt.hashSync("AdminPass123!", salt)
    });

    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: "AdminPass123!" })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    // 2. Add Vendor with exact Add Vendor fields
    console.log("\n--- 1. Testing Add Vendor with all fields ---");
    const initialVendorEmail = `test_edit_vendor_${Date.now()}@example.com`;
    const addRes = await fetch(`${API_BASE}/vendors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        vendorId: "H2VEN999",
        name: "Original Vendor Name",
        email: initialVendorEmail,
        password: "InitialPassword123!",
        totalPurchase: 50000,
        totalPaid: 30000
      })
    });
    const createdVendor = await addRes.json();
    const vendorId = createdVendor._id || createdVendor.id;
    console.log("Created Vendor ID:", vendorId);

    // Verify MongoDB state
    const dbVendorInitial = await db.models.Vendor.findById(vendorId).lean();
    console.log("Initial DB Vendor:", {
      vendorId: dbVendorInitial.vendorId,
      name: dbVendorInitial.name,
      email: dbVendorInitial.email,
      totalPurchase: dbVendorInitial.totalPurchase,
      totalPaid: dbVendorInitial.totalPaid,
      pending: dbVendorInitial.pending,
      status: dbVendorInitial.status
    });

    // 3. Create associated customer under this vendor
    console.log("\n--- 2. Creating associated customer under vendor ---");
    const custUsername = `cust_under_vendor_${Date.now()}`;
    const addCustRes = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        name: "Customer Under Vendor",
        username: custUsername,
        parentVendorId: String(vendorId),
        vendorId: "H2VEN999",
        creationDate: "16-May-2026",
        period: "Yearly"
      })
    });
    const createdCust = await addCustRes.json();
    console.log("Associated Customer created. ID:", createdCust._id || createdCust.id);

    // 4. Edit Vendor (PUT /api/vendors/:id) with SAME fields
    console.log("\n--- 3. Testing Edit Vendor (Updating existing document) ---");
    const updatedEmail = `updated_vendor_${Date.now()}@example.com`;
    const editRes = await fetch(`${API_BASE}/vendors/${vendorId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        vendorId: "H2VEN999", // Unchanged Vendor ID
        name: "Updated Vendor Name",
        email: updatedEmail,
        totalPurchase: 70000,
        totalPaid: 70000
      })
    });
    const editData = await editRes.json();
    console.log("PUT /api/vendors/:id response status:", editRes.status);

    // Verify updated document in MongoDB
    const dbVendorUpdated = await db.models.Vendor.findById(vendorId).lean();
    console.log("Updated DB Vendor:", {
      _id: dbVendorUpdated._id,
      vendorId: dbVendorUpdated.vendorId,
      name: dbVendorUpdated.name,
      email: dbVendorUpdated.email,
      totalPurchase: dbVendorUpdated.totalPurchase,
      totalPaid: dbVendorUpdated.totalPaid,
      pending: dbVendorUpdated.pending,
      status: dbVendorUpdated.status
    });

    const isSameId = String(dbVendorUpdated._id) === String(vendorId);
    const isVendorIdPreserved = dbVendorUpdated.vendorId === "H2VEN999";
    const isNameUpdated = dbVendorUpdated.name === "Updated Vendor Name";
    const isEmailUpdated = dbVendorUpdated.email === updatedEmail;
    const isFinancialsUpdated = dbVendorUpdated.totalPurchase === 70000 && dbVendorUpdated.totalPaid === 70000 && dbVendorUpdated.pending === 0 && dbVendorUpdated.status === "success";

    console.log(`Same Document ID check: ${isSameId ? "PASS" : "FAIL"}`);
    console.log(`Vendor ID Preserved check: ${isVendorIdPreserved ? "PASS" : "FAIL"}`);
    console.log(`Name Updated check: ${isNameUpdated ? "PASS" : "FAIL"}`);
    console.log(`Email Updated check: ${isEmailUpdated ? "PASS" : "FAIL"}`);
    console.log(`Financials & Status Updated check: ${isFinancialsUpdated ? "PASS" : "FAIL"}`);

    // 5. Verify customer relationship is 100% untouched
    console.log("\n--- 4. Verifying customer relationship integrity ---");
    const custAfterEdit = await db.models.Customer.findOne({ username: custUsername }).lean();
    const isCustIntact = custAfterEdit && String(custAfterEdit.parentVendorId) === String(vendorId);
    console.log(`Customer relationship intact check: ${isCustIntact ? "PASS" : "FAIL"}`);

    // 6. Cleanup
    console.log("\n--- 5. Cleaning up test records ---");
    await db.models.Customer.deleteMany({ username: custUsername });
    await db.models.Vendor.deleteMany({ _id: vendorId });
    await db.models.Admin.deleteMany({ email: { $in: [adminEmail, initialVendorEmail, updatedEmail] } });
    console.log("Cleaned up temporary test data.");

    if (isSameId && isVendorIdPreserved && isNameUpdated && isEmailUpdated && isFinancialsUpdated && isCustIntact) {
      console.log("\n==========================================================");
      console.log("ALL VENDOR EDIT TESTS PASSED! ✅");
      console.log("==========================================================");
    } else {
      throw new Error("Vendor edit test validation failed!");
    }

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    server.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

testVendorEditConsistency();
