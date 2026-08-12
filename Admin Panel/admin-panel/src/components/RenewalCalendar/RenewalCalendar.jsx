import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useData } from '../../context/DataContext';
import './RenewalCalendar.css';

function formatKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function RenewalCalendar() {
  const [value, setValue] = useState(new Date());
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();
  const { services } = useData();

  // Dynamically compute calendar events
  const calendarEvents = {};
  services.forEach(s => {
    if (!s.expiry) return;
    const eventDate = String(s.expiry).slice(0, 10);
    const days = Number(s.daysLeft) || 0;
    const color = days <= 3 ? '#EF4444' : days <= 8 ? '#F59E0B' : '#22C55E';
    if (!calendarEvents[eventDate]) {
      calendarEvents[eventDate] = { count: 0, color, minDays: days };
    }
    calendarEvents[eventDate].count += 1;
    // The dot should reflect the most urgent renewal on that day.
    if (days < calendarEvents[eventDate].minDays) {
      calendarEvents[eventDate].minDays = days;
      calendarEvents[eventDate].color = color;
    }
  });

  function tileContent({ date, view }) {
    if (view !== 'month') return null;
    const key = formatKey(date);
    const event = calendarEvents[key];
    if (!event) return null;
    return <span className="event-dot" style={{ background: event.color }} />;
  }

  function tileClassName({ date, view }) {
    if (view !== 'month') return '';
    const key = formatKey(date);
    return selected === key ? 'selected-tile' : '';
  }

  return (
    <div className="renewal-calendar-card">
      <div className="card-header">
        <h3>Renewal Calendar</h3>
      </div>

      <Calendar
        value={value}
        onChange={setValue}
        onClickDay={(date) => setSelected(formatKey(date))}
        tileContent={tileContent}
        tileClassName={tileClassName}
        showNeighboringMonth={true}
        className="h2-calendar"
      />

      <ul className="calendar-legend">
        {Object.entries(calendarEvents)
          .filter(([date]) => new Date(date) >= new Date(new Date().toDateString()))
          .sort((a, b) => new Date(a[0]) - new Date(b[0]))
          .slice(0, 3)
          .map(([date, event]) => {
          const d = new Date(date);
          const formatted = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
          return (
            <li key={date}>
              <span className="dot" style={{ background: event.color }} /> {formatted} - {event.count} Renewal{event.count > 1 ? 's' : ''}
            </li>
          );
        })}
        {Object.keys(calendarEvents).length === 0 && (
          <li>No upcoming renewals.</li>
        )}
      </ul>

      <button className="view-calendar-link" onClick={() => navigate('/renewal-center')}>
        View Calendar
      </button>
    </div>
  );
}
