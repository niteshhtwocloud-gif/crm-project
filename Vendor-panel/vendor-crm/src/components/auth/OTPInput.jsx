import React, { useRef } from 'react';

export default function OTPInput({ length = 6, otp, onOtpChange }) {
  const inputsRef = useRef([]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    onOtpChange(newOtp);

    if (value && index < length - 1) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, length);
    if (!/^\d+$/.test(pastedData)) return; 

    const newOtp = [...otp];
    pastedData.split('').forEach((char, i) => {
      newOtp[i] = char;
    });
    onOtpChange(newOtp);

    const focusIndex = Math.min(pastedData.length, length - 1);
    inputsRef.current[focusIndex].focus();
  };

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
      {otp.map((digit, index) => (
        <input
          key={index}
          type="text"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          ref={(el) => (inputsRef.current[index] = el)}
          style={{
            width: '45px',
            height: '50px',
            textAlign: 'center',
            fontSize: '20px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            outline: 'none'
          }}
        />
      ))}
    </div>
  );
}
