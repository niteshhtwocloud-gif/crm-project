import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../context/DataContext';
import { FiSearch, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import '../PagesCommon.css';

export default function RenewRequests() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [submitting, setSubmitting] = useState(false);

  const getAuthToken = () => token || localStorage.getItem('h2_token') || localStorage.getItem('token') || '';

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/renewal-requests`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to fetch renewal requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const formatDate = (dateVal) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return String(dateVal);
    }
  };

  const calculateNewExpiry = (currentExpiryStr) => {
    try {
      const base = currentExpiryStr ? new Date(currentExpiryStr) : new Date();
      const curr = isNaN(base.getTime()) ? new Date() : base;
      const next = new Date(curr);
      next.setFullYear(next.getFullYear() + 1);
      return formatDate(next);
    } catch {
      return '1 Year Later';
    }
  };

  const handleOpenApproveModal = (req) => {
    setSelectedRequest(req);
    setActionType('approve');
  };

  const handleOpenRejectModal = (req) => {
    setSelectedRequest(req);
    setActionType('reject');
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return;
    setSubmitting(true);

    try {
      const endpoint = `${API_BASE}/api/renewal-requests/${selectedRequest._id}/${actionType}`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (res.ok) {
        await fetchRequests();
        setSelectedRequest(null);
        setActionType(null);
      } else {
        const err = await res.json();
        alert(err.message || `Failed to ${actionType} request.`);
      }
    } catch (err) {
      console.error(`Failed to ${actionType} request:`, err);
      alert(`Network error trying to ${actionType} request.`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.username || '').toLowerCase().includes(q) ||
      (r.serviceName || '').toLowerCase().includes(q) ||
      (r.vendorName || '').toLowerCase().includes(q) ||
      (r.domain || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Renewal Requests</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Review vendor-submitted service renewal requests — {requests.length} total request{requests.length !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            className="filter-input"
            placeholder="Search by customer, username, service, vendor, domain..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="data-card">
        <div className="table-responsive">
          <table className="h2-table">
            <thead>
              <tr>
                <th style={{ minWidth: '140px' }}>Customer</th>
                <th style={{ minWidth: '120px' }}>Username</th>
                <th style={{ minWidth: '160px' }}>Product/Service</th>
                <th style={{ minWidth: '150px' }}>Vendor</th>
                <th style={{ minWidth: '160px' }}>Domain</th>
                <th style={{ minWidth: '130px' }}>Current Expiry</th>
                <th style={{ minWidth: '130px' }}>Requested Date</th>
                <th style={{ minWidth: '110px' }}>Status</th>
                <th style={{ textAlign: 'right', minWidth: '160px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r) => (
                <tr key={r._id}>
                  <td className="td-strong">{r.customerName || '—'}</td>
                  <td>{r.username || '—'}</td>
                  <td><span className="td-code">{r.serviceName || '—'}</span></td>
                  <td>{r.vendorName || '—'}</td>
                  <td>{r.domain || '—'}</td>
                  <td>{formatDate(r.currentExpiryDate)}</td>
                  <td>{formatDate(r.requestedAt)}</td>
                  <td>
                    <span style={{
                      background: r.requestStatus === 'Approved' ? 'rgba(34, 197, 94, 0.1)' : r.requestStatus === 'Rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: r.requestStatus === 'Approved' ? '#166534' : r.requestStatus === 'Rejected' ? '#991B1B' : '#92400E',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      {r.requestStatus || 'Pending'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {r.requestStatus === 'Pending' ? (
                      <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn-small btn-primary-sm"
                          style={{ background: '#22C55E', borderColor: '#22C55E', color: '#fff' }}
                          onClick={() => handleOpenApproveModal(r)}
                        >
                          <FiCheck /> Approve
                        </button>
                        <button
                          className="btn-small"
                          style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleOpenRejectModal(r)}
                        >
                          <FiX /> Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Reviewed by {r.reviewedBy || 'Admin'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '48px 32px', color: 'var(--text-secondary)' }}>
                    {loading ? 'Loading renewal requests...' : 'No renewal requests found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedRequest && actionType && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '440px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>
              {actionType === 'approve' ? 'Approve Renewal Request?' : 'Reject Renewal Request?'}
            </h3>

            {actionType === 'approve' ? (
              <div style={{ fontSize: '14px', color: '#4B5563', marginBottom: '20px', lineHeight: 1.5 }}>
                <p style={{ margin: '0 0 12px 0' }}>Approve this renewal request for 1 calendar year?</p>
                <div style={{ background: '#F3F4F6', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                  <div><strong>Customer:</strong> {selectedRequest.customerName || selectedRequest.username || 'Customer'}</div>
                  <div><strong>Service:</strong> {selectedRequest.serviceName}</div>
                  <div style={{ marginTop: '6px' }}><strong>Current Expiry:</strong> {formatDate(selectedRequest.currentExpiryDate)}</div>
                  <div><strong>New Expiry:</strong> <span style={{ color: '#059669', fontWeight: 600 }}>{calculateNewExpiry(selectedRequest.currentExpiryDate)}</span></div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: '#4B5563', marginBottom: '20px' }}>
                Are you sure you want to reject the renewal request for <strong>{selectedRequest.serviceName}</strong>? The service expiry date will remain unchanged.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
                onClick={() => { setSelectedRequest(null); setActionType(null); }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: actionType === 'approve' ? '#059669' : '#DC2626',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
                onClick={handleConfirmAction}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
