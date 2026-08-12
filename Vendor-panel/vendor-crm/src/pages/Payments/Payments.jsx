import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { LuEye, LuPlus, LuX, LuPrinter, LuCheck } from "react-icons/lu";
import { useCRM } from "../../context/CRMContext";
import { useToast } from "../../context/ToastContext";
import "./Payments.css";

const tabs = ["All", "Pending", "Completed", "Overdue"];
const statusMap = { All: null, Pending: "Pending", Completed: "Paid", Overdue: "Overdue" };
const modes = ["UPI", "Bank Transfer", "Credit Card", "Cash"];

export default function Payments() {
  const [params, setParams] = useSearchParams();
  const { payments, users, services, companySettings, addPayment, updatePaymentStatus, deletePayment } = useCRM();
  const { showToast } = useToast();

  const [tab, setTab] = useState("All");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Add Form state
  const [formData, setFormData] = useState({
    customer: "",
    service: "Cloud Hosting",
    amount: 1000,
    paid: 0,
    paymentMode: "UPI",
    dueDate: "",
    status: "Pending",
  });

  // Watch URL params for "viewInvoice"
  useEffect(() => {
    const viewInvoiceNo = params.get("viewInvoice");
    if (viewInvoiceNo) {
      const inv = payments.find(p => p.invoice === viewInvoiceNo);
      if (inv) {
        setSelectedInvoice(inv);
        setShowViewModal(true);
      }
      params.delete("viewInvoice");
      setParams(params);
    }
  }, [params, payments, setParams]);

  const rows = useMemo(() => {
    const status = statusMap[tab];
    return payments
      .filter((p) => !status || p.status === status)
      .map((p, i) => ({
        ...p,
        mode: p.mode || modes[i % modes.length],
      }));
  }, [payments, tab]);

  const totals = useMemo(() => {
    return payments.reduce(
      (acc, p) => {
        acc.paid += Number(p.paid || 0);
        acc.pending += Number(p.pending || p.amount - p.paid || 0);
        return acc;
      },
      { paid: 0, pending: 0 }
    );
  }, [payments]);

  const handleOpenAdd = () => {
    const defaultCustomer = users[0]?.name || "";
    const defaultService = services[0]?.name || "Cloud Hosting";
    const defaultServiceObj = services[0];
    const sellingPrice = defaultServiceObj ? defaultServiceObj.selling : 1500;

    const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    setFormData({
      customer: defaultCustomer,
      service: defaultService,
      amount: sellingPrice,
      paid: 0,
      paymentMode: "UPI",
      dueDate: futureDate,
      status: "Pending",
    });
    setShowAddModal(true);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!formData.customer) {
      showToast("Please select a customer or add one first.");
      return;
    }
    const invNo = `INV-2025-${payments.length + 1581}`;
    const newInvoice = {
      invoice: invNo,
      customer: formData.customer,
      service: formData.service,
      amount: Number(formData.amount),
      paid: Number(formData.paid),
      pending: Number(formData.amount - formData.paid),
      paymentDate: formData.paid > 0 ? new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "-",
      dueDate: formData.dueDate,
      status: formData.status,
      mode: formData.paymentMode,
    };
    addPayment(newInvoice);
    setShowAddModal(false);
    showToast(`Invoice ${invNo} created successfully`);
  };

  const handleMarkAsPaid = (invoiceNo) => {
    const inv = payments.find(p => p.invoice === invoiceNo);
    if (!inv) return;
    updatePaymentStatus(invoiceNo, "Paid", {
      paid: inv.amount,
      pending: 0,
      paymentDate: new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
    });
    setSelectedInvoice(prev => ({
      ...prev,
      status: "Paid",
      paid: prev.amount,
      pending: 0,
      paymentDate: new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
    }));
    showToast(`Invoice ${invoiceNo} marked as fully Paid`);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "service") {
        const found = services.find(s => s.name === value);
        if (found) next.amount = found.selling;
      }
      return next;
    });
  };

  const handleOpenView = (p) => {
    setSelectedInvoice(p);
    setShowViewModal(true);
  };

  const activeCustomerObj = useMemo(() => {
    if (!selectedInvoice) return null;
    return users.find(u => u.name === selectedInvoice.customer);
  }, [selectedInvoice, users]);

  return (
    <div className="payments-page">
      <div className="payments-stats">
        <div className="pay-stat">
          <span className="pay-stat-label">Total Collected</span>
          <span className="pay-stat-value success">₹ {totals.paid.toLocaleString("en-IN")}</span>
        </div>
        <div className="pay-stat">
          <span className="pay-stat-label">Total Pending</span>
          <span className="pay-stat-value warning">₹ {totals.pending.toLocaleString("en-IN")}</span>
        </div>
        <div className="pay-stat">
          <span className="pay-stat-label">Total Invoices</span>
          <span className="pay-stat-value">{payments.length}</span>
        </div>
      </div>

      <div className="table-card">
        <div className="payments-tabs">
          {tabs.map((t) => (
            <button
              key={t}
              className={`payment-tab ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="scroll-x">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Payment Mode</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.invoice}>
                  <td className="mono">{p.invoice}</td>
                  <td className="strong">{p.customer}</td>
                  <td>{p.service}</td>
                  <td>₹ {Number(p.amount || 0).toLocaleString("en-IN")}</td>
                  <td>{p.mode}</td>
                  <td>{p.dueDate}</td>
                  <td>
                    <span className={`badge badge-${(p.status || "Pending").toLowerCase()}`}>{p.status}</span>
                  </td>
                  <td>
                    <button className="icon-action view" onClick={() => handleOpenView(p)} title="View Invoice Detailed PDF">
                      <LuEye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="empty-row">No invoices in this category.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleCreateSubmit}>
            <div className="modal-header">
              <h3 className="modal-title">Create Invoice</h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <LuX size={18} />
              </button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group">
                <label className="form-label">Customer *</label>
                <select className="form-select" name="customer" value={formData.customer} onChange={handleChange} required>
                  <option value="">Select customer...</option>
                  {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Service Purchased</label>
                <select className="form-select" name="service" value={formData.service} onChange={handleChange}>
                  {services.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Total Amount (₹) *</label>
                <input className="form-input" type="number" name="amount" value={formData.amount} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Paid Amount (₹)</label>
                <input className="form-input" type="number" name="paid" value={formData.paid} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select className="form-select" name="paymentMode" value={formData.paymentMode} onChange={handleChange}>
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                  <option>Credit Card</option>
                  <option>Cash</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" name="dueDate" value={formData.dueDate} onChange={handleChange} placeholder="e.g. Jun 10, 2025" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" name="status" value={formData.status} onChange={handleChange}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Create Invoice</button>
            </div>
          </form>
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {showViewModal && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "750px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Invoice Viewer</h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowViewModal(false)}>
                <LuX size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ background: "#f8fafc", padding: "30px" }}>
              {/* Corporate Printable Sheet */}
              <div className="invoice-print-card" id="printable-invoice">
                <div className="invoice-header-row">
                  <div>
                    <h2 style={{ fontSize: "24px", color: "var(--primary-blue)", fontWeight: "800" }}>
                      {companySettings.companyName.toUpperCase()}
                    </h2>
                    <p style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>
                      GSTIN: {companySettings.gst}<br />
                      Email: {companySettings.email} · Mob: {companySettings.phone}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#1e293b", margin: 0 }}>INVOICE</h1>
                    <p style={{ fontSize: "14px", fontWeight: "700", fontFamily: "monospace", color: "#64748b", marginTop: "4px" }}>
                      {selectedInvoice.invoice}
                    </p>
                  </div>
                </div>

                <div className="invoice-details-grid">
                  <div>
                    <h4 style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>Billed To</h4>
                    <p style={{ fontWeight: "700", fontSize: "15px", color: "#1e293b" }}>{selectedInvoice.customer}</p>
                    {activeCustomerObj && (
                      <p style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>
                        Email: {activeCustomerObj.email}<br />
                        Phone: {activeCustomerObj.mobile}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <h4 style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>Invoice Details</h4>
                    <p style={{ fontSize: "13px", color: "#1e293b" }}>
                      <strong>Due Date:</strong> {selectedInvoice.dueDate}<br />
                      <strong>Payment Date:</strong> {selectedInvoice.paymentDate || "-"}<br />
                      <strong>Payment Mode:</strong> {selectedInvoice.mode || "UPI"}<br />
                      <strong>Status: </strong>
                      <span className={`badge badge-${(selectedInvoice.status || "Pending").toLowerCase()}`} style={{ display: "inline-block", marginTop: "2px" }}>
                        {selectedInvoice.status}
                      </span>
                    </p>
                  </div>
                </div>

                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Service Details & Hosting Specs</th>
                      <th style={{ textAlign: "right" }}>Billing Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong style={{ fontSize: "14px", color: "#1e293b" }}>{selectedInvoice.service}</strong>
                        <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                          Monthly subscription renewal billing cycle. Includes standard high speed bandwidth.
                        </p>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "600", fontSize: "14px" }}>
                        ₹ {Number(selectedInvoice.amount).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="invoice-totals">
                  <div style={{ display: "flex", width: "240px", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>Invoice Amount:</span>
                    <span style={{ fontWeight: "600", fontSize: "13px" }}>₹ {Number(selectedInvoice.amount).toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ display: "flex", width: "240px", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", padding: "8px 0" }}>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>Paid Amount:</span>
                    <span style={{ fontWeight: "600", fontSize: "13px", color: "#16a34a" }}>₹ {Number(selectedInvoice.paid || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ display: "flex", width: "240px", justifyContent: "space-between", paddingTop: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>Total Balance Due:</span>
                    <span style={{ fontWeight: "800", fontSize: "15px", color: "#dc2626" }}>₹ {Number(selectedInvoice.pending || selectedInvoice.amount - selectedInvoice.paid).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <div>
                {selectedInvoice.status !== "Paid" && (
                  <button className="btn-primary" onClick={() => handleMarkAsPaid(selectedInvoice.invoice)} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <LuCheck size={14} /> Mark as Paid
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    window.print();
                    showToast("Sending document to printer...");
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <LuPrinter size={14} /> Print Invoice
                </button>
                <button className="btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
