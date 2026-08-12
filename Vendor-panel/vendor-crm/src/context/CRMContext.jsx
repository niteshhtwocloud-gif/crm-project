import { createContext, useContext, useState, useEffect } from "react";

const CRMContext = createContext(null);

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000') + '/api';

const getHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("token")}`
});

export function CRMProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [backups, setBackups] = useState([]);
  
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("adminUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [companySettings, setCompanySettingsState] = useState({
    companyName: "Vendor CRM Solutions",
    email: "admin@vendorcrm.com",
    phone: "+91 98765 43210",
    gst: "27ABCDE1234F1Z5",
    logoText: "VC"
  });

  const [prefs, setPrefsState] = useState({
    theme: "Light",
    language: "English",
    timezone: "Asia/Kolkata (IST)",
  });

  // Apply theme class/attribute to HTML element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", prefs.theme);
  }, [prefs.theme]);

  // Fetch all database records when token is present
  const fetchAllData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const [usersRes, vendorsRes, servicesRes, paymentsRes, notifRes, backupsRes, companyRes, prefsRes, meRes] = await Promise.all([
        fetch(`${API_BASE}/users`, { headers: getHeaders() }),
        fetch(`${API_BASE}/vendors`, { headers: getHeaders() }),
        fetch(`${API_BASE}/services`, { headers: getHeaders() }),
        fetch(`${API_BASE}/payments`, { headers: getHeaders() }),
        fetch(`${API_BASE}/notifications`, { headers: getHeaders() }),
        fetch(`${API_BASE}/backups`, { headers: getHeaders() }),
        fetch(`${API_BASE}/settings/company`, { headers: getHeaders() }),
        fetch(`${API_BASE}/settings/prefs`, { headers: getHeaders() }),
        fetch(`${API_BASE}/auth/me`, { headers: getHeaders() })
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (vendorsRes.ok) setVendors(await vendorsRes.json());
      if (servicesRes.ok) setServices(await servicesRes.json());
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      if (notifRes.ok) setNotifications(await notifRes.json());
      if (backupsRes.ok) setBackups(await backupsRes.json());
      if (companyRes.ok) setCompanySettingsState(await companyRes.json());
      if (prefsRes.ok) setPrefsState(await prefsRes.json());
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData && meData.user) {
          setCurrentUser(meData.user);
          localStorage.setItem("adminUser", JSON.stringify(meData.user));
        }
      }
    } catch (error) {
      console.error("Failed to fetch CRM data from backend:", error);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [localStorage.getItem("token")]);

  // Notification Actions
  const addNotification = async (type, text, category = "System Messages") => {
    const now = new Date();
    const timeStr = now.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + ", " + now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ type, category, text, time: timeStr })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setNotifications(prev => [data, ...prev]);
    } catch (error) {
      console.error("Failed to create notification", error);
    }
  };

  // User Actions

  // Vendor Actions
  const addVendor = async (vendor) => {
    try {
      const response = await fetch(`${API_BASE}/vendors`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(vendor)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setVendors(prev => [...prev, data]);
      await addNotification("info", `New vendor added - ${data.name}`, "System Messages");
      return { ok: true, data };
    } catch (error) {
      console.error("Failed to create vendor", error);
      return { ok: false, message: error.message };
    }
  };

  const editVendor = async (id, updatedVendor) => {
    try {
      const response = await fetch(`${API_BASE}/vendors/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(updatedVendor)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setVendors(prev => prev.map((v) => (v.id === id || v._id === id ? data : v)));
      await addNotification("info", `Vendor profile updated for ${updatedVendor.name}`, "System Messages");
      return { ok: true, data };
    } catch (error) {
      console.error("Failed to edit vendor", error);
      return { ok: false, message: error.message };
    }
  };

  const deleteVendor = async (id, name) => {
    try {
      const response = await fetch(`${API_BASE}/vendors/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      setVendors(prev => prev.filter((v) => v.id !== id && v._id !== id));
      await addNotification("warning", `Vendor ${name} removed`, "System Messages");
      return { ok: true };
    } catch (error) {
      console.error("Failed to delete vendor", error);
      return { ok: false, message: error.message };
    }
  };

  const addUser = async (user) => {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(user)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setUsers(prev => [data, ...prev]);
      await addNotification("user", `New customer registered - ${user.name}`, "System Messages");
      return { ok: true, data };
    } catch (error) {
      console.error("Failed to create customer", error);
      return { ok: false, message: error.message };
    }
  };

  const editUser = async (id, updatedUser) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(updatedUser)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setUsers(prev => prev.map((u) => (u.id === id ? data : u)));
      await addNotification("info", `Customer profile updated for ${updatedUser.name}`, "System Messages");
      return { ok: true, data };
    } catch (error) {
      console.error("Failed to edit customer", error);
      return { ok: false, message: error.message };
    }
  };

  const deleteUser = async (id, name) => {
    try {
      const response = await fetch(`${API_BASE}/users/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      setUsers(prev => prev.filter((u) => u.id !== id));
      await addNotification("warning", `Customer ${name} removed from CRM`, "System Messages");
      return { ok: true };
    } catch (error) {
      console.error("Failed to delete customer", error);
      return { ok: false, message: error.message };
    }
  };

  // Service Actions
  const addService = async (service) => {
    try {
      const response = await fetch(`${API_BASE}/services`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(service)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setServices(prev => [data, ...prev]);
      await addNotification("success", `New service added: ${service.name}`, "System Messages");
    } catch (error) {
      console.error("Failed to add service", error);
    }
  };

  const editService = async (name, updatedService) => {
    try {
      const response = await fetch(`${API_BASE}/services/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(updatedService)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setServices(prev => prev.map((s) => (s.name === name ? data : s)));
      await addNotification("info", `Service settings updated for ${updatedService.name}`, "System Messages");
    } catch (error) {
      console.error("Failed to update service", error);
    }
  };

  const deleteService = async (name) => {
    try {
      const response = await fetch(`${API_BASE}/services/${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      setServices(prev => prev.filter((s) => s.name !== name));
      await addNotification("warning", `Service ${name} deleted`, "System Messages");
    } catch (error) {
      console.error("Failed to delete service", error);
    }
  };

  // Payment/Invoice Actions
  const addPayment = async (payment) => {
    try {
      const response = await fetch(`${API_BASE}/payments`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payment)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setPayments(prev => [data, ...prev]);
      await addNotification("info", `Invoice ${payment.invoice} generated for ${payment.customer}`, "Payment Alerts");
    } catch (error) {
      console.error("Failed to generate payment invoice", error);
    }
  };

  const updatePaymentStatus = async (invoice, status, additionalInfo = {}) => {
    try {
      const response = await fetch(`${API_BASE}/payments/${encodeURIComponent(invoice)}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status, ...additionalInfo })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setPayments(prev => prev.map((p) => (p.invoice === invoice ? data : p)));
      await addNotification(
        status === "Paid" ? "success" : "warning",
        `Invoice ${invoice} status changed to ${status}`,
        "Payment Alerts"
      );
    } catch (error) {
      console.error("Failed to update invoice status", error);
    }
  };

  const deletePayment = async (invoice) => {
    try {
      const response = await fetch(`${API_BASE}/payments/${encodeURIComponent(invoice)}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      setPayments(prev => prev.filter((p) => p.invoice !== invoice));
    } catch (error) {
      console.error("Failed to delete payment invoice", error);
    }
  };

  // Notification Actions
  const markRead = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PUT",
        headers: getHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setNotifications(prev => prev.map((n) => (n.id === id ? data : n)));
    } catch (error) {
      console.error("Failed to mark notification read", error);
    }
  };

  const markAllRead = async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications/read-all`, {
        method: "PUT",
        headers: getHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to mark all notifications read", error);
    }
  };

  // Settings Actions
  const setCompanySettings = async (updatedSettings) => {
    try {
      const response = await fetch(`${API_BASE}/settings/company`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(updatedSettings)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setCompanySettingsState(data);
    } catch (error) {
      console.error("Failed to update company settings", error);
    }
  };

  const setPrefs = async (updatedPrefs) => {
    try {
      const response = await fetch(`${API_BASE}/settings/prefs`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(updatedPrefs)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setPrefsState(data);
    } catch (error) {
      console.error("Failed to update preferences", error);
    }
  };

  // Backup Actions
  const createBackupState = async () => {
    try {
      const response = await fetch(`${API_BASE}/backups`, {
        method: "POST",
        headers: getHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setBackups(prev => [data, ...prev]);
      
      // Refresh notifications list to show completed notification
      const notifRes = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
      if (notifRes.ok) setNotifications(await notifRes.json());
      
      return data;
    } catch (error) {
      console.error("Failed to trigger database backup", error);
    }
  };

  const restoreBackupState = async (data) => {
    try {
      const response = await fetch(`${API_BASE}/backups/restore`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ payload: data })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message);

      // Overwrite local UI states with the restored details
      if (data.users) setUsers(data.users);
      if (data.services) setServices(data.services);
      if (data.payments) setPayments(data.payments);
      if (data.companySettings) setCompanySettingsState(data.companySettings);
      
      const notifRes = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
      if (notifRes.ok) setNotifications(await notifRes.json());
    } catch (error) {
      console.error("Failed to restore database from snapshot", error);
    }
  };

  return (
    <CRMContext.Provider
      value={{
        users,
        vendors,
        addVendor,
        editVendor,
        deleteVendor,
        setUsers,
        services,
        setServices,
        payments,
        setPayments,
        notifications,
        setNotifications,
        backups,
        setBackups,
        companySettings,
        setCompanySettings,
        currentUser,
        setCurrentUser,
        prefs,
        setPrefs,
        addNotification,
        addUser,
        editUser,
        deleteUser,
        addService,
        editService,
        deleteService,
        addPayment,
        updatePaymentStatus,
        deletePayment,
        markRead,
        markAllRead,
        createBackupState,
        restoreBackupState,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) throw new Error("useCRM must be used within CRMProvider");
  return context;
}
