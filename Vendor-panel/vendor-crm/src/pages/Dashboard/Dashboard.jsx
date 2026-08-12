import { useNavigate } from "react-router-dom";
import DashboardCards from "../../components/DashboardCards/DashboardCards";
import RevenueChart from "../../components/RevenueChart/RevenueChart";
import PaymentChart from "../../components/PaymentChart/PaymentChart";
import UpcomingRenewals from "../../components/UpcomingRenewals/UpcomingRenewals";
import RenewalCalendar from "../../components/RenewalCalendar/RenewalCalendar";
import RecentUsers from "../../components/RecentUsers/RecentUsers";
import PaymentSummary from "../../components/PaymentSummary/PaymentSummary";
import TopServices from "../../components/TopServices/TopServices";
import QuickActions from "../../components/QuickActions/QuickActions";
import Notifications from "../../components/Notifications/Notifications";
import { useToast } from "../../context/ToastContext";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return (
    <div className="dashboard-page">
      <DashboardCards onCardClick={(card) => showToast(`${card.label}: ${card.value}`)} />

      <div className="dashboard-row-2">
        <RevenueChart />
        <PaymentChart />
        <UpcomingRenewals onViewAll={() => navigate("/services")} />
        <RenewalCalendar onViewCalendar={() => showToast("Opening full calendar view")} />
      </div>

      <div className="dashboard-row-3">
        <RecentUsers />
        <PaymentSummary />
      </div>

      <div className="dashboard-row-4">
        <TopServices />
        <QuickActions />
        <Notifications />
      </div>
    </div>
  );
}

