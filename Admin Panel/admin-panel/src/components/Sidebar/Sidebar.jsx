import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import logo from './logo.png';
import {
  MdSpaceDashboard,
  MdOutlineSettings,
  MdOutlineNotifications,
  MdOutlineSupportAgent,
  MdOutlineBackup,
  MdOutlineAssessment,
} from 'react-icons/md';
import { HiOutlineUsers } from 'react-icons/hi';
import { BsBoxSeam, BsHourglassSplit } from 'react-icons/bs';
import { FiRefreshCw, FiCreditCard, FiFileText, FiActivity, FiTruck, FiChevronDown, FiAlertCircle } from 'react-icons/fi';
import { RiShieldUserLine } from 'react-icons/ri';

import './Sidebar.css';

const menuItems = [
  { label: 'Dashboard', icon: <MdSpaceDashboard />, path: '/' },
  { label: 'Customers', icon: <HiOutlineUsers />, path: '/customers' },
  { label: 'Vendors', icon: <FiTruck />, path: '/vendors' },
  { label: 'Services', icon: <BsBoxSeam />, path: '/services' },
  {
    label: 'Renewal Center',
    icon: <FiRefreshCw />,
    path: '/renewal-center',
    submenu: [
      { label: 'Expiring in 7 Days', icon: <BsHourglassSplit />, path: '/renewal-center/expiring' },
      { label: 'Expired Services', icon: <FiAlertCircle />, path: '/renewal-center/expired' },
      { label: 'Renew Requests', icon: <FiRefreshCw />, path: '/renewal-center/requests' },
    ]
  },
  { label: 'Payments', icon: <FiCreditCard />, path: '/payments' },
  { label: 'Invoices', icon: <FiFileText />, path: '/invoices' },
  { label: 'Bulk Excel Manager', icon: <FiFileText />, path: '/excel-manager' },
  { label: 'Reports', icon: <MdOutlineAssessment />, path: '/reports' },
  { label: 'Notifications', icon: <MdOutlineNotifications />, path: '/notifications', badge: 58 },
  { label: 'Settings', icon: <MdOutlineSettings />, path: '/settings' },
  { label: 'Users & Roles', icon: <RiShieldUserLine />, path: '/users-roles' },
  { label: 'Activity Logs', icon: <FiActivity />, path: '/activity-logs' },
  { label: 'Support Tickets', icon: <MdOutlineSupportAgent />, path: '/support-tickets' },
  { label: 'Backup', icon: <MdOutlineBackup />, path: '/backup' },
];

export default function Sidebar({ collapsed, mobileOpen }) {
  const location = useLocation();

  // Auto-expand Renewal Center if current path is a submenu route
  const isRenewalRoute = location.pathname.startsWith('/renewal-center');
  const [renewalOpen, setRenewalOpen] = useState(isRenewalRoute);

  // Keep it in sync if user navigates via Dashboard card
  React.useEffect(() => {
    if (isRenewalRoute) setRenewalOpen(true);
  }, [isRenewalRoute]);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo" style={{ justifyContent: collapsed ? 'center' : 'flex-start', alignItems: 'center', gap: '12px' }}>
        <img
          src={logo}
          alt="H Two Cloud Solutions"
          style={{
            height: collapsed ? '40px' : '48px',
            width: collapsed ? '40px' : '48px',
            objectFit: 'contain',
            borderRadius: '50%',
            background: '#fff',
            padding: '4px',
            flexShrink: 0
          }}
        />
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '18px', fontWeight: '800', lineHeight: '1.2', color: '#FFFFFF' }}>H &nbsp;&nbsp;Two</span>
            <span style={{ fontSize: '15px', fontWeight: '600', lineHeight: '1.2', color: '#B8C0CC' }}>Cloud Solutions</span>
          </div>
        )}
      </div>

      <nav className="sidebar-menu">
        <ul>
          {menuItems.map((item) => {
            // Items with submenu
            if (item.submenu) {
              const isParentActive = location.pathname === item.path;
              const isSubActive = item.submenu.some(sub => location.pathname === sub.path);
              const isExpanded = renewalOpen;

              return (
                <li key={item.label}>
                  {/* Parent: Renewal Center */}
                  <div
                    className={`menu-item menu-item-parent ${isParentActive && !isSubActive ? 'menu-item-active' : ''} ${isExpanded ? 'menu-item-expanded' : ''}`}
                    onClick={() => setRenewalOpen(o => !o)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="menu-icon">{item.icon}</span>
                    {!collapsed && <span className="menu-label">{item.label}</span>}
                    {!collapsed && (
                      <span className={`submenu-chevron ${isExpanded ? 'submenu-chevron-open' : ''}`}>
                        <FiChevronDown size={14} />
                      </span>
                    )}
                  </div>

                  {/* Submenu items */}
                  {!collapsed && isExpanded && (
                    <ul className="submenu-list">
                      {/* Main Renewal Center link */}
                      <li>
                        <NavLink
                          to={item.path}
                          end
                          className={({ isActive }) =>
                            `menu-item submenu-item ${isActive ? 'menu-item-active' : ''}`
                          }
                        >
                          <span className="menu-icon"><FiRefreshCw size={14} /></span>
                          <span className="menu-label">All Renewals</span>
                        </NavLink>
                      </li>
                      {item.submenu.map(sub => (
                        <li key={sub.label}>
                          <NavLink
                            to={sub.path}
                            className={({ isActive }) =>
                              `menu-item submenu-item ${isActive ? 'menu-item-active' : ''}`
                            }
                          >
                            <span className="menu-icon">{sub.icon}</span>
                            <span className="menu-label">{sub.label}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            // Regular items (no submenu)
            return (
              <li key={item.label}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `menu-item ${isActive ? 'menu-item-active' : ''}`
                  }
                >
                  <span className="menu-icon">{item.icon}</span>
                  {!collapsed && <span className="menu-label">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className="menu-badge">{item.badge}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

    </aside>
  );
}
