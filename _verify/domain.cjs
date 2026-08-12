// Domain grouping: same-domain records contiguous, natural numeric order
const rows = [
  { vendorId:'V03', domain:'as2',  name:'Gamma' },
  { vendorId:'V07', domain:'as10', name:'Kilo'  },
  { vendorId:'V01', domain:'as1',  name:'Alpha' },
  { vendorId:'V05', domain:'as2',  name:'Echo'  },
  { vendorId:'V09', domain:'',     name:'NoDom' },
  { vendorId:'V02', domain:'AS1',  name:'Bravo' },
  { vendorId:'V04', domain:'as2',  name:'Delta' },
  { vendorId:'V08', domain:'as10', name:'Lima'  },
];

const domainOf = c => (c.domain || c.domainName || '').trim().toLowerCase();

// OLD: first-appearance order
const grouped_old = [];
const seen = new Set();
rows.forEach(c => { const d = domainOf(c);
  if(!seen.has(d)){ seen.add(d); grouped_old.push(...rows.filter(i=>domainOf(i)===d)); }});

// NEW
const grouped_new = [...rows].sort((a,b)=>{
  const da=domainOf(a), db=domainOf(b);
  if(da!==db){ if(!da) return 1; if(!db) return -1;
    return da.localeCompare(db,undefined,{numeric:true,sensitivity:'base'}); }
  return String(a.vendorId||a.name||'').localeCompare(String(b.vendorId||b.name||''),undefined,{numeric:true,sensitivity:'base'});
});

const show = l => l.map(r=>`${r.domain||'(blank)'}`).join(' ');
console.log('OLD:', show(grouped_old));
console.log('NEW:', show(grouped_new));

// assert: contiguous + ascending
const seq = grouped_new.map(domainOf).filter(Boolean);
let contiguous = true; const seenD = new Set(); let prev = null;
for (const d of seq) { if (d !== prev) { if (seenD.has(d)) contiguous = false; seenD.add(d); prev = d; } }
const order = [...new Set(seq)];
const sorted = [...order].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
console.log('\ndomain order      :', order.join(' -> '));
console.log('contiguous groups :', contiguous);
console.log('natural ascending :', JSON.stringify(order)===JSON.stringify(sorted));
console.log('blank domain last :', domainOf(grouped_new[grouped_new.length-1])==='');
