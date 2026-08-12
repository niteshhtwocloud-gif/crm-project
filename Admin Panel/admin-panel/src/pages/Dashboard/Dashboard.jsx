import React from 'react';
import DashboardCards from '../../components/DashboardCards/DashboardCards';
import RevenueCards from '../../components/RevenueCards/RevenueCards';
import ExcelManager from '../../components/ExcelManager/ExcelManager';
import PaymentChart from '../../components/PaymentChart/PaymentChart';
import RenewalCalendar from '../../components/RenewalCalendar/RenewalCalendar';
import UpcomingRenewals from '../../components/UpcomingRenewals/UpcomingRenewals';
import OverduePayments from '../../components/OverduePayments/OverduePayments';
import RecentInvoices from '../../components/RecentInvoices/RecentInvoices';
import TopVendors from '../../components/TopVendors/TopVendors';
import './Dashboard.css';

export default function Dashboard() {
  return (
    <div className="dashboard-page">
      <DashboardCards />

      {/* Row 2: Finance Overview */}
      <div className="dashboard-row-finance">
        <div className="dashboard-finance-left">
          <div className="revenue-cards-wrapper">
            <RevenueCards />
          </div>
          <ExcelManager />
        </div>
        <div className="payment-chart-column">
          <PaymentChart />
        </div>
      </div>

      {/* Row 3: Renewals Overview */}
      <div className="dashboard-row-renewals">
        <RenewalCalendar />
        <UpcomingRenewals />
      </div>

      {/* Row 4: Billing & Payments */}
      <div className="dashboard-row-payments">
        <OverduePayments />
        <RecentInvoices />
      </div>

      {/* Row 5: Vendor Overview */}
      <div className="dashboard-row-full">
        <TopVendors />
      </div>
    </div>
  );
}
