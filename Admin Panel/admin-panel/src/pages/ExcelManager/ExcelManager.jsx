import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { FiUpload, FiDownload, FiCheckCircle, FiDatabase, FiFileText } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toISODate, calculateExpiryDate, calculateDaysLeft } from '../../utils/dateUtils';
import '../PagesCommon.css';
import './ExcelManager.css';

export default function ExcelManagerPage() {
  const { customers, addCustomer, invoices } = useData();
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [committed, setCommitted] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    if (!file) return;
    setImporting(true);
    setProgress(0);
    setPreviewRows([]);
    setCommitted(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });

        let p = 0;
        const interval = setInterval(() => {
          p += 20;
          setProgress(p);
          if (p >= 100) {
            clearInterval(interval);
            setImporting(false);
            
            const parsed = json.map((row, idx) => {
              const creationDate = toISODate(row.CreationDate || row.Creation || row['Creation Date'] || row.LoginDate || row['Login Date'] || row.StartDate) || new Date().toISOString().slice(0, 10);
              const period = row.Period || row.period || row.Duration || '';
              const expiryDate = calculateExpiryDate(creationDate, period);
              const daysLeft = calculateDaysLeft(expiryDate);

              return {
                id: idx + 1,
                name: row.CustomerName || row.Name || row['Customer/Company Name'] || 'Unnamed Customer',
                email: row.Email || row['Email Id'] || 'no-email@example.com',
                phone: row.Phone || row.Mobile || '+91 98765 00000',
                status: row.Status || 'Active',
                creationDate,
                period,
                expiryDate,
                daysLeft
              };
            });
            setPreviewRows(parsed);
          }
        }, 100);
      } catch (err) {
        setImporting(false);
        alert('Could not read that Excel file. Please upload a valid .xlsx or .xls file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleCommit = () => {
    if (previewRows.length === 0) return;
    previewRows.forEach(row => {
      addCustomer({
        name: row.name,
        email: row.email,
        phone: row.phone,
        status: row.status,
        creationDate: row.creationDate,
        loginDate: row.creationDate,
        period: row.period,
        expiryDate: row.expiryDate,
        daysLeft: row.daysLeft
      });
    });
    setPreviewRows([]);
    setCommitted(true);
    setTimeout(() => setCommitted(false), 4000);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { CustomerName: 'John Doe', Email: 'john@example.com', Phone: '+91 98765 43210', Status: 'Active' },
      { CustomerName: 'Jane Smith', Email: 'jane@example.com', Phone: '+91 98765 43211', Status: 'Inactive' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'h2-bulk-customer-template.xlsx');
  };

  const exportCustomers = () => {
    const dataToExport = customers.map(c => ({
      ID: c.id,
      CustomerName: c.name,
      Email: c.email,
      Phone: c.phone,
      Status: c.status
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'h2-active-customers.xlsx');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Bulk Excel Manager</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Bulk import client records or export cloud solutions billing tables into spreadsheets.
          </p>
        </div>
      </div>

      <div className="excel-page-layout">
        <div className="excel-panel-left">
          <div className="data-card excel-upload-card">
            <h3>Import Customer Spreadsheets</h3>
            <p className="upload-subtitle">Drag and drop your customer spreadsheet below or select from files</p>

            <form
              className={`drag-drop-zone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <FiUpload size={32} className="upload-icon-arrow" />
              <p className="drag-text">Drag & drop your Excel file here or click to browse</p>
              <p className="drag-hint">Supports .xlsx, .xls, and .csv files</p>
            </form>

            {importing && (
              <div className="upload-progress-wrapper">
                <div className="progress-bar-container"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                <span>Uploading spreadsheet: {progress}%</span>
              </div>
            )}

            {committed && (
              <div className="commit-success-banner">
                <FiCheckCircle size={16} />
                <span>Spreadsheet committed to system database successfully!</span>
              </div>
            )}

            <div className="template-download-card">
              <div className="template-info">
                <FiFileText size={18} />
                <div>
                  <h4>Bulk Template Format</h4>
                  <p>Standardized column headers: CustomerName, Email, Phone, Status</p>
                </div>
              </div>
              <button className="template-btn-download" onClick={downloadTemplate}>
                <FiDownload /> Download Template
              </button>
            </div>
          </div>
        </div>

        <div className="excel-panel-right">
          <div className="data-card export-actions-card">
            <h3>Database Export Hub</h3>
            <p className="export-subtitle">Download active collections tables or client lists in XLSX format</p>
            <div className="export-buttons-grid">
              <button className="export-grid-btn" onClick={exportCustomers}>
                <FiDatabase size={16} />
                <div>
                  <h4>Export Customers</h4>
                  <p>Export all registered accounts</p>
                </div>
              </button>
              <button
                className="export-grid-btn"
                onClick={() => {
                  const ws = XLSX.utils.json_to_sheet(invoices);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
                  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                  saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'h2-invoices.xlsx');
                }}
              >
                <FiFileText size={16} />
                <div>
                  <h4>Export Invoices</h4>
                  <p>Export all billing statements</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {previewRows.length > 0 && (
        <div className="data-card spreadsheet-preview-card">
          <div className="preview-header-row">
            <div>
              <h3>Spreadsheet Data Preview</h3>
              <p>Verify rows before committing them to the live customer database.</p>
            </div>
            <button className="btn-commit" onClick={handleCommit}>
              <FiCheckCircle /> Commit {previewRows.length} Rows to DB
            </button>
          </div>

          <div className="table-responsive">
            <table className="h2-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer Name</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td className="td-strong">{row.name}</td>
                    <td>{row.email}</td>
                    <td>{row.phone}</td>
                    <td>
                      <span className={`status-badge badge-${row.status === 'Active' ? 'success' : 'danger'}`}>
                        {row.status}
                      </span>
                    </td>
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
