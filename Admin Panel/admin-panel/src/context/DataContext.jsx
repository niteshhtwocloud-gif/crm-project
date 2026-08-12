import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { isCustomerExpired, getEffectiveStatus } from '../utils/dateUtils';

const DataContext = createContext(null);

// Single source of truth for the API host. Set VITE_API_BASE in .env to deploy.
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

// Safe number coercion - stops "₹ NaN" appearing on the dashboard when a
// record is missing amount / paid / pending.
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// The backend stores invoice status as "Paid" / "Pending" / "Overdue".
// The dashboard widgets style themselves on "success" / "warning" / "danger".
// We keep BOTH: `status` stays human readable, `statusKey` drives the CSS.
const STATUS_KEY_MAP = {
  paid: 'success',
  success: 'success',
  completed: 'success',
  partial: 'warning',
  pending: 'warning',
  warning: 'warning',
  overdue: 'danger',
  danger: 'danger',
  unpaid: 'danger'
};

const toStatusKey = (status) => STATUS_KEY_MAP[String(status || '').toLowerCase()] || 'warning';

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// One normalizer used by both the initial fetch and the poll, so the two
// code paths can never drift apart again.
const normalizeInvoice = (inv) => {
  const amount = num(inv.amount);
  const paid = num(inv.paid);
  const due = inv.pending !== undefined ? num(inv.pending) : Math.max(0, amount - paid);
  const rawStatus = inv.status || (due <= 0 ? 'Paid' : 'Pending');

  return {
    ...inv,
    id: String(inv._id || inv.id || inv.invoice || ''),
    invoiceNo: inv.invoice || inv.invoiceNo || '',
    amount,
    paid,
    due,
    status: rawStatus,
    statusKey: toStatusKey(rawStatus),
    date: inv.paymentDate || inv.date || '',
    dueDate: inv.dueDate || inv.due_date || ''
  };
};

const normalizeService = (s) => {
  const expiry = parseDate(s.expiry || s.expiryDate);
  const daysLeft = expiry
    ? Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  return {
    ...s,
    id: String(s._id || s.id || ''),
    customer: s.customer || s.customerName || s.name || 'Customer',
    product: s.product || s.productService || s.service || 'Cloud Service',
    amount: num(s.amount || s.pendingAmount || 0),
    expiry: s.expiry || (expiry ? expiry.toISOString().slice(0, 10) : ''),
    daysLeft: s.daysLeft !== undefined && s.daysLeft !== null && typeof s.daysLeft === 'number' ? s.daysLeft : (daysLeft ?? 0),
    hasExpiry: !!expiry
  };
};

const dedupe = (list = []) => {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = String(item?._id || item?.id || '');
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(item);
  }
  return out;
};

const normalizeVendor = (v) => ({
  ...v,
  totalPurchase: num(v.totalPurchase),
  totalPaid: num(v.totalPaid),
  pending: num(v.pending !== undefined ? v.pending : num(v.totalPurchase) - num(v.totalPaid))
});

export function DataProvider({ children }) {
  const { auth, token } = useAuth();

  // State definitions
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [rawSubscriptions, setRawSubscriptions] = useState([]);
  const [rawInvoices, setRawInvoices] = useState([]);
  const [payments, setPayments] = useState([]); // payment receipts (from /api/receipts)
  const [supportTickets, setSupportTickets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [backups, setBackups] = useState([]);
  const [settings, setSettings] = useState({
    companyName: 'H Two Cloud Solutions',
    systemEmail: 'admin@h2cloud.com',
    contactPhone: '+91 98765 43210',
    currency: '₹',
    paymentGateway: 'Razorpay'
  });
  const [users, setUsers] = useState([]); // system users
  const [activityLogs, setActivityLogs] = useState([]);

  // Dynamically derive unified real customer subscriptions & renewals
  const services = useMemo(() => {
    const combined = [];
    const seen = new Set();

    (rawSubscriptions || []).forEach(s => {
      const key = String(s._id || s.id || '');
      if (key) seen.add(key);
      combined.push(normalizeService(s));
    });

    (customers || []).forEach(c => {
      const key = String(c._id || c.id || '');
      if (!key || seen.has(key)) return;

      const customerName = c.name || c.customerName || c.username || 'Customer';
      const product = c.productService || c.product || c.service || 'Tally on Cloud';
      const expiry = c.expiryDate ? (typeof c.expiryDate === 'string' ? c.expiryDate.slice(0, 10) : new Date(c.expiryDate).toISOString().slice(0, 10)) : '';
      const expiryObj = parseDate(expiry);
      const daysLeft = expiryObj
        ? Math.ceil((expiryObj - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      combined.push({
        _id: c._id || c.id,
        id: String(c._id || c.id),
        customer: customerName,
        customerName: customerName,
        product: product,
        productService: product,
        domain: c.domain || c.domainName || '',
        username: c.username || '',
        creationDate: c.creationDate || c.loginDate || '',
        expiry: expiry,
        expiryDate: expiry,
        daysLeft: daysLeft !== null ? daysLeft : 0,
        hasExpiry: !!expiryObj,
        period: c.period || '',
        amount: num(c.amount || c.pendingAmount || 0),
        paymentStatus: c.paymentStatus || 'Pending',
        status: c.status || 'Active',
        vendorId: c.vendorId || '',
        parentVendorName: c.parentVendorName || ''
      });
    });

    return combined;
  }, [rawSubscriptions, customers]);

  // Dynamically derive unified real invoices
  const invoices = useMemo(() => {
    const combined = [];
    const seen = new Set();

    (rawInvoices || []).forEach(inv => {
      const key = String(inv._id || inv.id || inv.invoice || '');
      if (key) seen.add(key);
      combined.push(normalizeInvoice(inv));
    });

    (customers || []).forEach(c => {
      const key = `cust-inv-${c._id || c.id}`;
      if (seen.has(key)) return;

      const isOverdue = String(c.paymentStatus || '').toLowerCase() === 'overdue';
      const isPending = String(c.paymentStatus || '').toLowerCase() === 'pending';
      const isBillGen = String(c.billGenerated || '').toLowerCase() === 'yes';
      const hasPendingAmount = num(c.pendingAmount) > 0;

      if (isOverdue || isBillGen || (isPending && hasPendingAmount)) {
        const amount = num(c.amount || c.pendingAmount || (isOverdue ? 5000 : 0));
        const paid = isOverdue ? 0 : num(c.paid || 0);
        const due = Math.max(0, amount - paid) || (isOverdue ? amount || 5000 : 0);
        const invoiceNo = c.invoiceNo || c.invoice || `INV-${String(c.username || c._id || c.id || '').slice(-6).toUpperCase()}`;

        combined.push({
          _id: key,
          id: key,
          invoice: invoiceNo,
          invoiceNo: invoiceNo,
          customer: c.name || c.customerName || c.username || 'Customer',
          service: c.productService || c.product || c.service || 'Cloud Service',
          amount: amount || due,
          paid: paid,
          due: due,
          status: isOverdue ? 'Overdue' : (c.paymentStatus || 'Pending'),
          statusKey: isOverdue ? 'danger' : toStatusKey(c.paymentStatus),
          date: c.billingDate || c.creationDate || c.loginDate || '',
          dueDate: c.dueDate || c.expiryDate || c.creationDate || ''
        });
      }
    });

    return combined;
  }, [rawInvoices, customers]);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  });

  // Fetch all database records when token is present
  const fetchAllData = async () => {
    if (!token) return;

    try {
      const [
        customersRes,
        vendorsRes,
        servicesRes,
        invoicesRes,
        paymentsRes,
        ticketsRes,
        notifRes,
        backupsRes,
        settingsRes,
        usersRes,
        logsRes
      ] = await Promise.all([
        fetch(`${API_BASE}/api/users`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/vendors`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/subscriptions`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/payments`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/receipts`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/support-tickets`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/notifications`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/backups`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/settings/company`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/system-users`, { headers: getHeaders() }),
        fetch(`${API_BASE}/api/activity-logs`, { headers: getHeaders() })
      ]);

      if (customersRes.ok) setCustomers(dedupe(await customersRes.json()));
      if (vendorsRes.ok) setVendors(dedupe((await vendorsRes.json()).map(normalizeVendor)));
      if (servicesRes.ok) setRawSubscriptions(dedupe(await servicesRes.json()));
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setRawInvoices(dedupe(invoicesData.map(normalizeInvoice)));
      }
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      if (ticketsRes.ok) setSupportTickets(await ticketsRes.json());
      if (notifRes.ok) setNotifications(await notifRes.json());
      if (backupsRes.ok) setBackups(await backupsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (logsRes.ok) setActivityLogs(await logsRes.json());
    } catch (error) {
      console.error("Failed to fetch CRM data from backend:", error);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  // Polling for live notification updates (vendors additions or buys)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const [notifRes, invoicesRes, vendorsRes, customersRes] = await Promise.all([
          fetch(`${API_BASE}/api/notifications`, { headers: getHeaders() }),
          fetch(`${API_BASE}/api/payments`, { headers: getHeaders() }),
          fetch(`${API_BASE}/api/vendors`, { headers: getHeaders() }),
          fetch(`${API_BASE}/api/users`, { headers: getHeaders() })
        ]);

        if (notifRes.ok) setNotifications(await notifRes.json());
        if (vendorsRes.ok) setVendors(dedupe((await vendorsRes.json()).map(normalizeVendor)));
        if (customersRes.ok) setCustomers(dedupe(await customersRes.json()));
        if (invoicesRes.ok) {
          const invoicesData = await invoicesRes.json();
          setRawInvoices(dedupe(invoicesData.map(normalizeInvoice)));
        }
      } catch (error) {
        console.error("Error polling live notifications:", error);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [token]);

  // Log action helper
  const logAction = async (actionText) => {
    try {
      const response = await fetch(`${API_BASE}/api/activity-logs`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: actionText })
      });
      if (response.ok) {
        const newLog = await response.json();
        setActivityLogs(prev => [newLog, ...prev]);
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  // Alert notifier helper
  const addNotification = async (type, text, category = "System Messages") => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ text, type, category, time: new Date().toLocaleString() })
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(prev => [data, ...prev]);
      }
    } catch (error) {
      console.error("Failed to add notification:", error);
    }
  };

  const addNotif = async (text, type = 'info') => {
    await addNotification(type, text);
  };

  // Actions
  const addCustomer = async (customer) => {
    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(customer)
      });
      const data = await response.json();
      if (response.ok) {
        setCustomers(prev => dedupe([data, ...prev]));
        await logAction(`Added customer "${data.name}"`);
        return { ok: true, data };
      } else {
        return { ok: false, message: data.message || "Failed to add customer" };
      }
    } catch (error) {
      console.error("Failed to add customer:", error);
      return { ok: false, message: error.message };
    }
  };

  const editCustomer = async (id, updatedCustomer) => {
    try {
      const response = await axios.put(`${API_BASE}/api/users/${id}`, updatedCustomer, {
        headers: getHeaders()
      });
      const data = response.data;
      setCustomers(prev => prev.map(c => (String(c.id) === String(id) || String(c._id) === String(id) || c.id === id || c._id === id) ? { ...c, ...data, id: c.id || data.id, _id: c._id || data._id } : c));
      await logAction(`Updated customer "${data.name || ''}"`);
      return { ok: true, data };
    } catch (error) {
      console.error("Failed to edit customer:", error);
      return { ok: false, message: error.response?.data?.message || error.message };
    }
  };

  const deleteCustomer = async (id) => {
    try {
      const response = await axios.delete(`${API_BASE}/api/users/${id}`, {
        headers: getHeaders()
      });
      setCustomers(prev => prev.filter(c => String(c.id) !== String(id) && String(c._id) !== String(id)));
      await logAction(`Deleted customer ID ${id}`);
      return { ok: true, message: response.data.message };
    } catch (error) {
      console.error("Failed to delete customer:", error);
      return { ok: false, message: error.response?.data?.message || error.message };
    }
  };

  const addVendor = async (vendor) => {
    try {
      const response = await fetch(`${API_BASE}/api/vendors`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(vendor)
      });
      const data = await response.json();
      if (response.ok) {
        setVendors(prev => dedupe([...prev, data]));
        await logAction(`Added vendor "${data.name}"`);
        return { ok: true, data };
      }
      return { ok: false, message: data.message || "Failed to add vendor" };
    } catch (error) {
      console.error("Failed to add vendor:", error);
      return { ok: false, message: error.message };
    }
  };

  const editVendor = async (id, updatedVendor) => {
    try {
      const response = await axios.put(`${API_BASE}/api/vendors/${id}`, updatedVendor, {
        headers: getHeaders()
      });
      const data = response.data;
      setVendors(prev => prev.map(v => (v.id === id || v._id === id) ? data : v));
      await logAction(`Updated vendor "${data.name || ''}"`);
      return { ok: true, data };
    } catch (error) {
      console.error("Failed to edit vendor:", error);
      return { ok: false, message: error.response?.data?.message || error.message };
    }
  };

  const deleteVendor = async (id) => {
    try {
      const response = await axios.delete(`${API_BASE}/api/vendors/${id}`, {
        headers: getHeaders()
      });
      setVendors(prev => prev.filter(v => String(v.id) !== String(id) && String(v._id) !== String(id)));
      await logAction(`Deleted vendor ID ${id}`);
      return { ok: true, message: response.data.message };
    } catch (error) {
      console.error("Failed to delete vendor:", error);
      return { ok: false, message: error.response?.data?.message || error.message };
    }
  };

  const addService = async (service) => {
    try {
      const response = await fetch(`${API_BASE}/api/subscriptions`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(service)
      });
      if (response.ok) {
        const data = await response.json();
        setServices(prev => dedupe([...prev, data]));
        await logAction(`Added service "${data.product}" for customer "${data.customer}"`);
        // Refresh customers
        const custRes = await fetch(`${API_BASE}/api/users`, { headers: getHeaders() });
        if (custRes.ok) setCustomers(await custRes.json());
      }
    } catch (error) {
      console.error("Failed to add service subscription:", error);
    }
  };

  const renewService = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/api/renew/${id}`, {
        method: "PATCH",
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        
        if (data.recordType === 'Subscription') {
          setRawSubscriptions(prev => prev.map(s => (s.id === id || s._id === id) ? data : s));
        } else if (data.recordType === 'Customer') {
          setCustomers(prev => prev.map(c => (c.id === id || c._id === id) ? data : c));
        } else {
          // Fallback if needed, though recordType should always be provided
          fetchAllData();
        }

        const itemName = data.product || data.productService || data.name || 'Service';
        const customerName = data.customer || data.customerName || data.name || 'Customer';
        
        await logAction(`Renewed service "${itemName}" for "${customerName}"`);
        await addNotif(`Service "${itemName}" for "${customerName}" renewed successfully`, 'success');
      } else {
        const errData = await response.json().catch(() => ({}));
        console.error("Failed to renew service:", errData.message);
      }
    } catch (error) {
      console.error("Failed to renew service subscription:", error);
    }
  };

  const createInvoice = async (invoice) => {
    const amount = Number(invoice.amount);
    const newInv = {
      invoice: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: invoice.customer,
      service: invoice.product || invoice.service || 'Cloud Hosting',
      amount,
      paid: 0,
      pending: amount,
      paymentDate: '-',
      dueDate: invoice.expiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'Pending'
    };

    try {
      const response = await fetch(`${API_BASE}/api/payments`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(newInv)
      });
      if (response.ok) {
        const data = await response.json();
        const normalized = normalizeInvoice(data);
        setInvoices(prev => dedupe([normalized, ...prev]));
        await logAction(`Created invoice ${data.invoice} for ${data.customer}`);
        await addNotif(`New invoice ${data.invoice} generated for ₹${amount}`, 'warning');
      }
    } catch (error) {
      console.error("Failed to create invoice:", error);
    }
  };

  const recordPayment = async (payment) => {
    const payAmt = Number(payment.amount);
    const dateStr = new Date().toISOString().slice(0, 10);

    const targetInvoice = invoices.find(inv => inv.invoiceNo === payment.invoiceNo);
    if (!targetInvoice) return;

    const newPaid = Number(targetInvoice.paid || 0) + payAmt;
    const newPending = Math.max(0, Number(targetInvoice.amount || 0) - newPaid);
    const newStatus = newPending === 0 ? 'Paid' : 'Pending';

    try {
      const invResponse = await fetch(`${API_BASE}/api/payments/${encodeURIComponent(payment.invoiceNo)}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ paid: newPaid, pending: newPending, status: newStatus, paymentDate: dateStr })
      });

      if (invResponse.ok) {
        const data = await invResponse.json();
        const normalized = normalizeInvoice(data);
        setInvoices(prev => prev.map(inv => inv.invoiceNo === payment.invoiceNo ? normalized : inv));

        // Save payment receipt
        const recResponse = await fetch(`${API_BASE}/api/receipts`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            invoiceNo: payment.invoiceNo,
            customer: payment.customer,
            amount: payAmt,
            method: payment.method || 'UPI',
            date: dateStr
          })
        });

        if (recResponse.ok) {
          const newReceipt = await recResponse.json();
          setPayments(prev => [newReceipt, ...prev]);
        }

        await logAction(`Recorded payment of ₹${payAmt} for ${payment.invoiceNo}`);
        await addNotif(`Payment of ₹${payAmt} recorded for ${payment.invoiceNo}`, 'success');
      }
    } catch (error) {
      console.error("Failed to record payment:", error);
    }
  };

  const addSupportTicket = async (ticket) => {
    try {
      const response = await fetch(`${API_BASE}/api/support-tickets`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(ticket)
      });
      if (response.ok) {
        const data = await response.json();
        setSupportTickets(prev => [data, ...prev]);
        await logAction(`Created support ticket: "${data.subject}"`);
      }
    } catch (error) {
      console.error("Failed to create support ticket:", error);
    }
  };

  const triggerBackup = async (callbackProgress) => {
    await logAction(`Initiated manual database backup`);
    let progress = 0;
    const interval = setInterval(async () => {
      progress += 10;
      if (callbackProgress) callbackProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        try {
          const response = await fetch(`${API_BASE}/api/backups`, {
            method: "POST",
            headers: getHeaders()
          });
          if (response.ok) {
            const data = await response.json();
            setBackups(prev => [data, ...prev]);
            await logAction(`System backup completed successfully`);
          }
        } catch (error) {
          console.error("Failed to trigger backend backup:", error);
        }
      }
    }, 200);
  };

  const updateSettings = async (newSettings) => {
    try {
      const response = await fetch(`${API_BASE}/api/settings/company`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(newSettings)
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        await logAction(`Updated workspace settings`);
        await addNotif(`Workspace settings updated successfully`, 'success');
      }
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  const addUser = async (user) => {
    try {
      const response = await fetch(`${API_BASE}/api/system-users`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(user)
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(prev => [...prev, data]);
        await logAction(`Added user account "${data.name}" as ${data.role}`);
      }
    } catch (error) {
      console.error("Failed to add system user:", error);
    }
  };

  const submitPOInvoice = async (vendorName, amount) => {
    const targetVendor = vendors.find(v => v.name.toLowerCase().includes(vendorName.toLowerCase()) || vendorName.toLowerCase().includes(v.name.toLowerCase()));
    if (!targetVendor) return;

    const newPurchase = Number(targetVendor.totalPurchase || 0) + amount;
    const newPaid = Number(targetVendor.totalPaid || 0);

    try {
      const response = await fetch(`${API_BASE}/api/vendors/${targetVendor.id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ totalPurchase: newPurchase, totalPaid: newPaid })
      });
      if (response.ok) {
        const data = await response.json();
        setVendors(prev => prev.map(v => v.id === targetVendor.id ? data : v));
        await logAction(`Vendor "${vendorName}" submitted a new PO invoice of ₹${amount.toLocaleString('en-IN')}`);
        await addNotif(`New PO invoice of ₹${amount.toLocaleString('en-IN')} submitted by vendor "${vendorName}"`, 'info');
      }
    } catch (error) {
      console.error("Failed to submit PO invoice:", error);
    }
  };

  const clearNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (response.ok) {
        setNotifications([]);
        await logAction('Cleared all notifications');
      }
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };

  // ---------------------------------------------------------------------
  // Dashboard aggregations - all derived from live API data, no mock values
  // ---------------------------------------------------------------------
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const totalCustomersVal = customers.length;
  const totalVendorsVal = vendors.length;
  // Companies (vendor records) + the end users nested under them. The
  // Customers page shows both kinds of row, so this is the number that
  // matches what you actually see there.
  const totalRecordsVal = vendors.length + customers.length;
  // Vendors that sit under a parent vendor.
  const totalSubVendorsVal = vendors.filter(v => v.parentVendorId).length;

  // "Active" means not yet expired. Previously this counted every
  // subscription row including expired ones.
  const activeServicesVal = services.filter(s => !s.hasExpiry || s.daysLeft > 0).length;
  const expiringServicesVal = services.filter(s => s.daysLeft > 0 && s.daysLeft <= 7).length;
  const expiredServicesVal = services.filter(s => s.hasExpiry && s.daysLeft <= 0).length;

  // Expired customers: uses shared isCustomerExpired helper from dateUtils
  const expiredCustomersVal = [...vendors, ...customers].filter(rec => isCustomerExpired(rec?.expiryDate || rec?.expiry)).length;

  const totalDueAmountVal = invoices.reduce((sum, inv) => sum + num(inv.due), 0);

  // Genuinely scoped to the current calendar month rather than all-time.
  const inMonth = (inv, from, to) => {
    const d = parseDate(inv.date) || parseDate(inv.dueDate);
    if (!d) return false;
    return d >= from && (!to || d < to);
  };

  const paidThisMonthVal = invoices
    .filter(inv => inMonth(inv, startOfMonth, null))
    .reduce((sum, inv) => sum + num(inv.paid), 0);

  const paidPrevMonthVal = invoices
    .filter(inv => inMonth(inv, startOfPrevMonth, startOfMonth))
    .reduce((sum, inv) => sum + num(inv.paid), 0);

  const monthlyRevenueVal = invoices
    .filter(inv => inMonth(inv, startOfMonth, null))
    .reduce((sum, inv) => sum + num(inv.amount), 0);

  const revenuePrevMonthVal = invoices
    .filter(inv => inMonth(inv, startOfPrevMonth, startOfMonth))
    .reduce((sum, inv) => sum + num(inv.amount), 0);

  // Real month-over-month movement. Returns null when there is no baseline,
  // so the UI can hide the badge instead of printing a fake percentage.
  const pctChange = (current, previous) => {
    if (!previous) return null;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  };

  // Pie chart: bucket on statusKey (normalized) and real due dates.
  const isOverdue = (inv) => {
    const isExplicitOverdue = String(inv.status || '').toLowerCase() === 'overdue';
    const d = parseDate(inv.dueDate || inv.date);
    const datePassed = !!d && d < now;
    return (num(inv.due) > 0 && (isExplicitOverdue || datePassed)) || isExplicitOverdue;
  };

  const completedList = invoices.filter(inv => (num(inv.due) <= 0 && !isOverdue(inv)) || String(inv.status || '').toLowerCase() === 'paid');
  const overdueList = invoices.filter(isOverdue);
  const upcomingList = invoices.filter(inv => {
    const d = parseDate(inv.dueDate || inv.date);
    return num(inv.due) > 0 && !isOverdue(inv) && !!d && d >= now;
  });
  // Outstanding invoices with no usable due date land here.
  const pendingList = invoices.filter(inv =>
    num(inv.due) > 0 && !isOverdue(inv) && !upcomingList.includes(inv)
  );

  const totalInvoices = invoices.length;
  const pct = (n) => (totalInvoices ? Math.round((n / totalInvoices) * 100) : 0);

  const paymentStatusData = [
    { name: 'Completed', value: completedList.length, percent: pct(completedList.length), color: '#22C55E' },
    { name: 'Pending', value: pendingList.length, percent: pct(pendingList.length), color: '#F59E0B' },
    { name: 'Overdue', value: overdueList.length, percent: pct(overdueList.length), color: '#EF4444' },
    { name: 'Upcoming', value: upcomingList.length, percent: pct(upcomingList.length), color: '#A855F7' },
  ];

  return (
    <DataContext.Provider value={{
      customers,
      vendors,
      services,
      invoices,
      payments,
      supportTickets,
      notifications,
      backups,
      settings,
      users,
      activityLogs,

      // aggregations
      aggregations: {
        totalCustomers: totalCustomersVal,
        totalVendors: totalVendorsVal,
        totalRecords: totalRecordsVal,
        totalSubVendors: totalSubVendorsVal,
        activeServices: activeServicesVal,
        expiringServices: expiringServicesVal,
        expiredServices: expiredServicesVal,
        expiredCustomers: expiredCustomersVal,
        totalDueAmount: totalDueAmountVal,
        paidThisMonth: paidThisMonthVal,
        monthlyRevenue: monthlyRevenueVal,
        paidChangePct: pctChange(paidThisMonthVal, paidPrevMonthVal),
        revenueChangePct: pctChange(monthlyRevenueVal, revenuePrevMonthVal),
        overdueInvoices: overdueList,
        paymentStatusData
      },

      // let pages force a refetch after a mutation
      refreshAll: fetchAllData,

      // actions
      addCustomer,
      editCustomer,
      deleteCustomer,
      addNotification,
      addVendor,
      editVendor,
      deleteVendor,
      addService,
      renewService,
      createInvoice,
      recordPayment,
      addSupportTicket,
      triggerBackup,
      updateSettings,
      addUser,
      submitPOInvoice,
      clearNotifications,
      logAction
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
