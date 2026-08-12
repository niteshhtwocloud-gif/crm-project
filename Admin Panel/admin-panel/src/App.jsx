import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import Login from './pages/Login/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Import newly implemented screens
import Customers from './pages/Customers/Customers';
import Vendors from './pages/Vendors/Vendors';
import Services from './pages/Services/Services';
import RenewalCenter from './pages/RenewalCenter/RenewalCenter';
import ExpiringServices from './pages/RenewalCenter/ExpiringServices';
import ExpiredServices from './pages/RenewalCenter/ExpiredServices';
import RenewRequests from './pages/RenewalCenter/RenewRequests';
import Payments from './pages/Payments/Payments';
import Invoices from './pages/Invoices/Invoices';
import Reports from './pages/Reports/Reports';
import Notifications from './pages/Notifications/Notifications';
import Settings from './pages/Settings/Settings';
import UsersRoles from './pages/UsersRoles/UsersRoles';
import ActivityLogs from './pages/ActivityLogs/ActivityLogs';
import SupportTickets from './pages/SupportTickets/SupportTickets';
import Backup from './pages/Backup/Backup';
import ExcelManager from './pages/ExcelManager/ExcelManager';

const routes = [
  { path: 'customers', element: <Customers /> },
  { path: 'vendors', element: <Vendors /> },
  { path: 'services', element: <Services /> },
  { path: 'renewal-center', element: <RenewalCenter /> },
  { path: 'renewal-center/expiring', element: <ExpiringServices /> },
  { path: 'renewal-center/expired', element: <ExpiredServices /> },
  { path: 'renewal-center/requests', element: <RenewRequests /> },
  { path: 'payments', element: <Payments /> },
  { path: 'invoices', element: <Invoices /> },
  { path: 'reports', element: <Reports /> },
  { path: 'notifications', element: <Notifications /> },
  { path: 'settings', element: <Settings /> },
  { path: 'users-roles', element: <UsersRoles /> },
  { path: 'activity-logs', element: <ActivityLogs /> },
  { path: 'support-tickets', element: <SupportTickets /> },
  { path: 'backup', element: <Backup /> },
  { path: 'excel-manager', element: <ExcelManager /> },
];

export default function App() {
  const { auth, logout } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        {routes.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
