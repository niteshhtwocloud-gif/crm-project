import { LuEye, LuTrash2 } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { useCRM } from "../../context/CRMContext";
import { useToast } from "../../context/ToastContext";
import "./RecentUsers.css";

const statusClass = {
  Active: "badge-success",
  Expiring: "badge-warning",
  Expired: "badge-danger",
  Paid: "badge-success",
  Pending: "badge-warning",
  Overdue: "badge-danger",
};

export default function RecentUsers() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { users, deleteUser } = useCRM();

  const recent = users.slice(0, 5);

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to remove user "${name}"?`)) {
      deleteUser(id, name);
      showToast(`${name} removed successfully`);
    }
  };

  return (
    <div className="table-card">
      <div className="table-header">
        <h3 className="card-title">Recent Users</h3>
        <button className="view-all-btn" onClick={() => navigate("/reports")}>View All</button>
      </div>

      <div className="scroll-x">
        <table className="data-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Customer Name</th>
              <th>Mobile Number</th>
              <th>Email</th>
              <th>Service</th>
              <th>Username</th>
              <th>Login Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((u) => {
              const rawId = String(u.id || u._id || '');
              const displayId = rawId.length > 10 ? `USR-${rawId.slice(-6).toUpperCase()}` : `USR-${rawId}`;
              const displayStatus = u.status || u.paymentStatus || "Active";
              return (
                <tr key={rawId}>
                  <td className="mono">{displayId}</td>
                  <td className="strong">{u.name}</td>
                  <td>{u.mobile}</td>
                  <td>{u.email}</td>
                  <td>{u.service}</td>
                  <td>{u.username}</td>
                  <td>{u.loginDate}</td>
                  <td>{u.expiryDate}</td>
                  <td>
                    <span className={`badge ${statusClass[displayStatus] || "badge-success"}`}>{displayStatus}</span>
                  </td>
                  <td>
                    <div className="action-icons">
                      <button className="icon-action view" onClick={() => navigate(`/reports?viewId=${u.id}`)} title="View Credentials">
                        <LuEye size={15} />
                      </button>
                      <button className="icon-action delete" onClick={() => handleDelete(u.id, u.name)} title="Delete User">
                        <LuTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {recent.length === 0 && (
              <tr>
                <td colSpan={10} className="empty-row">No recent users.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

