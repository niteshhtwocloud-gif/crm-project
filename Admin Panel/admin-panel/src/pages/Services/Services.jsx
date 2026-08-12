import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { FiPlus, FiSearch, FiX } from 'react-icons/fi';
import '../PagesCommon.css';

export default function Services() {
  const { services, customers, addService } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [customer, setCustomer] = useState('');
  const [product, setProduct] = useState('');
  const [amount, setAmount] = useState('');
  const [expiry, setExpiry] = useState('');

  const handleOpenModal = () => {
    setCustomer(customers[0]?.name || '');
    setProduct('Tally Cloud');
    setAmount('');
    setExpiry(new Date().toISOString().slice(0, 10));
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customer || !product || !amount || !expiry) return;

    addService({
      customer,
      product,
      amount: Number(amount),
      expiry
    });
    setShowModal(false);
  };

  const filteredServices = services.filter(
    (s) =>
      s.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2>Cloud Subscriptions &amp; Services</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Track active SaaS environments, infrastructure instances, and client costs.
          </p>
        </div>
        <button className="action-btn" onClick={handleOpenModal}>
          <FiPlus /> Add Subscription
        </button>
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
      </div>

      <div className="data-card">
        <div className="table-responsive">
          <table className="h2-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Product/Service Name</th>
                <th>Billing Cost Rate</th>
                <th>Expiry Date</th>
                <th>Days Remaining</th>
                <th>Urgency Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((s) => (
                <tr key={s.id}>
                  <td className="td-strong">{s.customer}</td>
                  <td>
                    <span className="td-code">{s.product}</span>
                  </td>
                  <td>₹{s.amount.toLocaleString('en-IN')}/mo</td>
                  <td>{formatDate(s.expiry)}</td>
                  <td className="td-strong">{s.daysLeft} Days</td>
                  <td>
                    <span className={`status-badge badge-${s.status}`}>
                      {s.daysLeft <= 0 ? 'Expired' : `${s.daysLeft} Days Left`}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No services matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Create Active Subscription</h3>
              <FiX className="modal-close" onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-field">
                  <label>Assign to Customer *</label>
                  <select
                    className="form-select"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Service Product *</label>
                  <select
                    className="form-select"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                  >
                    <option value="Tally Cloud">Tally Cloud</option>
                    <option value="VPS Hosting">VPS Hosting</option>
                    <option value="Busy Cloud">Busy Cloud</option>
                    <option value="Marg Cloud">Marg Cloud</option>
                    <option value="Cloud Server Instance">Cloud Server Instance</option>
                    <option value="Backup Storage S3">Backup Storage S3</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Monthly Rate Cost (INR) *</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    placeholder="e.g. 12000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Subscription Expiration Date *</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
