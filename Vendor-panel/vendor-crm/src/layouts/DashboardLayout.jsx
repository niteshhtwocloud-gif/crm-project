import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import Navbar from "../components/Navbar/Navbar";
import { useCRM } from "../context/CRMContext";

const titleMap = {
  "/": { title: "Dashboard", subtitle: "Welcome back 👋" },
  "/reports": { title: "Customer", subtitle: "Search, filter and export your customer records" },
  "/services": { title: "Services", subtitle: "Manage all vendor services and pricing" },
  "/renewal-center/expiring": { title: "Expiring in 7 Days", subtitle: "Monitor customer services expiring within the next 7 days" },
  "/renewal-center/expired": { title: "Expired Services", subtitle: "View and request renewal for expired services" },
  "/buy-services": { title: "Buy Services", subtitle: "Order and provision new server nodes instantly" },
  "/payments": { title: "Payments", subtitle: "Track invoices and payment status" },
  "/excel": { title: "Excel Manager", subtitle: "Import and export data in bulk" },
  "/notifications": { title: "Notifications", subtitle: "Stay on top of alerts and updates" },
  "/settings": { title: "Settings", subtitle: "Manage company profile and preferences" },
};

export default function DashboardLayout({ onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useCRM();

  const meta = titleMap[location.pathname] || { title: "Vendor CRM", subtitle: "" };

  let activeUser = currentUser;
  if (!activeUser) {
    try {
      const storedUser = localStorage.getItem("adminUser");
      if (storedUser) activeUser = JSON.parse(storedUser);
    } catch (err) {
      console.error("Error parsing adminUser from localStorage", err);
    }
  }

  if (location.pathname === "/" && activeUser) {
    const displayName = activeUser.name || activeUser.vendorName || activeUser.companyName || "Vendor User";
    meta.subtitle = `Welcome back, ${displayName} 👋`;
  }

  const handleToggle = () => {
    if (window.innerWidth <= 1024) {
      setMobileOpen((o) => !o);
    } else {
      setCollapsed((c) => !c);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <div className={`app-layout ${collapsed ? "collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onLogout={handleLogout} />
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
      <div className="main-content">
        <Navbar
          onToggleSidebar={handleToggle}
          title={meta.title}
          subtitle={meta.subtitle}
          onLogout={handleLogout}
        />
        <div className="page-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
