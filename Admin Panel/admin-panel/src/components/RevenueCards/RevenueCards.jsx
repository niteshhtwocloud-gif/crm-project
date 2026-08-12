import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { BsWallet2, BsCreditCard2Front, BsGraphUpArrow } from 'react-icons/bs';
import { useData } from '../../context/DataContext';
import './RevenueCards.css';

const iconMap = {
  due: <BsWallet2 />,
  paid: <BsCreditCard2Front />,
  revenue: <BsGraphUpArrow />,
};

export default function RevenueCards() {
  const navigate = useNavigate();
  const { aggregations } = useData();

  const revenueCards = [
    {
      id: 1,
      title: 'Total Due Amount',
      value: `₹ ${aggregations.totalDueAmount.toLocaleString('en-IN')}`,
      icon: 'due',
      color: '#22C55E',
      footerLink: 'View details',
    },
    {
      id: 2,
      title: 'Paid This Month',
      value: `₹ ${aggregations.paidThisMonth.toLocaleString('en-IN')}`,
      icon: 'paid',
      color: '#4F6BFF',
      change: aggregations.paidChangePct,
    },
    {
      id: 3,
      title: 'Monthly Revenue',
      value: `₹ ${aggregations.monthlyRevenue.toLocaleString('en-IN')}`,
      icon: 'revenue',
      color: '#A855F7',
      change: aggregations.revenueChangePct,
    },
  ];
  return (
    <>
      {revenueCards.map((card, i) => (
        <motion.div
          className="revenue-card"
          key={card.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06 }}
          whileHover={{ y: -4 }}
        >
          <div className="revenue-icon" style={{ background: `${card.color}1A`, color: card.color }}>
            {iconMap[card.icon]}
          </div>
          <p className="revenue-title">{card.title}</p>
          <p className="revenue-value">{card.value}</p>
          {card.change !== null && card.change !== undefined ? (
            <p className="revenue-change" style={{ color: card.change < 0 ? '#EF4444' : undefined }}>
              {card.change < 0 ? <FiArrowDown /> : <FiArrowUp />} {Math.abs(card.change)}% from last month
            </p>
          ) : (
            <button className="revenue-link" onClick={() => navigate('/payments')}>
              {card.footerLink}
            </button>
          )}
        </motion.div>
      ))}
    </>
  );
}
