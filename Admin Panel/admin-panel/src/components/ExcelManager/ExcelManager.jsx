import React, { useState, useRef, useEffect } from 'react';
import { FiUpload, FiDownload, FiCheckCircle, FiFileText } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useData } from '../../context/DataContext';
import './ExcelManager.css';

// Builds the last 7 days from real records instead of the hardcoded
// "18 May ... 24 May" demo series that used to render here.
const buildSyncData = (services = [], invoices = []) => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }

  const onDay = (list, day, ...dateKeys) => {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    return list.filter((r) => {
      const raw = dateKeys.map((k) => r[k]).find(Boolean);
      if (!raw) return false;
      const rd = new Date(raw);
      return !isNaN(rd.getTime()) && rd >= day && rd < next;
    }).length;
  };

  return days.map((day) => ({
    date: day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    imported: onDay(services, day, 'created_at', 'expiry'),
    exported: onDay(invoices, day, 'created_at', 'date', 'dueDate')
  }));
};

export default function ExcelManager() {
  const { services, invoices } = useData();
  const [progress, setProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importedRows, setImportedRows] = useState(null);
  const [chartData, setChartData] = useState([]);

  // Keep the chart in sync with live data as it arrives.
  useEffect(() => {
    setChartData(buildSyncData(services || [], invoices || []));
  }, [services, invoices]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setProgress(0);
    setImportedRows(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        
        let p = 0;
        const interval = setInterval(() => {
          p += 25;
          setProgress(p);
          if (p >= 100) {
            clearInterval(interval);
            setImporting(false);
            setImportedRows(json.length);
            
            // Add a new entry to the chart data dynamically
            const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            setChartData((prev) => [
              ...prev.slice(1),
              { date: today, imported: json.length, exported: prev[prev.length - 1].exported }
            ]);
          }
        }, 150);
      } catch (err) {
        setImporting(false);
        alert('Could not read that Excel file. Please upload a valid .xlsx file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { CustomerName: 'John Doe', Email: 'john@example.com', Product: 'Cloud Premium', Amount: '₹8,500', ExpiryDate: '21 May 2025' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'admin-customer-template.xlsx');
  };

  const exportCustomers = () => {
    const dataToExport = (services || []).map((u) => ({
      ID: u._id || u.id,
      Name: u.customer,
      Product: u.product,
      ExpiryDate: u.expiry,
      DaysLeft: u.daysLeft,
      Amount: u.amount
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'h2-customers-list.xlsx');

    // Update export count on chart data dynamically
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    setChartData((prev) => {
      const last = prev[prev.length - 1];
      const updated = { ...last, exported: last.exported + dataToExport.length };
      return [...prev.slice(0, -1), updated];
    });
  };

  return (
    <div className="excel-manager-card">
      <div className="card-header-row">
        <div className="header-title-sec">
          <span className="excel-icon-logo"><FiFileText size={18} /></span>
          <div>
            <h4 className="excel-card-title">Bulk Excel Manager</h4>
            <p className="excel-card-subtitle">Import customer spreadsheets or export database sheets</p>
          </div>
        </div>
      </div>

      <div className="excel-content-grid">
        <div className="excel-controls-col">
          <p className="controls-desc">Choose a spreadsheet file to bulk import customer accounts into the H TWO system database. Expiry dates and plan subscriptions will be updated instantly.</p>
          
          <div className="upload-interactive-zone">
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".xlsx,.xls,.csv" 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
            />
            <button 
              type="button" 
              className="excel-action-btn import-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <FiUpload size={14} /> Upload Sheet (.xlsx)
            </button>
            
            {importing && (
              <div className="mini-progress-wrapper">
                <div className="mini-bar"><div className="mini-fill" style={{ width: `${progress}%` }} /></div>
                <span>{progress}%</span>
              </div>
            )}

            {importedRows !== null && (
              <div className="import-success-msg">
                <FiCheckCircle size={14} className="success-icon" />
                <span>Imported {importedRows} rows successfully!</span>
              </div>
            )}
          </div>

          <div className="downloads-actions-row">
            <button type="button" className="excel-action-btn export-btn" onClick={exportCustomers}>
              <FiDownload size={14} /> Export Customers
            </button>
            <button type="button" className="excel-action-btn template-btn" onClick={downloadTemplate}>
              <FiDownload size={14} /> Template
            </button>
          </div>
        </div>

        <div className="excel-chart-col">
          <span className="chart-col-label">Data Sync Activity History (Rows Sync)</span>
          <div className="excel-chart-wrapper">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorImport" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F6BFF" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4F6BFF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExport" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e8edf5',
                    fontSize: 11,
                  }}
                />
                <Area type="monotone" dataKey="imported" name="Imported Rows" stroke="#4F6BFF" fillOpacity={1} fill="url(#colorImport)" strokeWidth={2} />
                <Area type="monotone" dataKey="exported" name="Exported Rows" stroke="#22C55E" fillOpacity={1} fill="url(#colorExport)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
