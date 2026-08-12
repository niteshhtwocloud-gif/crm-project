import { useState } from "react";
import { LuShoppingCart, LuX, LuCheck } from "react-icons/lu";
import { useCRM } from "../../context/CRMContext";
import { useToast } from "../../context/ToastContext";
import "./BuyServices.css";

const SERVER_PLANS = [
  { id: "srv-starter", name: "Starter Cloud VPS", hosting: "AWS Cloud", ram: "8 GB DDR4", rom: "120 GB NVMe SSD", price: 899 },
  { id: "srv-business", name: "Business Cloud VPS", hosting: "DigitalOcean Node", ram: "16 GB DDR4", rom: "240 GB NVMe SSD", price: 1899, bestSeller: true },
  { id: "srv-enterprise", name: "Enterprise Node", hosting: "OVH Cloud", ram: "32 GB DDR4", rom: "500 GB NVMe SSD", price: 3799 },
  { id: "srv-dedicated-ext", name: "Dedicated Extreme", hosting: "Hostinger Dedicated", ram: "64 GB DDR4", rom: "1 TB NVMe SSD", price: 7499 },
  { id: "srv-dedicated-power", name: "Dedicated Power Server", hosting: "Bare Metal Dedicated", ram: "128 GB DDR4", rom: "2 TB NVMe SSD", price: 14999 },
  { id: "srv-gpu-node", name: "GPU AI Server Node", hosting: "AWS GPU Cluster", ram: "96 GB DDR4", rom: "1.5 TB NVMe SSD", price: 22499 },
];

export default function BuyServices() {
  const { users, editUser, addPayment, addNotification } = useCRM();
  const { showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  // Checkout Form states
  const [customerId, setCustomerId] = useState("");
  const [billingCycle, setBillingCycle] = useState("1"); // in months
  const [paymentMode, setPaymentMode] = useState("UPI");

  const handleOpenCheckout = (plan) => {
    setSelectedPlan(plan);
    setCustomerId(users[0]?.id || "");
    setBillingCycle("1");
    setPaymentMode("UPI");
    setShowModal(true);
  };

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (!customerId) {
      showToast("Please choose a customer first!");
      return;
    }

    const customer = users.find(u => String(u.id) === String(customerId));
    if (!customer) {
      showToast("Selected customer not found.");
      return;
    }

    const priceMultiplier = Number(billingCycle);
    const basePrice = selectedPlan.price;
    const finalAmount = basePrice * priceMultiplier;

    // 1. Create a live invoice
    const invNo = `INV-2025-${Math.floor(Math.random() * 9000) + 1000}`;
    const newInvoice = {
      invoice: invNo,
      customer: customer.name,
      service: selectedPlan.name,
      amount: finalAmount,
      paid: finalAmount,
      pending: 0,
      paymentDate: new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }),
      dueDate: new Date(Date.now() + 30 * priceMultiplier * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }),
      status: "Paid",
      mode: paymentMode,
    };
    addPayment(newInvoice);

    // 2. Assign the bought service to the customer profile
    const expiryDateStr = new Date(Date.now() + 30 * priceMultiplier * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    
    editUser(customer.id, {
      service: selectedPlan.name,
      paymentStatus: "Paid",
      pendingAmount: 0,
      expiryDate: expiryDateStr,
      dueDate: expiryDateStr,
      remarks: `Provisioned specs: ${selectedPlan.hosting} | ${selectedPlan.ram} | ${selectedPlan.rom}. Billing: ${billingCycle} Mo.`,
    });

    // 3. Add system notification
    addNotification(
      "success",
      `Server Node "${selectedPlan.name}" provisioned successfully for Customer ${customer.name}`,
      "System Messages"
    );

    setShowModal(false);
    showToast(`Order Confirmed! ${selectedPlan.name} assigned to ${customer.name}`);
  };

  return (
    <div className="buy-services-page">
      <div className="plans-grid">
        {SERVER_PLANS.map((plan) => (
          <div className={`plan-card ${plan.bestSeller ? "best-seller-card" : ""}`} key={plan.id}>
            <div className="plan-header" style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="plan-name">{plan.name}</h3>
              {plan.bestSeller && <span className="best-seller-badge">Best Seller</span>}
            </div>
            
            <div className="plan-specs" style={{ marginTop: "0" }}>
              <div className="spec-item">
                <span className="spec-label">Hosting:</span>
                <span className="spec-value">{plan.hosting}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">RAM:</span>
                <span className="spec-value">{plan.ram}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">ROM:</span>
                <span className="spec-value">{plan.rom}</span>
              </div>
            </div>

            <div className="plan-price-row">
              <span className="price-symbol">₹</span>
              <span className="price-amount">{plan.price.toLocaleString("en-IN")}</span>
              <span className="price-period">/ month</span>
            </div>

            <button className="plan-buy-btn" onClick={() => handleOpenCheckout(plan)}>
              <LuShoppingCart size={16} /> Buy Server Node
            </button>
          </div>
        ))}
      </div>

      {/* Checkout Modal */}
      {showModal && selectedPlan && (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleCheckoutSubmit} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Provision Server Node</h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowModal(false)}>
                <LuX size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "var(--bg)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase" }}>Selected Node specs</p>
                <h4 style={{ fontSize: "16px", fontWeight: "700", marginTop: "4px", color: "var(--primary-blue)" }}>{selectedPlan.name}</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px", marginTop: "10px", fontSize: "13px" }}>
                  <div><strong>Hosting:</strong> {selectedPlan.hosting}</div>
                  <div><strong>RAM:</strong> {selectedPlan.ram}</div>
                  <div><strong>ROM:</strong> {selectedPlan.rom}</div>
                  <div><strong>Base Price:</strong> ₹{selectedPlan.price}/month</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assign to Customer *</label>
                <select 
                  className="form-select" 
                  value={customerId} 
                  onChange={(e) => setCustomerId(e.target.value)} 
                  required
                >
                  <option value="">Select customer...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Billing Duration</label>
                <select 
                  className="form-select" 
                  value={billingCycle} 
                  onChange={(e) => setBillingCycle(e.target.value)}
                >
                  <option value="1">1 Month (Standard)</option>
                  <option value="3">3 Months (Quarterly)</option>
                  <option value="6">6 Months (Semi-Annual)</option>
                  <option value="12">12 Months (Annual - 10% Off)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Gateway Mode</label>
                <select 
                  className="form-select" 
                  value={paymentMode} 
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                  <option>Credit Card</option>
                  <option>Cash</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "14px", marginTop: "8px" }}>
                <span style={{ fontWeight: "700" }}>Total Cost:</span>
                <span style={{ fontWeight: "800", color: "var(--success)", fontSize: "18px" }}>
                  ₹{(selectedPlan.price * Number(billingCycle)).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <LuCheck size={16} /> Confirm Order
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
