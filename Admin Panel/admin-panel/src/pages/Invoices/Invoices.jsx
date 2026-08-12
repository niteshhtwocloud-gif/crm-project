import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { FiPlus, FiSearch, FiX } from 'react-icons/fi';
import '../PagesCommon.css';

export default function Invoices() {
  const { invoices, customers, createInvoice } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [customer, setCustomer] = useState('');
  const [amount, setAmount] = useState('');

  const handleOpenModal = () => {
    setCustomer(customers[0]?.name || '');
    setAmount('');
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customer || !amount) return;

    createInvoice({
      customer,
      amount: Number(amount)
    });
    setShowModal(false);
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'Paid') matchesStatus = inv.status === 'success';
    else if (statusFilter === 'Partial') matchesStatus = inv.status === 'warning';
    else if (statusFilter === 'Due') matchesStatus = inv.status === 'danger';

    return matchesSearch && matchesStatus;
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
          <h2>Client Invoices</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Generate, list, and oversee billing statements sent to clients.
          </p>
        </div>
        <button className="action-btn" onClick={handleOpenModal}>
          <FiPlus /> Create Invoice
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            className="filter-input"
            placeholder="Search by customer name or invoice number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Partial">Partial</option>
          <option value="Due">Due / Overdue</option>
        </select>
      </div>

      <div className="data-card">
        <div className="table-responsive">
          <table className="h2-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Customer</th>
                <th>Billing Date</th>
                <th>Total Amount</th>
                <th>Amount Paid</th>
                <th>Remaining Due</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="td-strong">{inv.invoiceNo}</td>
                  <td>{inv.customer}</td>
                  <td>{formatDate(inv.date)}</td>
                  <td className="td-strong">₹{inv.amount.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 500 }}>
                    ₹{inv.paid.toLocaleString('en-IN')}
                  </td>
                  <td style={{ color: inv.due > 0 ? 'var(--danger)' : 'inherit', fontWeight: 500 }}>
                    ₹{inv.due.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className={`status-badge badge-${inv.status}`}>
                      {inv.status === 'success' ? 'Paid' : (inv.status === 'warning' ? 'Partial' : 'Outstanding')}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No invoices generated yet.
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
              <h3>Create Customer Invoice</h3>
              <FiX className="modal-close" onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-field">
                  <label>Select Customer *</label>
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
                  <label>Invoice Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    placeholder="e.g. 15000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
