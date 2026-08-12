import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { FiSearch, FiRefreshCw } from 'react-icons/fi';
import '../PagesCommon.css';

export default function RenewalCenter() {
  const { services, renewService } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('All');

  const handleRenew = (id) => {
    renewService(id);
  };

  const filteredRenewals = (services || []).filter((s) => {
    const matchesSearch =
      (s.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.product || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesUrgency = true;
    if (urgencyFilter === 'Danger') matchesUrgency = (s.daysLeft ?? 0) <= 3;
    else if (urgencyFilter === 'Warning') matchesUrgency = (s.daysLeft ?? 0) > 3 && (s.daysLeft ?? 0) <= 8;
    else if (urgencyFilter === 'Safe') matchesUrgency = (s.daysLeft ?? 0) > 8;

    return matchesSearch && matchesUrgency;
  });

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Renewal Operations Center</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Monitor contract expiration alerts and extend licenses instantly.
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            className="filter-input"
            placeholder="Search by customer name or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
        >
          <option value="All">All Timelines</option>
          <option value="Danger">Urgent (&lt;= 3 Days)</option>
          <option value="Warning">Approaching (&lt;= 8 Days)</option>
          <option value="Safe">Safe (&gt; 8 Days)</option>
        </select>
      </div>

      <div className="data-card">
        <div className="table-responsive">
          <table className="h2-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Product/Service</th>
                <th>Renewal Cost</th>
                <th>Expiry Date</th>
                <th>Days Remaining</th>
                <th>Alert Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRenewals.map((s) => (
                <tr key={s.id}>
                  <td className="td-strong">{s.customer || '—'}</td>
                  <td><span className="td-code">{s.product || '—'}</span></td>
                  <td>₹{(s.amount || 0).toLocaleString('en-IN')}</td>
                  <td>{formatDate(s.expiry)}</td>
                  <td className="td-strong">{s.daysLeft ?? 0} Days</td>
                  <td>
                    <span className={`status-badge badge-${s.status}`}>
                      {s.daysLeft <= 0 ? 'Expired' : `${s.daysLeft} Days Remaining`}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-small btn-primary-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleRenew(s.id)}
                    >
                      <FiRefreshCw /> Renew 1 Year
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRenewals.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No renewal alerts found.
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
