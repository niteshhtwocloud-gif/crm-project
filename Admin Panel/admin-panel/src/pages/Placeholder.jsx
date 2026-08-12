import React from 'react';

export default function Placeholder({ title }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e8edf5',
        borderRadius: 16,
        boxShadow: '0 10px 35px rgba(15,23,42,.06)',
        padding: '60px 30px',
        textAlign: 'center',
        color: '#64748b',
      }}
    >
      <h2 style={{ color: '#1e293b', marginBottom: 10, fontSize: 20 }}>{title}</h2>
      <p style={{ fontSize: 14 }}>
        This section is under construction. Wire it up to your API to bring it to life.
      </p>
    </div>
  );
}
