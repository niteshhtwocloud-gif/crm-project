export const statCards = [
  {
    id: 1,
    title: 'Total Customers',
    value: '1,248',
    change: '12.5%',
    trend: 'up',
    icon: 'customers',
    gradient: ['#4F6BFF', '#2F55FF'],
  },
  {
    id: 2,
    title: 'Total Vendors',
    value: '156',
    change: '8.3%',
    trend: 'up',
    icon: 'vendors',
    gradient: ['#22C55E', '#16A34A'],
  },
  {
    id: 3,
    title: 'Active Services',
    value: '2,856',
    change: '10.4%',
    trend: 'up',
    icon: 'services',
    gradient: ['#A855F7', '#9333EA'],
  },
  {
    id: 4,
    title: 'Expiring in 7 Days',
    value: '48',
    change: null,
    trend: null,
    icon: 'expiring',
    gradient: ['#F59E0B', '#D97706'],
    link: 'View all',
  },
  {
    id: 5,
    title: 'Expired Services',
    value: '23',
    change: null,
    trend: null,
    icon: 'expired',
    gradient: ['#EF4444', '#DC2626'],
    link: 'View all',
  },
];

export const revenueCards = [
  {
    id: 1,
    title: 'Total Due Amount',
    value: '₹ 8,75,430',
    icon: 'due',
    color: '#22C55E',
    footerLink: 'View details',
  },
  {
    id: 2,
    title: 'Paid This Month',
    value: '₹ 12,45,660',
    icon: 'paid',
    color: '#4F6BFF',
    change: '15.6%',
  },
  {
    id: 3,
    title: 'Monthly Revenue',
    value: '₹ 18,75,430',
    icon: 'revenue',
    color: '#A855F7',
    change: '11.2%',
  },
];

export const paymentStatusData = [
  { name: 'Completed', value: 872, percent: 56, color: '#22C55E' },
  { name: 'Pending', value: 234, percent: 15, color: '#F59E0B' },
  { name: 'Overdue', value: 169, percent: 11, color: '#EF4444' },
  { name: 'Upcoming', value: 281, percent: 18, color: '#A855F7' },
];

export const calendarEvents = {
  '2025-05-09': { count: 7, color: '#F59E0B' },
  '2025-05-14': { count: 12, color: '#EF4444' },
  '2025-05-21': { count: 5, color: '#22C55E' },
};

export const upcomingRenewals = [
  { id: 1, customer: 'ABC Pvt Ltd', product: 'Tally Cloud', expiry: '21 May 2025', daysLeft: 3, amount: '₹8,500', status: 'danger' },
  { id: 2, customer: 'XYZ Traders', product: 'VPS Hosting', expiry: '23 May 2025', daysLeft: 5, amount: '₹15,000', status: 'warning' },
  { id: 3, customer: 'Shree Enterprises', product: 'Busy Cloud', expiry: '26 May 2025', daysLeft: 8, amount: '₹6,000', status: 'warning' },
  { id: 4, customer: 'Kumar & Co.', product: 'Tally Cloud', expiry: '28 May 2025', daysLeft: 10, amount: '₹10,500', status: 'info' },
  { id: 5, customer: 'Mahi Retail Ltd', product: 'Marg Cloud', expiry: '01 Jun 2025', daysLeft: 14, amount: '₹7,200', status: 'success' },
];

export const overduePayments = [
  { id: 1, customer: 'Om Sai Traders', invoice: 'INV-2025-1547', dueDate: '05 May 2025', amount: '₹12,500', overdueDays: 9 },
  { id: 2, customer: 'Balaji Enterprises', invoice: 'INV-2025-1541', dueDate: '02 May 2025', amount: '₹8,750', overdueDays: 12 },
  { id: 3, customer: 'Shyam & Sons', invoice: 'INV-2025-1522', dueDate: '28 Apr 2025', amount: '₹5,600', overdueDays: 16 },
  { id: 4, customer: 'Perfect Solutions', invoice: 'INV-2025-1501', dueDate: '25 Apr 2025', amount: '₹10,000', overdueDays: 19 },
  { id: 5, customer: 'M Tech Solutions', invoice: 'INV-2025-1498', dueDate: '20 Apr 2025', amount: '₹6,400', overdueDays: 24 },
];

export const recentInvoices = [
  { id: 1, invoiceNo: 'INV-2025-1587', customer: 'ABC Pvt Ltd', date: '18 May 2025', amount: '₹8,500', paid: '₹8,500', due: '₹0', status: 'success' },
  { id: 2, invoiceNo: 'INV-2025-1586', customer: 'XYZ Traders', date: '18 May 2025', amount: '₹15,000', paid: '₹7,500', due: '₹7,500', status: 'warning' },
  { id: 3, invoiceNo: 'INV-2025-1585', customer: 'Mahi Retail Ltd', date: '17 May 2025', amount: '₹7,200', paid: '₹0', due: '₹7,200', status: 'danger' },
  { id: 4, invoiceNo: 'INV-2025-1584', customer: 'Kumar & Co.', date: '17 May 2025', amount: '₹10,500', paid: '₹10,500', due: '₹0', status: 'success' },
  { id: 5, invoiceNo: 'INV-2025-1583', customer: 'Shree Enterprises', date: '16 May 2025', amount: '₹6,000', paid: '₹0', due: '₹6,000', status: 'danger' },
];

export const topVendors = [
  { id: 1, name: 'Server Basket', totalPurchase: '₹12,50,000', totalPaid: '₹9,80,000', pending: '₹2,70,000', status: 'warning' },
  { id: 2, name: 'Hostinger', totalPurchase: '₹6,80,000', totalPaid: '₹6,80,000', pending: '₹0', status: 'success' },
  { id: 3, name: 'Amazon Web Services', totalPurchase: '₹5,40,000', totalPaid: '₹3,90,000', pending: '₹1,50,000', status: 'warning' },
  { id: 4, name: 'GoDaddy', totalPurchase: '₹3,20,000', totalPaid: '₹2,70,000', pending: '₹50,000', status: 'warning' },
  { id: 5, name: 'DigitalOcean', totalPurchase: '₹2,10,000', totalPaid: '₹2,10,000', pending: '₹0', status: 'success' },
];

export const notifications = [
  { id: 1, text: '3 renewals are expiring in the next 3 days', time: '10 min ago', type: 'warning' },
  { id: 2, text: 'Invoice INV-2025-1585 payment received', time: '1 hr ago', type: 'success' },
  { id: 3, text: 'Om Sai Traders payment is overdue by 9 days', time: '3 hrs ago', type: 'danger' },
  { id: 4, text: 'New vendor "CloudNine Hosting" added', time: '5 hrs ago', type: 'info' },
  { id: 5, text: 'Backup completed successfully', time: 'Yesterday', type: 'success' },
];
