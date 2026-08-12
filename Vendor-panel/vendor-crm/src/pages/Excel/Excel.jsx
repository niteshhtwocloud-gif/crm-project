import { useState, useRef } from "react";
import { LuFileUp, LuFileDown, LuFileSpreadsheet, LuDownload } from "react-icons/lu";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useCRM } from "../../context/CRMContext";
import { useToast } from "../../context/ToastContext";
import { toISODate, calculateExpiryDate, calculateDaysLeft } from "../../utils/dateUtils";
import "./Excel.css";

export default function Excel() {
  const { users, setUsers, addNotification } = useCRM();
  const [progress, setProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setProgress(0);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });

        let p = 0;
        const timer = setInterval(() => {
          p += 20;
          setProgress(Math.min(p, 100));
          if (p >= 100) {
            clearInterval(timer);
            setImporting(false);

            // Map parsed json to user objects
            const newUsers = json.map((row, index) => {
              const uName = row.CustomerName || row.name || row["Customer Name"] || row["Customer/Company Name"] || row.Customer || "Imported Customer";
              const uEmail = row.Email || row.email || row["Email Id"] || "imported@email.com";
              const uMobile = String(row.Mobile || row.mobile || row.Phone || row.phone || "");
              const uService = row.Service || row.service || row["Product/Service"] || "Cloud Hosting";
              const uVendor = row.Vendor || row.vendor || row["Vendor Name"] || "CloudBase";
              const uUsername = row.Username || row.username || row["User Name"] || uEmail.split("@")[0];
              const uPassword = row.Password || row.password || "••••••••";
              const creationDate = toISODate(row.CreationDate || row.creationDate || row["Creation Date"] || row.LoginDate || row.loginDate || row["Login Date"]) || new Date().toISOString().slice(0, 10);
              const period = row.Period || row.period || "";
              const uExpDate = calculateExpiryDate(creationDate, period);
              const daysLeft = calculateDaysLeft(uExpDate);
              const uPayStatus = row.PaymentStatus || row.paymentStatus || "Paid";
              const uPending = Number(row.PendingAmount || row.pendingAmount || 0);

              return {
                id: Date.now() + index,
                name: uName,
                customerName: uName,
                email: uEmail,
                mobile: uMobile,
                vendor: uVendor,
                service: uService,
                productService: uService,
                username: uUsername,
                password: uPassword,
                loginDate: creationDate,
                creationDate: creationDate,
                period: period,
                expiryDate: uExpDate,
                daysLeft: daysLeft,
                paymentStatus: uPayStatus,
                pendingAmount: uPending,
                dueDate: row.DueDate || row.dueDate || uExpDate,
                remarks: row.Remarks || row.remarks || "Bulk Excel Import",
              };
            });

            setUsers(prev => [...newUsers, ...prev]);
            addNotification("success", `Bulk imported ${newUsers.length} customers from ${file.name}`, "System Messages");
            setPreview(newUsers.slice(0, 8));
            showToast(`Imported ${newUsers.length} rows from ${file.name}`);
          }
        }, 150);
      } catch (err) {
        setImporting(false);
        showToast("Could not read that file");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { CustomerName: "Jane Doe", Mobile: "9876543210", Email: "jane@gmail.com", Vendor: "CloudBase", Service: "Cloud Hosting", Username: "janedoe", Password: "Password123", ExpiryDate: "Jun 30, 2025", PaymentStatus: "Paid", PendingAmount: 0 },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "vendor-crm-template.xlsx");
    showToast("Template downloaded");
  };

  const exportUsers = () => {
    // Export raw users state from context
    const ws = XLSX.utils.json_to_sheet(users.map(u => ({
      ID: u.id,
      Name: u.name,
      Mobile: u.mobile,
      Email: u.email,
      Vendor: u.vendor,
      Service: u.service,
      Username: u.username,
      ExpiryDate: u.expiryDate,
      PaymentStatus: u.paymentStatus,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "vendor-crm-users.xlsx");
    showToast("Users exported successfully");
  };

  const exportReports = () => {
    // Export full data
    const ws = XLSX.utils.json_to_sheet(users);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Full Reports");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "vendor-crm-reports.xlsx");
    showToast("Full reports exported successfully");
  };

  return (
    <div className="excel-page">
      <div className="excel-grid">
        <div className="table-card excel-action-card">
          <div className="excel-icon import"><LuFileUp size={22} /></div>
          <h3 className="card-title">Import Excel</h3>
          <p className="excel-desc">Upload a .xlsx or .csv file to bulk import users and services.</p>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleFile} />
          <button className="excel-btn" onClick={() => fileInputRef.current.click()}>
            Choose File
          </button>
          {importing && (
            <div className="progress-wrap">
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <span className="progress-label">{progress}%</span>
            </div>
          )}
        </div>

        <div className="table-card excel-action-card">
          <div className="excel-icon template"><LuFileSpreadsheet size={22} /></div>
          <h3 className="card-title">Download Template</h3>
          <p className="excel-desc">Get the standard import template with the correct column headers.</p>
          <button className="excel-btn" onClick={downloadTemplate}>
            <LuDownload size={15} /> Download Template
          </button>
        </div>

        <div className="table-card excel-action-card">
          <div className="excel-icon export-users"><LuFileDown size={22} /></div>
          <h3 className="card-title">Export Users</h3>
          <p className="excel-desc">Download all recent users as an Excel spreadsheet.</p>
          <button className="excel-btn" onClick={exportUsers}>
            <LuDownload size={15} /> Export Users
          </button>
        </div>

        <div className="table-card excel-action-card">
          <div className="excel-icon export-reports"><LuFileDown size={22} /></div>
          <h3 className="card-title">Export Reports</h3>
          <p className="excel-desc">Download the full report dataset as an Excel spreadsheet.</p>
          <button className="excel-btn" onClick={exportReports}>
            <LuDownload size={15} /> Export Reports
          </button>
        </div>
      </div>

      {preview && (
        <div className="table-card preview-card">
          <h3 className="card-title">Import Preview (First 8 Rows)</h3>
          <div className="scroll-x">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Vendor</th>
                  <th>Service</th>
                  <th>Username</th>
                  <th>Expiry Date</th>
                  <th>Payment Status</th>
                  <th>Pending Amount</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.id}>
                    <td className="strong">{row.name}</td>
                    <td>{row.mobile}</td>
                    <td>{row.email}</td>
                    <td>{row.vendor}</td>
                    <td>{row.service}</td>
                    <td>{row.username}</td>
                    <td>{row.expiryDate}</td>
                    <td><span className={`badge badge-${row.paymentStatus.toLowerCase()}`}>{row.paymentStatus}</span></td>
                    <td>₹{Number(row.pendingAmount).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
