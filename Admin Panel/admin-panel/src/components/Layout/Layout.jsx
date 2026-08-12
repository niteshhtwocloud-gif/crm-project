import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import Navbar from '../Navbar/Navbar';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const titleMap = {
  '/': ['Dashboard', 'Welcome back, Admin 👋'],
  '/customers': ['Customers', 'Manage all your customers'],
  '/vendors': ['Vendors', 'Manage all your vendors'],
  '/services': ['Services', 'Track active and expiring services'],
  '/renewal-center': ['Renewal Center', 'Upcoming and overdue renewals'],
  '/renewal-center/expiring': ['Expiring in 7 Days', 'Services expiring within the next 7 days'],
  '/renewal-center/expired': ['Expired Services', 'Services past their expiry date'],
  '/payments': ['Payments', 'Track payment status'],
  '/invoices': ['Invoices', 'All customer invoices'],
  '/reports': ['Reports', 'Business performance reports'],
  '/settings': ['Settings', 'Configure your workspace'],
  '/users-roles': ['Users & Roles', 'Manage access and permissions'],
  '/activity-logs': ['Activity Logs', 'Track every action on your account'],
  '/support-tickets': ['Support Tickets', 'Help your customers faster'],
  '/backup': ['Backup', 'Keep your data safe'],
  '/excel-manager': ['Bulk Excel Manager', 'Import or export cloud spreadsheets'],
};

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState(null);
  const location = useLocation();
  const { auth } = useAuth();

  const [title, defaultSubtitle] = titleMap[location.pathname] || ['Dashboard', 'Welcome back, Admin 👋'];
  const subtitle =
    location.pathname === '/' && auth?.name ? `Welcome back, ${auth.name} 👋` : defaultSubtitle;




  return (
    <div className="layout">
      <Sidebar collapsed={collapsed} />
      <div className="layout-main">
        <Navbar
          onToggleSidebar={() => setCollapsed((c) => !c)}
          pageTitle={title}
          pageSubtitle={subtitle}
        />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
      {toast && <div className="global-toast">{toast}</div>}
    </div>
  );
}
