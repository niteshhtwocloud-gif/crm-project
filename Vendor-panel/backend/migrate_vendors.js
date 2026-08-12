const mongoose = require('mongoose');
async function migrate() {
  await mongoose.connect('mongodb+srv://htwo_cloud:HTwoCloud2026Secure@cluster0.tltzwy7.mongodb.net/vendor_crm?retryWrites=true&w=majority&appName=Cluster0');
  const db = mongoose.connection.db;
  const vendors = await db.collection('vendors').find({
    $or: [
      { vendorId: "" },
      { vendorId: null },
      { vendorId: { $exists: false } }
    ]
  }).toArray();
  console.log('Found ' + vendors.length + ' vendors needing vendorId update.');
  let updated = 0;
  for (const v of vendors) {
    const newVendorId = v._id.toString();
    await db.collection('vendors').updateOne(
      { _id: v._id },
      { $set: { vendorId: newVendorId } }
    );
    updated++;
  }
  console.log('Updated ' + updated + ' vendors.');
  process.exit(0);
}
migrate().catch(console.error);
