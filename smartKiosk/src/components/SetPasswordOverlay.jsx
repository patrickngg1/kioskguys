// src/components/SetPasswordOverlay.jsx
import React, { useState, useMemo } from 'react';

// Helper to read csrftoken cookie
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Same password rules as your register form: length, upper, lower, digit, symbol
function validatePasswordRules(password) {
  const length = password.length >= 8;
  const upper = /[A-Z]/.test(password);
  const lower = /[a-z]/.test(password);
  const digit = /[0-9]/.test(password);
  const special = /[^A-Za-z0-9]/.test(password);

  return { length, upper, lower, digit, special };
}

// Small password input with eye icon, using the same CSS classes you already have
// in login.css: .input-wrap, .input-field.with-eye, .eye-btn
function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);

  return (
    <div className='input-wrap'>
      <input
        className='input-field with-eye'
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type='button'
        className={`eye-btn ${show ? 'is-showing' : ''}`}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
      />
    </div>
  );
}

export default function SetPasswordOverlay({
  isOpen,
  onSuccess,
  onRequestClose,
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(false);

  // Compute which rules are satisfied
  const rules = useMemo(() => validatePasswordRules(password), [password]);

  if (!isOpen) return null;

  const allPassed =
    rules.length && rules.upper && rules.lower && rules.digit && rules.special;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!password || !confirm) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (!allPassed) {
      setError('Please meet all password requirements before continuing.');
      return;
    }

    setSubmitting(true);

    try {
      const csrftoken = getCookie('csrftoken');

      const res = await fetch('/api/set-password/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrftoken ? { 'X-CSRFToken': csrftoken } : {}),
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      // Treat only actual failures as failures
      if (!data.ok) {
        setError(data.error || 'Unable to update password.');
        return;
      }

      // -------------------------
      //     SUCCESS PATH
      // -------------------------

      // Clear any old error
      setError('');

      // Show local toast
      setToast(true);

      // Auto-close toast after 1.5s, then notify Dashboard to close overlay
      setTimeout(() => {
        setToast(false);

        if (typeof onSuccess === 'function') {
          onSuccess(true);
        }
      }, 1500);
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  }

  function renderRule(label, passed) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.8rem',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            borderRadius: '999px',
            border: passed ? '1px solid #10b981' : '1px solid #9ca3af',
            backgroundColor: passed ? '#10b981' : 'transparent',
            color: passed ? '#ffffff' : 'transparent',
            fontSize: '0.65rem',
          }}
        >
          {passed ? '✓' : ''}
        </span>
        <span
          style={{
            color: passed ? '#374151' : '#6b7280',
          }}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999, // ⬅⬅⬅ MAXIMUM PRIORITY ABOVE HEADER
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '6rem',
        background:
          'radial-gradient(circle at top, rgba(15,23,42,0.6), rgba(15,23,42,0.9))',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      {/* Card reusing your glassmorphism auth styles */}
      <div
        className='form-container'
        style={{
          position: 'relative',
          width: 'clamp(400px, 32vw, 480px)',
          maxWidth: '520px',
          zIndex: 1000001,
        }}
      >
        {/* Optional close button (only when onRequestClose is provided and reset is not forced) */}
        {typeof onRequestClose === 'function' && (
          <button
            type='button'
            onClick={onRequestClose}
            aria-label='Close'
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              border: 'none',
              background: 'transparent',
              fontSize: '1.1rem',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            ✕
          </button>
        )}

        <h1 className='kiosk-title' style={{ marginBottom: '0.9rem' }}>
          Set Your Smart Kiosk Password
        </h1>

        <p
          style={{
            marginBottom: '1.1rem',
            fontSize: '0.9rem',
            lineHeight: 1.45,
            color: '#4b5563',
          }}
        >
          You just signed in using a six-digit code. To keep your account safe,
          choose a strong password you’ll use for future logins.
        </p>

        <form onSubmit={handleSubmit} className='form-body'>
          {/* New Password */}
          <div className='form-group'>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              New Password
            </label>
            <div
              className={`input-check-wrap ${
                allPassed && password ? 'valid-field' : ''
              }`}
            >
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='Create a strong password'
                autoComplete='new-password'
              />
              {allPassed && password && <span className='checkmark'>✔</span>}
            </div>
          </div>

          {/* Confirm Password */}
          <div className='form-group' style={{ marginTop: '0.9rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Confirm Password
            </label>
            <div
              className={`input-check-wrap ${
                confirm && password === confirm ? 'valid-field' : ''
              }`}
            >
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder='Re-enter your password'
                autoComplete='new-password'
              />
              {confirm && password === confirm && (
                <span className='checkmark'>✔</span>
              )}
            </div>
          </div>

          {/* Rules list */}
          <div
            style={{
              marginTop: '0.9rem',
              padding: '0.75rem 0.85rem',
              borderRadius: '0.75rem',
              background: 'rgba(249,250,251,0.9)',
              border: '1px solid rgba(209,213,219,0.9)',
              display: 'grid',
              gridTemplateColumns: '1fr',
              rowGap: '0.35rem',
            }}
          >
            {renderRule('At least 8 characters', rules.length)}
            {renderRule('One uppercase letter (A–Z)', rules.upper)}
            {renderRule('One lowercase letter (a–z)', rules.lower)}
            {renderRule('One number (0–9)', rules.digit)}
            {renderRule('One symbol (!@#$…)', rules.special)}
          </div>

          {/* Error message */}
          {error && (
            <div
              className='inline-error'
              style={{ marginTop: '0.8rem', lineHeight: 1.4 }}
            >
              {error}
            </div>
          )}

          {/* Save button */}
          <button
            type='submit'
            className='auth-button'
            disabled={submitting}
            style={{ marginTop: '1.3rem' }}
          >
            {submitting ? 'Saving…' : 'Save Password'}
          </button>

          <p
            style={{
              marginTop: '0.9rem',
              fontSize: '0.78rem',
              color: '#6b7280',
              lineHeight: 1.4,
            }}
          >
            You’ll use this password with your email the next time you log in.
            The 6-digit code is just for getting you in this time.
          </p>
        </form>

        {/* Local toast inside overlay */}
        {toast && (
          <div className='dash-toast-wrapper'>
            <div className='dash-toast-card success fade-in'>
              <div className='dash-toast-emoji'>✔</div>
              <div className='dash-toast-text'>
                Password updated successfully!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
