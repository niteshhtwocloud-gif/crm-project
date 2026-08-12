import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { FiPlus, FiSearch, FiX } from 'react-icons/fi';
import '../PagesCommon.css';

export default function SupportTickets() {
  const { supportTickets, customers, addSupportTicket } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [customer, setCustomer] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('billing');
  const [priority, setPriority] = useState('Medium');
  const [message, setMessage] = useState('');

  const handleOpenModal = () => {
    setCustomer(customers[0]?.name || '');
    setSubject('');
    setCategory('billing');
    setPriority('Medium');
    setMessage('');
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customer || !subject.trim() || !message.trim()) return;

    addSupportTicket({
      customer,
      subject,
      category,
      priority,
      message,
    });
    setShowModal(false);
  };

  const filteredTickets = supportTickets.filter(
    (ticket) =>
      ticket.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h2>Help Desk Support Tickets</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Coordinate customer queries, disputing payments, and service issues.
          </p>
        </div>
        <button className="action-btn" onClick={handleOpenModal}>
          <FiPlus /> New Ticket
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            className="filter-input"
            placeholder="Search tickets by customer name or subject..."
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
                <th>Subject Description</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Filed Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t) => (
                <tr key={t.id}>
                  <td className="td-strong">{t.customer}</td>
                  <td>
                    <strong>{t.subject}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      {t.message}
                    </p>
                  </td>
                  <td>
                    <span className="td-code" style={{ textTransform: 'capitalize' }}>{t.category}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 600,
                        color: t.priority === 'High' ? 'var(--danger)' : (t.priority === 'Medium' ? 'var(--warning)' : 'var(--success)')
                      }}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td>{formatDate(t.date)}</td>
                  <td>
                    <span className={`badge badge-${t.status.toLowerCase().replace(' ', '-')}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No support tickets logged.
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
              <h3>File Support Ticket</h3>
              <FiX className="modal-close" onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-field">
                  <label>Associated Customer *</label>
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
                  <label>Subject Topic *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Tally database connection failure"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Category</label>
                    <select
                      className="form-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="billing">Billing &amp; Finance</option>
                      <option value="service">Technical Service</option>
                      <option value="dispute">Payment Dispute</option>
                      <option value="other">General Query</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Priority</label>
                    <select
                      className="form-select"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label>Detailed Message *</label>
                  <textarea
                    required
                    rows="3"
                    className="form-textarea"
                    placeholder="Describe the query in details..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Log Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
