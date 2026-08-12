// Real payments.json data se dashboard aggregations verify
const payments = require('/home/claude/proj/crm-project-com/Vendor-panel/backend/data/payments.json');

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const MAP = { paid:'success', success:'success', completed:'success', partial:'warning',
  pending:'warning', warning:'warning', overdue:'danger', danger:'danger', unpaid:'danger' };
const toStatusKey = s => MAP[String(s||'').toLowerCase()] || 'warning';
const parseDate = v => { if(!v) return null; const d=new Date(v); return isNaN(d)?null:d; };

const norm = inv => { const amount=num(inv.amount), paid=num(inv.paid);
  const due = inv.pending!==undefined?num(inv.pending):Math.max(0,amount-paid);
  const st = inv.status || (due<=0?'Paid':'Pending');
  return {...inv, amount, paid, due, status:st, statusKey:toStatusKey(st),
    date: inv.paymentDate||inv.date||'', dueDate: inv.dueDate||''}; };

const invoices = payments.map(norm);
const now = new Date();

console.log('--- OLD pie chart (matched on success/warning/danger) ---');
const oc = invoices.filter(i=>i.status==='success').length;
const pc = invoices.filter(i=>i.status==='warning').length;
const dc = invoices.filter(i=>i.status==='danger').length;
console.log(`Completed=${oc} Pending=${pc} Overdue=${dc}  => donut khaali, sab 0%`);

console.log('\n--- NEW pie chart (real data) ---');
const isOverdue = i => { const d=parseDate(i.dueDate); return i.due>0 && !!d && d<now; };
const completed = invoices.filter(i=>i.due<=0);
const overdue = invoices.filter(isOverdue);
const upcoming = invoices.filter(i=>{const d=parseDate(i.dueDate); return i.due>0 && !!d && d>=now;});
const pending = invoices.filter(i=>i.due>0 && !isOverdue(i) && !upcoming.includes(i));
const t = invoices.length;
const pct = n => t?Math.round(n/t*100):0;
for (const [n,l] of [['Completed',completed],['Pending',pending],['Overdue',overdue],['Upcoming',upcoming]])
  console.log(`${n.padEnd(10)} = ${l.length} (${pct(l.length)}%)`);
console.log('total invoices =', t, '| sum =', completed.length+pending.length+overdue.length+upcoming.length);

console.log('\n--- OLD status badges vs NEW ---');
const LBL={success:'Paid',warning:'Pending',danger:'Overdue'};
invoices.slice(0,4).forEach(i=>console.log(
  `${i.invoice}  raw="${i.status}"  OLD badge=${JSON.stringify(undefined)}  NEW badge="${LBL[i.statusKey]}" class=badge-${i.statusKey}`));

console.log('\n--- Due / totals (NaN check) ---');
console.log('totalDue    = \u20b9' + invoices.reduce((s,i)=>s+num(i.due),0).toLocaleString('en-IN'));
const som = new Date(now.getFullYear(), now.getMonth(), 1);
const inMonth = i => { const d=parseDate(i.date)||parseDate(i.dueDate); return d && d>=som; };
console.log('paidThisMonth (NEW, month-scoped) = \u20b9' + invoices.filter(inMonth).reduce((s,i)=>s+num(i.paid),0).toLocaleString('en-IN'));
console.log('paidThisMonth (OLD, all-time)     = \u20b9' + invoices.reduce((s,i)=>s+num(i.paid),0).toLocaleString('en-IN'));
console.log('any NaN?', invoices.some(i=>Number.isNaN(i.due)||Number.isNaN(i.paid)||Number.isNaN(i.amount)));
