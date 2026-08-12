// Runs the NEW importExcel parsing logic against a real .xlsx
const XLSX = require('xlsx');
const fs = require('fs');

const vendors = [
  { _id:'aaa111', id:'1', vendorId:'H2VEN001', name:'Alpha Networks' },
  { _id:'bbb222', id:'2', vendorId:'H2VEN002', name:'BlueWave Infotech' },
];

const toISODate = (value) => {
  if (value === undefined || value === null || value === "") return "";
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0,10);
  const asNum = Number(value);
  if (Number.isFinite(asNum) && String(value).trim()!=="" && asNum>0 && asNum<100000) {
    const d = new Date(Math.round((asNum - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0,10);
  }
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0,10);
};

const buf = fs.readFileSync('/tmp/test-import.xlsx');
const wb = XLSX.read(buf, { type:'buffer', cellDates:true });
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval:"", raw:false });

const norm = k => String(k).toLowerCase().replace(/[^a-z0-9]/g,'');
const buildIndex = row => { const i={}; Object.keys(row).forEach(k=>{
  const key=norm(k), val=row[k];
  const has = val!==undefined && val!==null && String(val).trim()!=="";
  if(has || i[key]===undefined) i[key]=val; }); return i; };
const get = (idx,...labels) => { for(const l of labels){ const v=idx[norm(l)];
  if(v!==undefined&&v!==null&&String(v).trim()!=="") return String(v).trim(); } return ""; };

const findVendor = idx => {
  const vId=get(idx,"Vendor ID","VendorId"); const vName=get(idx,"Vendor Name","Vendor");
  if(vId){ const b=vendors.find(v=>String(v.vendorId||'').toLowerCase()===vId.toLowerCase()); if(b) return b; }
  if(vName){ const b=vendors.find(v=>String(v.name||'').toLowerCase()===vName.toLowerCase()); if(b) return b; }
  if(vendors.length===1) return vendors[0];
  return null;
};

const parsed=[], skipped=[];
rows.forEach((raw,i)=>{
  const idx=buildIndex(raw);
  const name=get(idx,"Customer/Company Name","Customer Name","Company Name","Name","Full Name");
  if(!name){ skipped.push(`Row ${i+2}: no customer name`); return; }
  const vendor=findVendor(idx);
  if(!vendor){ skipped.push(`Row ${i+2} (${name}): vendor not found`); return; }
  parsed.push({
    parentVendorId:String(vendor._id||vendor.id), vendorId:vendor.vendorId, name,
    email:get(idx,"Email Id","Email"),
    domain:get(idx,"Domain","Domain Name"),
    ip:get(idx,"IP","IP Address"), port:get(idx,"Port"),
    productService:get(idx,"Product/Service","Product","Service"),
    period:get(idx,"Period"),
    creationDate:toISODate(get(idx,"Creation Date","Login Date")),
    expiryDate:toISODate(get(idx,"Expiry Date","Expiry")),
  });
});

console.log('rows in sheet :', rows.length);
console.log('parsed        :', parsed.length);
console.log('skipped       :', skipped.length);
console.log();
parsed.forEach(p=>console.log(' ', JSON.stringify(p)));
console.log();
skipped.forEach(s=>console.log('  SKIP:', s));

// assertions
const ok = [
  ['lowercase/spaced headers matched', parsed.some(p=>p.name==='Beta Ltd' && p.email==='b@x.com')],
  ['Date object -> ISO', parsed.find(p=>p.name==='Alpha Corp')?.creationDate==='2026-01-15'],
  ['Excel serial -> ISO', /^\d{4}-\d{2}-\d{2}$/.test(parsed.find(p=>p.name==='Gamma')?.creationDate||'')],
  ['linked to right vendor', parsed.find(p=>p.name==='Gamma')?.parentVendorId==='bbb222'],
  ['nameless row skipped', skipped.some(s=>s.includes('no customer name'))],
  ['unknown vendor skipped', skipped.some(s=>s.includes('Orphan'))],
];
console.log();
ok.forEach(([label,pass])=>console.log((pass?'PASS':'FAIL').padEnd(5), label));
