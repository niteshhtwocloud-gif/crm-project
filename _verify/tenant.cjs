// Simulates getTenantFilter/applyTenantFilter to prove a vendor sees only
// their own customers, before and after the _id fix.

const vendorA = { _id:'aaa111', id:'1', vendorId:'H2VEN001', name:'Alpha', parentVendorId:null };
const vendorB = { _id:'bbb222', id:'2', vendorId:'H2VEN002', name:'BlueWave', parentVendorId:null };
const vendors = [vendorA, vendorB];

// Customers created by the admin panel: parentVendorId = vendor._id
const customers = [
  { name:'Alpha Cust 1', parentVendorId:'aaa111', vendorId:'H2VEN001' },
  { name:'Alpha Cust 2', parentVendorId:'aaa111', vendorId:'H2VEN001' },
  { name:'Blue Cust 1',  parentVendorId:'bbb222', vendorId:'H2VEN002' },
];

const buildToken = (vendor, useOldIdentity) => ({
  role: 'vendor',
  vendorId: useOldIdentity ? String(vendor.id || vendor._id) : String(vendor._id)
});

const getTenantFilter = (user) => {
  if (user.role === 'super_admin') return null;
  if (!user.vendorId) return null;
  const subs = vendors.filter(v => String(v.parentVendorId) === String(user.vendorId));
  return { $in: [user.vendorId, ...subs.map(v => String(v._id))] };
};

const matches = (c, filter) =>
  filter.$in.includes(String(c.vendorId)) || filter.$in.includes(String(c.parentVendorId));

for (const [label, old] of [['OLD (vendor.id preferred)', true], ['NEW (vendor._id canonical)', false]]) {
  console.log('===', label, '===');
  for (const v of vendors) {
    const token = buildToken(v, old);
    const f = getTenantFilter(token);
    const visible = customers.filter(c => matches(c, f)).map(c => c.name);
    console.log(`  ${v.name.padEnd(9)} token.vendorId=${String(token.vendorId).padEnd(7)} sees: ${visible.length ? visible.join(', ') : '(nothing)'}`);
  }
  console.log();
}

const tok = buildToken(vendorA, false);
const vis = customers.filter(c => matches(c, getTenantFilter(tok)));
console.log('Alpha sees only own customers :', vis.every(c => c.parentVendorId === 'aaa111') && vis.length === 2);
console.log('Alpha cannot see BlueWave data:', !vis.some(c => c.name.startsWith('Blue')));
