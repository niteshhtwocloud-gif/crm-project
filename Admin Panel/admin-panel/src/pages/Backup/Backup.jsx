import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { FiDownloadCloud, FiServer } from 'react-icons/fi';
import '../PagesCommon.css';

export default function Backup() {
  const { backups, triggerBackup } = useData();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleRunBackup = () => {
    if (running) return;
    setRunning(true);
    setProgress(0);

    triggerBackup((prog) => {
      setProgress(prog);
      if (prog >= 100) {
        setTimeout(() => {
          setRunning(false);
          setProgress(0);
        }, 600);
      }
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>System Backups &amp; Disaster Recovery</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Store backups off-site on secure S3 targets and trigger manual snapshots.
          </p>
        </div>
        <button
          className="action-btn"
          onClick={handleRunBackup}
          disabled={running}
          style={{
            background: running ? 'var(--text-secondary)' : undefined,
            boxShadow: running ? 'none' : undefined,
            cursor: running ? 'not-allowed' : 'pointer',
          }}
        >
          <FiDownloadCloud /> {running ? 'Backing Up...' : 'Run Backup Now'}
        </button>
      </div>

      {running && (
        <div
          className="data-card"
          style={{
            padding: '24px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiServer className="spin-icon" style={{ animation: 'spin 2s linear infinite' }} /> Generating database snapshot dump...
            </span>
            <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>{progress}%</strong>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(95deg, var(--primary), var(--primary-dark))',
                transition: 'width 0.15s ease-out',
              }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="data-card">
        <div className="table-responsive">
          <table className="h2-table">
            <thead>
              <tr>
                <th>Backup File Identifier</th>
                <th>Storage Size</th>
                <th>Snapshot Timestamp</th>
                <th>Validation Status</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id}>
                  <td className="td-strong" style={{ fontFamily: 'monospace' }}>{b.filename}</td>
                  <td>{b.size}</td>
                  <td>{b.date}</td>
                  <td>
                    <span className="badge badge-active" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}>
                      {b.status}
                    </span>
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
