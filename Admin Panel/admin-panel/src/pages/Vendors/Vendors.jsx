import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { FiPlus, FiSearch, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { LuEye, LuPencil } from 'react-icons/lu';
import '../PagesCommon.css';

const statusLabel = {
  success: 'Paid',
  warning: 'Due',
};

export default function Vendors() {
  const { vendors, addVendor, editVendor } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [viewingVendor, setViewingVendor] = useState(null);

  // Form states (Source of truth: Add Vendor fields)
  const [vendorId, setVendorId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [totalPurchase, setTotalPurchase] = useState('');
  const [totalPaid, setTotalPaid] = useState('');

  const handleOpenAdd = () => {
    const usedIds = (vendors || [])
      .map(v => v.vendorId)
      .filter(id => id && String(id).startsWith("H2VEN"))
      .map(id => parseInt(String(id).replace("H2VEN", ""), 10))
      .filter(num => !isNaN(num))
      .sort((a, b) => a - b);
      
    let maxId = 1;
    for (let num of usedIds) {
      if (num === maxId) maxId++;
      else if (num > maxId) break;
    }
    
    setEditingVendorId(null);
    setVendorId(`H2VEN${String(maxId).padStart(3, '0')}`);
    setPassword('');
    setShowPassword(false);
    setName('');
    setEmail('');
    setTotalPurchase('');
    setTotalPaid('');
    setShowModal(true);
  };

  const handleOpenEdit = (vendor) => {
    setEditingVendorId(vendor._id || vendor.id);
    setVendorId(vendor.vendorId || '');
    setName(vendor.name || vendor.vendorName || '');
    setEmail(vendor.email || '');
    setPassword('');
    setShowPassword(false);
    setTotalPurchase(vendor.totalPurchase !== undefined && vendor.totalPurchase !== null ? String(vendor.totalPurchase) : '');
    setTotalPaid(vendor.totalPaid !== undefined && vendor.totalPaid !== null ? String(vendor.totalPaid) : '');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVendorId(null);
    setPassword('');
    setShowPassword(false);
    setName('');
    setEmail('');
    setTotalPurchase('');
    setTotalPaid('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (editingVendorId) {
      const payload = {
        vendorId: vendorId.trim(),
        name: name.trim(),
        email: email.trim(),
        totalPurchase: totalPurchase ? Number(totalPurchase) : 0,
        totalPaid: totalPaid ? Number(totalPaid) : 0,
      };
      if (password && password.trim() !== '') {
        payload.password = password.trim();
      }

      const res = await editVendor(editingVendorId, payload);
      if (res && res.ok === false) {
        alert(res.message || "Failed to update vendor.");
        return;
      }
      handleCloseModal();
      return;
    }

    // Add Vendor mode
    const res = await addVendor({
      vendorId: vendorId.trim(),
      password: password,
      name: name.trim(),
      email: email.trim(),
      totalPurchase: totalPurchase ? Number(totalPurchase) : 0,
      totalPaid: totalPaid ? Number(totalPaid) : 0,
    });
    
    if (res && res.ok === false) {
      alert(res.message || "Failed to add vendor.");
      return;
    }

    const created = res?.data || {};
    const loginEmail = created.email || email.trim();
    const loginPassword = created.password || password;
    if (loginPassword) {
      window.alert(
        `Vendor "${created.name || name.trim()}" created.\n\n` +
        `Login email: ${loginEmail}\n` +
        `Password: ${loginPassword}\n\n` +
        `Share these with the vendor. They will only see their own customers.`
      );
    }

    handleCloseModal();
  };

  const handleStatusChange = async (vendor, newStatusText) => {
    const newStatus = newStatusText === 'Paid' ? 'success' : 'warning';
    const vendorTargetId = vendor._id || vendor.id;
    await editVendor(vendorTargetId, { status: newStatus });
  };

  const filteredVendors = (vendors || []).filter((vendor) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      (vendor.name && vendor.name.toLowerCase().includes(searchLower)) ||
      (vendor.email && vendor.email.toLowerCase().includes(searchLower)) ||
      (vendor.vendorId && vendor.vendorId.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="page-container">
      <style>{`
        /* Action buttons matching Customers page styling */
        .icon-action {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #f0f3ff;
          color: #4f6bdf;
        }
        .icon-action:hover {
          transform: translateY(-1px);
        }
        .icon-action.view {
          background: #f0f3ff;
          color: #4f6bdf;
        }
        .icon-action.view:hover {
          background: #dfe6ff;
        }
        .icon-action.edit {
          background: #fff4cd;
          color: #efa915;
        }
        .icon-action.edit:hover {
          background: #ffebb0;
          color: #d99000;
        }
        .h2-table tr.vendor-main-row {
          transition: background-color 0.2s ease;
        }
        .h2-table tr.vendor-main-row:hover td {
          background-color: #f8fafc !important;
        }
      `}</style>

      <div className="page-header">
        <div>
          <h2>Vendors Directory</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Manage vendor accounts, purchase orders, paid amounts, and outstanding dues.
          </p>
        </div>
        <button className="action-btn" onClick={handleOpenAdd}>
          <FiPlus /> Add Vendor
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            className="filter-input"
            placeholder="Search by vendor name, email, or vendor ID..."
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
                <th>Vendor ID</th>
                <th>Vendor Name</th>
                <th>Email Address</th>
                <th>Total Purchase</th>
                <th>Total Paid</th>
                <th>Pending Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'center', minWidth: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor) => {
                const pendingAmt = vendor.pending !== undefined
                  ? vendor.pending
                  : ((Number(vendor.totalPurchase || 0) - Number(vendor.totalPaid || 0)));

                return (
                  <tr key={vendor._id || vendor.id} className="vendor-main-row">
                    <td>{vendor.vendorId || '—'}</td>
                    <td className="td-strong">{vendor.name || vendor.vendorName || '—'}</td>
                    <td>{vendor.email || '—'}</td>
                    <td>₹{(vendor.totalPurchase || 0).toLocaleString('en-IN')}</td>
                    <td>₹{(vendor.totalPaid || 0).toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: '600', color: pendingAmt > 0 ? 'var(--warning)' : 'inherit' }}>
                      ₹{pendingAmt.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`status-badge badge-${vendor.status || 'success'}`}>
                        {statusLabel[vendor.status] || vendor.status || 'Paid'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="icon-action view"
                          onClick={() => setViewingVendor(vendor)}
                          title="View Full Details"
                        >
                          <LuEye size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-action edit"
                          onClick={() => handleOpenEdit(vendor)}
                          title="Edit"
                        >
                          <LuPencil size={14} />
                        </button>
                        <select
                          className="status-dropdown-action"
                          value={vendor.status === 'warning' ? 'Due' : 'Paid'}
                          onChange={(e) => handleStatusChange(vendor, e.target.value)}
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            border: "1px solid #e2e8f0",
                            fontSize: "12px",
                            cursor: "pointer",
                            backgroundColor: "#fff",
                            outline: "none",
                            minWidth: "75px",
                            color: "#334155"
                          }}
                        >
                          <option value="Paid">Paid</option>
                          <option value="Due">Due</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredVendors.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No vendors found matching the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ VIEW VENDOR MODAL ============ */}
      {viewingVendor && (
        <div className="modal-backdrop" onClick={() => setViewingVendor(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Vendor Details</h3>
              <FiX className="modal-close" onClick={() => setViewingVendor(null)} />
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Vendor ID</label>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{viewingVendor.vendorId || '—'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Vendor / Company Name</label>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{viewingVendor.name || viewingVendor.vendorName || '—'}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email Address</label>
                  <div style={{ color: 'var(--text-primary)' }}>{viewingVendor.email || '—'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Total Purchase Amount</label>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{(viewingVendor.totalPurchase || 0).toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Total Paid Amount</label>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{(viewingVendor.totalPaid || 0).toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Pending Amount</label>
                  <div style={{ fontWeight: 600, color: (viewingVendor.pending || (Number(viewingVendor.totalPurchase || 0) - Number(viewingVendor.totalPaid || 0))) > 0 ? 'var(--warning)' : 'inherit' }}>
                    ₹{(viewingVendor.pending !== undefined ? viewingVendor.pending : (Number(viewingVendor.totalPurchase || 0) - Number(viewingVendor.totalPaid || 0))).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Status</label>
                  <div>
                    <span className={`status-badge badge-${viewingVendor.status || 'success'}`}>
                      {statusLabel[viewingVendor.status] || viewingVendor.status || 'Paid'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setViewingVendor(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={() => {
                  const v = viewingVendor;
                  setViewingVendor(null);
                  handleOpenEdit(v);
                }}
              >
                Edit Vendor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ ADD / EDIT VENDOR MODAL ============ */}
      {showModal && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingVendorId ? "Edit Vendor" : "Onboard New Vendor"}</h3>
              <FiX className="modal-close" onClick={handleCloseModal} />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-field">
                  <label>Vendor ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Vendor / Company Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Hostgator Inc."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="e.g. billing@hostgator.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>{editingVendorId ? "Password (leave blank to keep current)" : "Password *"}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      required={!editingVendorId}
                      className="form-input"
                      placeholder={editingVendorId ? "Leave blank to keep existing password" : "Enter secure password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#666', padding: 0 }}
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Total Purchase Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="e.g. 50000"
                      value={totalPurchase}
                      onChange={(e) => setTotalPurchase(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Total Paid Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="e.g. 40000"
                      value={totalPaid}
                      onChange={(e) => setTotalPaid(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingVendorId ? "Save Changes" : "Save Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
