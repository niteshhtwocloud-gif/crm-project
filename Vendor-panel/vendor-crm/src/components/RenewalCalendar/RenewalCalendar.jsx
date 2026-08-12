import { useState, useMemo } from "react";
import Calendar from "react-calendar";
import { LuChevronLeft, LuChevronRight, LuCalendarClock } from "react-icons/lu";
import { useCRM } from "../../context/CRMContext";
import "./RenewalCalendar.css";
import "react-calendar/dist/Calendar.css";

export default function RenewalCalendar({ onViewCalendar }) {
  const { users, services } = useCRM();
  const [date, setDate] = useState(new Date());

  const { dateRenewalMap, activeMonthLegend } = useMemo(() => {
    const map = {};
    const legendMap = {};
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();

    const monthName = date.toLocaleDateString("en-US", { month: "short" });

    const all = [...users, ...services];
    const seen = new Set();

    all.forEach((item) => {
      const key = String(item._id || item.id || item.name || '');
      if (!key || seen.has(key)) return;
      seen.add(key);

      const expStr = item.expiryDate || item.expiry;
      if (!expStr) return;
      const d = new Date(expStr);
      if (isNaN(d.getTime())) return;

      const y = d.getFullYear();
      const m = d.getMonth();
      const dayNum = d.getDate();

      const keyDate = `${y}-${m}-${dayNum}`;
      map[keyDate] = (map[keyDate] || 0) + 1;

      if (y === targetYear && m === targetMonth) {
        const legKey = `${dayNum} ${monthName}`;
        legendMap[legKey] = (legendMap[legKey] || 0) + 1;
      }
    });

    const colors = ["#F59E0B", "#EF4444", "#22C55E", "#4F6BFF"];
    const legendItems = Object.keys(legendMap).slice(0, 4).map((legKey, idx) => ({
      label: `${legKey} - ${legendMap[legKey]} Renewal${legendMap[legKey] > 1 ? 's' : ''}`,
      color: colors[idx % colors.length]
    }));

    return {
      dateRenewalMap: map,
      activeMonthLegend: legendItems
    };
  }, [users, services, date]);

  return (
    <div className="chart-card renewal-card">
      <div className="chart-header">
        <h3 className="card-title">Renewal Calendar</h3>
        <div className="month-nav">
          <button onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))}>
            <LuChevronLeft size={16} />
          </button>
          <span>{date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
          <button onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))}>
            <LuChevronRight size={16} />
          </button>
        </div>
      </div>

      <Calendar
        value={date}
        onChange={setDate}
        activeStartDate={date}
        onActiveStartDateChange={({ activeStartDate }) => activeStartDate && setDate(activeStartDate)}
        showNavigation={false}
        tileContent={({ date: d, view }) => {
          if (view !== "month") return null;
          const keyDate = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const cnt = dateRenewalMap[keyDate];
          if (!cnt) return null;
          return <span className="tile-dot" style={{ background: "#4F6BFF" }} />;
        }}
        className="renewal-calendar"
      />

      <ul className="renewal-legend">
        {activeMonthLegend.map((item, idx) => (
          <li key={idx}>
            <span className="tile-dot" style={{ background: item.color }} /> {item.label}
          </li>
        ))}
        {activeMonthLegend.length === 0 && (
          <li style={{ fontSize: "12px", color: "#64748b" }}>No renewals scheduled for this month.</li>
        )}
      </ul>

      <button className="view-calendar-link" onClick={onViewCalendar}>
        <LuCalendarClock size={14} /> View Calendar
      </button>
    </div>
  );
}
