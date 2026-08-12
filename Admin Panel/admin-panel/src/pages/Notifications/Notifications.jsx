import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { FiBell, FiTrash2, FiInfo, FiCheckCircle, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';
import '../PagesCommon.css';

const iconMap = {
  success: <FiCheckCircle style={{ color: 'var(--success)' }} />,
  warning: <FiAlertTriangle style={{ color: 'var(--warning)' }} />,
  danger: <FiAlertCircle style={{ color: 'var(--danger)' }} />,
  info: <FiInfo style={{ color: 'var(--primary)' }} />,
};

export default function Notifications() {
  const { notifications, clearNotifications, logAction } = useData();
  const navigate = useNavigate();

  const handleClearAll = () => {
    clearNotifications();
    logAction('Cleared all notifications');
  };

  const handleNavigate = (path) => {
    if (path) navigate(path);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>System Alerts &amp; Notifications</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            System logs, backup outcomes, renewal reminders, and payout activities.
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            className="action-btn"
            style={{ background: 'var(--danger)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.25)' }}
            onClick={handleClearAll}
          >
            <FiTrash2 /> Clear All Alerts
          </button>
        )}
      </div>

      <div className="data-card" style={{ padding: '8px 0' }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer'
            }}
            onClick={() => {
              if (n.category === 'Renewal Request' || (n.text && n.text.toLowerCase().includes('renewal request'))) {
                navigate('/renewal-center/requests');
              }
            }}
          >
            <div
              style={{
                padding: '10px',
                borderRadius: '12px',
                background: '#f8fafc',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {iconMap[n.type] || iconMap.info}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {n.text}
              </p>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{n.time || 'Just now'}</span>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
            <FiBell style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.6 }} />
            <p>Your notification tray is completely empty.</p>
          </div>
        )}
      </div>
    </div>
  );
}
