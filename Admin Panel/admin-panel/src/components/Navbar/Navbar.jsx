import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';
import { FiSearch, FiCalendar, FiBell, FiChevronDown, FiLogOut, FiUser, FiSettings } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import Calendar from 'react-calendar';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import 'react-calendar/dist/Calendar.css';
import './Navbar.css';

export default function Navbar({ onToggleSidebar, pageTitle, pageSubtitle }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const calendarRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const { auth, logout } = useAuth();
  const { notifications, clearNotifications } = useData();
  const navigate = useNavigate();
  const displayName = auth?.name || 'Admin';
  const displayRole = auth?.role === 'vendor' ? 'Vendor' : 'Super Admin';
  const notifCount = notifications.length;

  function handleLogout() {
    setShowProfile(false);
    logout();
    navigate('/login', { replace: true });
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) setShowCalendar(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="icon-btn hamburger" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <HiOutlineMenuAlt2 />
        </button>
        <div className="navbar-titles">
          <h1>{pageTitle || 'Dashboard'}</h1>
          <p>{pageSubtitle || 'Welcome back, Admin 👋'}</p>
        </div>
      </div>

      <div className="navbar-right">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by customer, invoice, vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="navbar-icons">
          <div className="dropdown-wrapper" ref={calendarRef}>
            <button
              className="icon-btn"
              onClick={() => {
                setShowCalendar((s) => !s);
                setShowNotifications(false);
                setShowProfile(false);
              }}
              aria-label="Calendar"
            >
              <FiCalendar />
            </button>
            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  className="dropdown-panel calendar-dropdown"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <Calendar />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="dropdown-wrapper" ref={notifRef}>
            <button
              className="icon-btn"
              onClick={() => {
                setShowNotifications((s) => !s);
                setShowCalendar(false);
                setShowProfile(false);
              }}
              aria-label="Notifications"
            >
              <FiBell />
              {notifCount > 0 && <span className="notif-dot">{notifCount}</span>}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  className="dropdown-panel notif-dropdown"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="notif-header">
                    <span>Notifications</span>
                    <button onClick={clearNotifications}>Clear all</button>
                  </div>
                  <div className="notif-list">
                    {notifications.map((n) => (
                      <div
                        className="notif-item"
                        key={n.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (n.category === 'Renewal Request' || (n.text && n.text.toLowerCase().includes('renewal request'))) {
                            setShowNotifications(false);
                            navigate('/renewal-center/requests');
                          }
                        }}
                      >
                        <span className={`notif-dotmark notif-${n.type}`} />
                        <div>
                          <p>{n.text}</p>
                          <span className="notif-time">{n.time}</span>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        No new notifications.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="dropdown-wrapper profile-wrapper" ref={profileRef}>
            <button
              className="profile-btn"
              onClick={() => {
                setShowProfile((s) => !s);
                setShowCalendar(false);
                setShowNotifications(false);
              }}
            >
              <img
                src={auth?.avatar || "https://i.pravatar.cc/64?img=13"}
                alt={`${displayName} avatar`}
                className="profile-avatar"
              />
              <div className="profile-info">
                <span className="profile-name">{displayName}</span>
                <span className="profile-role">{displayRole}</span>
              </div>
              <FiChevronDown className="chevron" />
            </button>
            <AnimatePresence>
              {showProfile && (
                <motion.div
                  className="dropdown-panel profile-dropdown"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <button className="profile-menu-item" onClick={() => { setShowProfile(false); navigate('/settings', { state: { tab: 'profile' } }); }}>
                    <FiUser /> My Profile
                  </button>
                  <button className="profile-menu-item" onClick={() => { setShowProfile(false); navigate('/settings', { state: { tab: 'workspace' } }); }}>
                    <FiSettings /> Account Settings
                  </button>
                  <button className="profile-menu-item logout" onClick={handleLogout}>
                    <FiLogOut /> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
