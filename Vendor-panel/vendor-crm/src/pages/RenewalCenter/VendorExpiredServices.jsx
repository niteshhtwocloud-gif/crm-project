import { useState, useMemo } from "react";
import { LuSearch, LuRefreshCw } from "react-icons/lu";
import { useCRM } from "../../context/CRMContext";
import { useToast } from "../../context/ToastContext";

const API_BASE = (import.meta.env.VITE_API_BASE || 'https://crm-backend-4fh2.onrender.com') + '/api';
const getHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${localStorage.getItem("token")}`
});

export default function VendorExpiredServices() {
  const { users, services } = useCRM();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const expiredList = useMemo(() => {
    const combined = [];
    const seen = new Set();

    // Check users
    users.forEach(u => {
      const id = String(u._id || u.id || '');
      if (!id || seen.has(id)) return;
      seen.add(id);

      const dLeft = typeof u.daysLeft === 'number' ? u.daysLeft : null;
      if ((dLeft !== null && dLeft <= 0) || u.status === 'Expired') {
        const overdueDays = dLeft !== null ? Math.abs(dLeft) : 0;
        combined.push({
          id,
          customer: u.name || u.customerName || 'Customer',
          username: u.username || '—',
          product: u.productService || u.service || 'Service',
          domain: u.domain || u.domainName || '—',
          startDate: u.creationDate || u.loginDate || '—',
          expiryDate: u.expiryDate || '—',
          overdueText: overdueDays === 0 ? 'Expired Today' : `${overdueDays} Days Overdue`,
          status: 'Expired',
          raw: u
        });
      }
    });

    // Check services
    services.forEach(s => {
      const id = String(s._id || s.id || s.name || '');
      if (!id || seen.has(id)) return;
      seen.add(id);

      const dLeft = typeof s.daysLeft === 'number' ? s.daysLeft : null;
      if ((dLeft !== null && dLeft <= 0) || s.status === 'Expired') {
        const overdueDays = dLeft !== null ? Math.abs(dLeft) : 0;
        combined.push({
          id,
          customer: s.name || 'Service',
          username: s.username || '—',
          product: s.name || 'Service',
          domain: '—',
          startDate: s.created || '—',
          expiryDate: s.expiry || s.expiryDate || '—',
          overdueText: overdueDays === 0 ? 'Expired Today' : `${overdueDays} Days Overdue`,
          status: 'Expired',
          raw: s
        });
      }
    });

    return combined;
  }, [users, services]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return expiredList;
    const q = searchTerm.toLowerCase();
    return expiredList.filter(item =>
      item.customer.toLowerCase().includes(q) ||
      item.product.toLowerCase().includes(q) ||
      item.username.toLowerCase().includes(q) ||
      item.domain.toLowerCase().includes(q)
    );
  }, [expiredList, searchTerm]);

  const handleRenewRequest = async (item) => {
    if (!window.confirm(`Send renewal request for expired service "${item.customer} - ${item.product}"?`)) return;

    try {
      const response = await fetch(`${API_BASE}/renewal-requests`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          serviceId: item.id,
          customerId: item.id,
          customerName: item.customer,
          username: item.username,
          serviceName: item.product,
          domain: item.domain,
          currentExpiryDate: item.expiryDate
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

  return (
    <div className="reports-page">
      <div className="table-card">
        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="card-title">Expired Services</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Services and customer licenses past their expiration date — {expiredList.length} total.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', padding: '6px 12px', borderRadius: '8px' }}>
              <LuSearch size={14} style={{ color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search expired services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '180px' }}
              />
            </div>
          </div>
        </div>

        <div className="scroll-x">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer / Domain</th>
                <th>Username</th>
                <th>Product/Service</th>
                <th>Start Date</th>
                <th>Expiry Date</th>
                <th>Days Overdue</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="strong">{item.customer}</td>
                  <td>{item.username}</td>
                  <td><span className="mono">{item.product}</span></td>
                  <td>{item.startDate}</td>
                  <td>{item.expiryDate}</td>
                  <td className="strong">
                    <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#DC2626', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                      {item.overdueText}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-danger">Expired</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-primary"
                      style={{ padding: "4px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      onClick={() => handleRenewRequest(item)}
                    >
                      <LuRefreshCw size={12} /> Renew Request
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-row" style={{ textAlign: 'center', padding: '40px' }}>
                    No expired services found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
