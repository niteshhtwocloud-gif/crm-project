import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HiOutlineUsers, HiOutlineOfficeBuilding } from 'react-icons/hi';
import { BsBoxSeam, BsHourglassSplit } from 'react-icons/bs';
import { MdErrorOutline } from 'react-icons/md';
import { FiArrowUp } from 'react-icons/fi';
import { useData } from '../../context/DataContext';
import './DashboardCards.css';

const iconMap = {
  customers: <HiOutlineUsers />,
  vendors: <HiOutlineOfficeBuilding />,
  services: <BsBoxSeam />,
  expiring: <BsHourglassSplit />,
  expired: <MdErrorOutline />,
};

export default function DashboardCards() {
  const navigate = useNavigate();
  const { aggregations } = useData();

  const statCards = [
    {
      id: 1,
      title: 'Total Customers',
      value: aggregations.totalCustomers.toLocaleString(),
      change: null,
      trend: null,
      link: 'View all',
      icon: 'customers',
      route: '/customers',
      gradient: ['#4F6BFF', '#2F55FF'],
    },
    {
      id: 2,
      title: 'Total Vendors',
      value: aggregations.totalVendors.toLocaleString(),
      change: null,
      trend: null,
      link: 'View all',
      icon: 'vendors',
      route: '/vendors',
      gradient: ['#22C55E', '#16A34A'],
    },
    {
      id: 3,
      title: 'Active Services',
      value: aggregations.activeServices.toLocaleString(),
      change: null,
      trend: null,
      link: 'View all',
      icon: 'services',
      route: '/services',
      gradient: ['#A855F7', '#9333EA'],
    },
    {
      id: 4,
      title: 'Expiring in 7 Days',
      value: aggregations.expiringServices.toLocaleString(),
      change: null,
      trend: null,
      icon: 'expiring',
      route: '/renewal-center/expiring',
      gradient: ['#F59E0B', '#D97706'],
      link: 'View all',
    },
    {
      id: 5,
      title: 'Expired Services',
      value: aggregations.expiredServices.toLocaleString(),
      change: null,
      trend: null,
      icon: 'expired',
      route: '/renewal-center/expired',
      gradient: ['#EF4444', '#DC2626'],
      link: 'View all',
    },
  ];

  return (
    <div className="stat-cards-row">
      {statCards.map((card, i) => (
        <motion.div
          className="stat-card"
          key={card.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06 }}
          whileHover={{ y: -4 }}
          onClick={() => navigate(card.route)}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-card-top">
            <div
              className="stat-icon-box"
              style={{
                background: `linear-gradient(135deg, ${card.gradient[0]}, ${card.gradient[1]})`,
              }}
            >
              {iconMap[card.icon]}
            </div>
            <p className="stat-title">{card.title}</p>
          </div>
          <p className="stat-value">{card.value}</p>
          {card.change ? (
            <p className="stat-change">
              <FiArrowUp /> {card.change} from last month
            </p>
          ) : (
            <span className="stat-link">
              {card.link}
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}
