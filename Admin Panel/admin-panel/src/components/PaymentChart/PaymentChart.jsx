import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useData } from '../../context/DataContext';
import './PaymentChart.css';

export default function PaymentChart() {
  const [activeIndex, setActiveIndex] = useState(null);
  const [hidden, setHidden] = useState([]);
  const { aggregations } = useData();
  const paymentStatusData = aggregations.paymentStatusData;

  const visibleData = paymentStatusData.filter((d) => !hidden.includes(d.name));

  function toggleLegend(name) {
    setHidden((h) => (h.includes(name) ? h.filter((n) => n !== name) : [...h, name]));
  }

  return (
    <div className="payment-chart-card">
      <div className="card-header">
        <h3>Payment Status Overview</h3>
      </div>
      <div className="payment-chart-body">
        <div className="donut-wrapper">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={visibleData}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={90}
                paddingAngle={2}
                onMouseEnter={(_, i) => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {visibleData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} invoices`, name]}
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid #e8edf5',
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="payment-legend">
          {paymentStatusData.map((item) => (
            <li
              key={item.name}
              className={hidden.includes(item.name) ? 'legend-hidden' : ''}
              onClick={() => toggleLegend(item.name)}
            >
              <span className="legend-dot" style={{ background: item.color }} />
              <span className="legend-name">{item.name}</span>
              <span className="legend-percent">
                {item.percent}% ({item.value})
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
