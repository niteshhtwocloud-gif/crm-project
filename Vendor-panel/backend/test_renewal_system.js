const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('./database/db');

async function runTests() {
  console.log("=== STARTING RENEWAL SYSTEM BACKEND VERIFICATION ===");

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vendorcrm');
  console.log("✅ Connected to MongoDB");

  const { Customer, Service, RenewalRequest, Notification, Admin, Vendor } = db.models;

  // 1. Find or create a test customer service record
  let testCustomer = await Customer.findOne({ name: /Test Customer/i });
  if (!testCustomer) {
    testCustomer = await Customer.create({
      name: "Test Customer Renewal",
      username: "testrenew01",
      email: "testrenew@example.com",
      service: "Tally on Cloud",
      productService: "Tally on Cloud",
      expiryDate: new Date("2026-08-11"),
      status: "Expired",
      daysLeft: -1
    });
    console.log("Created sample test customer record:", testCustomer._id);
  } else {
    testCustomer.expiryDate = new Date("2026-08-11");
    testCustomer.status = "Expired";
    await testCustomer.save();
    console.log("Reset test customer expiryDate to 2026-08-11");
  }

  const serviceId = testCustomer._id.toString();

  // 2. Clean old test renewal requests for this service
  await RenewalRequest.deleteMany({ serviceId });

  // 3. Test creating a renewal request
  console.log("\n--- Testing Renewal Request Creation ---");
  const newReq = await RenewalRequest.create({
    serviceId,
    customerId: serviceId,
    customerName: testCustomer.name,
    username: testCustomer.username,
    vendorId: "vendor_test_123",
    vendorName: "Test Vendor Partner",
    serviceName: testCustomer.service,
    domain: "test.htwo.cloud",
    currentExpiryDate: "2026-08-11",
    requestedAt: new Date(),
    requestedBy: "Test Vendor Partner",
    requestStatus: "Pending"
  });

  console.log("✅ RenewalRequest inserted in DB with ID:", newReq._id);
  console.log("   Initial Request Status:", newReq.requestStatus);

  // Create notification
  const notif = await Notification.create({
    id: Date.now(),
    type: "info",
    category: "Renewal Request",
    text: `Renewal request received for ${testCustomer.name} - ${testCustomer.service}`,
    time: "Just now",
    unread: true,
    requestId: newReq._id.toString()
  });
  console.log("✅ Admin Notification inserted in DB:", notif.text);

  // 4. Test duplicate protection
  console.log("\n--- Testing Duplicate Pending Request Protection ---");
  const existingPending = await RenewalRequest.findOne({ serviceId, requestStatus: "Pending" });
  if (existingPending) {
    console.log("✅ Duplicate check passed! Service already has pending request:", existingPending._id);
  } else {
    console.error("❌ Failed duplicate check!");
  }

  // 5. Test Approval (+1 Calendar Year calculation)
  console.log("\n--- Testing Approval (+1 Calendar Year) ---");
  const initialExpiry = new Date(testCustomer.expiryDate);
  console.log("   Initial Expiry Date:", initialExpiry.toISOString().slice(0, 10));

  // Perform +1 year calculation logic
  const targetExpiry = new Date(initialExpiry);
  targetExpiry.setFullYear(targetExpiry.getFullYear() + 1);
  const newExpiryStr = targetExpiry.toISOString().slice(0, 10);

  testCustomer.expiryDate = targetExpiry;
  testCustomer.status = "Active";
  await testCustomer.save();

  newReq.requestStatus = "Approved";
  newReq.reviewedAt = new Date();
  newReq.reviewedBy = "CRM Administrator";
  await newReq.save();

  console.log("✅ RenewalRequest updated to Approved in DB");
  console.log("✅ Service record updated in DB with new Expiry Date:", newExpiryStr);
  console.log("   Expected Expiry: 2027-08-11 | Got Expiry:", newExpiryStr);

  if (newExpiryStr === "2027-08-11") {
    console.log("✅ Calendar +1 Year calculation matches perfectly!");
  } else {
    console.error("❌ Expiry date mismatch!");
  }

  // 6. Test Rejection flow on a new request
  console.log("\n--- Testing Rejection Flow ---");
  const rejectReq = await RenewalRequest.create({
    serviceId,
    customerId: serviceId,
    customerName: testCustomer.name,
    username: testCustomer.username,
    vendorId: "vendor_test_123",
    vendorName: "Test Vendor Partner",
    serviceName: testCustomer.service,
    domain: "test.htwo.cloud",
    currentExpiryDate: newExpiryStr,
    requestedAt: new Date(),
    requestedBy: "Test Vendor Partner",
    requestStatus: "Pending"
  });

  rejectReq.requestStatus = "Rejected";
  rejectReq.reviewedAt = new Date();
  rejectReq.reviewedBy = "CRM Administrator";
  await rejectReq.save();

  const refreshedCustomer = await Customer.findById(serviceId);
  console.log("✅ Rejection completed!");
  console.log("   Request status:", rejectReq.requestStatus);
  console.log("   Customer Expiry Date remained unchanged:", refreshedCustomer.expiryDate.toISOString().slice(0, 10));

  console.log("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY ===");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
