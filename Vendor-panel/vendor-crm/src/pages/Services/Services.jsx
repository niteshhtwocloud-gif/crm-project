import { useState } from "react";
import { LuServer, LuPlus, LuEye, LuEyeOff, LuPencil, LuTrash2, LuX, LuRefreshCw } from "react-icons/lu";
import { useCRM } from "../../context/CRMContext";
import { useToast } from "../../context/ToastContext";
import "./Services.css";

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000') + '/api';
const getHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("token")}`
});

const statusClass = { Active: "badge-success", Expiring: "badge-warning", Expired: "badge-danger" };

export default function Services() {
  const [visiblePw, setVisiblePw] = useState({});
  const { services, addService, editService, deleteService } = useCRM();
  const { showToast } = useToast();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "Hosting",
    provider: "AWS",
    purchase: 0,
    selling: 0,
    username: "",
    password: "",
    created: "",
    expiry: "",
    renewal: "",
    status: "Active",
  });

  const togglePw = (name) => setVisiblePw((v) => ({ ...v, [name]: !v[name] }));

  const handleOpenAdd = () => {
    const today = new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
    setFormData({
      name: "",
      category: "Hosting",
      provider: "AWS",
      purchase: 1000,
      selling: 1500,
      username: "",
      password: "",
      created: today,
      expiry: nextYear,
      renewal: nextYear,
      status: "Active",
    });
    setShowAddModal(true);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    addService(formData);
    setShowAddModal(false);
    showToast(`Service "${formData.name}" added successfully`);
  };

  const handleOpenEdit = (s) => {
    setSelectedService(s);
    setFormData({ ...s });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    editService(selectedService.name, formData);
    setShowEditModal(false);
    showToast(`Service "${formData.name}" updated`);
  };

  const handleDelete = (name) => {
    if (window.confirm(`Are you sure you want to delete service "${name}"?`)) {
      deleteService(name);
      showToast(`Service "${name}" deleted`);
    }
  };

  const handleRenewRequest = async (s) => {
    if (!window.confirm(`Send renewal request for service "${s.name}"?`)) return;

    try {
      const response = await fetch(`${API_BASE}/renewal-requests`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          serviceId: s._id || s.id || s.name,
          serviceName: s.name,
          currentExpiryDate: s.expiry || s.expiryDate || ''
        })
      });
      const data = await response.json();
      if (response.ok) {
        showToast("Renewal request submitted successfully.");
      } else {
        showToast(data.message || "Failed to submit renewal request.");
      }
    } catch (err) {
      console.error(err);
      showToast("Error submitting renewal request.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "purchase" || name === "selling" ? Number(value) : value,
    }));
  };

  return (
    <div className="services-page">
      <div className="services-toolbar">
        <p className="services-count">{services.length} services configured</p>
      </div>

      <div className="services-grid">
        {services.map((s) => (
          <div className="service-card" key={s.name}>
            <div className="service-card-top">
              <div className="service-icon"><LuServer size={22} /></div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span className={`badge ${statusClass[s.status] || "badge-success"}`}>{s.status}</span>
                <button
                  className="icon-action delete"
                  style={{ padding: "4px", background: "none" }}
                  onClick={() => handleDelete(s.name)}
                  title="Delete Service"
                >
                  <LuTrash2 size={14} style={{ color: "var(--danger)" }} />
                </button>
              </div>
            </div>
            <h3 className="service-name">{s.name}</h3>
            <p className="service-meta">{s.category} · {s.provider}</p>

            <div className="service-price-row">
              <div>
                <span className="price-label">Purchase</span>
                <span className="price-value">₹{Number(s.purchase).toLocaleString("en-IN")}</span>
              </div>
              <div>
                <span className="price-label">Selling</span>
                <span className="price-value selling">₹{Number(s.selling).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="service-detail-row">
              <span>Username</span>
              <span className="mono">{s.username}</span>
            </div>
            <div className="service-detail-row">
              <span>Password</span>
              <span className="mono pw-row">
                {visiblePw[s.name] ? s.password : "••••••••"}
                <button onClick={() => togglePw(s.name)}>
                  {visiblePw[s.name] ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                </button>
              </span>
            </div>
            <div className="service-detail-row">
              <span>Created</span>
              <span>{s.created}</span>
            </div>
            <div className="service-detail-row">
              <span>Expiry</span>
              <span>{s.expiry}</span>
            </div>
            <div className="service-detail-row">
              <span>Renewal</span>
              <span>{s.renewal}</span>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{
                marginTop: '14px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onClick={() => handleRenewRequest(s)}
            >
              <LuRefreshCw size={14} /> Renew Request
            </button>
          </div>
        ))}
      </div>

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleCreateSubmit}>
            <div className="modal-header">
              <h3 className="modal-title">Add Service Catalog</h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <LuX size={18} />
              </button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group">
                <label className="form-label">Service Name *</label>
                <input className="form-input" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" name="category" value={formData.category} onChange={handleChange}>
                  <option>Hosting</option>
                  <option>Server</option>
                  <option>Domain</option>
                  <option>Security</option>
                  <option>Email</option>
                  <option>Cloud</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vendor Provider</label>
                <select className="form-select" name="provider" value={formData.provider} onChange={handleChange}>
                  <option>AWS</option>
                  <option>DigitalOcean</option>
                  <option>OVH</option>
                  <option>Hostinger</option>
                  <option>GoDaddy</option>
                  <option>Sectigo</option>
                  <option>Google Cloud</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" name="status" value={formData.status} onChange={handleChange}>
                  <option>Active</option>
                  <option>Expiring</option>
                  <option>Expired</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Price (₹)</label>
                <input className="form-input" type="number" name="purchase" value={formData.purchase} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price (₹)</label>
                <input className="form-input" type="number" name="selling" value={formData.selling} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Admin Username</label>
                <input className="form-input" name="username" value={formData.username} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Admin Password</label>
                <input className="form-input" name="password" value={formData.password} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Created Date</label>
                <input className="form-input" name="created" value={formData.created} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input className="form-input" name="expiry" value={formData.expiry} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Renewal Date</label>
                <input className="form-input" name="renewal" value={formData.renewal} onChange={handleChange} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Add Service</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Service Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleEditSubmit}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Service Catalog</h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                <LuX size={18} />
              </button>
            </div>
            <div className="modal-body form-grid">
              <div className="form-group">
                <label className="form-label">Service Name *</label>
                <input className="form-input" name="name" value={formData.name} onChange={handleChange} disabled required />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" name="category" value={formData.category} onChange={handleChange}>
                  <option>Hosting</option>
                  <option>Server</option>
                  <option>Domain</option>
                  <option>Security</option>
                  <option>Email</option>
                  <option>Cloud</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vendor Provider</label>
                <select className="form-select" name="provider" value={formData.provider} onChange={handleChange}>
                  <option>AWS</option>
                  <option>DigitalOcean</option>
                  <option>OVH</option>
                  <option>Hostinger</option>
                  <option>GoDaddy</option>
                  <option>Sectigo</option>
                  <option>Google Cloud</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" name="status" value={formData.status} onChange={handleChange}>
                  <option>Active</option>
                  <option>Expiring</option>
                  <option>Expired</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Price (₹)</label>
                <input className="form-input" type="number" name="purchase" value={formData.purchase} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price (₹)</label>
                <input className="form-input" type="number" name="selling" value={formData.selling} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Admin Username</label>
                <input className="form-input" name="username" value={formData.username} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Admin Password</label>
                <input className="form-input" name="password" value={formData.password} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Created Date</label>
                <input className="form-input" name="created" value={formData.created} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input className="form-input" name="expiry" value={formData.expiry} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Renewal Date</label>
                <input className="form-input" name="renewal" value={formData.renewal} onChange={handleChange} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
