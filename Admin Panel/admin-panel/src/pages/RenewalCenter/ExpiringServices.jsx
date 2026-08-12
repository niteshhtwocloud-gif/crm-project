import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { FiSearch, FiRefreshCw } from 'react-icons/fi';
import '../PagesCommon.css';

export default function ExpiringServices() {
  const { services, renewService } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  const expiringList = useMemo(() => {
    return services.filter(s => s.hasExpiry && s.daysLeft > 0 && s.daysLeft <= 7);
  }, [services]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return expiringList;
    const q = searchTerm.toLowerCase();
    return expiringList.filter(s =>
      (s.customer || '').toLowerCase().includes(q) ||
      (s.product || '').toLowerCase().includes(q) ||
      (s.username || '').toLowerCase().includes(q) ||
      (s.vendorId || '').toLowerCase().includes(q) ||
      (s.parentVendorName || '').toLowerCase().includes(q) ||
      (s.domain || '').toLowerCase().includes(q)
    );
  }, [expiringList, searchTerm]);

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr || '—';
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr || '—';
    }
  };

  const formatDaysRemaining = (days) => {
    if (days <= 0) return 'Today';
    if (days === 1) return '1 Day';
    return `${days} Days`;
  };

  const handleRenew = (id) => {
    renewService(id);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Expiring in 7 Days</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Services expiring within the next 7 days — {expiringList.length} service{expiringList.length !== 1 ? 's' : ''} found.
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            className="filter-input"
            placeholder="Search by customer, product, vendor, domain..."
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
                <th style={{ minWidth: '140px' }}>Username</th>
                <th style={{ minWidth: '170px' }}>Product/Service</th>
                <th style={{ minWidth: '170px' }}>Vendor</th>
                <th style={{ minWidth: '180px' }}>Domain</th>
                <th style={{ minWidth: '120px' }}>Start Date</th>
                <th style={{ minWidth: '120px' }}>Expiry Date</th>
                <th style={{ minWidth: '140px' }}>Days Remaining</th>
                <th style={{ minWidth: '100px' }}>Status</th>
                <th style={{ textAlign: 'right', minWidth: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="td-strong">{s.customer || '—'}</td>
                  <td>{s.username || '—'}</td>
                  <td><span className="td-code">{s.product || '—'}</span></td>
                  <td>{s.parentVendorName || s.vendorId || '—'}</td>
                  <td>{s.domain || '—'}</td>
                  <td>{formatDate(s.creationDate)}</td>
                  <td>{formatDate(s.expiry || s.expiryDate)}</td>
                  <td className="td-strong">
                    <span className="status-badge" style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#D97706',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      {formatDaysRemaining(s.daysLeft)}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge" style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#F59E0B',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      Expiring Soon
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-small btn-primary-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleRenew(s.id)}
                    >
                      <FiRefreshCw /> Renew
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '48px 32px', color: 'var(--text-secondary)' }}>
                    {searchTerm.trim()
                      ? 'No matching services found.'
                      : 'No services are expiring in the next 7 days.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
