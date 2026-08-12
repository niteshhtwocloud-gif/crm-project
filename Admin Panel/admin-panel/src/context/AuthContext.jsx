import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE || 'https://crm-backend-4fh2.onrender.com/';

const STORAGE_KEY = 'h2_auth';
const TOKEN_KEY = 'h2_token';

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });




  
  const [token, setToken] = useState(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });

  // Until the saved token is verified against the server we must not render
  // protected pages, otherwise the dashboard flashes on screen before the
  // redirect to /login. `authChecked` gates that.
  const [authChecked, setAuthChecked] = useState(
    () => !localStorage.getItem(TOKEN_KEY)
  );

  // Verify session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      // No token at all -> definitely logged out. Clear any stale user blob
      // left behind, which was what let the dashboard open without a login.
      localStorage.removeItem(STORAGE_KEY);
      setAuth(null);
      setAuthChecked(true);
      return;
    }
    if (savedToken) {
      fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          "Authorization": `Bearer ${savedToken}`
        }
      })
      .then(res => {
        if (!res.ok) throw new Error("Invalid session");
        return res.json();
      })
      .then(data => {
        const userPayload = {
          role: data.user.role || (data.user.email === "admin@vendorcrm.com" ? "Super Admin" : "Vendor Partner"),
          name: data.user.name,
          email: data.user.email,
          avatar: data.user.avatar || null,
          loggedInAt: new Date().toISOString()
        };
        setAuth(userPayload);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userPayload));
      })
      .catch(err => {
        console.error("Admin session verification failed:", err);
        logout();
      })
      .finally(() => setAuthChecked(true));
    }
  }, []);

  async function loginApi(email, password) {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to authenticate.");
    }
    
    const userPayload = {
      role: data.user.role || (email === "admin@vendorcrm.com" ? "Super Admin" : "Vendor Partner"),
      name: data.user.name,
      email: data.user.email,
      avatar: data.user.avatar || null,
      loggedInAt: new Date().toISOString()
    };
    
    setToken(data.token);
    setAuth(userPayload);
    setAuthChecked(true);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userPayload));
    return userPayload;
  }

  async function registerApi(name, email, password) {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to register.");
    }

    const userPayload = {
      role: data.user.role || (email === "admin@vendorcrm.com" ? "Super Admin" : "Vendor Partner"),
      name: data.user.name,
      email: data.user.email,
      avatar: data.user.avatar || null,
      loggedInAt: new Date().toISOString()
    };

    setToken(data.token);
    setAuth(userPayload);
    setAuthChecked(true);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userPayload));
    return userPayload;
  }

  function logout() {
    setAuth(null);
    setToken(null);
    setAuthChecked(true);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  function updateAuth(newPayload) {
    setAuth(prev => {
      const updated = { ...prev, ...newPayload };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <AuthContext.Provider value={{ auth, token, authChecked, login: loginApi, register: registerApi, logout, updateAuth, isAuthenticated: !!auth && !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
