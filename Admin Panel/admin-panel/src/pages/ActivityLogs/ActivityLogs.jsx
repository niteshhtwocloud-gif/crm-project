import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { FiSearch } from 'react-icons/fi';
import '../PagesCommon.css';

export default function ActivityLogs() {
  const { activityLogs } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = activityLogs.filter(
    (log) =>
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>System Audit Trail</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            A read-only log tracking changes, backups, logins, and billing operations.
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            className="filter-input"
            placeholder="Search audit trail by user or action..."
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
                <th>Timestamp</th>
                <th>Operator</th>
                <th>Action Logged</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className="td-code" style={{ padding: '4px 8px' }}>
                      {log.timestamp}
                    </span>
                  </td>
                  <td className="td-strong">{log.user}</td>
                  <td>{log.action}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No audit logs recorded matching search criteria.
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
