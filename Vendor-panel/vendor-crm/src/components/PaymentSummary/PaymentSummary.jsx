import { LuEye } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { useCRM } from "../../context/CRMContext";
import "./PaymentSummary.css";

const statusClass = {
  Paid: "badge-success",
  Pending: "badge-warning",
  Overdue: "badge-danger",
};

const fmt = (n) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

export default function PaymentSummary() {
  const navigate = useNavigate();
  const { payments } = useCRM();

  const recentPayments = payments.slice(0, 5);

  return (
    <div className="table-card">
      <div className="table-header">
        <h3 className="card-title">Payment Summary</h3>
        <button className="view-all-btn" onClick={() => navigate("/payments")}>View All</button>
      </div>

      <div className="scroll-x">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice No.</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Pending</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {recentPayments.map((p) => (
              <tr key={p.invoice}>
                <td className="mono">{p.invoice}</td>
                <td className="strong">{p.customer}</td>
                <td>{p.service}</td>
                <td>{fmt(p.amount)}</td>
                <td>{fmt(p.paid)}</td>
                <td>{fmt(p.pending)}</td>
                <td>{p.dueDate}</td>
                <td>
                  <span className={`badge ${statusClass[p.status] || "badge-warning"}`}>{p.status}</span>
                </td>
                <td>
                  <button className="icon-action view" onClick={() => navigate(`/payments?viewInvoice=${p.invoice}`)} title="View Invoice">
                    <LuEye size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {recentPayments.length === 0 && (
              <tr>
                <td colSpan={9} className="empty-row">No payments recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

