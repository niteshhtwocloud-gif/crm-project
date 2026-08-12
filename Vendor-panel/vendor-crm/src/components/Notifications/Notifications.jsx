import { LuTriangleAlert, LuWallet, LuUserPlus, LuDatabaseBackup } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { useCRM } from "../../context/CRMContext";
import "./Notifications.css";

const iconMap = {
  warning: { icon: LuTriangleAlert, color: "#F59E0B", bg: "#FEF3C7" },
  info: { icon: LuWallet, color: "#4F6BFF", bg: "#EEF2FF" },
  user: { icon: LuUserPlus, color: "#A855F7", bg: "#F3E8FF" },
  success: { icon: LuDatabaseBackup, color: "#22C55E", bg: "#DCFCE7" },
};

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications } = useCRM();

  const latestNotifs = notifications.slice(0, 4);

  return (
    <div className="table-card">
      <div className="table-header">
        <h3 className="card-title">Notifications</h3>
        <button className="view-all-btn" onClick={() => navigate("/notifications")}>View All</button>
      </div>

      <div className="notif-list">
        {latestNotifs.map((n) => {
          const meta = iconMap[n.type] || iconMap.info;
          return (
            <div className="notif-row" key={n.id}>
              <span className="notif-row-icon" style={{ background: meta.bg, color: meta.color }}>
                <meta.icon size={16} />
              </span>
              <div className="notif-row-body">
                <p className="notif-row-text">{n.text}</p>
                <span className="notif-row-time">{n.time}</span>
              </div>
            </div>
          );
        })}
        {latestNotifs.length === 0 && (
          <p style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)", fontSize: "14px" }}>
            No notifications.
          </p>
        )}
      </div>
    </div>
  );
}

