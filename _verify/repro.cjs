// Reproduces the duplicate bug and proves the fix, using the real shapes
// returned by GET /api/vendors and GET /api/users.

const vendor = {
  _id: '68a1f0c000000000000000aa', id: '1',
  name: 'Server Basket', email: 'billing@serverbasket.com',
  domain: 'sb.htwo.cloud', ip: '103.10.10.1', port: '3389',
  productService: 'Tally Cloud', username: 'sbadmin',
  creationDate: '2026-01-05', expiryDate: '2027-01-05', period: 'Yearly',
  renewalType: 'Renewal', tallyNetId: 'TN-SB-01', tallyNetPassword: 'sbpass',
  dataPath: 'D:\\TallyData\\SB', paymentStatus: 'Paid', status: 'Active',
  vendorId: 'H2VEN001', parentVendorId: null
};

const childUser = {
  _id: '68a1f0c000000000000000bb', id: '1770000000000',
  parentVendorId: '68a1f0c000000000000000aa', vendorId: 'H2VEN001',
  name: 'Rahul Sharma', email: 'rahul@sb.com',
  domainName: '', ip: '', port: '', productService: '',
  loginDate: '', expiryDate: '', period: '',
  paymentStatus: 'Pending', status: 'Active',
  tallyNetId: '', tallyNetPassword: '', license: ''
};

// The display-only merge from the render loop (unchanged, still used for display)
const mergedUser = {
  ...childUser,
  vendorId: vendor.vendorId,
  customerName: vendor.name || vendor.customerName,
  domain: childUser.domainName || childUser.domain || vendor.domain || '—',
  product: childUser.productService || childUser.service || vendor.productService || '—',
  ip: childUser.ip || vendor.ip || '—',
  port: childUser.port || vendor.port || '—',
  username: childUser.username || childUser.email || '—',
  creationDate: childUser.loginDate || childUser.creationDate || vendor.creationDate || '—',
  expiryDate: childUser.expiryDate || vendor.expiryDate || '—',
  period: childUser.period || vendor.period || '—',
  paymentStatus: childUser.paymentStatus || vendor.paymentStatus || 'Pending',
  status: childUser.status || vendor.status || 'Active',
  licenseId: childUser.tallyNetId || '—',
  licensePassword: childUser.tallyNetPassword || '—',
  licenseDetails: childUser.license || '—',
};

const EMPTY_FORM = {
  parentVendorId: '', vendorId: '', customerName: '', domain: '', ip: '', port: '',
  serverId: '', serverPassword: '', product: '', username: '',
  creationDate: '', renewalNew: 'New', period: '', expiryDate: '',
  paymentStatus: 'Pending', billGenerated: 'No', email: '', billingDate: '',
  licenseDetails: '', licenseType: '', licenseId: '', licensePassword: '',
  salesPerson: '', reminderStatus: 'Pending', remarks: '', purchaseType: '',
  demoTime: '', dataPathLocation: '', userStatus: 'Active', status: 'Active',
  daysLeft: ''
};

// ---------- OLD handleOpenEdit ----------
function oldOpenEdit(c) {
  const next = { ...EMPTY_FORM };
  Object.keys(EMPTY_FORM).forEach(k => { next[k] = c[k] !== undefined && c[k] !== null ? c[k] : EMPTY_FORM[k]; });
  return next;
}

// ---------- NEW recordToForm ----------
const clean = v => {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return (s === '—' || s === '-' || s === 'N/A') ? '' : v;
};
function recordToForm(r) {
  r = r || {};
  const pick = (...keys) => { for (const k of keys) { const v = clean(r[k]); if (v !== '' && v !== undefined) return v; } return ''; };
  const toDate = v => { const raw = clean(v); if (!raw) return ''; const d = new Date(raw); return isNaN(d) ? '' : d.toISOString().slice(0,10); };
  return { ...EMPTY_FORM,
    parentVendorId: pick('parentVendorId'), vendorId: pick('vendorId'),
    customerName: pick('customerName','name'),
    domain: pick('domain','domainName'), ip: pick('ip','ipAddress'), port: pick('port'),
    product: pick('product','productService','service'), username: pick('username'),
    creationDate: toDate(pick('creationDate','loginDate')),
    renewalNew: pick('renewalNew','renewalType') || 'New',
    period: pick('period'), expiryDate: toDate(pick('expiryDate','expiry')),
    paymentStatus: pick('paymentStatus') || 'Pending', email: pick('email'),
    licenseDetails: pick('licenseDetails','license'), licenseId: pick('licenseId','tallyNetId'),
    licensePassword: pick('licensePassword','tallyNetPassword'),
    dataPathLocation: pick('dataPathLocation','dataPath'),
    status: pick('status') || 'Active' };
}

const toPayload = f => ({ name: f.customerName, email: f.email, productService: f.product,
  domain: f.domain, ip: f.ip, port: f.port, period: f.period,
  expiryDate: f.expiryDate, paymentStatus: f.paymentStatus, status: f.status,
  tallyNetId: f.licenseId, tallyNetPassword: f.licensePassword, renewalType: f.renewalNew });

console.log('=== BUG 1: editing a CHILD USER ===');
const oldChild = toPayload(oldOpenEdit(mergedUser));
console.log('OLD saved name  :', JSON.stringify(oldChild.name), ' <-- vendor ka naam! duplicate row');
console.log('OLD saved domain:', JSON.stringify(oldChild.domain), '(vendor se copy)');
console.log('OLD saved ip    :', JSON.stringify(oldChild.ip), '(vendor se copy)');
console.log('OLD tallyNetId  :', JSON.stringify(oldChild.tallyNetId), '<-- literal em-dash DB me');
const newChild = toPayload(recordToForm(childUser));
console.log('NEW saved name  :', JSON.stringify(newChild.name), ' <-- child ka apna naam');
console.log('NEW saved domain:', JSON.stringify(newChild.domain), '(khaali hi rehta hai)');
console.log('NEW tallyNetId  :', JSON.stringify(newChild.tallyNetId));

console.log('\n=== BUG 2: editing a VENDOR row ===');
const oldV = oldOpenEdit(vendor);
console.log('OLD customerName:', JSON.stringify(oldV.customerName), '-> handleSubmit chupchap ruk jata hai');
console.log('OLD product     :', JSON.stringify(oldV.product));
console.log('OLD licenseId   :', JSON.stringify(oldV.licenseId));
const newV = recordToForm(vendor);
console.log('NEW customerName:', JSON.stringify(newV.customerName));
console.log('NEW product     :', JSON.stringify(newV.product));
console.log('NEW licenseId   :', JSON.stringify(newV.licenseId));
console.log('NEW renewalNew  :', JSON.stringify(newV.renewalNew));
console.log('NEW dataPath    :', JSON.stringify(newV.dataPathLocation));

const dup = oldChild.name === vendor.name && oldChild.domain === vendor.domain;
console.log('\nDuplicate reproduced with OLD code:', dup);
console.log('Duplicate gone with NEW code      :', !(newChild.name === vendor.name));
