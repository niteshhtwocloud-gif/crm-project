import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { FiSave, FiUser, FiSettings, FiEye, FiEyeOff } from 'react-icons/fi';
import './Settings.css';
import '../PagesCommon.css';

export default function Settings() {
  const { settings, updateSettings, logAction } = useData();
  const { auth, updateAuth } = useAuth();
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';
  const location = useLocation();

  // Handle active tab state
  const defaultTab = location.state?.tab || 'profile';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync state if navigation changes history state
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  // Profile Form states
  const [profileName, setProfileName] = useState(auth?.name || '');
  const [profileEmail, setProfileEmail] = useState(auth?.email || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showProfilePassword, setShowProfilePassword] = useState(false);

  useEffect(() => {
    if (auth) {
      setProfileName(auth.name || '');
      setProfileEmail(auth.email || '');
    }
  }, [auth?.name, auth?.email]);
  
  // Workspace Form states
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [systemEmail, setSystemEmail] = useState(settings.systemEmail);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone);
  const [currency, setCurrency] = useState(settings.currency);
  const [paymentGateway, setPaymentGateway] = useState(settings.paymentGateway);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Hidden file input reference
  const fileInputRef = React.useRef(null);

  const getHeaders = () => {
    const token = localStorage.getItem('h2_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSavedSuccess(false);

    if (newPassword && newPassword !== confirmNewPassword) {
      setProfileError("New password and confirm password do not match.");
      return;
    }

    if (newPassword && !profilePassword) {
      setProfileError("Current password is required to set a new password.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/profile`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          currentPassword: profilePassword,
          newPassword: newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setProfileError(data.message || "Failed to update profile.");
      } else {
        updateAuth({
          name: data.user.name || profileName,
          email: data.user.email || profileEmail
        });
        logAction(`Updated user profile: "${profileName}"`);
        setProfilePassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setProfileSavedSuccess(true);
        setTimeout(() => setProfileSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      setProfileError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = reader.result;
      try {
        const response = await fetch(`${API_BASE}/api/profile/avatar`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ avatar: base64String })
        });
        if (response.ok) {
          updateAuth({ avatar: base64String });
          alert("Profile photo updated successfully.");
        } else {
          const err = await response.json();
          alert(err.message || "Failed to upload photo.");
        }
      } catch (err) {
        console.error(err);
        alert("Network error. Failed to upload photo.");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleResetAvatar = async () => {
    if (!window.confirm("Reset your profile photo?")) return;

    try {
      const response = await fetch(`${API_BASE}/api/profile/avatar`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (response.ok) {
        updateAuth({ avatar: null });
        alert("Profile photo reset successfully.");
      } else {
        const err = await response.json();
        alert(err.message || "Failed to reset photo.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Failed to reset photo.");
    }
  };

  const handleWorkspaceSubmit = (e) => {
    e.preventDefault();
    updateSettings({
      companyName,
      systemEmail,
      contactPhone,
      currency,
      paymentGateway
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const isVendor = auth?.role === 'vendor';

  return (
    <div className="page-container" style={{ maxWidth: '680px' }}>
      <div className="page-header">
        <div>
          <h2>Account &amp; Workspace Settings</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Manage your personal profile, notification preferences, and cloud workspace integrations.
          </p>
        </div>
      </div>

      <div className="settings-tabs">
        <button
          className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <FiUser style={{ marginRight: '6px', verticalAlign: 'middle' }} /> User Profile
        </button>
        {!isVendor && (
          <button
            className={`settings-tab-btn ${activeTab === 'workspace' ? 'active' : ''}`}
            onClick={() => setActiveTab('workspace')}
          >
            <FiSettings style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Workspace Settings
          </button>
        )}
      </div>

      <div className="data-card" style={{ padding: '28px' }}>
        {activeTab === 'profile' ? (
          <div>
            {profileSavedSuccess && (
              <div style={{ padding: '12px 18px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', fontWeight: 600, fontSize: '14px', marginBottom: '20px' }}>
                ✓ Profile details updated successfully.
              </div>
            )}
            {profileError && (
              <div style={{ padding: '12px 18px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontWeight: 600, fontSize: '14px', marginBottom: '20px' }}>
                ⚠ {profileError}
              </div>
            )}
            <form onSubmit={handleProfileSubmit}>
              <div className="profile-avatar-section">
                <img src={auth?.avatar || "https://i.pravatar.cc/128?img=13"} alt="User avatar" className="profile-avatar-large" />
                <div className="avatar-actions">
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    style={{ display: 'none' }} 
                    ref={fileInputRef} 
                    onChange={handleAvatarUpload} 
                  />
                  <button type="button" className="avatar-upload-btn" onClick={() => fileInputRef.current?.click()}>Upload New Photo</button>
                  <button type="button" className="avatar-delete-btn" onClick={handleResetAvatar}>Reset Avatar</button>
                </div>
              </div>

              <div className="form-field">
                <label>Full Display Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label>Login Email Address *</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                />
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label>Current Password (Optional)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showProfilePassword ? "text" : "password"}
                      className="form-input"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <button type="button" onClick={() => setShowProfilePassword(!showProfilePassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#666', padding: 0 }}>
                      {showProfilePassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="form-field">
                  <label>New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Account Role (Readonly)</label>
                  <input
                    type="text"
                    disabled
                    className="form-input"
                    style={{ background: '#f8fafc', color: 'var(--text-secondary)' }}
                    value={auth?.role || 'User'}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="action-btn"
                disabled={isLoading}
                style={{ marginTop: '12px', width: '100%', justifyContent: 'center', opacity: isLoading ? 0.7 : 1 }}
              >
                <FiSave /> {isLoading ? "Saving..." : "Save Profile Details"}
              </button>
            </form>
          </div>
        ) : (
          <div>
            {savedSuccess && (
              <div style={{ padding: '12px 18px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', fontWeight: 600, fontSize: '14px', marginBottom: '20px' }}>
                ✓ Workspace settings saved successfully.
              </div>
            )}
            <form onSubmit={handleWorkspaceSubmit}>
              <div className="form-field">
                <label>Organization Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label>System Dispatch Email *</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    value={systemEmail}
                    onChange={(e) => setSystemEmail(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Support Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label>Billing Currency Symbol</label>
                  <select
                    className="form-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="₹">₹ (INR)</option>
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Primary Payment Gateway</label>
                  <select
                    className="form-select"
                    value={paymentGateway}
                    onChange={(e) => setPaymentGateway(e.target.value)}
                  >
                    <option value="Razorpay">Razorpay Checkout</option>
                    <option value="Stripe">Stripe Checkout</option>
                    <option value="PayPal">PayPal Business</option>
                    <option value="Cashfree">Cashfree Payments</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="action-btn"
                style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}
              >
                <FiSave /> Save Workspace Settings
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
