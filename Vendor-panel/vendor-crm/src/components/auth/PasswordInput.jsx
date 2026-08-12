import React, { useState } from 'react';

export default function PasswordInput({ id, label, placeholder, value, onChange, showStrength = false }) {
  const [showPassword, setShowPassword] = useState(false);

  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = showStrength ? calculateStrength(value) : 0;
  const strengthColors = ['#ff4d4d', '#ff944d', '#ffff4d', '#a6ff4d', '#4dff4d'];
  const strengthText = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          style={{ width: '100%', paddingRight: '40px' }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            padding: 0
          }}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>
      {showStrength && value.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '4px' }}>
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                style={{
                  flex: 1,
                  background: level <= strength ? strengthColors[strength - 1] : 'rgba(255,255,255,0.2)',
                  borderRadius: '2px',
                  transition: 'background 0.3s'
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: '12px', color: strengthColors[strength - 1], textAlign: 'right' }}>
            {strengthText[strength - 1] || 'Weak'}
          </div>
        </div>
      )}
    </div>
  );
}
