const mongoose = require('mongoose');
const db = require('./database/db');
require('dotenv').config();

async function migrateUsers() {
  console.log("Connecting to database...");
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm_db');
  console.log("Connected to MongoDB.");

  try {
    const users = await db.models.Customer.find({});
    let updatedCount = 0;

    for (const user of users) {
      let needsUpdate = false;
      let newParentVendorId = user.parentVendorId;
      let newVendorIdStr = user.vendorId;
      
      // If vendorId is 24-char hex (ObjectId), it means it was wrongly stored as vendorId instead of parentVendorId
      if (user.vendorId && typeof user.vendorId === 'string' && user.vendorId.length === 24 && /^[0-9a-fA-F]{24}$/.test(user.vendorId)) {
        newParentVendorId = user.vendorId;
        newVendorIdStr = null; // We need to look up the actual vendorId from the Vendor model
      }

      // If we don't have newVendorIdStr but we have parentVendorId
      if (!newVendorIdStr && newParentVendorId && mongoose.Types.ObjectId.isValid(newParentVendorId)) {
        const vendor = await db.models.Vendor.findById(newParentVendorId);
        if (vendor && vendor.vendorId) {
          newVendorIdStr = vendor.vendorId;
          needsUpdate = true;
        }
      }
      
      // Also, try matching by vendor name if both IDs are missing or messed up
      if ((!newParentVendorId || !newVendorIdStr) && user.vendor) {
         const vendorByName = await db.models.Vendor.findOne({ name: user.vendor });
         if (vendorByName) {
            if (!newParentVendorId) newParentVendorId = vendorByName._id.toString();
            if (!newVendorIdStr) newVendorIdStr = vendorByName.vendorId;
            needsUpdate = true;
         }
      }

      // Special case: if user.vendorId was properly stored as H2VEN... but parentVendorId is missing
      if (user.vendorId && typeof user.vendorId === 'string' && user.vendorId.startsWith('H2VEN') && !user.parentVendorId) {
         const vendorByVendorId = await db.models.Vendor.findOne({ vendorId: user.vendorId });
         if (vendorByVendorId) {
            newParentVendorId = vendorByVendorId._id.toString();
            needsUpdate = true;
         }
      }

      if (newParentVendorId !== user.parentVendorId || newVendorIdStr !== user.vendorId) {
         needsUpdate = true;
      }

      if (needsUpdate) {
        console.log(`Updating User: ${user.name} | parentVendorId: ${newParentVendorId} | vendorId: ${newVendorIdStr}`);
        await db.models.Customer.updateOne(
          { _id: user._id },
          { $set: { parentVendorId: newParentVendorId, vendorId: newVendorIdStr } }
        );
        updatedCount++;
      }
    }

    console.log(`Migration complete. Updated ${updatedCount} users.`);
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    mongoose.connection.close();
  }
}

migrateUsers();
