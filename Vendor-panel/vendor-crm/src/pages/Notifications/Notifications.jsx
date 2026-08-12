import { useState } from "react";
import { LuTriangleAlert, LuWallet, LuUserPlus, LuDatabaseBackup, LuCheck, LuBellOff } from "react-icons/lu";
import { useCRM } from "../../context/CRMContext";
import { useToast } from "../../context/ToastContext";
import "./Notifications.css";

const iconMap = {
  warning: { icon: LuTriangleAlert, color: "#F59E0B", bg: "#FEF3C7" },
  info: { icon: LuWallet, color: "#4F6BFF", bg: "#EEF2FF" },
  user: { icon: LuUserPlus, color: "#A855F7", bg: "#F3E8FF" },
  success: { icon: LuDatabaseBackup, color: "#22C55E", bg: "#DCFCE7" },
};

const categories = ["All", "Expiry Alerts", "Payment Alerts", "Renewal Alerts", "System Messages"];

export default function Notifications() {
  const { notifications, markRead, markAllRead } = useCRM();
  const [category, setCategory] = useState("All");
  const { showToast } = useToast();

  const filtered = notifications.filter((n) => category === "All" || n.category === category);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkRead = (id) => {
    markRead(id);
    showToast("Notification marked as read");
  };

  const handleMarkAllRead = () => {
    markAllRead();
    showToast("All notifications marked as read");
  };

  return (
    <div className="notifications-page">
      <div className="table-card">
        <div className="notif-toolbar">
          <div className="notif-tabs">
            {categories.map((c) => (
              <button
                key={c}
                className={`notif-tab ${category === c ? "active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <button className="mark-read-btn" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            <LuCheck size={15} /> Mark all as read ({unreadCount})
          </button>
        </div>

        <div className="full-notif-list">
          {filtered.map((n) => {
            const meta = iconMap[n.type] || iconMap.info;
            return (
              <div className={`full-notif-row ${n.unread ? "unread" : ""}`} key={n.id}>
                <span className="notif-row-icon" style={{ background: meta.bg, color: meta.color }}>
                  <meta.icon size={17} />
                </span>
                <div className="notif-row-body">
                  <p className="notif-row-text">{n.text}</p>
                  <span className="notif-row-meta">{n.category} · {n.time}</span>
                </div>
                {n.unread ? (
                  <button className="mark-btn" onClick={() => handleMarkRead(n.id)}>Mark read</button>
                ) : (
                  <span className="read-tag">Read</span>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty-state">
              <LuBellOff size={26} />
              <p>No notifications in this category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

