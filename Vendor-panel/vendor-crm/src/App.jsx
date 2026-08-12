import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import VerifyOTP from "./pages/auth/VerifyOTP";
import ResetPassword from "./pages/auth/ResetPassword";
import Dashboard from "./pages/Dashboard/Dashboard";
import Reports from "./pages/Reports/Reports";
import Services from "./pages/Services/Services";
import VendorExpiringServices from "./pages/RenewalCenter/VendorExpiringServices";
import VendorExpiredServices from "./pages/RenewalCenter/VendorExpiredServices";
import BuyServices from "./pages/BuyServices/BuyServices";
import Payments from "./pages/Payments/Payments";
import Excel from "./pages/Excel/Excel";
import NotificationsPage from "./pages/Notifications/Notifications";
import Settings from "./pages/Settings/Settings";
import { ToastProvider } from "./context/ToastContext";
import { CRMProvider } from "./context/CRMContext";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE || 'https://crm-backend-4fh2.onrender.com';

function App() {
  const [isAuthed, setIsAuthed] = useState(
    localStorage.getItem("isAuthed") === "true" && !!localStorage.getItem("token")
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error("Invalid session");
          }
          return res.json();
        })
        .then(data => {
          if (data && data.user) {
            localStorage.setItem("adminUser", JSON.stringify(data.user));
          }
        })
        .catch(err => {
          console.error("Session verification failed, logging out:", err);
          localStorage.removeItem("isAuthed");
          localStorage.removeItem("token");
          localStorage.removeItem("adminUser");
          setIsAuthed(false);
        });
    }
  }, []);

  return (
    <ToastProvider>
      <CRMProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={isAuthed ? <Navigate to="/" replace /> : <Login onLogin={() => setIsAuthed(true)} />}
            />
            <Route path="/forgot-password" element={isAuthed ? <Navigate to="/" replace /> : <ForgotPassword />} />
            <Route path="/verify-otp" element={isAuthed ? <Navigate to="/" replace /> : <VerifyOTP />} />
            <Route path="/reset-password" element={isAuthed ? <Navigate to="/" replace /> : <ResetPassword />} />
            <Route
              element={isAuthed ? (
                <DashboardLayout onLogout={() => {
                  localStorage.removeItem("isAuthed");
                  localStorage.removeItem("token");
                  localStorage.removeItem("adminUser");
                  setIsAuthed(false);
                }} />
              ) : <Navigate to="/login" replace />}
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/services" element={<Services />} />
              <Route path="/renewal-center/expiring" element={<VendorExpiringServices />} />
              <Route path="/renewal-center/expired" element={<VendorExpiredServices />} />
              <Route path="/buy-services" element={<BuyServices />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/excel" element={<Excel />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CRMProvider>
    </ToastProvider>
  );
}



export default App;

