/**
 * purge-demo-data.js
 *
 * Deletes ONLY the sample records that initDb.js seeded from the JSON files in
 * backend/data. Your own records are matched against those files and left
 * alone, so this is safe to run on a database that already has real data.
 *
 * Usage:
 *   cd Vendor-panel/backend
 *   node purge-demo-data.js --dry-run     # show what WOULD be deleted
 *   node purge-demo-data.js               # actually delete
 *
 * Login accounts (admins collection) are never touched, so you can still
 * sign in afterwards.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fs = require('fs');
const mongoose = require('mongoose');
const { models } = require('./database/db');

const DATA_DIR = path.join(__dirname, 'data');
const DRY_RUN = process.argv.includes('--dry-run');

const readSeed = (file) => {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
};

// Each target says: which model, which seed file, and how to build a Mongo
// filter that matches ONLY the seeded rows.
const TARGETS = [
  {
    label: 'customers (users)',
    model: models.Customer,
    seed: 'users.json',
    filter: (rows) => ({
      $or: rows.map((r) => ({ name: r.name, email: r.email || '' }))
    })
  },
  {
    label: 'vendors',
    model: models.Vendor,
    seed: 'vendors.json',
    filter: (rows) => ({ $or: rows.map((r) => ({ email: r.email })) })
  },
  {
    label: 'invoices (payments)',
    model: models.Payment,
    seed: 'payments.json',
    filter: (rows) => ({ invoice: { $in: rows.map((r) => r.invoice) } })
  },
  {
    label: 'subscriptions',
    model: models.Subscription,
    seed: 'subscriptions.json',
    filter: (rows) => ({
      $or: rows.map((r) => ({ customer: r.customer, product: r.product }))
    })
  },
  {
    label: 'receipts',
    model: models.Receipt,
    seed: 'receipts.json',
    filter: (rows) => ({ invoiceNo: { $in: rows.map((r) => r.invoiceNo) } })
  },
  {
    label: 'services',
    model: models.Service,
    seed: 'services.json',
    filter: (rows) => ({ name: { $in: rows.map((r) => r.name) } })
  },
  {
    label: 'support tickets',
    model: models.SupportTicket,
    seed: 'supportTickets.json',
    filter: (rows) => ({ subject: { $in: rows.map((r) => r.subject) } })
  },
  {
    label: 'system users',
    model: models.SystemUser,
    seed: 'systemUsers.json',
    filter: (rows) => ({ email: { $in: rows.map((r) => r.email) } })
  },
  {
    label: 'activity logs',
    model: models.ActivityLog,
    seed: 'activityLogs.json',
    filter: (rows) => ({ action: { $in: rows.map((r) => r.action) } })
  },
  {
    label: 'notifications',
    model: models.Notification,
    seed: 'notifications.json',
    filter: (rows) => ({ text: { $in: rows.map((r) => r.text) } })
  },
  {
    label: 'backups',
    model: models.Backup,
    seed: 'backups.json',
    filter: (rows) => ({ filename: { $in: rows.map((r) => r.filename) } })
  }
];

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI missing from .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected.${DRY_RUN ? '  [DRY RUN - nothing will be deleted]' : ''}\n`);

  let grandTotal = 0;

  for (const t of TARGETS) {
    const rows = readSeed(t.seed);
    if (!rows.length) {
      console.log(`${t.label.padEnd(22)} seed file empty/missing - skipped`);
      continue;
    }

    const filter = t.filter(rows);
    const total = await t.model.countDocuments({});
    const matched = await t.model.countDocuments(filter);

    if (!matched) {
      console.log(`${t.label.padEnd(22)} ${total} rows, 0 demo - clean`);
      continue;
    }

    if (DRY_RUN) {
      const preview = await t.model.find(filter).limit(3).lean();
      const names = preview
        .map((d) => d.name || d.customer || d.invoice || d.subject || d.text || d.invoiceNo || d._id)
        .join(', ');
      console.log(`${t.label.padEnd(22)} ${total} rows, ${matched} demo WOULD BE DELETED  e.g. ${names}`);
    } else {
      const res = await t.model.deleteMany(filter);
      console.log(`${t.label.padEnd(22)} ${total} rows, deleted ${res.deletedCount} demo`);
    }

    grandTotal += matched;
  }

  console.log(
    `\n${DRY_RUN ? 'Would delete' : 'Deleted'} ${grandTotal} demo record(s). Login accounts untouched.`
  );
  if (DRY_RUN) console.log('Re-run without --dry-run to apply.');
  console.log('\nMake sure SEED_DEMO_DATA is not "true" in .env, or they come back on restart.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Purge failed:', err);
  process.exit(1);
});
