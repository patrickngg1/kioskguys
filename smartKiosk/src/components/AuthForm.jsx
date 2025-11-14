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

/* Password Input with Simple Eye (CSS driven) */
function PasswordInput({
  value,
  onChange,
  placeholder = 'Enter your password',
  inputClass = 'input-field',
  autoComplete = 'current-password',
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

      {/* Empty button — icons handled entirely by CSS */}
      <button
        type='button'
        className={`eye-btn ${show ? 'is-showing' : ''}`}
        onClick={() => setShow((prev) => !prev)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
      />
    </div>
  );
}

export default function AuthForm({ currentView, setView, onLoginSuccess }) {
  const [view, setLocalView] = useState(currentView ?? 'login');
  const viewSetter = setView ?? setLocalView;

  const [toast, setToast] = useState(null);
  const showToast = (type, message) => setToast({ type, message });

  // Shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register-specific
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  /* LOGIN */
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const user = await loginWithSession(email, password);

      showToast('success', 'Welcome back! Redirecting…');

      setTimeout(() => {
        onLoginSuccess?.(user);
      }, 1000);
    } catch (err) {
      const msg = err.message.includes('Failed to fetch')
        ? 'Server unreachable. Try again.'
        : 'Invalid email or password.';
      showToast('error', msg);
    }
  };

  /* REGISTER */
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateEmailDomain(email)) {
      showToast('error', 'Use a valid UTA or Mavs email.');
      return;
    }

    if (password !== confirmPassword) {
      showToast('error', 'Passwords do not match.');
      return;
    }

    const pwErr = validatePassword(password);
    if (pwErr) {
      showToast('error', pwErr);
      return;
    }

    try {
      await registerWithSession(email, password, fullName);

      // SUCCESS
      showToast('success', 'Account created successfully! Please sign in.');

      // Switch to login on success ONLY
      viewSetter('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      // FAILURE → Stay on Register view
      showToast(
        'error',
        err?.message?.includes('already')
          ? 'This email is already registered.'
          : 'Registration failed. Please try again.'
      );
    }
  };

  return (
    <div id='auth-container' className='form-container'>
      {toast && (
        <AuthToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <h1 className='kiosk-title'>KIOSK ACCESS</h1>

      <div className='tab-bar'>
        <button
          className={`tab-button ${view === 'login' ? 'active' : ''}`}
          onClick={() => viewSetter('login')}
        >
          Sign In
        </button>
        <button
          className={`tab-button ${view === 'register' ? 'active' : ''}`}
          onClick={() => viewSetter('register')}
        >
          Sign Up
        </button>
      </div>

      {/* FORM CONTENT */}
      <div className='form-body'>
        {/* LOGIN FORM */}
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
                autoComplete='username'
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

            <button className='auth-button' type='submit'>
              Sign In
            </button>
          </form>
        ) : (
          /* REGISTER FORM */
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

            <button className='auth-button' type='submit'>
              Register
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
