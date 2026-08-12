import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  LuSearch, LuPrinter, LuFileSpreadsheet, LuFilter, LuPlus, LuUpload,
  LuEye, LuEyeOff, LuPencil, LuTrash2, LuX, LuChevronLeft, LuChevronRight, LuUserPlus
} from "react-icons/lu";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";
import { toISODate, calculateExpiryDate, calculateDaysLeft, formatDate, getEffectiveStatus } from "../../utils/dateUtils";
import "./Customers.css";

const PAGE_SIZE = 8;

const EMPTY_FORM = {
  parentVendorId: "", vendorId: "", customerName: "", domain: "", ip: "", port: "",
  serverId: "", serverPassword: "", product: "", username: "",
  subVendor: "", creationDate: "", renewalNew: "New", period: "", expiryDate: "",
  paymentStatus: "Pending", billGenerated: "No", email: "", billingDate: "",
  licenseDetails: "", licenseType: "", licenseId: "", licensePassword: "",
  salesPerson: "", reminderStatus: "Pending", remarks: "", purchaseType: "",
  demoTime: "", dataPathLocation: "", userStatus: "Active", status: "Active",
  daysLeft: ""
};

const EMPTY_ADD_USER_FORM = {
  parentVendorId: "", vendorId: "", vendorName: "", companyName: "", productService: "",
  fullName: "", email: "", mobile: "", username: "", password: "", confirmPassword: "",
  employeeId: "", designation: "", department: "", role: "", reportingManager: "",
  userStatus: "Active", loginStatus: "Allowed", twoFactorAuth: "Disabled", accountExpiryDate: "", lastWorkingDate: "",
  officePhone: "", alternateMobile: "", officeEmail: "", address: "", city: "", state: "", country: "", pinCode: "",
  joiningDate: "", notes: "", daysLeft: ""
};

const VIEW_FIELDS = [
  ["Vendor ID", "vendorId"], ["Customer/Company Name", "customerName"], ["Domain", "domain"], ["IP", "ip"], ["Port", "port"],
  ["Server Id", "serverId"], ["Server Password", "serverPassword"],
  ["Product/Service", "product"], ["Sub Vendor", "subVendor"], ["Username", "username"],
  ["Creation Date", "creationDate"], ["Renewal/New", "renewalNew"],
  ["Period", "period"], ["Expiry Date", "expiryDate"], ["Days Left", "daysLeft"],
  ["Payment Status", "paymentStatus"], ["Bill Generated", "billGenerated"],
  ["Email Id", "email"], ["Billing Date", "billingDate"], ["Created By", "createdBy"],
  ["License Details", "licenseDetails"], ["License Type", "licenseType"],
  ["Tally.Net ID", "licenseId"], ["Tally.Net Password", "licensePassword"],
  ["Sales Person", "salesPerson"], ["Reminder Status", "reminderStatus"],
  ["Remarks", "remarks"], ["Purchase Type", "purchaseType"], ["Demo Time", "demoTime"],
  ["Data Path Location", "dataPathLocation"], ["User Status", "userStatus"], ["Status", "status"]
];

// Placeholder glyphs are display-only. If they reach the edit form they get
// saved into the database as literal strings, so strip them on the way in.
const clean = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return (s === "—" || s === "-" || s === "N/A") ? "" : v;
};

// The backend and this form use different names for the same fields. Mapping
// them explicitly is what stops an edit from silently blanking a record.
//   vendor record  ->  form field
//   name              customerName
//   productService    product
//   renewalType       renewalNew
//   tallyNetId        licenseId
//   tallyNetPassword  licensePassword
//   dataPath          dataPathLocation
function recordToForm(record) {
  const r = record || {};
  const pick = (...keys) => {
    for (const k of keys) {
      const v = clean(r[k]);
      if (v !== "" && v !== undefined) return v;
    }
    return "";
  };

  const toDateInput = (v) => {
    const raw = clean(v);
    if (!raw) return "";
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  };

  return {
    ...EMPTY_FORM,
    parentVendorId: pick("parentVendorId"),
    vendorId: pick("vendorId"),
    customerName: pick("customerName", "name"),
    domain: pick("domain", "domainName"),
    ip: pick("ip", "ipAddress"),
    port: pick("port"),
    serverId: pick("serverId"),
    serverPassword: pick("serverPassword"),
    product: pick("product", "productService", "service"),
    subVendor: pick("subVendor"),
    username: pick("username"),
    creationDate: toDateInput(pick("creationDate", "loginDate")),
    renewalNew: pick("renewalNew", "renewalType") || "New",
    period: pick("period"),
    expiryDate: toDateInput(pick("expiryDate", "expiry")),
    paymentStatus: pick("paymentStatus") || "Pending",
    billGenerated: pick("billGenerated") || "No",
    email: pick("email"),
    billingDate: toDateInput(pick("billingDate")),
    licenseDetails: pick("licenseDetails", "license"),
    licenseType: pick("licenseType"),
    licenseId: pick("licenseId", "tallyNetId"),
    licensePassword: pick("licensePassword", "tallyNetPassword"),
    salesPerson: pick("salesPerson"),
    reminderStatus: pick("reminderStatus") || "Pending",
    remarks: pick("remarks"),
    purchaseType: pick("purchaseType"),
    demoTime: pick("demoTime"),
    dataPathLocation: pick("dataPathLocation", "dataPath"),
    userStatus: pick("userStatus") || "Active",
    status: pick("status") || "Active",
    daysLeft: clean(r.daysLeft) === "" ? "" : Number(r.daysLeft) || 0,
    mobile: pick("mobile", "phone"),
    phone: pick("phone", "mobile")
  };
}

// A vendor row that has a parentVendorId IS a sub vendor. A child user row's
// sub vendor is the vendor it sits under (when that vendor has a parent).
// An explicit `subVendor` field on the record always wins.
function resolveSubVendor(record, parentVendor) {
  const r = record || {};
  if (clean(r.subVendor)) return r.subVendor;
  if (r.parentVendorId) return r.name || r.customerName || r.parentVendorName || "";
  if (parentVendor && parentVendor.parentVendorId) {
    return parentVendor.name || parentVendor.customerName || "";
  }
  return "";
}

function DaysLeftBadge({ daysLeft }) {
  if (daysLeft === null || daysLeft === undefined || daysLeft === "") return <span className="badge badge-muted">—</span>;
  if (daysLeft < 0) return <span className="badge badge-overdue">{daysLeft} Days</span>;
  if (daysLeft <= 7) return <span className="badge badge-pending">{daysLeft} Days</span>;
  return <span className="badge badge-paid">{daysLeft} Days</span>;
}

// Auto-derive effective status from the customer's actual Expiry Date.
// If stored status is "Active" but expiryDate is before today → "Expired".
// Other statuses (Inactive, Suspended, Expired) are kept as-is.
function effectiveStatus(record) {
  const stored = (record && record.status) || "Active";
  if (stored !== "Active") return stored;

  const raw = record && (record.expiryDate || record.expiry);
  if (!raw) return stored;

  const expiry = new Date(raw);
  if (isNaN(expiry.getTime())) return stored;

  // Compare calendar dates only (no timezone shift)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < today) return "Expired";
  return stored;
}

// Dummy User Generator: Safe version that handles undefined/null values
// Dummy data generator removed

export default function Customers() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialStatusParam = searchParams.get("status");

  const { customers, addCustomer, editCustomer, deleteCustomer, addNotification, vendors, addVendor, editVendor, deleteVendor, refreshAll } = useData();
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("All Domains");
  const [statusFilter, setStatusFilter] = useState(initialStatusParam || "All");
  const [periodFilter, setPeriodFilter] = useState("All Periods");
  const [page, setPage] = useState(1);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [showVendorName, setShowVendorName] = useState(false);

  // "domain" = one flat list ordered by domain (all as1, then as2, then as3).
  // "vendor" = the original view, vendors with their customers nested.
  const [groupMode, setGroupMode] = useState("domain");

  // CHANGED: Ab sirf ek hi row expand hogi at a time
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  // 'vendor' = row from the vendors collection, 'user' = child row from users.
  // Previously this was inferred by searching the customers array, which
  // misrouted the save whenever an id happened to exist in both.
  const [editingType, setEditingType] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [paymentEditModal, setPaymentEditModal] = useState(null);
  const [paymentEditStatus, setPaymentEditStatus] = useState("Pending");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const importInputRef = useRef(null);

  // Excel import preview state. The file is parsed into `importPreview`, the
  // user confirms in a modal, and only then are rows sent to the server.
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importDefaultVendorId, setImportDefaultVendorId] = useState("");
  const [importProgress, setImportProgress] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importFilter, setImportFilter] = useState("all");

  // Import Excel by Vendor state (automatic existing vendor assignment)
  const importByVendorInputRef = useRef(null);
  const [showVendorImportModal, setShowVendorImportModal] = useState(false);
  const [vendorImportPreview, setVendorImportPreview] = useState(null);
  const [vendorImportProgress, setVendorImportProgress] = useState(null);
  const [vendorImportResult, setVendorImportResult] = useState(null);
  const [vendorImportFilter, setVendorImportFilter] = useState("all");


  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserFormData, setAddUserFormData] = useState(EMPTY_ADD_USER_FORM);
  const [showLicensePassword, setShowLicensePassword] = useState(false);
  const [showAddUserPassword, setShowAddUserPassword] = useState(false);
  const [showAddUserConfirmPassword, setShowAddUserConfirmPassword] = useState(false);

  const vendorRecords = vendors || [];
  const addCustomerRecord = addVendor;
  const editCustomerRecord = editVendor;
  const deleteCustomerRecord = deleteVendor;


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };

      if (name === 'parentVendorId') {
        const selectedVendor = (vendors || []).find(v => String(v._id || v.id) === String(value));
        next.vendorId = selectedVendor ? (selectedVendor.vendorId || "") : "";
      }


      // 1. Selecting a Period fills today's date automatically if Creation
      //    Date is still blank, then derives Expiry from it. Previously both
      //    fields had to already be set, so picking a period did nothing.
      if (name === 'period' && value && !next.creationDate) {
        next.creationDate = new Date().toISOString().slice(0, 10);
      }

      if ((name === 'period' || name === 'creationDate') && next.creationDate && next.period) {
        next.expiryDate = calculateExpiryDate(next.creationDate, next.period);
      }

      // 2. Auto-calculate Days Left based on Expiry Date
      if (next.expiryDate) {
        next.daysLeft = calculateDaysLeft(next.expiryDate);
      } else {
        next.daysLeft = 0;
      }

      return next;
    });
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setEditingType(null);
    setShowLicensePassword(false);
    const today = new Date().toISOString().slice(0, 10);

    setFormData({
      ...EMPTY_FORM,
      vendorId: "",
      username: "",
      licensePassword: "",
      creationDate: today
    });
    setShowFormModal(true);
  };

  // IMPORTANT: `record` must be the raw API record, never a display-merged
  // object. Passing a merged row here is what copied the parent vendor's
  // values onto the child user and produced duplicate-looking rows.
  const handleOpenEdit = (record, type) => {
    setEditingId(record._id || record.id);
    setEditingType(type);
    setFormData(recordToForm(record));
    setShowFormModal(true);
  };

  const handleCloseForm = () => {
    setShowFormModal(false);
    setEditingId(null);
    setEditingType(null);
    setFormData(EMPTY_FORM);
  };

  // `record` is the raw record used for editing; `display` may be a merged
  // view object. Keeping them separate stops merged values being saved.
  const handleOpenView = (display, record, type) => {
    setSelected(display);
    setSelectedRecord(record || display);
    setSelectedType(type);
    setShowViewModal(true);
  };

  const handleUserFormChange = (e) => {
    const { name, value } = e.target;
    setAddUserFormData(prev => {
      const next = { ...prev, [name]: value };

      if (next.accountExpiryDate) {
        const expDate = new Date(next.accountExpiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!isNaN(expDate.getTime())) {
          const diffTime = expDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          next.daysLeft = diffDays > 0 ? diffDays : 0;
        } else {
          next.daysLeft = 0;
        }
      }

      return next;
    });
  };

  const handleAddUser = (parentVendor) => {
    setAddUserFormData({
      ...EMPTY_ADD_USER_FORM,
      vendorId: parentVendor.vendorId,
      parentVendorId: parentVendor._id || parentVendor.id,
      vendorName: parentVendor.name || parentVendor.customerName,
      companyName: parentVendor.name || parentVendor.customerName,
      productService: parentVendor.productService || parentVendor.product || ""
    });
    setShowAddUserModal(true);
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!addUserFormData.fullName || !addUserFormData.email || !addUserFormData.mobile || !addUserFormData.username || !addUserFormData.password || !addUserFormData.confirmPassword) {
      showToast("Please fill all required fields");
      return;
    }
    if (addUserFormData.password !== addUserFormData.confirmPassword) {
      showToast("Passwords do not match");
      return;
    }

    setSaving(true);
    const newChild = {
      parentVendorId: addUserFormData.parentVendorId,
      vendorId: addUserFormData.vendorId,
      name: addUserFormData.fullName,
      email: addUserFormData.email,
      mobile: addUserFormData.mobile,
      username: addUserFormData.username,
      password: addUserFormData.password,
      role: addUserFormData.role || "User",
      status: addUserFormData.userStatus || "Active",
      service: addUserFormData.productService || ""
    };

    const res = await addCustomer(newChild);
    setSaving(false);

    if (res && res.ok) {
      showToast("Associated user added successfully");
      setShowAddUserModal(false);
    } else {
      showToast(res?.message || "Failed to add user");
    }
  };

  const handleOpenPaymentEdit = (customer, isChild = true) => {
    const currentStatus = customer.paymentStatus || "Pending";
    setPaymentEditModal({ customer, isChild });
    setPaymentEditStatus(currentStatus);
  };

  const handleSavePaymentStatus = async (e) => {
    if (e) e.preventDefault();
    if (!paymentEditModal || !paymentEditModal.customer) return;

    const targetCustomer = paymentEditModal.customer;
    const customerId = String(targetCustomer._id || targetCustomer.id);
    const isChild = paymentEditModal.isChild;
    const newStatus = paymentEditStatus;

    setPaymentSaving(true);
    try {
      let res;
      if (isChild) {
        res = await editCustomer(customerId, { paymentStatus: newStatus });
      } else {
        res = await editVendor(customerId, { paymentStatus: newStatus });
      }

      if (res && res.ok) {
        showToast(`Payment status updated to ${newStatus}`);
        setPaymentEditModal(null);
      } else {
        showToast(res?.message || "Failed to update payment status");
      }
    } catch (err) {
      console.error("Payment status update error:", err);
      showToast("Error updating payment status");
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleStatusChange = async (record, newStatus, isChild) => {
    const recordId = String(record._id || record.id);
    // Send only the field being changed. Spreading the whole record sent
    // _id back to the server, which Mongo refuses to $set.
    const payload = { status: newStatus };
    let res;
    if (isChild) {
      res = await editCustomer(recordId, payload);
    } else {
      res = await editVendor(recordId, payload);
    }
    if (res && res.ok) {
      showToast(`Status updated to ${newStatus}`);
    } else {
      showToast(res?.message || "Failed to update status");
    }
  };

  const handleDelete = async (c) => {
    const customerId = String(c._id || c.id);
    if (!customerId || customerId === "undefined") {
      showToast("Error: Customer ID not found");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${c.customerName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingId(customerId);
    try {
      const res = await deleteCustomer(customerId);
      if (res && res.ok) {
        showToast(`${c.customerName} removed successfully`);
      } else {
        showToast(res?.message || "Failed to delete");
      }
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete customer");
    } finally {
      setIsDeletingId(null);
    }
  };

  // CHANGED: Toggles only one row and closes the previous one
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerName.trim()) return;

    setSaving(true);
    const parentVendor = vendors.find(v => String(v._id || v.id) === String(formData.parentVendorId));
    const parentVendorName = parentVendor ? parentVendor.name : "";

    const payload = {
      parentVendorId: formData.parentVendorId,
      parentVendorName: parentVendorName,
      vendorId: formData.vendorId,
      name: formData.customerName,
      email: formData.email,
      productService: formData.product,
      subVendor: formData.subVendor,
      domain: formData.domain,
      ip: formData.ip,
      port: formData.port,
      serverId: formData.serverId,
      serverPassword: formData.serverPassword,
      username: formData.username,
      password: formData.password || "",
      renewalType: formData.renewalNew,
      creationDate: formData.creationDate,
      expiryDate: formData.expiryDate,
      period: formData.period,
      paymentStatus: formData.paymentStatus,
      billGenerated: formData.billGenerated,
      billingDate: formData.billingDate,
      licenseDetails: formData.licenseDetails,
      licenseType: formData.licenseType,
      tallyNetId: formData.licenseId,
      tallyNetPassword: formData.licensePassword,
      salesPerson: formData.salesPerson,
      reminderStatus: formData.reminderStatus,
      purchaseType: formData.purchaseType,
      demoTime: formData.demoTime,
      dataPathLocation: formData.dataPathLocation,
      userStatus: formData.userStatus,
      status: formData.status,
      remarks: formData.remarks,
      mobile: formData.mobile || "",
      phone: formData.phone || ""
    };

    let res;
    if (editingId) {
      // editingType is set when the edit button is clicked, so a child user
      // is never saved through the vendor endpoint (or vice versa).
      res = editingType === 'user'
        ? await editCustomer(editingId, payload)
        : await editVendor(editingId, payload);
    } else {
      // "Add Customer" creates a CUSTOMER under the selected vendor, not a
      // new vendor. Vendors are created from the Vendors page.
      if (!formData.parentVendorId) {
        setSaving(false);
        showToast("Please select a vendor first");
        return;
      }
      res = await addCustomer(payload);
    }
    setSaving(false);
    if (res && res.ok) {
      if (!editingId) {
        const vendorLabel = parentVendorName || "vendor";
        await addNotification("info", `New customer "${formData.customerName}" added under ${vendorLabel}`, "System Messages");
      }
      showToast(editingId ? "Updated successfully" : "Customer added successfully");
      handleCloseForm();
    } else {
      showToast(res?.message || "Failed to save");
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
    (vendorRecords || []).forEach(v => {
      if (v.domain) set.add(v.domain.trim());
      if (v.domainName) set.add(v.domainName.trim());
    });
    (customers || []).forEach(c => {
      if (c.domain) set.add(c.domain.trim());
      if (c.domainName) set.add(c.domainName.trim());
    });
    return Array.from(set).filter(Boolean).sort((a, b) => naturalDomainCompare(a, b));
  }, [vendorRecords, customers]);

  const filtered = useMemo(() => {
    // 1. Filter original vendor records (without mutating original data)
    const baseFiltered = vendorRecords.filter((c) => {
      const cid = String(c.id || c._id);
      if (hiddenIds.some(id => String(id) === cid)) return false;

      const q = query.toLowerCase();
      const matchesQuery = !q || String(c.vendorId || "").toLowerCase().includes(q) || String(c.name || c.customerName || "").toLowerCase().includes(q) ||
        String(c.email || "").toLowerCase().includes(q) || String(c.username || "").toLowerCase().includes(q) ||
        String(c.productService || c.product || "").toLowerCase().includes(q) || String(c.domain || c.domainName || "").toLowerCase().includes(q) ||
        String(c.ip || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All" || effectiveStatus(c) === statusFilter;
      const matchesPeriod = periodFilter === "All Periods" || c.period === periodFilter;

      const matchesDomain = domainFilter === "All Domains" || domainFilter === "All" ||
        String(c.domain || c.domainName || "").trim().toLowerCase() === domainFilter.trim().toLowerCase() ||
        (customers || []).some(u =>
          (String(u.parentVendorId) === cid || (c.vendorId && String(u.vendorId) === String(c.vendorId))) &&
          String(u.domain || u.domainName || "").trim().toLowerCase() === domainFilter.trim().toLowerCase()
        );

      return matchesQuery && matchesStatus && matchesPeriod && matchesDomain;
    });

    // 2. Automatic Natural Domain Sort on the derived display copy
    const getEffectiveDomain = (c) => {
      if (c.domain || c.domainName) return (c.domain || c.domainName).trim().toLowerCase();
      const cid = String(c._id || c.id);
      const child = (customers || []).find(
        u => (String(u.parentVendorId) === cid || (c.vendorId && String(u.vendorId) === String(c.vendorId))) && (u.domain || u.domainName)
      );
      return child ? (child.domain || child.domainName).trim().toLowerCase() : "";
    };

    const displaySorted = [...baseFiltered].sort((a, b) => {
      const da = getEffectiveDomain(a);
      const db = getEffectiveDomain(b);

      const cmp = naturalDomainCompare(da, db);
      if (cmp !== 0) return cmp;

      // Stable sort: keep relative readable order inside group
      return String(a.vendorId || a.name || "").localeCompare(
        String(b.vendorId || b.name || ""),
        undefined,
        { numeric: true, sensitivity: 'base' }
      );
    });

    return displaySorted;
  }, [vendorRecords, customers, query, statusFilter, periodFilter, domainFilter, hiddenIds]);

  const totalPages = 1;
  const paginated = filtered;

  // ------------------------------------------------------------------
  // Domain-first view
  //
  // The vendor-nested table can never put every as1 row together, because
  // domains live on the customer records and those sit inside different
  // vendors. This builds one flat list of every visible record - vendor rows
  // and customer rows alike - ordered strictly by domain, so all as1.* rows
  // come first, then all as2.*, then as3.*. A newly added as1 record sorts
  // into the as1 block automatically instead of landing at the bottom.
  // ------------------------------------------------------------------
  const formatDate = (value) => {
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
  };

  const domainOfRecord = (r) =>
    String(r.domain || r.domainName || "").trim().toLowerCase();

  const domainRows = useMemo(() => {
    if (groupMode !== "domain") return [];

    const q = query.toLowerCase();
    const matchesSearch = (r) =>
      !q ||
      String(r.vendorId || "").toLowerCase().includes(q) ||
      String(r.name || r.customerName || "").toLowerCase().includes(q) ||
      String(r.email || "").toLowerCase().includes(q) ||
      String(r.username || "").toLowerCase().includes(q) ||
      String(r.productService || r.product || "").toLowerCase().includes(q) ||
      String(r.domain || r.domainName || "").toLowerCase().includes(q) ||
      String(r.ip || "").toLowerCase().includes(q);

    const passesFilters = (r) => {
      if (!matchesSearch(r)) return false;
      if (statusFilter !== "All" && effectiveStatus(r) !== statusFilter) return false;
      if (periodFilter !== "All Periods" && r.period !== periodFilter) return false;
      if (domainFilter !== "All Domains" && domainFilter !== "All") {
        if (domainOfRecord(r) !== domainFilter.trim().toLowerCase()) return false;
      }
      return true;
    };

    const rows = [];

    (vendorRecords || []).forEach((v) => {
      const vid = String(v._id || v.id);
      if (hiddenIds.some((id) => String(id) === vid)) return;
      if (passesFilters(v)) {
        rows.push({ kind: "vendor", record: v, vendor: v, domain: domainOfRecord(v) });
      }
    });

    (customers || []).forEach((u) => {
      const parent = (vendorRecords || []).find(
        (v) =>
          String(u.parentVendorId) === String(v._id || v.id) ||
          (v.vendorId && String(u.vendorId) === String(v.vendorId))
      );
      if (parent && hiddenIds.some((id) => String(id) === String(parent._id || parent.id))) return;
      if (!passesFilters(u)) return;
      rows.push({
        kind: "user",
        record: u,
        vendor: parent || null,
        // A customer with no domain of its own inherits the vendor's, so it
        // still lands in the right block instead of dropping to the bottom.
        domain: domainOfRecord(u) || (parent ? domainOfRecord(parent) : "")
      });
    });

    rows.sort((a, b) => {
      const cmp = naturalDomainCompare(a.domain, b.domain);
      if (cmp !== 0) return cmp;
      // Inside one domain: vendor row first, then its customers by name.
      const va = String(a.vendor?.name || "");
      const vb = String(b.vendor?.name || "");
      if (va !== vb) return va.localeCompare(vb, undefined, { numeric: true, sensitivity: "base" });
      if (a.kind !== b.kind) return a.kind === "vendor" ? -1 : 1;
      return String(a.record.name || a.record.customerName || "").localeCompare(
        String(b.record.name || b.record.customerName || ""),
        undefined,
        { numeric: true, sensitivity: "base" }
      );
    });

    return rows;
  }, [groupMode, vendorRecords, customers, query, statusFilter, periodFilter, domainFilter, hiddenIds]);

  const exportExcel = () => {
    const rows = filtered.map(c => {
      const row = {};
      VIEW_FIELDS.forEach(([label, key]) => { row[label] = c[key] !== undefined && c[key] !== null ? c[key] : ""; });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Companies");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "my-companies.xlsx");
    showToast("Excel exported");
  };

  // Header matching ignores case, spaces and punctuation, so "Email Id",
  // "EMAIL ID" and "email_id" all resolve to the same field.
  const normHeader = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");

  const buildIndex = (row) => {
    const idx = {};
    Object.keys(row).forEach((k) => {
      const key = normHeader(k);
      const val = row[k];
      const hasVal = val !== undefined && val !== null && String(val).trim() !== "";
      // Sheets often carry near-duplicate headers as separate columns.
      // Never let a blank one overwrite a filled one.
      if (hasVal || idx[key] === undefined) idx[key] = val;
    });
    return idx;
  };

  const cell = (idx, ...labels) => {
    for (const l of labels) {
      const v = idx[normHeader(l)];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };

  const rowToCustomer = (idx, name) => {
    const rawCreationDate = cell(idx, "Creation Date", "Login Date", "Created", "Start Date");
    const creationDate = toISODate(rawCreationDate) || new Date().toISOString().slice(0, 10);
    const period = cell(idx, "Period");
    // ALWAYS automatically calculate Expiry Date from Creation Date + Period (never rely on Excel Expiry Date value)
    const expiryDate = calculateExpiryDate(creationDate, period);
    const daysLeft = calculateDaysLeft(expiryDate);

    return {
      name,
      email: cell(idx, "Email Id", "Email", "Email Address", "Gmail"),
      mobile: cell(idx, "Mobile", "Phone", "Contact", "Mobile No"),
      phone: cell(idx, "Phone", "Mobile", "Contact"),
      domainName: cell(idx, "Domain", "Domain Name"),
      domain: cell(idx, "Domain", "Domain Name"),
      ip: cell(idx, "IP Address", "IP", "Ip"),
      port: cell(idx, "Port"),
      serverId: cell(idx, "Server Id", "Server ID"),
      serverPassword: cell(idx, "Server Password"),
      productService: cell(idx, "Product/Service", "Product", "Service"),
      subVendor: cell(idx, "Sub Vendor", "SubVendor"),
      username: cell(idx, "Username", "User Name"),
      password: cell(idx, "Password"),
      loginDate: creationDate,
      creationDate: creationDate,
      period: period,
      expiryDate: expiryDate,
      daysLeft: daysLeft,
      renewalType: cell(idx, "Renewal/New", "Renewal Type", "Renewal"),
      paymentStatus: cell(idx, "Payment Status", "Payment") || "Pending",
      billGenerated: cell(idx, "Bill Generated"),
      billingDate: toISODate(cell(idx, "Billing Date")),
      licenseType: cell(idx, "License Type"),
      license: cell(idx, "License Details", "License"),
      tallyNetId: cell(idx, "Tally.Net ID", "TallyNet Id", "License Id"),
      tallyNetPassword: cell(idx, "Tally.Net Password", "TallyNet Password", "License Password"),
      salesPerson: cell(idx, "Sales Person", "Salesperson"),
      reminderStatus: cell(idx, "Reminder Status") || "Pending",
      purchaseType: cell(idx, "Purchase Type"),
      demoTime: cell(idx, "Demo Time"),
      dataPathLocation: cell(idx, "Data Path Location", "Data Path"),
      userStatus: cell(idx, "User Status") || "Active",
      status: cell(idx, "Status") || "Active",
      remarks: cell(idx, "Remarks", "Notes")
    };
  };

  // Reads the file and builds a preview. Nothing is sent to the server here -
  // the user confirms in the modal first, so a bad sheet can no longer half
  // import and leave the table in a strange state.
  const importExcel = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), {
        type: "array",
        cellDates: true
      });

      const sheetName = workbook.SheetNames[0];
      const firstSheet = sheetName ? workbook.Sheets[sheetName] : null;
      if (!firstSheet) {
        showToast("This file has no readable sheet");
        return;
      }

      // raw:true + cellDates means real date cells arrive as Date objects
      // instead of being pre-formatted into an ambiguous "1/15/27" string.
      const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: true });
      if (!rawRows.length) {
        showToast(`Sheet "${sheetName}" has no data rows`);
        return;
      }

      const headers = Object.keys(rawRows[0] || {});

      const items = rawRows.map((raw, i) => {
        const idx = buildIndex(raw);
        const name = cell(
          idx,
          "Customer/Company Name", "Customer Name", "Company Name",
          "Name", "Full Name", "Client Name", "Vendor Name"
        );

        // Match a vendor by id, then by name. Unmatched rows are NOT dropped -
        // they fall back to the vendor chosen in the modal.
        const vId = cell(idx, "Vendor ID", "VendorId", "vendor_id");
        const vName = cell(idx, "Vendor Name", "Vendor", "Parent Vendor");
        let vendor = null;
        if (vId) {
          vendor = (vendors || []).find(
            (v) => String(v.vendorId || "").toLowerCase() === vId.toLowerCase()
          ) || null;
        }
        if (!vendor && vName) {
          vendor = (vendors || []).find(
            (v) => String(v.name || "").toLowerCase() === vName.toLowerCase()
          ) || null;
        }

        const data = rowToCustomer(idx, name);
        const isDuplicate = customers.some(
          c => c.username && data.username && c.username.toLowerCase() === data.username.toLowerCase()
        );

        return {
          rowNo: i + 2,
          name,
          matchedVendor: vendor,
          data,
          isDuplicate,
          error: name ? "" : "No customer name in this row"
        };
      });

      setImportPreview({
        fileName: file.name,
        sheetName,
        headers,
        items,
        totalRows: rawRows.length
      });
      setImportDefaultVendorId(
        (vendors || []).length === 1 ? String(vendors[0]._id || vendors[0].id) : ""
      );
      setImportResult(null);
      setImportProgress(null);
      setShowImportModal(true);
    } catch (error) {
      console.error("Excel import failed:", error);
      showToast(`Could not read this file: ${error.message}`);
    }
  };

  // Rows the user will actually import, once the fallback vendor is applied.
  const importableItems = useMemo(() => {
    if (!importPreview) return [];
    return importPreview.items.map((item) => {
      const vendor =
        item.matchedVendor ||
        (vendors || []).find(
          (v) => String(v._id || v.id) === String(importDefaultVendorId)
        ) ||
        null;
      const error = item.error || (vendor ? "" : "No vendor - choose one above");
      return { ...item, vendor, error };
    });
  }, [importPreview, importDefaultVendorId, vendors]);

  const displayedImportableItems = useMemo(() => {
    if (!importableItems) return [];
    if (importFilter === "ready") return importableItems.filter((i) => !i.error && !i.isDuplicate);
    if (importFilter === "duplicate") return importableItems.filter((i) => !i.error && i.isDuplicate);
    if (importFilter === "issues") return importableItems.filter((i) => i.error);
    return importableItems;
  }, [importableItems, importFilter]);

  const confirmImport = async () => {
    const ready = importableItems.filter((i) => !i.error && !i.isDuplicate);
    if (!ready.length) {
      showToast("Nothing to import - every row has an issue");
      return;
    }

    setImportProgress({ done: 0, total: ready.length });
    let imported = 0;
    const failures = [];

    // Sequential, not Promise.all: the backend creates a login account and a
    // notification per record, and firing them together dropped rows.
    for (let i = 0; i < ready.length; i++) {
      const item = ready[i];
      const payload = {
        ...item.data,
        parentVendorId: String(item.vendor._id || item.vendor.id),
        parentVendorName: item.vendor.name || "",
        vendorId: item.vendor.vendorId || ""
      };
      try {
        const res = await addCustomer(payload);
        if (res && res.ok) imported++;
        else failures.push(`Row ${item.rowNo} (${item.name}): ${res?.message || "rejected by server"}`);
      } catch (err) {
        failures.push(`Row ${item.rowNo} (${item.name}): ${err.message}`);
      }
      setImportProgress({ done: i + 1, total: ready.length });
    }

    const skipped = importableItems.filter((i) => i.error || i.isDuplicate);
    setImportResult({ imported, attempted: ready.length, failures, skipped });
    setImportProgress(null);

    if (imported) {
      if (refreshAll) await refreshAll();
      await addNotification("info", `${imported} customer(s) imported from Excel`, "System Messages");
    }
    showToast(`${imported} of ${ready.length} customers imported`);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportPreview(null);
    setImportResult(null);
    setImportProgress(null);
    setImportFilter("all");
  };

  // Import Excel by Vendor: automatically matches existing vendors by Vendor ID or Vendor Name
  const importExcelByVendor = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), {
        type: "array",
        cellDates: true
      });

      const sheetName = workbook.SheetNames[0];
      const firstSheet = sheetName ? workbook.Sheets[sheetName] : null;
      if (!firstSheet) {
        showToast("This file has no readable sheet");
        return;
      }

      const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: true });
      if (!rawRows.length) {
        showToast(`Sheet "${sheetName}" has no data rows`);
        return;
      }

      const headers = Object.keys(rawRows[0] || {});

      const items = rawRows.map((raw, i) => {
        const idx = buildIndex(raw);
        const name = cell(
          idx,
          "Customer/Company Name", "Customer Name", "Company Name",
          "Name", "Full Name", "Client Name"
        ) || cell(idx, "Username", "User Name") || "Customer";

        const vId = cell(idx, "Vendor ID", "VendorId", "vendor_id", "Vendor Id", "Vendor Code");
        const vName = cell(idx, "Vendor Name", "Vendor", "Parent Vendor", "Parent Vendor Name");

        let matchedVendor = null;
        if (vId) {
          matchedVendor = (vendors || []).find(
            (v) => String(v.vendorId || "").trim().toLowerCase() === vId.trim().toLowerCase()
          ) || null;
        }
        if (!matchedVendor && vName) {
          matchedVendor = (vendors || []).find(
            (v) => String(v.name || "").trim().toLowerCase() === vName.trim().toLowerCase()
          ) || null;
        }

        let error = "";
        if (!matchedVendor) {
          const specified = vId || vName;
          error = specified
            ? `Vendor "${specified}" not found in database`
            : "No Vendor ID or Vendor Name in this row";
        }

        const data = rowToCustomer(idx, name);
        const isDuplicate = customers.some(
          c => c.username && data.username && c.username.toLowerCase() === data.username.toLowerCase()
        );

        return {
          rowNo: i + 2,
          name,
          vendorIdentifier: vId || vName || "",
          matchedVendor,
          data,
          isDuplicate,
          error
        };
      });

      const matchedMap = new Map();
      items.forEach(item => {
        if (item.matchedVendor) {
          const vKey = item.matchedVendor.vendorId ? `${item.matchedVendor.name} (${item.matchedVendor.vendorId})` : item.matchedVendor.name;
          matchedMap.set(vKey, (matchedMap.get(vKey) || 0) + 1);
        }
      });

      setVendorImportPreview({
        fileName: file.name,
        sheetName,
        headers,
        items,
        totalRows: rawRows.length,
        matchedVendorSummary: Array.from(matchedMap.entries()).map(([k, count]) => `${k}: ${count} customer(s)`)
      });
      setVendorImportResult(null);
      setVendorImportProgress(null);
      setShowVendorImportModal(true);
    } catch (error) {
      console.error("Excel import by vendor failed:", error);
      showToast(`Could not read this file: ${error.message}`);
    }
  };

  const confirmVendorImport = async () => {
    if (!vendorImportPreview) return;
    const ready = vendorImportPreview.items.filter((i) => !i.error && i.matchedVendor && !i.isDuplicate);
    if (!ready.length) {
      showToast("Nothing to import - every row has an error or unmatched vendor");
      return;
    }

    setVendorImportProgress({ done: 0, total: ready.length });
    let imported = 0;
    const failures = [];
    const uniqueMatchedVendors = new Set();

    for (let i = 0; i < ready.length; i++) {
      const item = ready[i];
      const vendor = item.matchedVendor;
      uniqueMatchedVendors.add(vendor.vendorId || vendor.name);

      const payload = {
        ...item.data,
        parentVendorId: String(vendor._id || vendor.id),
        parentVendorName: vendor.name || "",
        vendorId: vendor.vendorId || ""
      };
      try {
        const res = await addCustomer(payload);
        if (res && res.ok) imported++;
        else failures.push(`Row ${item.rowNo} (${item.name}): ${res?.message || "rejected by server"}`);
      } catch (err) {
        failures.push(`Row ${item.rowNo} (${item.name}): ${err.message}`);
      }
      setVendorImportProgress({ done: i + 1, total: ready.length });
    }

    const skipped = vendorImportPreview.items.filter((i) => i.error || !i.matchedVendor || i.isDuplicate);
    setVendorImportResult({
      imported,
      attempted: ready.length,
      vendorsMatchedCount: uniqueMatchedVendors.size,
      failures,
      skipped
    });
    setVendorImportProgress(null);

    if (imported) {
      if (refreshAll) await refreshAll();
      await addNotification("info", `${imported} customer(s) imported under ${uniqueMatchedVendors.size} vendor(s)`, "System Messages");
    }
    showToast(`${imported} of ${ready.length} customers imported under ${uniqueMatchedVendors.size} vendor(s)`);
  };

  const displayedVendorImportItems = useMemo(() => {
    if (!vendorImportPreview) return [];
    if (vendorImportFilter === "ready") {
      return vendorImportPreview.items.filter((i) => !i.error && i.matchedVendor && !i.isDuplicate);
    }
    if (vendorImportFilter === "duplicate") {
      return vendorImportPreview.items.filter((i) => !i.error && i.matchedVendor && i.isDuplicate);
    }
    if (vendorImportFilter === "issues") {
      return vendorImportPreview.items.filter((i) => i.error || !i.matchedVendor);
    }
    return vendorImportPreview.items;
  }, [vendorImportPreview, vendorImportFilter]);

  const closeVendorImportModal = () => {
    setShowVendorImportModal(false);
    setVendorImportPreview(null);
    setVendorImportResult(null);
    setVendorImportProgress(null);
    setVendorImportFilter("all");
  };
  // Gives users a sheet whose headers exactly match what the importer expects.
  const downloadTemplate = () => {
    const sample = {};
    VIEW_FIELDS.forEach(([label]) => { sample[label] = ""; });
    const firstVendor = (vendors || [])[0];
    sample["Vendor ID"] = firstVendor?.vendorId || "H2VEN001";
    sample["Customer/Company Name"] = "Example Customer";
    sample["Domain"] = "as1.htwo.cloud";
    sample["Period"] = "Yearly";
    const ws = XLSX.utils.json_to_sheet([sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "customer-import-template.xlsx");
    showToast("Template downloaded - fill it and use Import Excel");
  };

  return (
    <div className="customers-page">
      <div className="customers-topbar">
        <p className="customers-count">
          {filtered.length} companies found
        </p>
        <button className="btn-primary customers-add-btn" onClick={handleOpenAdd}>
          <LuPlus size={18} /> Add Customer
        </button>
      </div>

      <div className="table-card">
        <div className="customers-toolbar">
          <div className="search-input">
            <LuSearch size={16} />
            <input
              placeholder="Search vendor id, company, email, username, product, domain, IP..."
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
              <LuEye size={14} />
              <select value="View" onChange={(e) => {
                if (e.target.value === "toggle_vendor") {
                  setShowVendorName(!showVendorName);
                }
              }}>
                <option value="View" disabled>View Columns</option>
                <option value="toggle_vendor">
                  {showVendorName ? 'Hide Vendor Name' : 'Show Vendor Name'}
                </option>
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
            <input ref={importInputRef} className="excel-import-input" type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} />
            <button className="toolbar-btn" onClick={() => importInputRef.current?.click()}><LuUpload size={15} /> Import Excel</button>
            <input ref={importByVendorInputRef} className="excel-import-input" type="file" accept=".xlsx,.xls,.csv" onChange={importExcelByVendor} />
            <button className="toolbar-btn" onClick={() => importByVendorInputRef.current?.click()}><LuUpload size={15} /> Import Excel by Vendor</button>
            <button className="toolbar-btn" onClick={downloadTemplate} title="Download a sheet with the exact headers the importer expects"><LuFileSpreadsheet size={15} /> Template</button>
            <button className="toolbar-btn" onClick={() => { window.print(); showToast("Sending to printer"); }}>
              <LuPrinter size={15} /> Print
            </button>
          </div>
        </div>

        <div className="scroll-x">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor ID</th>
                <th>Domain</th>
                {showVendorName && <th>Vendor Name</th>}
                <th>Product/Service</th>
                <th>Sub Vendor</th>
                <th>Username</th>
                <th>IP Address</th>
                <th>Port</th>
                <th>Creation Date</th>
                <th>Expiry Date</th>
                <th>Period</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupMode === "domain" && domainRows.length === 0 && (
                <tr>
                  <td colSpan={showVendorName ? "14" : "13"} className="empty-row">
                    No records match the current filters.
                  </td>
                </tr>
              )}

              {groupMode === "domain" && domainRows.map((row, i) => {
                const r = row.record;
                const isUser = row.kind === "user";
                const prev = domainRows[i - 1];
                // Header printed once, the first time a domain appears.
                const startsGroup = !prev || prev.domain !== row.domain;
                const groupSize = domainRows.filter((x) => x.domain === row.domain).length;
                const label = row.domain || "No domain";

                return (
                  <React.Fragment key={`${row.kind}-${r._id || r.id}-${i}`}>
                    {startsGroup && (
                      <tr className="domain-group-row">
                        <td colSpan={showVendorName ? "14" : "13"}>
                          <span className="domain-group-name">{label}</span>
                          <span className="domain-group-count">{groupSize} record{groupSize === 1 ? "" : "s"}</span>
                        </td>
                      </tr>
                    )}
                    <tr className={isUser ? "domain-user-row" : ""}>
                      <td className="strong">{isUser ? (row.vendor?.vendorId || r.vendorId || "\u2014") : r.vendorId}</td>
                      <td>{r.domain || r.domainName || (row.vendor?.domain) || "\u2014"}</td>
                      {showVendorName && (
                        <td>
                          <span className="strong">{r.name || r.customerName || "\u2014"}</span>
                          {isUser && row.vendor && (
                            <span className="under-vendor"> under {row.vendor.name}</span>
                          )}
                        </td>
                      )}
                      <td>{r.productService || r.product || row.vendor?.productService || "\u2014"}</td>
                      <td>{resolveSubVendor(r, row.vendor) || "\u2014"}</td>
                      <td>{r.username || r.email || "\u2014"}</td>
                      <td>{r.ip || row.vendor?.ip || "\u2014"}</td>
                      <td>{r.port || row.vendor?.port || "\u2014"}</td>
                      <td>{formatDate(r.creationDate || r.loginDate) || "\u2014"}</td>
                      <td>{formatDate(r.expiryDate) || "\u2014"}</td>
                      <td>{r.period || "\u2014"}</td>
                      <td>
                        <div className="payment-cell-wrapper">
                          <span className={`badge badge-${String(r.paymentStatus || "Pending").toLowerCase()}`}>
                            {r.paymentStatus || "Pending"}
                          </span>
                          <button
                            type="button"
                            className="payment-edit-btn"
                            onClick={() => handleOpenPaymentEdit(r, isUser)}
                            title="Edit Payment Status"
                          >
                            <LuPencil size={11} />
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className={`badge status-${effectiveStatus(r).toLowerCase()}`}>
                          {effectiveStatus(r)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button className="icon-action view" onClick={() => handleOpenView(r, r, isUser ? 'user' : 'vendor')} title="View Full Details">
                            <LuEye size={14} />
                          </button>
                          <button className="icon-action edit" onClick={() => handleOpenEdit(r, isUser ? 'user' : 'vendor')} title="Edit">
                            <LuPencil size={14} />
                          </button>
                          <select
                            className="status-dropdown-action"
                            value={effectiveStatus(r)}
                            onChange={(e) => handleStatusChange(r, e.target.value, isUser)}
                            style={{ padding: "2px 4px", borderRadius: "4px", border: "1px solid #e2e8f0", fontSize: "12px", cursor: "pointer", backgroundColor: "#fff", outline: "none", minWidth: "80px", color: "#334155" }}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Expired">Expired</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}

              {groupMode === "vendor" && paginated.map((c, index) => {
                const customerId = String(c._id || c.id);
                const uniqueRowKey = (c._id || c.id) ? `${customerId}-${index}` : `row-${index}`;

                // Generate mock associated users safely with strict parent domain binding

                // Child customers of this vendor, also ordered by domain so
                // as1.htwo.cloud rows sit together before as2.htwo.cloud.
                const associatedUsers = (customers || [])
                  .filter(u =>
                    (String(u.parentVendorId) === customerId || (c.vendorId && String(u.vendorId) === String(c.vendorId))) &&
                    (domainFilter === "All Domains" || domainFilter === "All" || String(u.domain || u.domainName || c.domain || "").trim().toLowerCase() === domainFilter.trim().toLowerCase())
                  )
                  .sort((a, b) => {
                    const da = String(a.domainName || a.domain || "").trim().toLowerCase();
                    const db = String(b.domainName || b.domain || "").trim().toLowerCase();
                    const cmp = naturalDomainCompare(da, db);
                    if (cmp !== 0) return cmp;
                    return String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true, sensitivity: 'base' });
                  });

                return (
                  <React.Fragment key={c._id || c.id || uniqueRowKey}>
                    <tr>
                      <td className="strong">{c.vendorId}</td>
                      <td>{c.domain || "—"}</td>
                      {showVendorName && (
                        <td>
                          <div className="vendor-name-clickable"><span className="strong">{associatedUsers.length > 0 ? "▸ " : ""}{c.name || c.customerName || "—"}</span></div>
                        </td>
                      )}
                      <td>{c.productService || c.product || "—"}</td>
                      <td>{resolveSubVendor(c) || "—"}</td>
                      <td>{c.username || "—"}</td>
                      <td>{c.ip || "—"}</td>
                      <td>{c.port || "—"}</td>
                      <td>{formatDate(c.creationDate) || "—"}</td>
                      <td>{formatDate(c.expiryDate) || "—"}</td>
                      <td>{c.period || "—"}</td>
                      <td>
                        <div className="payment-cell-wrapper">
                          <span className={`badge badge-${String(c.paymentStatus || "Pending").toLowerCase()}`}>
                            {c.paymentStatus || "Pending"}
                          </span>
                          <button
                            type="button"
                            className="payment-edit-btn"
                            onClick={() => handleOpenPaymentEdit(c, false)}
                            title="Edit Payment Status"
                          >
                            <LuPencil size={11} />
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className={`badge status-${effectiveStatus(c).toLowerCase()}`}>
                          {effectiveStatus(c)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button className="icon-action view" onClick={() => handleOpenView(c, c, 'vendor')} title="View Full Details">
                            <LuEye size={14} />
                          </button>
                          <button className="icon-action edit" onClick={() => handleOpenEdit(c, 'vendor')} title="Edit">
                            <LuPencil size={14} />
                          </button>
                          <select
                            className="status-dropdown-action"
                            value={effectiveStatus(c)}
                            onChange={(e) => handleStatusChange(c, e.target.value, false)}
                            style={{ padding: "2px 4px", borderRadius: "4px", border: "1px solid #e2e8f0", fontSize: "12px", cursor: "pointer", backgroundColor: "#fff", outline: "none", minWidth: "80px", color: "#334155" }}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Suspended">Suspended</option>
                            <option value="Expired">Expired</option>
                          </select>
                        </div>
                      </td>
                    </tr>

                    {/* Associated Users rendered as aligned table rows */}
                    {associatedUsers.length === 0 && (
                      <tr>
                        <td colSpan={showVendorName ? "14" : "13"} className="empty-row" style={{ backgroundColor: "rgba(0,0,0,0.02)", textAlign: "center", padding: "20px" }}>
                          No users found for this Vendor.
                        </td>
                      </tr>
                    )}
                    {associatedUsers.map(user => {
                      const mergedUser = {
                        ...user,
                        vendorId: c.vendorId,
                        customerName: c.name || c.customerName,
                        domain: user.domainName || user.domain || c.domain || "—",
                        product: user.productService || user.service || c.productService || c.product || "—",
                        ip: user.ip || c.ip || "—",
                        port: user.port || c.port || "—",
                        username: user.username || user.email || "—",
                        creationDate: user.loginDate || user.creationDate || c.creationDate || "—",
                        expiryDate: user.expiryDate || c.expiryDate || "—",
                        period: user.period || c.period || "—",
                        paymentStatus: user.paymentStatus || c.paymentStatus || "Pending",
                        status: user.status || c.status || "Active",
                        email: user.email || c.email || "—",
                        daysLeft: user.daysLeft !== undefined ? user.daysLeft : "—",
                        licenseId: user.tallyNetId || "—",
                        licensePassword: user.tallyNetPassword || "—",
                        licenseDetails: user.license || "—",
                        subVendor: resolveSubVendor(user, c) || "—",
                      };

                      return (
                        <tr key={user.id} className="associated-user-row" style={{ backgroundColor: "rgba(0,0,0,0.02)" }}>
                          <td style={{ borderTop: "none" }} className="strong">{c.vendorId || "—"}</td>
                          <td style={{ borderTop: "none" }}>{user.domain || c.domain || "—"}</td>
                          {showVendorName && (
                            <td style={{ borderTop: "none" }}>
                              <div style={{ paddingLeft: "28px", display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                                <span className="strong" style={{ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.customerName || "—"}</span>
                              </div>
                            </td>
                          )}
                          <td style={{ borderTop: "none" }}>{user.productService || user.product || c.productService || c.product || "—"}</td>
                          <td style={{ borderTop: "none" }}>{resolveSubVendor(user, c) || "—"}</td>
                          <td style={{ borderTop: "none" }}>{user.username || user.email || "—"}</td>
                          <td style={{ borderTop: "none" }}>{user.ip || c.ip || "—"}</td>
                          <td style={{ borderTop: "none" }}>{user.port || c.port || "—"}</td>
                          <td style={{ borderTop: "none" }}>{formatDate(user.creationDate || c.creationDate) || "—"}</td>
                          <td style={{ borderTop: "none" }}>{formatDate(user.expiryDate || c.expiryDate) || "—"}</td>
                          <td style={{ borderTop: "none" }}>{user.period || c.period || "—"}</td>
                          <td style={{ borderTop: "none" }}>
                            <div className="payment-cell-wrapper">
                              <span className={`badge badge-${String(user.paymentStatus || c.paymentStatus || "Pending").toLowerCase()}`}>
                                {user.paymentStatus || c.paymentStatus || "Pending"}
                              </span>
                              <button
                                type="button"
                                className="payment-edit-btn"
                                onClick={() => handleOpenPaymentEdit(user, true)}
                                title="Edit Payment Status"
                              >
                                <LuPencil size={11} />
                              </button>
                            </div>
                          </td>
                          <td style={{ borderTop: "none" }}>
                            <span className={`badge status-${effectiveStatus(user.expiryDate ? user : c).toLowerCase()}`}>
                              {effectiveStatus(user.expiryDate ? user : c)}
                            </span>
                          </td>
                          <td style={{ borderTop: "none" }}>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button className="icon-action view" onClick={() => handleOpenView(mergedUser, user, 'user')} title="View Full Details">
                                <LuEye size={14} />
                              </button>
                              <button className="icon-action edit" onClick={() => handleOpenEdit(user, 'user')} title="Edit">
                                <LuPencil size={14} />
                              </button>

                              <select
                                className="status-dropdown-action"
                                value={effectiveStatus(user.expiryDate ? user : c)}
                                onChange={(e) => handleStatusChange(user, e.target.value, true)}
                                style={{ padding: "2px 4px", borderRadius: "4px", border: "1px solid #e2e8f0", fontSize: "12px", cursor: "pointer", backgroundColor: "#fff", outline: "none", minWidth: "80px", color: "#334155" }}
                              >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Suspended">Suspended</option>
                                <option value="Expired">Expired</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan="13" className="empty-row">No companies found. Click "Add Company" to create one.</td>
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
              <h3 className="modal-title">{editingId ? "Edit Vendor" : "Add New Customer"}</h3>
              <button type="button" className="modal-close-btn" onClick={handleCloseForm}>
                <LuX size={18} />
              </button>
            </div>
            <div className="modal-body modal-body-scroll" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <p className="cust-section-title">Basic Details</p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Vendor </label>
                  <select className="form-select" name="parentVendorId" value={formData.parentVendorId} onChange={handleChange} required>
                    <option value="">Select Vendor</option>
                    {(vendors || []).map(v => (
                      <option key={v._id || v.id} value={v._id || v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Vendor ID</label>
                  <input className="form-input" name="vendorId" value={formData.vendorId} readOnly disabled style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Name</label>
                  <input className="form-input" name="customerName" value={formData.customerName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Id </label>
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
                  <label className="form-label">Domain </label>
                  <input className="form-input" name="domain" value={formData.domain} onChange={handleChange} placeholder="client.htwo.cloud" />
                </div>
                <div className="form-group">
                  <label className="form-label">IP</label>
                  <input className="form-input" name="ip" value={formData.ip} onChange={handleChange} placeholder="103.x.x.x" />
                </div>
                <div className="form-group">
                  <label className="form-label">Port </label>
                  <input className="form-input" name="port" value={formData.port} onChange={handleChange} placeholder="3389" />
                </div>
                <div className="form-group">
                  <label className="form-label">Server Id </label>
                  <input className="form-input" name="serverId" value={formData.serverId} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Server Password </label>
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
                  <label className="form-label">Sub Vendor</label>
                  <input className="form-input" name="subVendor" value={formData.subVendor} onChange={handleChange} placeholder="Sub vendor name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input className="form-input" name="username" value={formData.username} onChange={handleChange} autoComplete="off" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tally.Net ID</label>
                  <input className="form-input" name="licenseId" value={formData.licenseId} onChange={handleChange} placeholder="e.g. alpha919" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tally.Net Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" type={showLicensePassword ? "text" : "password"} name="licensePassword" value={formData.licensePassword} onChange={handleChange} placeholder="Enter Tally.Net Password" autoComplete="new-password" style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => setShowLicensePassword(!showLicensePassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#666', padding: 0 }}>
                      {showLicensePassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                    </button>
                  </div>
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
                  <input className="form-input" type="date" name="creationDate" value={formData.creationDate} onChange={handleChange} disabled={!!editingId} style={editingId ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}} />
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
                  <select className="form-select" name="billGenerated" value={formData.billGenerated} onChange={handleChange} >
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
              <button type="button" className="btn-secondary" onClick={handleCloseForm}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : (editingId ? "Update Customer" : "Save Customer")}
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
              <h3 className="modal-title">Company Details — {selected.customerName}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowViewModal(false)}>
                <LuX size={18} />
              </button>
            </div>
            <div className="modal-body modal-body-scroll" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <div className="cust-detail-grid">
                {VIEW_FIELDS.map(([label, key]) => (
                  <div className="cust-detail-item" key={key}>
                    <span className="cust-detail-label">{label}</span>
                    <span className="cust-detail-value">
                      {key === "daysLeft"
                        ? (selected.daysLeft === null || selected.daysLeft === undefined ? "—" : `${selected.daysLeft} days`)
                        : (key === "creationDate" || key === "expiryDate" || key === "billingDate")
                          ? (formatDate(selected[key]) || "—")
                          : (selected[key] !== undefined && selected[key] !== null && selected[key] !== "" ? String(selected[key]) : "—")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
              <button type="button" className="btn-primary" onClick={() => { setShowViewModal(false); handleOpenEdit(selectedRecord || selected, selectedType); }}>Edit Company</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ ADD ASSOCIATED USER MODAL ============ */}
      {showAddUserModal && (
        <div className="modal-overlay">
          <form className="modal-card modal-card-wide" onSubmit={handleAddUserSubmit}>
            <div className="modal-header">
              <h3 className="modal-title"></h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowAddUserModal(false)}>
                <LuX size={18} />
              </button>
            </div>
            <div className="modal-body modal-body-scroll" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <p className="cust-section-title">Auto Filled Details</p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Parent Vendor *</label>
                  <select className="form-select" name="parentVendorId" value={addUserFormData.parentVendorId} onChange={handleUserFormChange} required>
                    <option value="">Select Parent Vendor</option>
                    {(vendors || []).map(v => (
                      <option key={v._id || v.id} value={v._id || v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Vendor ID</label>
                  <input className="form-input" name="vendorId" value={addUserFormData.vendorId} readOnly disabled style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Vendor Name</label>
                  <input className="form-input" name="vendorName" value={addUserFormData.vendorName} readOnly disabled style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input className="form-input" name="companyName" value={addUserFormData.companyName} readOnly disabled style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Product / Service </label>
                  <select className="form-select" name="productService" value={addUserFormData.productService} onChange={handleUserFormChange} required>
                    <option value="">Select Product / Service</option>
                    <option value="Tally on Cloud">Tally on Cloud</option>
                    <option value="Busy on Cloud">Busy on Cloud</option>
                    <option value="Marg on Cloud">Marg on Cloud</option>
                  </select>
                </div>
              </div>

              <p className="cust-section-title">Basic User Details</p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" name="fullName" value={addUserFormData.fullName} onChange={handleUserFormChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input className="form-input" type="email" name="email" value={addUserFormData.email} onChange={handleUserFormChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <input className="form-input" name="mobile" value={addUserFormData.mobile} onChange={handleUserFormChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input className="form-input" name="username" value={addUserFormData.username} onChange={handleUserFormChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" type={showAddUserPassword ? "text" : "password"} name="password" value={addUserFormData.password} onChange={handleUserFormChange} required style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => setShowAddUserPassword(!showAddUserPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#666', padding: 0 }}>
                      {showAddUserPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input" type={showAddUserConfirmPassword ? "text" : "password"} name="confirmPassword" value={addUserFormData.confirmPassword} onChange={handleUserFormChange} required style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => setShowAddUserConfirmPassword(!showAddUserConfirmPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#666', padding: 0 }}>
                      {showAddUserConfirmPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input className="form-input" name="employeeId" value={addUserFormData.employeeId} onChange={handleUserFormChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input className="form-input" name="designation" value={addUserFormData.designation} onChange={handleUserFormChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" name="department" value={addUserFormData.department} onChange={handleUserFormChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <input className="form-input" name="role" value={addUserFormData.role} onChange={handleUserFormChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Reporting Manager</label>
                  <input className="form-input" name="reportingManager" value={addUserFormData.reportingManager} onChange={handleUserFormChange} />
                </div>
              </div>

              <p className="cust-section-title">Account Details</p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">User Status</label>
                  <select className="form-select" name="userStatus" value={addUserFormData.userStatus} onChange={handleUserFormChange}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Login Status</label>
                  <select className="form-select" name="loginStatus" value={addUserFormData.loginStatus} onChange={handleUserFormChange}>
                    <option value="Allowed">Allowed</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Two Factor Authentication</label>
                  <select className="form-select" name="twoFactorAuth" value={addUserFormData.twoFactorAuth} onChange={handleUserFormChange}>
                    <option value="Disabled">Disabled</option>
                    <option value="Enabled">Enabled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Account Expiry Date</label>
                  <input className="form-input" type="date" name="accountExpiryDate" value={addUserFormData.accountExpiryDate} onChange={handleUserFormChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Working Date</label>
                  <input className="form-input" type="date" name="lastWorkingDate" value={addUserFormData.lastWorkingDate} onChange={handleUserFormChange} />
                </div>
              </div>


              <p className="cust-section-title">Contact Details</p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Office Phone</label>
                  <input className="form-input" name="officePhone" value={addUserFormData.officePhone} onChange={handleUserFormChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Alternate Mobile</label>
                  <input className="form-input" name="alternateMobile" value={addUserFormData.alternateMobile} onChange={handleUserFormChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Office Email</label>
                  <input className="form-input" type="email" name="officeEmail" value={addUserFormData.officeEmail} onChange={handleUserFormChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" name="address" value={addUserFormData.address} onChange={handleUserFormChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" name="city" value={addUserFormData.city} onChange={handleUserFormChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" name="state" value={addUserFormData.state} onChange={handleUserFormChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input className="form-input" name="country" value={addUserFormData.country} onChange={handleUserFormChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">PIN Code</label>
                  <input className="form-input" name="pinCode" value={addUserFormData.pinCode} onChange={handleUserFormChange} />
                </div>
              </div>

              <p className="cust-section-title">Other Details</p>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Joining Date</label>
                  <input className="form-input" type="date" name="joiningDate" value={addUserFormData.joiningDate} onChange={handleUserFormChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes / Remarks</label>
                  <input className="form-input" name="notes" value={addUserFormData.notes} onChange={handleUserFormChange} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowAddUserModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save User</button>
            </div>
          </form>
        </div>
      )}

      {showImportModal && importPreview && (
        <div className="modal-overlay" onClick={closeImportModal}>
          <div className="modal-card import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Import from Excel</h3>
              <button className="icon-action" onClick={closeImportModal}><LuX size={18} /></button>
            </div>

            <div className="import-body">
              <p className="import-file-line">
                <strong>{importPreview.fileName}</strong>
                {" \u2022 "}sheet "{importPreview.sheetName}"
                {" \u2022 "}{importPreview.totalRows} row(s)
              </p>

              <details className="import-headers">
                <summary>Columns detected ({importPreview.headers.length})</summary>
                <p>{importPreview.headers.join(", ") || "none"}</p>
              </details>

              <div className="form-group">
                <label className="form-label">
                  Vendor for rows without a Vendor ID <span className="req">*</span>
                </label>
                <select
                  className="form-input"
                  value={importDefaultVendorId}
                  onChange={(e) => setImportDefaultVendorId(e.target.value)}
                >
                  <option value="">-- Select a vendor --</option>
                  {(vendors || []).map((v) => (
                    <option key={v._id || v.id} value={v._id || v.id}>
                      {v.name}{v.vendorId ? ` (${v.vendorId})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {!importResult && (
                <>
                  <div className="import-counts">
                    <button
                      type="button"
                      className={`import-filter-btn ${importFilter === "all" ? "active" : ""}`}
                      onClick={() => setImportFilter("all")}
                    >
                      All ({importableItems.length})
                    </button>
                    <button
                      type="button"
                      className={`import-filter-btn ok ${importFilter === "ready" ? "active" : ""}`}
                      onClick={() => setImportFilter("ready")}
                    >
                      {importableItems.filter(i => !i.error && !i.isDuplicate).length} ready
                    </button>
                    <button
                      type="button"
                      className={`import-filter-btn dup ${importFilter === "duplicate" ? "active" : ""}`}
                      onClick={() => setImportFilter("duplicate")}
                    >
                      {importableItems.filter(i => !i.error && i.isDuplicate).length} duplicate
                    </button>
                    <button
                      type="button"
                      className={`import-filter-btn bad ${importFilter === "issues" ? "active" : ""}`}
                      onClick={() => setImportFilter("issues")}
                    >
                      {importableItems.filter(i => i.error).length} with issues
                    </button>
                  </div>

                  <div className="import-table-wrap">
                    <table className="import-table">
                      <thead>
                        <tr>
                          <th>Row</th><th>Customer</th><th>Domain</th><th>Vendor</th><th>Status / Issue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedImportableItems.map((item) => (
                          <tr key={item.rowNo} className={item.error ? "row-bad" : item.isDuplicate ? "row-duplicate" : ""}>
                            <td>{item.rowNo}</td>
                            <td>{item.name || "\u2014"}</td>
                            <td>{item.data.domain || "\u2014"}</td>
                            <td>{item.vendor ? item.vendor.name : "\u2014"}</td>
                            <td className="issue-cell">
                              {item.error ? (
                                <span style={{ color: "#ef4444", fontWeight: "600" }}>{item.error}</span>
                              ) : item.isDuplicate ? (
                                <span style={{ color: "#d97706", fontWeight: "600", backgroundColor: "#fef3c7", padding: "2px 8px", borderRadius: "4px", display: "inline-block" }}>
                                  Duplicate
                                </span>
                              ) : (
                                <span style={{ color: "#16a34a", fontWeight: "500" }}>Ready</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {importProgress && (
                <p className="import-progress">
                  Importing {importProgress.done} of {importProgress.total}...
                </p>
              )}

              {importResult && (
                <div className="import-result">
                  <p><strong>{importResult.imported}</strong> of {importResult.attempted} customers imported.</p>
                  {!!importResult.skipped.length && (
                    <details open>
                      <summary>{importResult.skipped.length} row(s) skipped</summary>
                      <ul>
                        {importResult.skipped.slice(0, 20).map((s2) => (
                          <li key={s2.rowNo}>Row {s2.rowNo}: {s2.error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {!!importResult.failures.length && (
                    <details open>
                      <summary>{importResult.failures.length} row(s) failed on the server</summary>
                      <ul>
                        {importResult.failures.slice(0, 20).map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeImportModal}>
                {importResult ? "Close" : "Cancel"}
              </button>
              {!importResult && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={confirmImport}
                  disabled={!!importProgress || !importableItems.filter(i => !i.error && !i.isDuplicate).length}
                >
                  {importProgress
                    ? `Importing ${importProgress.done}/${importProgress.total}...`
                    : `Import ${importableItems.filter(i => !i.error && !i.isDuplicate).length} Customer(s)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showVendorImportModal && vendorImportPreview && (
        <div className="modal-overlay" onClick={closeVendorImportModal}>
          <div className="modal-card import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Import Customers by Vendor</h3>
                <p className="modal-sub">
                  Automatically assigns each customer to the matching existing vendor from the Excel row.
                </p>
              </div>
              <button type="button" className="close-btn" onClick={closeVendorImportModal}>
                <LuX size={18} />
              </button>
            </div>

            <div className="modal-body import-body">
              <p className="import-file-line">
                File: <strong>{vendorImportPreview.fileName}</strong> ({vendorImportPreview.totalRows} row(s))
              </p>

              {vendorImportPreview.matchedVendorSummary && vendorImportPreview.matchedVendorSummary.length > 0 && (
                <div style={{ marginBottom: "12px", padding: "10px 14px", background: "#f1f5f9", borderRadius: "8px", fontSize: "13px", color: "#334155" }}>
                  <strong>Matched Existing Vendors:</strong> {vendorImportPreview.matchedVendorSummary.join(", ")}
                </div>
              )}

              {!vendorImportResult && (
                <>
                  <div className="import-counts">
                    <button
                      type="button"
                      className={`import-filter-btn ${vendorImportFilter === "all" ? "active" : ""}`}
                      onClick={() => setVendorImportFilter("all")}
                    >
                      All ({vendorImportPreview.items.length})
                    </button>
                    <button
                      type="button"
                      className={`import-filter-btn ok ${vendorImportFilter === "ready" ? "active" : ""}`}
                      onClick={() => setVendorImportFilter("ready")}
                    >
                      {vendorImportPreview.items.filter(i => !i.error && i.matchedVendor && !i.isDuplicate).length} ready
                    </button>
                    <button
                      type="button"
                      className={`import-filter-btn dup ${vendorImportFilter === "duplicate" ? "active" : ""}`}
                      onClick={() => setVendorImportFilter("duplicate")}
                    >
                      {vendorImportPreview.items.filter(i => !i.error && i.matchedVendor && i.isDuplicate).length} duplicate
                    </button>
                    <button
                      type="button"
                      className={`import-filter-btn bad ${vendorImportFilter === "issues" ? "active" : ""}`}
                      onClick={() => setVendorImportFilter("issues")}
                    >
                      {vendorImportPreview.items.filter(i => i.error || !i.matchedVendor).length} with issues / unmatched
                    </button>
                  </div>

                  <div className="import-table-wrap">
                    <table className="import-table">
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Customer / User</th>
                          <th>Domain</th>
                          <th>Excel Vendor</th>
                          <th>Matched Database Vendor</th>
                          <th>Status / Issue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedVendorImportItems.map((item) => (
                          <tr key={item.rowNo} className={item.error ? "row-bad" : item.isDuplicate ? "row-duplicate" : ""}>
                            <td>{item.rowNo}</td>
                            <td>{item.name || "\u2014"}</td>
                            <td>{item.data.domain || "\u2014"}</td>
                            <td>{item.vendorIdentifier || "\u2014"}</td>
                            <td>{item.matchedVendor ? `${item.matchedVendor.name} (${item.matchedVendor.vendorId || ''})` : "\u2014"}</td>
                            <td className="issue-cell">
                              {item.error ? (
                                <span style={{ color: "#ef4444", fontWeight: "600" }}>{item.error}</span>
                              ) : item.isDuplicate ? (
                                <span style={{ color: "#d97706", fontWeight: "600", backgroundColor: "#fef3c7", padding: "2px 8px", borderRadius: "4px", display: "inline-block" }}>
                                  Duplicate
                                </span>
                              ) : (
                                <span style={{ color: "#16a34a", fontWeight: "500" }}>Ready</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {vendorImportProgress && (
                <p className="import-progress">
                  Importing {vendorImportProgress.done} of {vendorImportProgress.total}...
                </p>
              )}

              {vendorImportResult && (
                <div className="import-result">
                  <p>
                    <strong>{vendorImportResult.imported}</strong> of {vendorImportResult.attempted} customers successfully imported across <strong>{vendorImportResult.vendorsMatchedCount}</strong> vendor(s).
                  </p>
                  {!!vendorImportResult.skipped.length && (
                    <details open>
                      <summary>{vendorImportResult.skipped.length} row(s) skipped / unmatched</summary>
                      <ul>
                        {vendorImportResult.skipped.slice(0, 20).map((s2) => (
                          <li key={s2.rowNo}>Row {s2.rowNo} ({s2.name || s2.vendorIdentifier}): {s2.error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {!!vendorImportResult.failures.length && (
                    <details open>
                      <summary>{vendorImportResult.failures.length} row(s) failed on server</summary>
                      <ul>
                        {vendorImportResult.failures.slice(0, 20).map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeVendorImportModal}>
                {vendorImportResult ? "Close" : "Cancel"}
              </button>
              {!vendorImportResult && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={confirmVendorImport}
                  disabled={!!vendorImportProgress || !vendorImportPreview.items.filter(i => !i.error && i.matchedVendor && !i.isDuplicate).length}
                >
                  {vendorImportProgress
                    ? `Importing ${vendorImportProgress.done}/${vendorImportProgress.total}...`
                    : `Import ${vendorImportPreview.items.filter(i => !i.error && i.matchedVendor && !i.isDuplicate).length} Customer(s)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ PAYMENT STATUS EDIT MODAL ============ */}
      {paymentEditModal && (
        <div className="modal-overlay" onClick={() => setPaymentEditModal(null)}>
          <div className="modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Payment Status</h3>
              <button type="button" className="modal-close-btn" onClick={() => setPaymentEditModal(null)}>
                <LuX size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePaymentStatus}>
              <div className="modal-body" style={{ padding: "20px" }}>
                <div style={{ marginBottom: "16px", background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Customer / Company</div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                    {paymentEditModal.customer.name || paymentEditModal.customer.customerName || paymentEditModal.customer.username || "Customer"}
                  </div>
                  {(paymentEditModal.customer.domain || paymentEditModal.customer.domainName) && (
                    <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                      Domain: <strong>{paymentEditModal.customer.domain || paymentEditModal.customer.domainName}</strong>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: "6px" }}>Select Payment Status</label>
                  <select
                    className="form-select"
                    value={paymentEditStatus}
                    onChange={(e) => setPaymentEditStatus(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    autoFocus
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Partial">Partial</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions" style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#f8fafc" }}>
                <button type="button" className="btn-secondary" onClick={() => setPaymentEditModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={paymentSaving}>
                  {paymentSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}