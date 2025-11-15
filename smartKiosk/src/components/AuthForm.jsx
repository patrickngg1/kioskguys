import React, { useState } from 'react';
import { loginWithSession, registerWithSession } from '../api/authApi';
import AuthToast from './AuthToast';

/* Helpers */
function validateEmailDomain(email) {
  const domain = email.substring(email.lastIndexOf('@'));
  return domain === '@mavs.uta.edu' || domain === '@uta.edu';
}

function validatePassword(password) {
  if (password.length < 8)
    return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password))
    return 'Password must contain an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain a number.';
  return null;
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  inputClass = 'input-field',
  autoComplete,
}) {
  const [show, setShow] = useState(false);
  return (
    <div className='input-wrap'>
      <input
        className={`${inputClass} with-eye`}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
      />

      <button
        type='button'
        className={`eye-btn ${show ? 'is-showing' : ''}`}
        onClick={() => setShow((s) => !s)}
      />
    </div>
  );
}

export default function AuthForm({ onLoginSuccess }) {
  const [view, setView] = useState('login');

  const [toast, setToast] = useState(null);
  const showToast = (type, message) => setToast({ type, message });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleLogin(e) {
    e.preventDefault();

    try {
      const user = await loginWithSession(email, password);
      showToast('success', 'Welcome back! Redirecting…');

      setTimeout(() => {
        onLoginSuccess?.(user);
      }, 900);
    } catch (err) {
      showToast(
        'error',
        err.message.includes('Failed to fetch')
          ? 'Server unreachable. Try again.'
          : 'Invalid email or password.'
      );
    }
  }

  async function handleRegister(e) {
    e.preventDefault();

    // 1️⃣ Full Name required
    if (!fullName.trim()) {
      showToast('error', 'Please enter your full name.');
      return;
    }

    // 2️⃣ Email required
    if (!email.trim()) {
      showToast('error', 'Please enter your UTA email.');
      return;
    }

    // 3️⃣ Email domain check
    if (!validateEmailDomain(email)) {
      showToast('error', 'Use a valid UTA or Mavs email.');
      return;
    }

    // 4️⃣ Password required
    if (!password) {
      showToast('error', 'Please enter a password.');
      return;
    }

    // 5️⃣ Password confirm required
    if (!confirmPassword) {
      showToast('error', 'Please confirm your password.');
      return;
    }

    // 6️⃣ Password match
    if (password !== confirmPassword) {
      showToast('error', 'Passwords do not match.');
      return;
    }

    // 7️⃣ Password rules
    const pwErr = validatePassword(password);
    if (pwErr) {
      showToast('error', pwErr);
      return;
    }

    // 8️⃣ Attempt registration
    try {
      await registerWithSession(email, password, fullName);

      showToast('success', 'Account created! Please sign in.');
      setView('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(
        'error',
        err?.message?.includes('already')
          ? 'This email is already registered.'
          : 'Registration failed.'
      );
    }
  }

  return (
    <div id='auth-container' className='form-container'>
      {/* ===== 1. TOAST & BLUR OVERLAY ===== */}
      {/* These are now rendered on top when 'toast' exists */}
      {toast && (
        <>
          {/* This div is the blur/darken effect */}
          <div className='auth-blur-overlay' />

          {/* This div centers the toast */}
          <div className='auth-toast-center'>
            <AuthToast
              type={toast.type}
              message={toast.message}
              onClose={() => setToast(null)}
            />
          </div>
        </>
      )}

      {/* ===== 2. CARD CONTENT ===== */}
      {/* This new wrapper gets blurred when the toast is active */}
      <div className={toast ? 'blurred-card' : ''}>
        <h1 className='kiosk-title'>KIOSK ACCESS</h1>

        <div className='tab-bar'>
          <button
            className={`tab-button ${view === 'login' ? 'active' : ''}`}
            onClick={() => setView('login')}
          >
            Sign In
          </button>

          <button
            className={`tab-button ${view === 'register' ? 'active' : ''}`}
            onClick={() => setView('register')}
          >
            Sign Up
          </button>
        </div>

        <div className='form-body'>
          {view === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className='form-group'>
                <label>Email</label>
                <input
                  className='input-field'
                  type='email'
                  placeholder='email@uta.edu'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className='form-group'>
                <label>Password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='Enter your password'
                  inputClass='input-field'
                  autoComplete='current-password'
                />
              </div>

              <button className='auth-button'>Sign In</button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className='form-group'>
                <label>Full Name</label>
                <input
                  className='input-field'
                  type='text'
                  placeholder='Jane Doe'
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className='form-group'>
                <label>UTA Email</label>
                <input
                  className='input-field'
                  type='email'
                  placeholder='email@mavs.uta.edu'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className='form-group'>
                <label>Password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='Min. 8 characters, 1 uppercase, 1 number'
                  inputClass='input-field'
                  autoComplete='new-password'
                />
              </div>

              <div className='form-group'>
                <label>Confirm Password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder='Confirm your password'
                  inputClass='input-field'
                  autoComplete='new-password'
                />
              </div>

              <button className='auth-button'>Register</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
