import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import './RecentInvoices.css';

const statusLabel = {
  success: 'Paid',
  warning: 'Pending',
  danger: 'Overdue',
};

const money = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;

export default function RecentInvoices() {
  const navigate = useNavigate();
  const { invoices } = useData();

  // Newest first by invoice/due date, then take five.
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.date || b.dueDate || 0) - new Date(a.date || a.dueDate || 0))
    .slice(0, 5);

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
    <div className="table-card">
      <div className="table-card-header">
        <h3>Recent Invoices</h3>
        <button className="view-all-btn" onClick={() => navigate('/invoices')}>
          View All
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Invoice No.</th>
              <th>Customer</th>
              <th>Invoice Date</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentInvoices.map((row) => (
              <tr key={row.id}>
                <td className="cell-strong">{row.invoiceNo}</td>
                <td>{row.customer}</td>
                <td>{formatDate(row.date || row.dueDate)}</td>
                <td className="cell-strong">{money(row.amount)}</td>
                <td>{money(row.paid)}</td>
                <td>{money(row.due)}</td>
                <td>
                  <span className={`status-badge badge-${row.statusKey}`}>
                    {statusLabel[row.statusKey] || row.status}
                  </span>
                </td>
              </tr>
            ))}
            {recentInvoices.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                  No recent invoices.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
