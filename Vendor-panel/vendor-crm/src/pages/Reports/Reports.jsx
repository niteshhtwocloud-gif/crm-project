import { useState, useMemo } from "react";
import {
  LuSearch, LuDownload, LuFileSpreadsheet, LuFilter, LuPlus,
  LuEye, LuPencil, LuTrash2, LuX, LuChevronLeft, LuChevronRight, LuRefreshCw
} from "react-icons/lu";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useCRM } from "../../context/CRMContext";
import { useToast } from "../../context/ToastContext";
import { toISODate, calculateExpiryDate, calculateDaysLeft, formatDate, effectiveStatus } from "../../utils/dateUtils";
import "./Reports.css";
import "./Customers.css";

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000') + '/api';
const getHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("token")}`
});
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

const PAGE_SIZE = 8;

const EMPTY_FORM = {
  customerName: "", domain: "", ip: "", port: "",
  serverId: "", serverPassword: "", product: "", username: "",
  creationDate: "", renewalNew: "New", period: "", expiryDate: "",
  paymentStatus: "Pending", billGenerated: "No", email: "", billingDate: "",
  licenseDetails: "", licenseType: "", licenseId: "", licensePassword: "",
  salesPerson: "", reminderStatus: "Pending", remarks: "", purchaseType: "",
  demoTime: "", dataPathLocation: "", userStatus: "Active", status: "Active",
  daysLeft: ""
};

const VIEW_FIELDS = [
  ["Customer/Company Name", "customerName"], ["Domain", "domain"], ["IP Address", "ip"], ["Port", "port"],
  ["Server Id", "serverId"], ["Server Password", "serverPassword"],
  ["Product/Service", "product"], ["Sub Vendor", "subVendor"], ["Username", "username"],
  ["Creation Date", "creationDateFormatted"], ["Renewal/New", "renewalNew"],
  ["Period", "period"], ["Expiry Date", "expiryDateFormatted"], ["Days Left", "daysLeft"],
  ["Payment Status", "paymentStatus"], ["Bill Generated", "billGenerated"],
  ["Email Id", "email"], ["Billing Date", "billingDate"], ["Created By", "createdBy"],
  ["License Details", "licenseDetails"], ["License Type", "licenseType"],
  ["Tally.Net ID", "licenseId"], ["Tally.Net Password", "licensePassword"],
  ["Sales Person", "salesPerson"], ["Reminder Status", "reminderStatus"],
  ["Remarks", "remarks"], ["Purchase Type", "purchaseType"], ["Demo Time", "demoTime"],
  ["Data Path Location", "dataPathLocation"], ["User Status", "userStatus"], ["Status", "effectiveStatus"]
];

const MODAL_VIEW_FIELDS = [
  ["Customer / Company Name", "customerName"],
  ["Domain Name", "domain"],
  ["IP Address", "ip"],
  ["Port", "port"],
  ["Server ID", "serverId"],
  ["Server Password", "serverPassword"],
  ["Product / Service", "product"],
  ["Sub Vendor", "subVendor"],
  ["Username", "username"],
  ["Creation Date", "creationDateFormatted"],
  ["Renewal / New", "renewalNew"],
  ["Period", "period"],
  ["Expiry Date", "expiryDateFormatted"],
  ["Days Left", "daysLeft"],
  ["Payment Status", "paymentStatus"],
  ["Status", "effectiveStatus"],
  ["Tally.Net ID", "licenseId"],
  ["Tally.Net Password", "licensePassword"],
  ["License Details", "licenseDetails"],
  ["License Type", "licenseType"],
  ["Data Path Location", "dataPathLocation"],
  ["Sales Person", "salesPerson"],
  ["Email Id", "email"],
  ["Remarks", "remarks"]
];

function DaysLeftBadge({ daysLeft }) {
  if (daysLeft === null || daysLeft === undefined || daysLeft === "") return <span className="badge badge-muted">—</span>;
  if (daysLeft < 0) return <span className="badge badge-overdue">{daysLeft} Days</span>;
  if (daysLeft <= 7) return <span className="badge badge-pending">{daysLeft} Days</span>;
  return <span className="badge badge-paid">{daysLeft} Days</span>;
}

export default function Reports() {
  const { users, addUser, editUser, deleteUser, addNotification } = useCRM();
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("All Domains");
  const [statusFilter, setStatusFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All Periods");
  const [page, setPage] = useState(1);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Map API actions to code expectations
  const customerRecords = users || [];
  const addCustomerRecord = addUser;
  const editCustomerRecord = editUser;
  const deleteCustomerRecord = async (id) => {
    const c = customerRecords.find(x => (x.id || x._id) === id);
    const name = c ? (c.customerName || c.name) : "";
    return await deleteUser(id, name);
  };

  const handleRenewRequest = async (c) => {
    const serviceTitle = c.productService || c.service || c.product || "Service";
    const custName = c.name || c.customerName || "";
    if (!window.confirm(`Send renewal request for "${custName} - ${serviceTitle}"?`)) return;

    try {
      const response = await fetch(`${API_BASE}/renewal-requests`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          serviceId: String(c._id || c.id || ""),
          customerId: String(c._id || c.id || ""),
          customerName: custName,
          username: c.username || "",
          vendorId: String(c.vendorId || ""),
          serviceName: serviceTitle,
          domain: c.domain || c.domainName || "",
          currentExpiryDate: c.expiryDate || ""
        })
      });
      const data = await response.json();
      if (response.ok) {
        showToast("Renewal request submitted successfully.");
      } else {
        showToast(data.message || "Failed to submit renewal request.");
      }
    } catch (err) {
      console.error(err);
      showToast("Error submitting renewal request.");
    }
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };

      // Auto-calculate expiry date
      if (name === "creationDate" || name === "period") {
        if (next.period && next.period !== "Custom") {
          const cd = dayjs(next.creationDate, "YYYY-MM-DD");
          if (cd.isValid()) {
            if (next.period === "Monthly") next.expiryDate = cd.add(1, 'month').format("YYYY-MM-DD");
            else if (next.period === "Quarterly") next.expiryDate = cd.add(3, 'month').format("YYYY-MM-DD");
            else if (next.period === "Half Yearly") next.expiryDate = cd.add(6, 'month').format("YYYY-MM-DD");
            else if (next.period === "Yearly") next.expiryDate = cd.add(1, 'year').format("YYYY-MM-DD");
          }
        }
      }

      // Auto-calculate days left
      if (name === "creationDate" || name === "period" || name === "expiryDate") {
        if (next.expiryDate) {
          const exp = dayjs(next.expiryDate, "YYYY-MM-DD");
          if (exp.isValid()) {
            next.daysLeft = exp.diff(dayjs().startOf('day'), 'day');
          } else {
            next.daysLeft = "";
          }
        } else {
          next.daysLeft = "";
        }
      }

      return next;
    });
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      ...EMPTY_FORM,
      username: "",
      licensePassword: "",
      creationDate: dayjs().format("YYYY-MM-DD")
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingId(c.id);
    const next = { ...EMPTY_FORM };
    Object.keys(EMPTY_FORM).forEach(k => { next[k] = c[k] !== undefined && c[k] !== null ? c[k] : EMPTY_FORM[k]; });
    if (c.service) next.product = c.service;

    // Convert DD MMM YYYY to YYYY-MM-DD for <input type="date">
    if (next.creationDate) {
      const parsed = dayjs(next.creationDate, ["DD MMM YYYY", "YYYY-MM-DD"]);
      if (parsed.isValid()) next.creationDate = parsed.format("YYYY-MM-DD");
    }
    if (next.expiryDate) {
      const parsed = dayjs(next.expiryDate, ["DD MMM YYYY", "YYYY-MM-DD"]);
      if (parsed.isValid()) next.expiryDate = parsed.format("YYYY-MM-DD");
    }

    setFormData(next);
    setShowFormModal(true);
  };

  const handleOpenView = (c) => {
    const custName = c.name || c.customerName || "—";
    const dom = c.domain || c.domainName || "—";
    const prod = c.productService || c.product || c.service || "—";
    const user = c.username || c.email || "—";
    const sub = c.subVendor || c.subvendor || c.subVendorName || "—";
    const licId = c.tallyNetId || c.licenseId || "—";
    const licPass = c.tallyNetPassword || c.licensePassword || "—";
    const licDet = c.licenseDetails || c.license || "—";
    const ipAddr = c.ip || c.ipAddress || "—";
    const portVal = c.port || "—";
    const sId = c.serverId || "—";
    const sPass = c.serverPassword || "—";
    const cDate = formatDate(c.creationDate || c.loginDate) || "—";
    const eDate = formatDate(c.expiryDate || c.expiry) || "—";
    const effStatus = effectiveStatus(c);
    const dLeft = c.daysLeft !== undefined && c.daysLeft !== null && c.daysLeft !== "" ? c.daysLeft : calculateDaysLeft(c.expiryDate || c.expiry);

    setSelected({
      ...c,
      customerName: custName,
      domain: dom,
      product: prod,
      username: user,
      subVendor: sub,
      licenseId: licId,
      licensePassword: licPass,
      licenseDetails: licDet,
      ip: ipAddr,
      port: portVal,
      serverId: sId,
      serverPassword: sPass,
      creationDateFormatted: cDate,
      expiryDateFormatted: eDate,
      effectiveStatus: effStatus,
      daysLeft: dLeft,
      paymentStatus: c.paymentStatus || "Pending",
      renewalNew: c.renewalNew || c.renewalType || "New",
      dataPathLocation: c.dataPathLocation || c.dataPath || "—"
    });
    setShowViewModal(true);
  };

  const handleDelete = (c) => {
    setVendorToDelete(c);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!vendorToDelete) return;
    setIsDeleting(true);
    try {
      const vendorId = vendorToDelete.id || vendorToDelete._id;
      const res = await deleteCustomerRecord(vendorId);
      if (res && res.ok) {
        showToast("Vendor deleted successfully.");
        setShowDeleteModal(false);
      } else {
        showToast(res?.message || "Failed to delete vendor.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Failed to delete vendor.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName.trim()) return;
    const requiredFields = [
      ['product', 'Product/Service'],
      ['port', 'Port'],
      ['serverId', 'Server Id'],
      ['serverPassword', 'Server Password'],
      ['username', 'Username'],
      ['email', 'Email Id'],
      ['creationDate', 'Creation Date'],
      ['expiryDate', 'Expiry Date']
    ];
    const missing = requiredFields.filter(([k]) => !String(formData[k] || '').trim()).map(([, label]) => label);
    if (missing.length) {
      showToast(`Please fill required fields: ${missing.join(', ')}`);
      return;
    }
    setSaving(true);

    const extra = {
      domain: formData.domain,
      ip: formData.ip,
      port: formData.port,
      serverId: formData.serverId,
      serverPassword: formData.serverPassword,
      renewalNew: formData.renewalNew,
      period: formData.period,
      billGenerated: formData.billGenerated,
      billingDate: formData.billingDate,
      licenseDetails: formData.licenseDetails,
      licenseType: formData.licenseType,
      licenseId: formData.licenseId,
      licensePassword: formData.licensePassword,
      salesPerson: formData.salesPerson,
      reminderStatus: formData.reminderStatus,
      purchaseType: formData.purchaseType,
      demoTime: formData.demoTime,
      dataPathLocation: formData.dataPathLocation,
      userStatus: formData.userStatus,
      remarks: formData.remarks
    };

    const payload = {
      name: formData.customerName,
      email: formData.email,
      service: formData.product,
      username: formData.username,
      loginDate: formData.creationDate,
      expiryDate: formData.expiryDate,
      paymentStatus: formData.paymentStatus,
      status: formData.status,
      remarks: JSON.stringify(extra),
      mobile: formData.mobile || "",
      phone: formData.phone || ""
    };

    const res = editingId
      ? await editCustomerRecord(editingId, payload)
      : await addCustomerRecord(payload);
    setSaving(false);
    if (res && res.ok) {
      if (!editingId) {
        await addNotification("user", `New customer "${formData.customerName}" added`, "System Messages");
      }
      showToast(editingId ? "Customer updated successfully" : "Customer added successfully");
      setShowFormModal(false);
    } else if (res && !res.ok) {
      showToast(res.message || "Failed to save customer");
    } else {
      showToast(editingId ? "Customer updated successfully" : "Customer added successfully");
      setShowFormModal(false);
    }
  };

  const naturalDomainCompare = (domainA, domainB) => {
    const da = String(domainA || "").trim().toLowerCase();
    const db = String(domainB || "").trim().toLowerCase();

    // Blank/empty domains must appear at the end
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;

    if (da === db) return 0;

    return da.localeCompare(db, undefined, { numeric: true, sensitivity: 'base' });
  };

  const availableDomains = useMemo(() => {
    const set = new Set();
    customerRecords.forEach(c => {
      if (c.domain) set.add(c.domain.trim());
      if (c.domainName) set.add(c.domainName.trim());
    });
    return Array.from(set).filter(Boolean).sort((a, b) => naturalDomainCompare(a, b));
  }, [customerRecords]);

  const filtered = useMemo(() => {
    // 1. Filter original customer records (without mutating original data)
    const baseFiltered = customerRecords.filter((c) => {
      const q = query.toLowerCase();
      const effStatus = effectiveStatus(c);
      const matchesQuery =
        !q ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.username || "").toLowerCase().includes(q) ||
        (c.name || c.customerName || "").toLowerCase().includes(q) ||
        (c.service || c.product || c.productService || "").toLowerCase().includes(q) ||
        (c.domain || c.domainName || "").toLowerCase().includes(q) ||
        (c.ip || c.ipAddress || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All" || effStatus === statusFilter;
      const matchesPeriod = periodFilter === "All Periods" || (c.period && c.period.trim().toLowerCase() === periodFilter.trim().toLowerCase());
      const matchesDomain = domainFilter === "All Domains" || domainFilter === "All" ||
        String(c.domain || c.domainName || "").trim().toLowerCase() === domainFilter.trim().toLowerCase();
      return matchesQuery && matchesStatus && matchesPeriod && matchesDomain;
    });

    // 2. Automatic Natural Domain Sort on the derived display copy
    const displaySorted = [...baseFiltered].sort((a, b) => {
      const da = a.domain || a.domainName || "";
      const db = b.domain || b.domainName || "";
      const cmp = naturalDomainCompare(da, db);
      if (cmp !== 0) return cmp;
      return 0; // Stable sort: preserve relative order
    });

    return displaySorted;
  }, [customerRecords, query, statusFilter, periodFilter, domainFilter]);

  const exportExcel = () => {
    const rows = filtered.map(c => {
      const custName = c.name || c.customerName || "—";
      const dom = c.domain || c.domainName || "—";
      const prod = c.productService || c.product || c.service || "—";
      const user = c.username || c.email || "—";
      const sub = c.subVendor || c.subvendor || c.subVendorName || "—";
      const licId = c.tallyNetId || c.licenseId || "—";
      const licPass = c.tallyNetPassword || c.licensePassword || "—";
      const licDet = c.licenseDetails || c.license || "—";
      const ipAddr = c.ip || c.ipAddress || "—";
      const portVal = c.port || "—";
      const sId = c.serverId || "—";
      const sPass = c.serverPassword || "—";
      const cDate = formatDate(c.creationDate || c.loginDate) || "—";
      const eDate = formatDate(c.expiryDate || c.expiry) || "—";
      const effStatus = effectiveStatus(c);
      const dLeft = c.daysLeft !== undefined && c.daysLeft !== null && c.daysLeft !== "" ? c.daysLeft : calculateDaysLeft(c.expiryDate || c.expiry);

      const normalized = {
        ...c,
        customerName: custName,
        domain: dom,
        product: prod,
        username: user,
        subVendor: sub,
        licenseId: licId,
        licensePassword: licPass,
        licenseDetails: licDet,
        ip: ipAddr,
        port: portVal,
        serverId: sId,
        serverPassword: sPass,
        creationDateFormatted: cDate,
        expiryDateFormatted: eDate,
        effectiveStatus: effStatus,
        daysLeft: dLeft,
        paymentStatus: c.paymentStatus || "Pending",
        renewalNew: c.renewalNew || c.renewalType || "New",
        dataPathLocation: c.dataPathLocation || c.dataPath || "—"
      };

      const row = {};
      VIEW_FIELDS.forEach(([label, key]) => { row[label] = normalized[key] !== undefined && normalized[key] !== null ? normalized[key] : ""; });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "my-customers.xlsx");
    showToast("Excel exported");
  };

  return (
    <div className="customers-page">
      <div className="customers-topbar">
        <p className="customers-count">{filtered.length} customers found</p>
      </div>

      <div className="table-card">
        <div className="customers-toolbar">
          <div className="search-input">
            <LuSearch size={16} />
            <input
              placeholder="Search customer, email, username, product, domain..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
          </div>

          <div className="toolbar-actions">
            <div className="filter-select">
              <LuFilter size={14} />
              <select value={domainFilter} onChange={(e) => { setDomainFilter(e.target.value); setPage(1); }}>
                <option value="All Domains">All Domains</option>
                {availableDomains.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="filter-select">
              <LuFilter size={14} />
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
            <div className="filter-select">
              <LuFilter size={14} />
              <select value={periodFilter} onChange={(e) => { setPeriodFilter(e.target.value); setPage(1); }}>
                <option value="All Periods">All Periods</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Half Yearly">Half Yearly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            <button className="toolbar-btn" onClick={exportExcel}><LuFileSpreadsheet size={15} /> Excel</button>
            <button className="toolbar-btn" onClick={() => { window.print(); showToast("Sending to printer"); }}>
              <LuDownload size={15} /> Print
            </button>
          </div>
        </div>

        <div className="scroll-x">
          <table className="data-table">
            <thead>
              <tr>
                <th>Domain Name</th>
                <th>Product/Service</th>
                <th>Username</th>
                <th>SubVendor</th>
                <th>Tally.Net ID</th>
                <th>Tally.Net Password</th>
                <th>Period</th>
                <th>Expiry Date</th>
                <th>Days Left</th>
                <th>Payment</th>
                <th>Status</th>
                <th>License</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const dom = c.domain || c.domainName || "—";
                const prod = c.productService || c.product || c.service || "—";
                const uname = c.username || c.email || "—";
                const sub = c.subVendor || c.subvendor || c.subVendorName || "—";
                const licId = c.tallyNetId || c.licenseId || "—";
                const licPass = c.tallyNetPassword || c.licensePassword || "—";
                const expiryFmt = formatDate(c.expiryDate || c.expiry) || "—";
                const effStatus = effectiveStatus(c);
                const payStatus = c.paymentStatus || "Pending";
                const licDet = c.licenseDetails || c.license || "—";
                const daysLeftVal = c.daysLeft !== undefined && c.daysLeft !== null && c.daysLeft !== "" ? c.daysLeft : calculateDaysLeft(c.expiryDate || c.expiry);

                return (
                  <tr key={c.id || c._id}>
                    <td className="strong">{dom}</td>
                    <td>{prod}</td>
                    <td>{uname}</td>
                    <td>{sub}</td>
                    <td>{licId}</td>
                    <td>{licPass}</td>
                    <td>{c.period || "—"}</td>
                    <td>{expiryFmt}</td>
                    <td><DaysLeftBadge daysLeft={daysLeftVal} /></td>
                    <td>
                      <span className={`badge badge-${payStatus.toLowerCase()}`}>
                        {payStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`badge status-${effStatus.toLowerCase()}`}>
                        {effStatus}
                      </span>
                    </td>
                    <td>{licDet}</td>
                    <td>
                      <button className="icon-action view" onClick={() => handleOpenView(c)} title="View Full Details">
                        <LuEye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="13" className="empty-row">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ============ ADD / EDIT MODAL ============ */}
      {showFormModal && (
        <div className="modal-overlay">
          <form className="modal-card modal-card-wide" onSubmit={handleSubmit} autoComplete="off">
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? "Edit Customer" : "Add New Customer"}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowFormModal(false)}>
                <LuX size={18} />
              </button>
            </div>
            <div className="modal-body modal-body-scroll">

              <p className="cust-section-title">Basic Details</p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input className="form-input" name="customerName" value={formData.customerName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Id *</label>
                  <input className="form-input" type="email" name="email" value={formData.email} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Sales Person</label>
                  <input className="form-input" name="salesPerson" value={formData.salesPerson} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Purchase Type</label>
                  <select className="form-select" name="purchaseType" value={formData.purchaseType} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    <option value="Direct">Direct</option>
                    <option value="Partner">Partner</option>
                    <option value="Demo">Demo</option>
                    <option value="Trial">Trial</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Demo Time</label>
                  <input className="form-input" name="demoTime" value={formData.demoTime} onChange={handleChange} placeholder="e.g. 7 days" />
                </div>
              </div>

              <p className="cust-section-title">Server Details</p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Port *</label>
                  <input className="form-input" name="port" value={formData.port} onChange={handleChange} placeholder="3389" />
                </div>
                <div className="form-group">
                  <label className="form-label">Server Id *</label>
                  <input className="form-input" name="serverId" value={formData.serverId} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Server Password *</label>
                  <input className="form-input" name="serverPassword" value={formData.serverPassword} onChange={handleChange} autoComplete="new-password" />
                </div>
                <div className="form-group">
                  <label className="form-label">Data Path Location</label>
                  <input className="form-input" name="dataPathLocation" value={formData.dataPathLocation} onChange={handleChange} placeholder="D:\TallyData\Client01" />
                </div>
              </div>

              <p className="cust-section-title">Product &amp; Subscription</p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Product/Service *</label>
                  <input className="form-input" name="product" value={formData.product} onChange={handleChange} placeholder="Tally on Cloud - Silver" />
                </div>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input className="form-input" name="username" value={formData.username} onChange={handleChange} autoComplete="off" />
                </div>
                <div className="form-group">
                  <label className="form-label">Renewal/New</label>
                  <select className="form-select" name="renewalNew" value={formData.renewalNew} onChange={handleChange}>
                    <option value="New">New</option>
                    <option value="Renewal">Renewal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Period</label>
                  <select className="form-select" name="period" value={formData.period} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half Yearly">Half Yearly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Creation Date *</label>
                  <input className="form-input" type="date" name="creationDate" value={formData.creationDate} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date *</label>
                  <input className="form-input" type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} />
                </div>
              </div>

              <p className="cust-section-title">License Details</p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">License Type</label>
                  <select className="form-select" name="licenseType" value={formData.licenseType} onChange={handleChange}>
                    <option value="">-- Select --</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Rental">Rental</option>
                    <option value="Educational">Educational</option>
                    <option value="Customer Owned">Customer Owned</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">License Id</label>
                  <input className="form-input" name="licenseId" value={formData.licenseId} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">License Password</label>
                  <input className="form-input" name="licensePassword" value={formData.licensePassword} onChange={handleChange} autoComplete="new-password" />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">License Details</label>
                  <input className="form-input" name="licenseDetails" value={formData.licenseDetails} onChange={handleChange} placeholder="Serial no / admin email etc." />
                </div>
              </div>

              <p className="cust-section-title">Billing &amp; Status</p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Payment Status</label>
                  <select className="form-select" name="paymentStatus" value={formData.paymentStatus} onChange={handleChange}>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bill Generated</label>
                  <select className="form-select" name="billGenerated" value={formData.billGenerated} onChange={handleChange}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Billing Date</label>
                  <input className="form-input" type="date" name="billingDate" value={formData.billingDate} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Reminder Status</label>
                  <select className="form-select" name="reminderStatus" value={formData.reminderStatus} onChange={handleChange}>
                    <option value="Pending">Pending</option>
                    <option value="Sent">Sent</option>
                    <option value="Not Required">Not Required</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">User Status</label>
                  <select className="form-select" name="userStatus" value={formData.userStatus} onChange={handleChange}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Locked">Locked</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" name="status" value={formData.status} onChange={handleChange}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Remarks</label>
                  <textarea className="form-textarea" rows="2" name="remarks" value={formData.remarks} onChange={handleChange} />
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : (editingId ? "Update Customer" : "Add Customer")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============ VIEW DETAILS MODAL ============ */}
      {showViewModal && selected && (
        <div className="modal-overlay">
          <div className="modal-card modal-card-wide">
            <div className="modal-header">
              <h3 className="modal-title">Customer Details — {selected.customerName}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowViewModal(false)}>
                <LuX size={18} />
              </button>
            </div>
            <div className="modal-body modal-body-scroll">
              <div className="cust-detail-grid">
                {MODAL_VIEW_FIELDS.map(([label, key]) => (
                  <div className="cust-detail-item" key={key}>
                    <span className="cust-detail-label">{label}</span>
                    <span className="cust-detail-value">
                      {key === "daysLeft"
                        ? (selected.daysLeft === null || selected.daysLeft === undefined ? "—" : `${selected.daysLeft} days`)
                        : (selected[key] !== undefined && selected[key] !== null && selected[key] !== "" ? String(selected[key]) : "—")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE CONFIRMATION MODAL ============ */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Delete</h3>
              <button type="button" className="modal-close-btn" onClick={() => !isDeleting && setShowDeleteModal(false)} disabled={isDeleting}>
                <LuX size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this vendor?</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancel</button>
              <button type="button" className="btn-primary" style={{ background: "#ef4444", border: "none" }} onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
