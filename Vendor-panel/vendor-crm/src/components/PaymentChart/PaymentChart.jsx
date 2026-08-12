import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useCRM } from "../../context/CRMContext";
import "./PaymentChart.css";

export default function PaymentChart() {
  const { payments } = useCRM();

  const paymentOverview = useMemo(() => {
    const total = payments.length;
    const completedCount = payments.filter(p => p.status === 'Paid' || p.status === 'Completed').length;
    const pendingCount = payments.filter(p => p.status === 'Pending').length;
    const overdueCount = payments.filter(p => p.status === 'Overdue' || p.status === 'Failed').length;

    const calcPct = (cnt) => (total > 0 ? Math.round((cnt / total) * 100) : 0);

    return [
      { name: "Completed", value: completedCount, percent: calcPct(completedCount), color: "#22C55E" },
      { name: "Pending", value: pendingCount, percent: calcPct(pendingCount), color: "#F59E0B" },
      { name: "Overdue", value: overdueCount, percent: calcPct(overdueCount), color: "#EF4444" },
    ];
  }, [payments]);
  return (
    <div className="chart-card payment-card">
      <div className="chart-header">
        <h3 className="card-title">Payment Overview</h3>
      </div>

      <div className="donut-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={paymentOverview}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={3}
              cornerRadius={4}
              startAngle={90}
              endAngle={-270}
            >
              {paymentOverview.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} invoices`, name]}
              contentStyle={{ borderRadius: 10, border: "1px solid #E8EDF5", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="donut-legend">
        {paymentOverview.map((item) => (
          <li key={item.name}>
            <span className="legend-dot" style={{ background: item.color }} />
            <span className="legend-name">{item.name}</span>
            <span className="legend-value">
              {item.percent}% ({item.value})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
