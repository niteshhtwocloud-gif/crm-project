# CRM Fixes — Dashboard Real Data + Edit Duplicate

11 files patched. Apne project me **same path pe** copy-paste kar dena (pehle backup le lena).

---

## Problem 1 — Edit karne pe duplicate

### Asli wajah

`Admin Panel/admin-panel/src/pages/Customers/Customers.jsx`

Child user row ka edit button **display ke liye banaya gaya object** bhej raha tha:

```jsx
// PEHLE (bug)
<button onClick={() => handleOpenEdit(mergedUser)}>
```

`mergedUser` me child user ki khaali fields parent vendor ki value se bhari jaati hain (`|| c.domain`, `|| c.ip`, `customerName: c.name`). Save karne par **vendor ka poora data child user ke record pe likh jata tha** — screen pe do bilkul same rows = "duplicate".

Test se proof:

```
OLD saved name  : "Server Basket"   <-- vendor ka naam child pe chala gaya
OLD saved domain: "sb.htwo.cloud"   <-- vendor se copy
OLD tallyNetId  : "—"               <-- literal em-dash DB me save

NEW saved name  : "Rahul Sharma"    <-- child ka apna naam
NEW saved domain: ""
NEW tallyNetId  : ""
```

### Do supporting bugs jo isko trigger karte the

**(a) `handleOpenEdit` galat field names padhta tha.** Vendor record me `name` / `productService` / `renewalType` / `tallyNetId` / `dataPath` hai, form `customerName` / `product` / `renewalNew` / `licenseId` / `dataPathLocation` dhundta tha:

```
OLD customerName: ""   -> handleSubmit chupchap `if (!formData.customerName.trim()) return;` pe ruk jata tha
NEW customerName: "Server Basket"
NEW product     : "Tally Cloud"
NEW licenseId   : "TN-SB-01"
```

User ko lagta tha edit kaam nahi kar raha → "Add Customer" se dobara add karta tha → **asli duplicate row**.

**(b) Add aur Edit do alag collections me jaate the.** Table `vendors` dikhata hai, par "Add Customer" `addCustomer` (POST `/api/users`) call karta tha. Naya record list me kabhi dikhta hi nahi tha → user phir add karta tha.

### Fixes

| Fix | Kya kiya |
|---|---|
| `recordToForm()` naya mapper | Backend ke saare field naam sahi tarah form me map karta hai |
| `clean()` helper | `"—"`, `"-"`, `"N/A"` placeholders DB me jaane se rokta hai |
| `handleOpenEdit(record, type)` | Ab **raw record** leta hai, merged object nahi |
| `editingType` state | `'vendor'` / `'user'` explicitly track hota hai — pehle `customers.some(...)` se guess hota tha |
| Add ab `addCustomerRecord` (= `addVendor`) call karta hai | Naya record turant list me dikhta hai |
| `handleCloseForm()` | Modal band karne pe `editingId`/`editingType`/`formData` reset |
| `handleStatusChange` | Ab sirf `{ status }` bhejta hai, poora record nahi (record me `_id` tha, Mongo reject karta tha) |
| View modal | Display object aur editable record alag rakhe (`selectedRecord`) |

`Vendor-panel/backend/routes/users.js` — PUT route se `_id`, `id`, `created_at`, `__v` strip kiye. `$set` me `_id` jaane se Mongo poora update fail kar deta tha.

---

## Problem 2 — Dashboard pe real data nahi aa raha

### Asli wajah: status vocabulary mismatch

| | Backend bhejta hai | Dashboard expect karta tha |
|---|---|---|
| `payments.status` | `Paid` / `Pending` / `Overdue` | `success` / `warning` / `danger` |

Real seed data me: `Paid: 5, Pending: 4, Overdue: 2`. Nateeja:

```
OLD pie chart:  Completed=0  Pending=0  Overdue=0   => donut khaali, sab 0%
NEW pie chart:  Completed=5 (45%)  Overdue=6 (55%)  Pending=0  Upcoming=0
                total=11, sum=11  (koi invoice chhoot nahi rahi)

OLD status badge: undefined  (blank)
NEW status badge: "Paid" / "Pending" / "Overdue"
```

### Saare fixes

**`DataContext.jsx`**

- `API_BASE` constant — 20+ hardcoded `http://https://crm-backend-4fh2.onrender.com` hataye. Deploy ke liye `.env` me `VITE_API_BASE` set karo.
- `normalizeInvoice` / `normalizeService` / `normalizeVendor` — ek hi jagah. Initial fetch aur 8-second polling dono yahi use karte hain, to dono kabhi drift nahi karenge (pehle do jagah duplicate logic thi).
- `statusKey` mapping — `status` human-readable rehta hai, CSS class `statusKey` se banti hai.
- `num()` coercion — `₹ NaN` khatam. Verify kiya: `any NaN? false`
- `date` aur `dueDate` alag kiye. Pehle dono ek field me collapse the, aur unpaid invoice me `paymentDate` khaali hota hai → overdue days `NaN`.
- **Month-scoped totals.** Pehle `paidThisMonth` aur `monthlyRevenue` lifetime totals the:
  ```
  paidThisMonth (OLD, all-time)     = ₹59,899
  paidThisMonth (NEW, month-scoped) = ₹0
  ```
- `paidChangePct` / `revenueChangePct` — asli month-over-month, baseline na ho to `null`.
- `activeServices` — sirf non-expired. Pehle `services.length` tha, expired bhi count hote the.
- `refreshAll` export.

**Components**

| File | Fix |
|---|---|
| `DashboardCards` | Hardcoded `12.5%` / `8.3%` / `10.4%` "from last month" hataye; links proper routes pe |
| `RevenueCards` | Hardcoded `15.6%` / `11.2%` → real `paidChangePct` / `revenueChangePct`; negative pe red + down arrow |
| `RecentInvoices` | `statusKey` badges; `money()` helper (crash-proof); date-sorted (pehle array order tha) |
| `OverduePayments` | Sirf **actually** overdue (dueDate < today). Pehle balance wali har invoice "Overdue" thi. Days ab dueDate se, most-overdue pehle |
| `UpcomingRenewals` | Expired rows filter; `urgency()` daysLeft se badge colour; safe number formatting |
| `TopVendors` | Ab **actually top** — `totalPurchase` desc. Pehle API alphabetical bhejta tha, to "Top Vendors" = "first five by name" |
| `RenewalCalendar` | `new Date(2026, 4, 1)` hardcoded tha → ab current month. Legend ab soonest-3 upcoming dates, dot most-urgent renewal ka colour |
| `ExcelManager` (dashboard) | `mockData` import hataya → real `services` |

---

## Ek aur wajah jo check karna: super_admin role

`Vendor-panel/backend/routes/auth.js` me `super_admin` role **sirf** in do emails ko milta hai:

- `admin@vendorcrm.com`
- `admin@h2cloud.com`

Kisi aur email se login karne pe role `vendor` ban jata hai. Phir `utils/tenant.js` ka `applyTenantFilter` vendors pe `parentVendorId = user.vendorId` laga deta hai → **dashboard saare zero dikhata hai**.

Agar fixes ke baad bhi dashboard khaali hai, pehle in dono emails me se ek se login karke check karo. Long-term me role ko email string se nahi, DB me `role` field se decide karna chahiye.

---

## ⚠️ Security — ye zaroori hai

`Vendor-panel/.env` archive me committed hai aur usme **live credentials** hain:

- MongoDB Atlas connection URI
- Gmail app password (`EMAIL_PASS`)
- `JWT_SECRET`
- Vendor passwords **plaintext** me (`PARENT_VENDOR_1_PASSWORD` etc.)

Maine values print nahi ki, lekin ye file jise bhi ye .rar milega usko dikh jayegi.

Karo:

1. Atlas password aur Gmail app password **turant rotate** karo
2. `JWT_SECRET` badlo (saare existing tokens invalid ho jayenge — theek hai)
3. `.env` ko `.gitignore` me daalo, `git rm --cached Vendor-panel/.env`
4. `.env.example` khaali values ke saath commit karo
5. `routes/vendors.js` me vendor password plaintext me DB me save hota hai (`$set: { password: plainPassword }`) — ye `bcrypt` hash hona chahiye
6. `.env` me runtime pe append karna (`fs.appendFileSync` in vendors POST) hata do — ye credentials file me likh raha hai

---

## Test files

`verify/repro.cjs` aur `verify/dash.cjs` — bug reproduce karke fix prove karte hain. `node repro.cjs` chalao.
