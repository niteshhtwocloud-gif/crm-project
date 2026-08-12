import { LuUsers, LuUserPlus, LuUserCheck, LuServer, LuHourglass, LuTimerOff, LuWallet, LuCircleCheckBig } from "react-icons/lu";
import { motion } from "framer-motion";
import { useCRM } from "../../context/CRMContext";
import "./DashboardCards.css";

const iconMap = {
  users: LuUsers,
  login: LuUserPlus,
  active: LuUserCheck,
  services: LuServer,
  expiring: LuHourglass,
  expired: LuTimerOff,
  pending: LuWallet,
  completed: LuCircleCheckBig,
};

export default function DashboardCards({ onCardClick }) {
  const { users, services, payments } = useCRM();

  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalUsers = users.length;
  
  // Real today's logins
  const todayLogins = users.filter(u => {
    const lDate = u.loginDate || u.lastLogin || u.created_at || u.creationDate;
    if (!lDate) return false;
    const dStr = typeof lDate === 'object' && lDate.toISOString ? lDate.toISOString().slice(0, 10) : String(lDate).slice(0, 10);
    return dStr === todayStr;
  }).length;

  const activeUsers = users.filter(u => u.status === "Active" || u.paymentStatus === "Paid").length;
  
  // Active and Expiring services using real customer/service records
  const activeServicesCount = services.filter(s => s.status === "Active").length + users.filter(u => u.status === "Active").length;
  const expiringServicesCount = services.filter(s => s.status === "Expiring" || (s.daysLeft > 0 && s.daysLeft <= 7)).length + 
                                users.filter(u => u.status === "Expiring" || (u.daysLeft > 0 && u.daysLeft <= 7)).length;

  const pendingPaymentsCount = payments.filter(p => p.status === "Pending" || p.status === "Overdue").length;
  const completedPaymentsCount = payments.filter(p => p.status === "Paid" || p.status === "Completed").length;

  // Real month over month calculations
  const usersThisMonth = users.filter(u => {
    const d = new Date(u.created_at || u.creationDate || u.loginDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const cards = [
    { id: 1, label: "Total Users", value: totalUsers.toLocaleString(), change: `${usersThisMonth} new this month`, icon: "users", color: "#4F6BFF" },
    { id: 2, label: "Today's Logins", value: todayLogins.toLocaleString(), change: todayLogins > 0 ? "↗ Active today" : "0 logins today", icon: "login", color: "#22C55E" },
    { id: 3, label: "Active Users", value: activeUsers.toLocaleString(), change: totalUsers > 0 ? `${Math.round((activeUsers / totalUsers) * 100)}% of total users` : "0% of total users", icon: "active", color: "#A855F7" },
    { id: 4, label: "Active Services", value: activeServicesCount.toLocaleString(), change: "↗ Live Active Services", icon: "services", color: "#F59E0B" },
    { id: 5, label: "Expiring Services", value: expiringServicesCount.toLocaleString(), change: expiringServicesCount > 0 ? "⚠ Requires Attention" : "✓ All licenses healthy", icon: "expiring", color: "#EF4444" },
    { id: 7, label: "Pending Payments", value: pendingPaymentsCount.toLocaleString(), change: pendingPaymentsCount > 0 ? "⚠ Awaiting Payment" : "✓ All invoices paid", icon: "pending", color: "#F59E0B" },
    { id: 8, label: "Completed Payments", value: completedPaymentsCount.toLocaleString(), change: payments.length > 0 ? `${Math.round((completedPaymentsCount / payments.length) * 100)}% completion rate` : "0% completion rate", icon: "completed", color: "#22C55E" },
  ];

  return (
    <div className="cards-grid">
      {cards.map((card, i) => {
        const Icon = iconMap[card.icon];
        const isPositive = card.change.startsWith("+");
        return (
          <motion.button
            key={card.id}
            className="summary-card"
            onClick={() => onCardClick && onCardClick(card)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            whileHover={{ y: -4 }}
          >
            <div className="summary-icon" style={{ background: card.color }}>
              <Icon size={20} />
            </div>
            <div className="summary-info">
              <p className="summary-label">{card.label}</p>
              <h3 className="summary-value">{card.value}</h3>
              <span className={`summary-change ${isPositive ? "positive" : "negative"}`}>
                {isPositive ? "↗" : "↘"} {card.change}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

