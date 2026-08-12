import { LuUserPlus, LuServer, LuFilePlus2, LuFileUp, LuFileDown } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import "./QuickActions.css";

export default function QuickActions() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const actions = [
    { label: "Import Excel", icon: LuFileUp, color: "#F59E0B", bg: "#FEF3C7", onClick: () => navigate("/excel") },
    { label: "Export Excel", icon: LuFileDown, color: "#EF4444", bg: "#FEE2E2", onClick: () => navigate("/excel") },
  ];

  return (
    <div className="table-card">
      <div className="table-header">
        <h3 className="card-title">Quick Actions</h3>
      </div>
      <div className="quick-actions-grid">
        {actions.map((a) => (
          <button className="quick-action-btn" key={a.label} onClick={a.onClick}>
            <span className="qa-icon" style={{ background: a.bg, color: a.color }}>
              <a.icon size={19} />
            </span>
            <span className="qa-label">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
