import React, { useState, useEffect } from 'react';
import '../styles/Login.css';

// Helper for strength logic (Mirrors your registration form)
function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score === 0) return { label: '', level: 0 };
  if (score === 1) return { label: 'Weak', level: 1 };
  if (score === 2) return { label: 'Okay', level: 2 };
  if (score === 3) return { label: 'Good', level: 3 };
  return { label: 'Strong', level: 4 };
}

export default function SetPasswordOverlay({ isOpen, onSuccess }) {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [strength, setStrength] = useState({ label: '', level: 0 });

  useEffect(() => {
    setStrength(getPasswordStrength(password));
  }, [password]);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setStatus('loading');

    try {
      // ✅ Extract CSRF token to authorize the POST request
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1];

      const res = await fetch('/api/me/set-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken, // ✅ Required for Django POST
        },
        body: JSON.stringify({ password }),
        credentials: 'include', // ✅ Ensures session cookies are sent
      });

      const data = await res.json();
      if (data.ok) {
        setStatus('success');
        // Transition back after showing the emerald state
        setTimeout(() => onSuccess(true), 1500);
      } else {
        throw new Error(data.error || 'Update failed');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='modal-overlay'>
      <div className='form-container' onClick={(e) => e.stopPropagation()}>
        <h1 className='kiosk-title'>SECURE ACCOUNT</h1>
        <p
          style={{
            textAlign: 'center',
            marginBottom: '1.5rem',
            color: '#475569',
            fontSize: '0.95rem',
            lineHeight: '1.4',
          }}
        >
          Please set a permanent password. <br />
          <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
            Requirement: At least 8 characters, including one capital letter,
            one number, and one special symbol.
          </span>
        </p>

        <form onSubmit={handleSetPassword}>
          <div className='form-group'>
            <label className='form-label'>New Password</label>
            <input
              type='password'
              className='input-field'
              placeholder='••••••••'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />

            {/* ✅ Live Strength Meter */}
            {password && (
              <div
                className='pw-strength-container'
                style={{ marginTop: '10px' }}
              >
                <div className={`pw-strength-bar level-${strength.level}`} />
                <span className='pw-strength-label'>{strength.label}</span>
              </div>
            )}

            {status === 'error' && (
              <div
                className='inline-error'
                style={{
                  color: '#ef4444',
                  fontSize: '0.8rem',
                  marginTop: '5px',
                }}
              >
                {errorMsg}
              </div>
            )}
          </div>

          <button
            type='submit'
            className={`auth-button smart-kinetic-btn ${status}`}
            disabled={strength.level < 4}
            style={{ minHeight: '60px', marginTop: '1.5rem', width: '100%' }}
          >
            <div
              className={`status-layer idle ${
                status === 'idle' ? 'active' : ''
              }`}
            >
              SAVE PASSWORD
            </div>
            <div
              className={`status-layer loading ${
                status === 'loading' ? 'active' : ''
              }`}
            >
              <span className='galactic-spinner'></span> UPDATING...
            </div>
            <div
              className={`status-layer success ${
                status === 'success' ? 'active' : ''
              }`}
            >
              <span className='checkmark-kinetic'>✓</span> SAVED
            </div>
            <div
              className={`status-layer error ${
                status === 'error' ? 'active' : ''
              }`}
            >
              <span className='error-cross'>✕</span> TRY AGAIN
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}
