import { useState, useRef, useEffect } from "react";
import { LuMenu, LuSearch, LuCalendar, LuBell, LuChevronDown, LuUser, LuSettings, LuLogOut } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { useCRM } from "../../context/CRMContext";
import logo from "../Sidebar/logo.png";
import "./Navbar.css";

export default function Navbar({ onToggleSidebar, title, subtitle, onLogout }) {
  const [search, setSearch] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const navigate = useNavigate();
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const calRef = useRef(null);
  const { notifications, companySettings, currentUser } = useCRM();

  let activeUser = currentUser;
  if (!activeUser) {
    try {
      const storedUser = localStorage.getItem("adminUser");
      if (storedUser) activeUser = JSON.parse(storedUser);
    } catch (err) {
      console.error("Error parsing adminUser from localStorage", err);
    }
  }

  const displayName = activeUser?.name || activeUser?.vendorName || activeUser?.companyName || "Vendor User";
  const displayEmail = activeUser?.email || "";
  const displayRole = activeUser?.role === "super_admin" ? "Super Admin" : 
                      activeUser?.role === "vendor" ? "Vendor Admin" : 
                      activeUser?.role === "sub_vendor" ? "Vendor User" :
                      activeUser?.role === "Customer" ? "Customer" : "Vendor User";
  const avatarSrc = logo;

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (calRef.current && !calRef.current.contains(e.target)) setShowCalendar(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const today = new Date();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="icon-btn hamburger" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <LuMenu size={20} />
        </button>
        <div>
          <h1 className="navbar-title">{title}</h1>
          {subtitle && <p className="navbar-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="navbar-right">
        <div className="search-bar">
          <LuSearch size={17} className="search-icon" />
          <input
            type="text"
            placeholder="Search by user, service, invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && search.trim()) {
                navigate(`/reports?q=${encodeURIComponent(search)}`);
                setSearch("");
              }
            }}
          />
        </div>

        <div className="navbar-actions">
          <div className="dropdown-wrap" ref={calRef}>
            <button className="icon-btn" onClick={() => setShowCalendar((s) => !s)} aria-label="Calendar">
              <LuCalendar size={19} />
            </button>
            {showCalendar && (
              <div className="dropdown-panel calendar-panel">
                <p className="dropdown-heading">Today</p>
                <p className="calendar-date">
                  {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
                <button className="dropdown-link" onClick={() => { setShowCalendar(false); navigate("/"); }}>
                  View renewal calendar
                </button>
              </div>
            )}
          </div>

          <div className="dropdown-wrap" ref={notifRef}>
            <button className="icon-btn" onClick={() => setShowNotif((s) => !s)} aria-label="Notifications">
              <LuBell size={19} />
              {unreadCount > 0 && <span className="notif-dot">{unreadCount}</span>}
            </button>
            {showNotif && (
              <div className="dropdown-panel notif-panel">
                <p className="dropdown-heading">Notifications</p>
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="notif-item" onClick={() => { setShowNotif(false); navigate("/notifications"); }}>
                    <p className="notif-text" style={{ fontWeight: n.unread ? "600" : "400" }}>{n.text}</p>
                    <span className="notif-time">{n.time}</span>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <p style={{ padding: "16px", fontSize: "13px", color: "var(--text-secondary)", textAlign: "center" }}>
                    No notifications
                  </p>
                )}
                <button
                  className="dropdown-link"
                  onClick={() => { setShowNotif(false); navigate("/notifications"); }}
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>

          <div className="dropdown-wrap profile-wrap" ref={profileRef}>
            <button className="profile-btn" onClick={() => setShowProfile((s) => !s)}>
              <img
                src={avatarSrc}
                alt="H Two Cloud Solutions"
                className="profile-avatar"
                style={{ objectFit: "contain", background: "#fff" }}
              />
              <div className="profile-info">
                <span className="profile-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "130px" }} title={displayName}>
                  {displayName}
                </span>
                <span className="profile-role">
                  {displayRole}
                </span>
              </div>
              <LuChevronDown size={16} className="profile-chevron" />
            </button>
            {showProfile && (
              <div className="dropdown-panel profile-panel">
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", marginBottom: "8px" }}>
                  <div style={{ fontWeight: "600", color: "var(--text)", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={displayName}>
                    {displayName}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={displayEmail}>
                    {displayEmail}
                  </div>
                </div>
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate("/settings"); }}>
                  <LuUser size={16} /> My Profile
                </button>
                <button className="dropdown-item" onClick={() => { setShowProfile(false); navigate("/settings"); }}>
                  <LuSettings size={16} /> Settings
                </button>
                <button className="dropdown-item danger" onClick={() => { setShowProfile(false); onLogout(); }}>
                  <LuLogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

