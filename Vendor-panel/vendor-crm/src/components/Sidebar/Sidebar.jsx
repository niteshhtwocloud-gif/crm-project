import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import logo from "./logo.png";
import {
  LuLayoutDashboard,
  LuChartBar,
  LuServer,
  LuWallet,
  LuFileSpreadsheet,
  LuDatabaseBackup,
  LuBell,
  LuSettings,
  LuLogOut,
  LuShoppingCart,
  LuRotateCw,
  LuHourglass,
  LuTimerOff,
  LuChevronDown
} from "react-icons/lu";
import { useCRM } from "../../context/CRMContext";
import "./Sidebar.css";

const navItems = [
  { to: "/", label: "Dashboard", icon: LuLayoutDashboard, end: true },
  { to: "/reports", label: "Customer", icon: LuChartBar },
  { to: "/services", label: "Services", icon: LuServer },
  {
    label: "Renewal Center",
    icon: LuRotateCw,
    submenu: [
      { to: "/renewal-center/expiring", label: "Expiring in 7 Days", icon: LuHourglass },
      { to: "/renewal-center/expired", label: "Expired Services", icon: LuTimerOff },
    ]
  },
  { to: "/buy-services", label: "Buy Services", icon: LuShoppingCart },
  { to: "/payments", label: "Payments", icon: LuWallet },
  { to: "/excel", label: "Excel Manager", icon: LuFileSpreadsheet },
  { to: "/notifications", label: "Notifications", icon: LuBell },
  { to: "/settings", label: "Settings", icon: LuSettings },
];

export default function Sidebar({ collapsed, mobileOpen, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications } = useCRM();

  const isRenewalActive = location.pathname.startsWith("/renewal-center");
  const [renewalOpen, setRenewalOpen] = useState(isRenewalActive);

  useEffect(() => {
    if (isRenewalActive) setRenewalOpen(true);
  }, [location.pathname]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-logo">
        <img
          src={logo}
          alt="H Two Cloud Solutions"
          style={{
            width: collapsed ? "36px" : "42px",
            height: collapsed ? "36px" : "42px",
            objectFit: "contain",
            borderRadius: "50%",
            background: "#fff",
            padding: "4px",
            flexShrink: 0
          }}
        />
        {!collapsed && (
          <div className="logo-text">
            <span className="logo-title">VENDOR</span>
            <span className="logo-subtitle">CRM SOLUTIONS</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => {
            if (item.submenu) {
              return (
                <li key={item.label}>
                  <div
                    className={`nav-link nav-parent ${isRenewalActive ? "active" : ""}`}
                    onClick={() => setRenewalOpen((o) => !o)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="nav-icon">
                      <item.icon size={19} />
                    </span>
                    {!collapsed && <span className="nav-label">{item.label}</span>}
                    {!collapsed && (
                      <span className={`chevron-icon ${renewalOpen ? "open" : ""}`}>
                        <LuChevronDown size={14} />
                      </span>
                    )}
                  </div>
                  {!collapsed && renewalOpen && (
                    <ul className="submenu-list">
                      {item.submenu.map((sub) => (
                        <li key={sub.to}>
                          <NavLink
                            to={sub.to}
                            className={({ isActive }) => `nav-link submenu-item ${isActive ? "active" : ""}`}
                          >
                            <span className="nav-icon">
                              <sub.icon size={16} />
                            </span>
                            <span className="nav-label">{sub.label}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            const hasBadge = item.to === "/notifications" && unreadCount > 0;
            const badgeVal = item.to === "/notifications" ? unreadCount : undefined;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="nav-icon">
                    <item.icon size={19} />
                  </span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                  {!collapsed && hasBadge && <span className="nav-badge">{badgeVal}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <button className="logout-link" onClick={onLogout}>
        <span className="nav-icon">
          <LuLogOut size={19} />
        </span>
        {!collapsed && <span className="nav-label">Logout</span>}
      </button>
    </aside>
  );
}

