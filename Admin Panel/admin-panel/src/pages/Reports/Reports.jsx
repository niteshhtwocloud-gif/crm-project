import React from 'react';
import { useData } from '../../context/DataContext';
import '../PagesCommon.css';

export default function Reports() {
  const { aggregations, invoices, vendors, services } = useData();

  // Custom breakdowns
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCollections = invoices.reduce((sum, inv) => sum + inv.paid, 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.due, 0);

  const totalVendorBills = vendors.reduce((sum, v) => sum + v.totalPurchase, 0);
  const totalVendorPaid = vendors.reduce((sum, v) => sum + v.totalPaid, 0);
  const totalVendorPending = vendors.reduce((sum, v) => sum + v.pending, 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Business Financial Reports</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Comprehensive overview of revenue collections, vendor accounts and active subscription values.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Customer Accounts Overview */}
        <div className="data-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            Client Accounts Receivable
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Invoiced Amount</span>
              <strong style={{ color: 'var(--text-primary)' }}>₹{totalInvoiced.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Revenue Collections</span>
              <strong style={{ color: 'var(--success)' }}>₹{totalCollections.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Outstanding Dues</span>
              <strong style={{ color: 'var(--danger)' }}>₹{totalOutstanding.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Vendor Payables Overview */}
        <div className="data-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            Vendor Accounts Payable
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Procurement Volume</span>
              <strong style={{ color: 'var(--text-primary)' }}>₹{totalVendorBills.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Settled Payouts</span>
              <strong style={{ color: 'var(--primary)' }}>₹{totalVendorPaid.toLocaleString('en-IN')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Pending Vendor Dues</span>
              <strong style={{ color: 'var(--warning)' }}>₹{totalVendorPending.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>

        {/* Subscriptions Aggregates */}
        <div className="data-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
            Active Subscription Assets
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Active Licenses</span>
              <strong style={{ color: 'var(--text-primary)' }}>{services.length} subscriptions</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Monthly Subscription Value</span>
              <strong style={{ color: 'var(--purple)' }}>
                ₹{services.reduce((sum, s) => sum + s.amount, 0).toLocaleString('en-IN')}/mo
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Alerting Renewals (&lt;= 8 days)</span>
              <strong style={{ color: 'var(--danger)' }}>
                {aggregations.expiringServices} licenses
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="data-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          Detailed Invoice Summary Log
        </h3>
        <div className="table-responsive">
          <table className="h2-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Subtotal</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Fulfillment Split</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="td-strong">{inv.invoiceNo}</td>
                  <td>{inv.customer}</td>
                  <td>₹{inv.amount.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--success)' }}>₹{inv.paid.toLocaleString('en-IN')}</td>
                  <td style={{ color: inv.due > 0 ? 'var(--danger)' : 'inherit' }}>₹{inv.due.toLocaleString('en-IN')}</td>
                  <td>
                    {inv.amount === 0 ? '0%' : `${Math.round((inv.paid / inv.amount) * 100)}%`} collected
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
