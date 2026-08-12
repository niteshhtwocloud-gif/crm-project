export const summaryCards = [
  { id: 1, label: "Total Users", value: "1,248", change: "+12.5% from last month", icon: "users", color: "#4F6BFF" },
  { id: 2, label: "Today's Logins", value: "156", change: "+8.3% from yesterday", icon: "login", color: "#22C55E" },
  { id: 3, label: "Active Users", value: "856", change: "+10.2% from last month", icon: "active", color: "#A855F7" },
  { id: 4, label: "Active Services", value: "2,856", change: "+9.8% from last month", icon: "services", color: "#F59E0B" },
  { id: 5, label: "Expiring Services", value: "48", change: "-6.4% from last month", icon: "expiring", color: "#EF4444" },
  { id: 6, label: "Expired Services", value: "23", change: "-3.2% from last month", icon: "expired", color: "#EF4444" },
  { id: 7, label: "Pending Payments", value: "124", change: "-7.6% from last month", icon: "pending", color: "#F59E0B" },
  { id: 8, label: "Completed Payments", value: "1,024", change: "+15.6% from last month", icon: "completed", color: "#22C55E" },
];

export const revenueData = [
  { day: "May 1", value: 8000 },
  { day: "May 4", value: 11000 },
  { day: "May 8", value: 15500 },
  { day: "May 11", value: 13000 },
  { day: "May 15", value: 21000 },
  { day: "May 18", value: 17500 },
  { day: "May 22", value: 19500 },
  { day: "May 25", value: 14000 },
  { day: "May 28", value: 18000 },
  { day: "May 31", value: 12500 },
];

export const paymentOverview = [
  { name: "Completed", value: 810, percent: 65, color: "#22C55E" },
  { name: "Pending", value: 248, percent: 20, color: "#F59E0B" },
  { name: "Overdue", value: 124, percent: 10, color: "#EF4444" },
  { name: "Upcoming", value: 66, percent: 5, color: "#A855F7" },
];

export const recentUsers = [
  { id: "USR-1001", name: "Rahul Sharma", mobile: "9876543210", email: "rahul@gmail.com", service: "Cloud Hosting", username: "rahul123", loginDate: "24 May 2025", expiryDate: "24 Jun 2025", daysLeft: 31, status: "Active" },
  { id: "USR-1002", name: "Priya Verma", mobile: "8765432109", email: "priya@gmail.com", service: "VPS Hosting", username: "priya.v", loginDate: "24 May 2025", expiryDate: "20 Jun 2025", daysLeft: 27, status: "Active" },
  { id: "USR-1003", name: "Amit Singh", mobile: "7654321098", email: "amit@gmail.com", service: "Dedicated Server", username: "amit.singh", loginDate: "23 May 2025", expiryDate: "18 Jun 2025", daysLeft: 25, status: "Active" },
  { id: "USR-1004", name: "Neha Patel", mobile: "6543210987", email: "neha@gmail.com", service: "WordPress Hosting", username: "neha.p", loginDate: "22 May 2025", expiryDate: "15 Jun 2025", daysLeft: 22, status: "Expiring" },
  { id: "USR-1005", name: "Vikash Gupta", mobile: "5432109876", email: "vikash@gmail.com", service: "Cloud Hosting", username: "vikash.g", loginDate: "21 May 2025", expiryDate: "10 Jun 2025", daysLeft: 17, status: "Expiring" },
];

export const paymentSummary = [
  { invoice: "INV-2025-1578", customer: "Rahul Sharma", service: "Cloud Hosting", amount: 12500, paid: 12500, pending: 0, paymentDate: "24 May 2025", dueDate: "24 Jun 2025", status: "Paid" },
  { invoice: "INV-2025-1577", customer: "Priya Verma", service: "VPS Hosting", amount: 8750, paid: 5000, pending: 3750, paymentDate: "20 May 2025", dueDate: "20 Jun 2025", status: "Pending" },
  { invoice: "INV-2025-1576", customer: "Amit Singh", service: "Dedicated Server", amount: 15000, paid: 0, pending: 15000, paymentDate: "18 May 2025", dueDate: "18 Jun 2025", status: "Overdue" },
  { invoice: "INV-2025-1575", customer: "Neha Patel", service: "WordPress Hosting", amount: 10000, paid: 10000, pending: 0, paymentDate: "15 May 2025", dueDate: "15 Jun 2025", status: "Paid" },
  { invoice: "INV-2025-1574", customer: "Vikash Gupta", service: "Cloud Hosting", amount: 6400, paid: 2000, pending: 4400, paymentDate: "10 May 2025", dueDate: "10 Jun 2025", status: "Pending" },
];

export const topServices = [
  { name: "Cloud Hosting", total: 450, active: 390, expiring: 45, expired: 15 },
  { name: "VPS Hosting", total: 320, active: 280, expiring: 30, expired: 10 },
  { name: "Dedicated Server", total: 180, active: 150, expiring: 20, expired: 10 },
  { name: "WordPress Hosting", total: 150, active: 130, expiring: 15, expired: 5 },
];

export const notificationsList = [
  { id: 1, type: "warning", text: "12 services are expiring in 7 days", time: "10 May 2025, 10:30 AM" },
  { id: 2, type: "info", text: "Payment received from Rahul Sharma", time: "10 May 2025, 09:15 AM" },
  { id: 3, type: "user", text: "New user registered - Priya Verma", time: "09 May 2025, 06:20 PM" },
  { id: 4, type: "success", text: "Server backup completed successfully", time: "09 May 2025, 03:45 PM" },
];

export const renewalEvents = {
  9: { count: 7, color: "#F59E0B" },
  14: { count: 12, color: "#EF4444" },
  16: { count: 5, color: "#22C55E" },
  21: { count: 5, color: "#22C55E" },
  28: { count: 3, color: "#4F6BFF" },
};

export const backupHistory = [
  { id: 1, date: "09 May 2025, 03:45 PM", size: "2.45 GB", status: "Completed" },
  { id: 2, date: "08 May 2025, 03:40 PM", size: "2.40 GB", status: "Completed" },
  { id: 3, date: "07 May 2025, 03:38 PM", size: "2.38 GB", status: "Completed" },
  { id: 4, date: "06 May 2025, 03:41 PM", size: "2.36 GB", status: "Failed" },
];

export const reportRows = Array.from({ length: 24 }).map((_, i) => ({
  id: i + 1,
  name: recentUsers[i % recentUsers.length].name + (i > 4 ? ` ${i}` : ""),
  mobile: `98${(10000000 + i * 137).toString().slice(0, 8)}`,
  email: `user${i + 1}@gmail.com`,
  vendor: ["CloudBase", "ServerPro", "HostNet", "WebForge"][i % 4],
  service: topServices[i % topServices.length].name,
  username: `user${i + 1}`,
  password: "••••••••",
  loginDate: "May " + ((i % 28) + 1) + ", 2025",
  expiryDate: "Jun " + ((i % 28) + 1) + ", 2025",
  paymentStatus: ["Paid", "Pending", "Overdue"][i % 3],
  pendingAmount: (i % 3 === 0) ? 0 : (i * 137) % 9000,
  dueDate: "Jun " + ((i % 28) + 1) + ", 2025",
  remarks: i % 5 === 0 ? "VIP customer" : "-",
}));
