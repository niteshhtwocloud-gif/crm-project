import { LuCalendarRange } from "react-icons/lu";
import { useCRM } from "../../context/CRMContext";
import "./UpcomingRenewals.css";

export default function UpcomingRenewals({ onViewAll }) {
  const { users, services } = useCRM();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currMonth = now.getMonth();
  const currYear = now.getFullYear();

  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;

  const allRecords = [...users, ...services];
  const seenIds = new Set();

  allRecords.forEach((item) => {
    const key = String(item._id || item.id || item.name || '');
    if (!key || seenIds.has(key)) return;
    seenIds.add(key);

    const expStr = item.expiryDate || item.expiry;
    if (!expStr) return;
    const d = new Date(expStr);
    if (isNaN(d.getTime())) return;

    const dStr = d.toISOString().slice(0, 10);
    const daysLeft = Math.ceil((d - now) / (1000 * 60 * 60 * 24));

    if (dStr === todayStr) {
      todayCount++;
    }
    if (daysLeft > 0 && daysLeft <= 7) {
      weekCount++;
    }
    if (d.getMonth() === currMonth && d.getFullYear() === currYear) {
      monthCount++;
    }
  });

  const rows = [
    { label: "Today", value: `${todayCount} Renewals` },
    { label: "This Week", value: `${weekCount} Renewals` },
    { label: "This Month", value: `${monthCount} Renewals` },
  ];

  return (
    <div className="chart-card upcoming-card">
      <div className="upcoming-icon">
        <LuCalendarRange size={20} />
      </div>
      <h3 className="card-title">Upcoming Renewals</h3>
      <div className="upcoming-total">{monthCount}</div>
      <button className="upcoming-view-all" onClick={onViewAll}>View all</button>

      <div className="upcoming-rows">
        {rows.map((r) => (
          <div className="upcoming-row" key={r.label}>
            <span className="upcoming-label">{r.label}</span>
            <span className="upcoming-value">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

