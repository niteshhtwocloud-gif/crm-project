import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { LuChevronDown } from "react-icons/lu";
import { useCRM } from "../../context/CRMContext";
import "./RevenueChart.css";

const ranges = ["This Month", "Last Month", "This Year"];

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value">₹ {payload[0].value.toLocaleString("en-IN")}</p>
      </div>
    );
  }
  return null;
}

export default function RevenueChart() {
  const { payments, users } = useCRM();
  const [range, setRange] = useState("This Month");
  const [open, setOpen] = useState(false);

  const { thisMonthData, lastMonthData, yearlyData, growthText } = useMemo(() => {
    const now = new Date();
    const currMonth = now.getMonth();
    const currYear = now.getFullYear();

    const lastMonthDate = new Date(currYear, currMonth - 1, 1);
    const lastMonthIdx = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    let thisMonthTot = 0;
    let lastMonthTot = 0;
    let thisYearTot = 0;
    let prevYearTot = 0;

    // Daily buckets for this month & last month
    const thisMonthDaysMap = {};
    const lastMonthDaysMap = {};
    const monthsYearMap = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 };
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Process payments
    payments.forEach(p => {
      const amt = Number(p.paid || p.amount || 0);
      if (amt <= 0) return;
      const dStr = p.paymentDate || p.date || p.created_at;
      if (!dStr) return;
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return;

      const m = d.getMonth();
      const y = d.getFullYear();
      const dayNum = d.getDate();

      if (y === currYear) {
        monthsYearMap[monthNames[m]] = (monthsYearMap[monthNames[m]] || 0) + amt;
        thisYearTot += amt;
      } else if (y === currYear - 1) {
        prevYearTot += amt;
      }

      if (m === currMonth && y === currYear) {
        const label = `${monthNames[m]} ${dayNum}`;
        thisMonthDaysMap[label] = (thisMonthDaysMap[label] || 0) + amt;
        thisMonthTot += amt;
      }

      if (m === lastMonthIdx && y === lastMonthYear) {
        const label = `${monthNames[m]} ${dayNum}`;
        lastMonthDaysMap[label] = (lastMonthDaysMap[label] || 0) + amt;
        lastMonthTot += amt;
      }
    });

    // Format output arrays
    const thisMData = Object.keys(thisMonthDaysMap).map(k => ({ day: k, value: thisMonthDaysMap[k] }));
    const lastMData = Object.keys(lastMonthDaysMap).map(k => ({ day: k, value: lastMonthDaysMap[k] }));
    const yData = monthNames.map(m => ({ day: m, value: monthsYearMap[m] || 0 }));

    // Fallbacks if empty
    if (thisMData.length === 0) {
      const mName = monthNames[currMonth];
      thisMData.push({ day: `${mName} 1`, value: 0 }, { day: `${mName} 15`, value: 0 }, { day: `${mName} 30`, value: 0 });
    }
    if (lastMData.length === 0) {
      const mName = monthNames[lastMonthIdx];
      lastMData.push({ day: `${mName} 1`, value: 0 }, { day: `${mName} 15`, value: 0 }, { day: `${mName} 30`, value: 0 });
    }

    // Dynamic growth percentage
    let mGrowth = "0% from last month";
    if (lastMonthTot > 0) {
      const pct = Math.round(((thisMonthTot - lastMonthTot) / lastMonthTot) * 100);
      mGrowth = `${pct >= 0 ? '↗ +' : '↘ '}${pct}% from last month`;
    } else if (thisMonthTot > 0) {
      mGrowth = "↗ +100% from last month";
    }

    let lmGrowth = "0% from previous month";
    if (lastMonthTot > 0) {
      lmGrowth = "↗ Recorded Revenue";
    }

    let yGrowth = "0% from last year";
    if (prevYearTot > 0) {
      const pct = Math.round(((thisYearTot - prevYearTot) / prevYearTot) * 100);
      yGrowth = `${pct >= 0 ? '↗ +' : '↘ '}${pct}% from last year`;
    } else if (thisYearTot > 0) {
      yGrowth = "↗ +100% from last year";
    }

    const growth = range === "This Month" ? mGrowth : range === "Last Month" ? lmGrowth : yGrowth;

    return {
      thisMonthData: thisMData,
      lastMonthData: lastMData,
      yearlyData: yData,
      growthText: growth
    };
  }, [payments, range]);

  const activeData = range === "This Month" 
    ? thisMonthData 
    : range === "Last Month" 
    ? lastMonthData 
    : yearlyData;

  const total = activeData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="chart-card revenue-card">
      <div className="chart-header">
        <h3 className="card-title">Monthly Revenue Overview</h3>
        <div className="range-dropdown">
          <button className="range-btn" onClick={() => setOpen((o) => !o)}>
            {range} <LuChevronDown size={14} />
          </button>
          {open && (
            <div className="range-menu">
              {ranges.map((r) => (
                <button key={r} onClick={() => { setRange(r); setOpen(false); }}>
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="revenue-total">
        <span className="rupee">₹</span> {total.toLocaleString("en-IN")}
        <span className="revenue-growth">{growthText}</span>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={activeData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F6BFF" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#4F6BFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#EEF1F6" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              interval={range === "This Year" || range === "This Month" || range === "Last Month" ? 1 : 2}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v / 1000}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#4F6BFF"
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
              activeDot={{ r: 5, fill: "#4F6BFF", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
