import { useNavigate } from "react-router-dom";
import { useCRM } from "../../context/CRMContext";
import "./TopServices.css";

export default function TopServices() {
  const navigate = useNavigate();
  const { users } = useCRM();

  // Aggregate user service statistics dynamically
  const serviceStats = {};
  users.forEach((u) => {
    const sName = u.service || "Cloud Hosting";
    if (!serviceStats[sName]) {
      serviceStats[sName] = { name: sName, total: 0, active: 0, expiring: 0, expired: 0 };
    }
    serviceStats[sName].total++;
    
    const status = u.paymentStatus || "Paid";
    if (status === "Paid") {
      serviceStats[sName].active++;
    } else if (status === "Pending") {
      serviceStats[sName].expiring++;
    } else {
      serviceStats[sName].expired++;
    }
  });

  const sortedStats = Object.values(serviceStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  return (
    <div className="table-card small-card">
      <div className="table-header">
        <h3 className="card-title">Top Services</h3>
        <button className="view-all-btn" onClick={() => navigate("/services")}>View All</button>
      </div>

      <div className="scroll-x">
        <table className="data-table mini-table">
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Total Users</th>
              <th>Active</th>
              <th>Expiring</th>
              <th>Expired</th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((s) => (
              <tr key={s.name}>
                <td className="strong">{s.name}</td>
                <td>{s.total}</td>
                <td className="text-success">{s.active}</td>
                <td className="text-warning">{s.expiring}</td>
                <td className="text-danger">{s.expired}</td>
              </tr>
            ))}
            {sortedStats.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-row">No services data available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

