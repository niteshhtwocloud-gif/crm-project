require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

async function cleanDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const start = new Date('2026-08-04T06:00:00.000Z');
  const end = new Date('2026-08-04T06:59:59.999Z');
  
  const res = await db.collection('users').deleteMany({ created_at: { $gte: start, $lt: end } });
  console.log('Deleted extra bulk users:', res.deletedCount);
  
  process.exit(0);
}
cleanDB().catch(console.error);
