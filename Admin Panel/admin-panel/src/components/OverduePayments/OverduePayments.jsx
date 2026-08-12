import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import './OverduePayments.css';

export default function OverduePayments() {
  const navigate = useNavigate();
  const { invoices } = useData();

  // Only invoices whose due date has passed or status is Overdue
  const today = new Date();
  const overduePayments = invoices
    .filter((inv) => {
      const isExplicitOverdue = String(inv.status || '').toLowerCase() === 'overdue';
      const due = inv.dueDate || inv.date ? new Date(inv.dueDate || inv.date) : null;
      const hasDatePassed = due && !isNaN(due.getTime()) && due < today;
      return (Number(inv.due) || 0) > 0 && (isExplicitOverdue || hasDatePassed);
    })
    .map((inv) => {
      const due = inv.dueDate || inv.date ? new Date(inv.dueDate || inv.date) : null;
      let overdueDays = 1;
      if (due && !isNaN(due.getTime()) && due < today) {
        overdueDays = Math.max(1, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
      }
      return {
        id: inv.id,
        customer: inv.customer,
        invoice: inv.invoiceNo || inv.invoice || 'INV-001',
        dueDate: inv.dueDate || inv.date,
        amount: Number(inv.due) || 0,
        overdueDays
      };
    })
    .sort((a, b) => b.overdueDays - a.overdueDays)
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
        <h3>Overdue Payments</h3>
        <button className="view-all-btn" onClick={() => navigate('/payments')}>
          View All
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Invoice No.</th>
              <th>Due Date</th>
              <th>Due Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {overduePayments.map((row) => (
              <tr key={row.id}>
                <td className="cell-strong">{row.customer}</td>
                <td>{row.invoice}</td>
                <td>{formatDate(row.dueDate)}</td>
                <td className="cell-strong">₹{(Number(row.amount) || 0).toLocaleString('en-IN')}</td>
                <td>
                  <span className="status-badge badge-danger">Overdue {row.overdueDays} Days</span>
                </td>
              </tr>
            ))}
            {overduePayments.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                  No overdue payments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
