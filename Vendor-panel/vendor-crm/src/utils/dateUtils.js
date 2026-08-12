/**
 * Universal date parsing and expiry date calculation utility.
 * Supports JS Date objects, Excel serial numbers, DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD,
 * and DD-MMM-YYYY (e.g. 16-May-2026, 21-Jan-2026, 15-Dec-2025).
 */

const MONTH_MAP = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

export function toISODate(value) {
  if (value === undefined || value === null || value === "") return "";

  if (value instanceof Date && !isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Handle Excel serial numbers (e.g. 46245)
  const asNum = Number(value);
  if (Number.isFinite(asNum) && String(value).trim() !== "" && asNum > 0 && asNum < 100000) {
    const d = new Date(Math.round((asNum - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }

  const str = String(value).trim();
  if (!str) return "";

  // Check for ISO timestamp format (e.g. 2026-05-16T...)
  if (str.includes('T')) {
    const prefix = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(prefix)) return prefix;
  }

  // Check for YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Check for named month dates: "16-May-2026", "21 Jan 2026", "15-Dec-25"
  const namedMatch = str.match(/^(\d{1,2})[\/\-\s]+([A-Za-z]{3,9})[\/\-\s]+(\d{2,4})$/);
  if (namedMatch) {
    let [, p1, p2, y] = namedMatch;
    if (y.length === 2) y = String(2000 + Number(y));
    const mNum = MONTH_MAP[p2.toLowerCase()];
    if (mNum) {
      const day = String(p1).padStart(2, '0');
      const month = String(mNum).padStart(2, '0');
      return `${y}-${month}-${day}`;
    }
  }

  // Check for numeric dates: "16/05/2026", "16-05-2026", "16.05.2026"
  const dmyMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmyMatch) {
    let [, p1, p2, y] = dmyMatch;
    if (y.length === 2) y = String(2000 + Number(y));
    let day = Number(p1);
    let month = Number(p2);
    if (month > 12 && day <= 12) {
      day = Number(p2);
      month = Number(p1);
    }
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Fallback to JS standard Date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return str;
}

export function calculateExpiryDate(creationDateVal, periodVal) {
  if (!creationDateVal && !periodVal) return "";
  const isoCreation = toISODate(creationDateVal) || new Date().toISOString().slice(0, 10);
  if (!periodVal) return isoCreation;

  const rawPeriod = String(periodVal).trim();
  const lowerPeriod = rawPeriod.toLowerCase();

  const parts = isoCreation.split('-');
  if (parts.length !== 3) return "";
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1; // 0-indexed month
  const day = parseInt(parts[2], 10);

  const d = new Date(y, m, day);
  if (isNaN(d.getTime())) return "";

  if (lowerPeriod === 'monthly' || lowerPeriod === 'month' || lowerPeriod === '1 month' || lowerPeriod === '1 months' || lowerPeriod === '1 mo' || lowerPeriod === '1m' || lowerPeriod === '1') {
    d.setMonth(d.getMonth() + 1);
  } else if (lowerPeriod === 'quarterly' || lowerPeriod === 'quarter' || lowerPeriod === '3 months' || lowerPeriod === '3 month' || lowerPeriod === '3 mo' || lowerPeriod === '3m' || lowerPeriod === '3') {
    d.setMonth(d.getMonth() + 3);
  } else if (lowerPeriod === 'half-yearly' || lowerPeriod === 'half yearly' || lowerPeriod === 'halfyearly' || lowerPeriod === 'semi-annually' || lowerPeriod === '6 months' || lowerPeriod === '6 month' || lowerPeriod === '6 mo' || lowerPeriod === '6m' || lowerPeriod === '6') {
    d.setMonth(d.getMonth() + 6);
  } else if (lowerPeriod === 'yearly' || lowerPeriod === 'annual' || lowerPeriod === 'annually' || lowerPeriod === '1 year' || lowerPeriod === '1 years' || lowerPeriod === '12 months' || lowerPeriod === '12 month' || lowerPeriod === '12 mo' || lowerPeriod === '12m' || lowerPeriod === '1 yr' || lowerPeriod === '12') {
    d.setFullYear(d.getFullYear() + 1);
  } else if (lowerPeriod === '2 years' || lowerPeriod === '2 year' || lowerPeriod === '24 months' || lowerPeriod === '24 month' || lowerPeriod === '24 mo' || lowerPeriod === '24m' || lowerPeriod === '2 yr' || lowerPeriod === '24') {
    d.setFullYear(d.getFullYear() + 2);
  } else if (lowerPeriod === 'weekly' || lowerPeriod === '1 week' || lowerPeriod === '1 weeks' || lowerPeriod === '7 days' || lowerPeriod === '7 day') {
    d.setDate(d.getDate() + 7);
  } else if (lowerPeriod === '2 weeks' || lowerPeriod === '14 days' || lowerPeriod === '14 day') {
    d.setDate(d.getDate() + 14);
  } else {
    const monthMatch = lowerPeriod.match(/^(\d+)\s*(?:months?|mos?|m)?$/);
    const yearMatch = lowerPeriod.match(/^(\d+)\s*(?:years?|yrs?|y)$/);
    const weekMatch = lowerPeriod.match(/^(\d+)\s*(?:weeks?|w)$/);
    const dayMatch = lowerPeriod.match(/^(\d+)\s*(?:days?|d)$/);

    if (yearMatch) {
      d.setFullYear(d.getFullYear() + parseInt(yearMatch[1], 10));
    } else if (monthMatch) {
      d.setMonth(d.getMonth() + parseInt(monthMatch[1], 10));
    } else if (weekMatch) {
      d.setDate(d.getDate() + parseInt(weekMatch[1], 10) * 7);
    } else if (dayMatch) {
      d.setDate(d.getDate() + parseInt(dayMatch[1], 10));
    }
  }

  const expY = d.getFullYear();
  const expM = String(d.getMonth() + 1).padStart(2, '0');
  const expD = String(d.getDate()).padStart(2, '0');
  return `${expY}-${expM}-${expD}`;
}

export function calculateDaysLeft(expiryDateVal) {
  if (!expiryDateVal) return 0;
  const isoExpiry = toISODate(expiryDateVal);
  if (!isoExpiry) return 0;
  const parts = isoExpiry.split('-');
  if (parts.length !== 3) return 0;
  const expDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(expDate.getTime())) return 0;
  const diffTime = expDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function formatDate(value) {
  if (value === undefined || value === null || value === "") return "";
  const iso = toISODate(value);
  if (!iso) return String(value);
  const parts = iso.split('-');
  if (parts.length !== 3) return String(value);
  const y = parts[0];
  const mNum = parseInt(parts[1], 10);
  const d = parts[2];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mName = monthNames[mNum - 1] || parts[1];
  return `${d}-${mName}-${y}`;
}

export function effectiveStatus(record) {
  const stored = (record && record.status) || "Active";
  if (stored !== "Active") return stored;

  const raw = record && (record.expiryDate || record.expiry);
  if (!raw) return stored;

  const expiry = new Date(raw);
  if (isNaN(expiry.getTime())) return stored;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < today) return "Expired";
  return stored;
}
