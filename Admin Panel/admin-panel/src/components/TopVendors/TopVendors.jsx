import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import './TopVendors.css';

const statusLabel = {
  success: 'Paid',
  warning: 'Due',
};

export default function TopVendors() {
  const navigate = useNavigate();
  const { vendors } = useData();

  // The API returns vendors sorted alphabetically, so "Top Vendors" was
  // really "first five by name". Rank by purchase value instead.
  const topVendors = [...vendors]
    .sort((a, b) => (Number(b.totalPurchase) || 0) - (Number(a.totalPurchase) || 0))
    .slice(0, 5);

  const money = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;

  return (
    <div className="table-card">
      <div className="table-card-header">
        <h3>Top Vendors</h3>
        <button className="view-all-btn" onClick={() => navigate('/vendors')}>
          View All
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Vendor Name</th>
              <th>Total Purchase</th>
              <th>Total Paid</th>
              <th>Pending Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {topVendors.map((row) => (
              <tr key={row._id || row.id}>
                <td className="cell-strong">{row.name}</td>
                <td>{money(row.totalPurchase)}</td>
                <td>{money(row.totalPaid)}</td>
                <td>{money(row.pending)}</td>
                <td>
                  <span className={`status-badge badge-${row.status}`}>
                    {statusLabel[row.status] || ((Number(row.pending) || 0) > 0 ? 'Due' : 'Paid')}
                  </span>
                </td>
              </tr>
            ))}
            {topVendors.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                  No vendors found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
