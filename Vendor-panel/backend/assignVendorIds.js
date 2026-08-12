const mongoose = require('mongoose');

async function assignIds() {
  await mongoose.connect('mongodb+srv://danish_42:P7rKxXqT6F@cluster0.zoxn6r3.mongodb.net/crm_db?retryWrites=true&w=majority');
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).sort({ _id: 1 }).toArray();
  let maxId = 0;
  
  for (let c of users) {
    let extra = {};
    if (c.remarks) {
      try { extra = JSON.parse(c.remarks); } catch(e) { extra = { remarks: c.remarks }; }
    }
    if (extra.vendorId && extra.vendorId.startsWith('H2VEN')) {
      const num = parseInt(extra.vendorId.replace('H2VEN', ''), 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    }
  }
  
  console.log('Current maxId:', maxId);
  
  let updated = 0;
  for (let c of users) {
    let extra = {};
    if (c.remarks) {
      try { extra = JSON.parse(c.remarks); } catch(e) { extra = { remarks: c.remarks }; }
    }
    if (!extra.vendorId) {
      maxId++;
      extra.vendorId = 'H2VEN' + String(maxId).padStart(3, '0');
      await db.collection('users').updateOne(
        { _id: c._id },
        { $set: { remarks: JSON.stringify(extra) } }
      );
      updated++;
    }
  }
  
  console.log('Updated users with new vendor IDs:', updated);
  process.exit(0);
}

assignIds().catch(console.error);
