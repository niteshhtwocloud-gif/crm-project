import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { FiPlus, FiSearch, FiX } from 'react-icons/fi';
import '../PagesCommon.css';

export default function Payments() {
  const navigate = useNavigate();
  const { payments, invoices, recordPayment } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [invoiceNo, setInvoiceNo] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');

  // Filter invoices that are not fully paid
  const unpaidInvoices = invoices.filter((inv) => inv.due > 0);

  const handleOpenModal = () => {
    if (unpaidInvoices.length > 0) {
      setInvoiceNo(unpaidInvoices[0].invoiceNo);
      setAmount(unpaidInvoices[0].due);
    } else {
      setInvoiceNo('');
      setAmount('');
    }
    setMethod('UPI');
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!invoiceNo || !amount) return;

    const selectedInv = invoices.find((i) => i.invoiceNo === invoiceNo);
    if (!selectedInv) return;

    recordPayment({
      invoiceNo,
      customer: selectedInv.customer,
      amount: Number(amount),
      method
    });
    setShowModal(false);
  };

  const filteredPayments = payments.filter(
    (p) =>
      p.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h2>Payment Transactions</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            View client collection history and log invoice payments.
          </p>
        </div>
        <button className="action-btn" onClick={handleOpenModal}>
          <FiPlus /> Record Payment
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
      </div>

      <div className="data-card">
        <div className="table-responsive">
          <table className="h2-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Invoice Ref</th>
                <th>Paid Date</th>
                <th>Amount Collected</th>
                <th>Payment Mode</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id}>
                  <td className="td-strong">{p.customer}</td>
                  <td><span className="td-code">{p.invoiceNo}</span></td>
                  <td>{formatDate(p.date)}</td>
                  <td className="td-strong" style={{ color: 'var(--success)' }}>
                    ₹{p.amount.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className="badge badge-inactive" style={{ padding: '3px 8px' }}>{p.method}</span>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No collections logged yet.
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
              <h3>Record Customer Payment</h3>
              <FiX className="modal-close" onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {unpaidInvoices.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '14px' }}>
                      All invoices are currently fully paid.
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      Tip: Please go to the{' '}
                      <span 
                        onClick={() => { setShowModal(false); navigate('/invoices'); }} 
                        style={{ color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Invoices page
                      </span>{' '}
                      to generate a new customer invoice first!
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="form-field">
                      <label>Select Unpaid Invoice *</label>
                      <select
                        className="form-select"
                        value={invoiceNo}
                        onChange={(e) => {
                          setInvoiceNo(e.target.value);
                          const chosen = unpaidInvoices.find((i) => i.invoiceNo === e.target.value);
                          if (chosen) setAmount(chosen.due);
                        }}
                      >
                        {unpaidInvoices.map((inv) => (
                          <option key={inv.id} value={inv.invoiceNo}>
                            {inv.invoiceNo} - {inv.customer} (Due: ₹{inv.due})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Amount Paid (INR) *</label>
                      <input
                        type="number"
                        required
                        className="form-input"
                        placeholder="e.g. 5000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Payment Method</label>
                      <select
                        className="form-select"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                      >
                        <option value="UPI">UPI / GPay / PhonePe</option>
                        <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={unpaidInvoices.length === 0}>
                  Log Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
