import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import './UpcomingRenewals.css';

export default function UpcomingRenewals() {
  const navigate = useNavigate();
  const { services } = useData();

  // Get top 5 upcoming renewals sorted by urgency
  // Genuinely upcoming: exclude already-expired rows and rows without expiry, soonest first.
  const upcomingRenewals = [...services]
    .filter((s) => s.hasExpiry && Number(s.daysLeft) >= 0)
    .sort((a, b) => (Number(a.daysLeft) || 0) - (Number(b.daysLeft) || 0))
    .slice(0, 5);

  // daysLeft drives the badge colour; the API's own status field is ignored
  // here because subscriptions and invoices use different vocabularies.
  const urgency = (d) => {
    const n = Number(d) || 0;
    if (n <= 3) return 'danger';
    if (n <= 8) return 'warning';
    return 'success';
  };

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
        <h3>Upcoming Renewals</h3>
        <button className="view-all-btn" onClick={() => navigate('/renewal-center')}>
          View All
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Product</th>
              <th>Expiry Date</th>
              <th>Days Left</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {upcomingRenewals.map((row) => (
              <tr key={row._id || row.id}>
                <td className="cell-strong">{row.customer}</td>
                <td>{row.product}</td>
                <td>{formatDate(row.expiry)}</td>
                <td className={`days-left days-${urgency(row.daysLeft)}`}>{Number(row.daysLeft) || 0} Days</td>
                <td className="cell-strong">₹{(Number(row.amount) || 0).toLocaleString('en-IN')}</td>
                <td>
                  <span className={`status-badge badge-${urgency(row.daysLeft)}`}>
                    {Number(row.daysLeft) || 0} Days Left
                  </span>
                </td>
              </tr>
            ))}
            {upcomingRenewals.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                  No upcoming renewals.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
