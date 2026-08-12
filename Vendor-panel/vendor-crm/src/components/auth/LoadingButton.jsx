import React from 'react';

export default function LoadingButton({ loading, text, loadingText, onClick, type = "submit", className = "submit-btn" }) {
  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={loading}
      style={
        loading
          ? { background: 'linear-gradient(135deg, rgba(79,216,255,0.5), rgba(79,216,255,0.2))', cursor: 'not-allowed' }
          : undefined
      }
    >
      {loading ? loadingText : text}
    </button>
  );
}
