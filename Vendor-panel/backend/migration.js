require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const URI = process.env.MONGODB_URI;

async function runMigration() {
  if (!URI) {
    console.error("MONGODB_URI missing");
    process.exit(1);
  }

  await mongoose.connect(URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;

  const users = await db.collection('users').find({}).toArray();
  console.log(`Found ${users.length} users to migrate.`);
  
  let updatedUsers = 0;
  console.log("==========================================================================");
  console.log("             NEW VENDOR USER CREDENTIALS (SAVE THIS)                      ");
  console.log("==========================================================================");
  console.log("Name\t\t\tUsername\t\t\tPlain Password");
  console.log("--------------------------------------------------------------------------");

  for (let u of users) {
    let updateDoc = {};
    let setFields = {};

    // Generate random 8-character password
    const plainPassword = Math.random().toString(36).slice(-8);
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(plainPassword, salt);
    
    setFields.password = hashedPassword;
    
    // Auto-generate username if not exists
    if (!u.username || typeof u.username !== 'string' || u.username.trim() === '') {
      const uName = typeof u.name === 'string' ? u.name : 'user';
      setFields.username = (typeof u.email === 'string' && u.email.split('@')[0]) || uName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
    }

    // Isolate vendorId if it's in remarks
    if (!u.vendorId) {
      let extra = {};
      if (typeof u.remarks === 'string' && u.remarks.startsWith('{')) {
        try { extra = JSON.parse(u.remarks); } catch(e) {}
      }
      if (extra.vendorId) {
        setFields.vendorId = extra.vendorId;
      } else if (u.vendorEmail) {
        // Find vendor by email to get their vendorId
        const vendor = await db.collection('vendors').findOne({ email: new RegExp(`^${u.vendorEmail}$`, 'i') });
        if (vendor) {
          setFields.vendorId = vendor.id || vendor._id.toString();
        } else {
          // Check admins
          const admin = await db.collection('admins').findOne({ email: new RegExp(`^${u.vendorEmail}$`, 'i') });
          if (admin) {
            setFields.vendorId = null; // Admin owns it
          }
        }
      }
    }

    if (Object.keys(setFields).length > 0) {
      await db.collection('users').updateOne({ _id: u._id }, { $set: setFields });
      updatedUsers++;
      
      const displayUser = setFields.username || u.username;
      const displayName = u.name && u.name.length > 20 ? u.name.substring(0, 17) + '...' : u.name;
      console.log(`${displayName}\t\t${displayUser}\t\t${plainPassword}`);
    }
  }

  console.log("==========================================================================");
  console.log(`Migration Complete: Updated ${updatedUsers} users.`);

  // Fix other collections if needed (payments, services, subscriptions)
  for (const coll of ['payments', 'services', 'subscriptions', 'supporttickets', 'receipts']) {
    try {
      const items = await db.collection(coll).find({ vendorId: { $exists: false } }).toArray();
      let count = 0;
      for (let item of items) {
        let vId = null;
        let extra = {};
        if (typeof item.remarks === 'string' && item.remarks.startsWith('{')) {
          try { extra = JSON.parse(item.remarks); } catch(e) {}
        }
        if (extra.vendorId) {
          vId = extra.vendorId;
        } else if (item.vendorEmail) {
          const v = await db.collection('vendors').findOne({ email: new RegExp(`^${item.vendorEmail}$`, 'i') });
          if (v) vId = v.id || v._id.toString();
        } else if (item.customer) {
          // Get customer's vendorId
          const c = await db.collection('users').findOne({ $or: [{ name: item.customer }, { username: item.customer }] });
          if (c && c.vendorId) vId = c.vendorId;
        }

        if (vId) {
          await db.collection(coll).updateOne({ _id: item._id }, { $set: { vendorId: vId } });
          count++;
        }
      }
      if (count > 0) {
        console.log(`Updated ${count} records in ${coll} with vendorId.`);
      }
    } catch (e) {
      console.log(`Skipping collection ${coll} due to error or non-existence.`);
    }
  }

  process.exit(0);
}

runMigration().catch(console.error);
