import React, { useState } from 'react';
import CardSwipeModal from './CardSwipeModal';
import { createPortal } from 'react-dom';

import {
  loginWithSession,
  registerWithSession,
  requestPasswordReset,
} from '../api/authApi';
import AuthToast from './AuthToast';

// --- HELPERS ---
function validateEmailDomain(email) {
  const v = email.toLowerCase();
  const domain = v.substring(v.lastIndexOf('@'));
  return domain === '@mavs.uta.edu' || domain === '@uta.edu';
}

function validatePassword(password) {
  if (password.length < 8)
    return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password))
    return 'Password must contain an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain a number.';
  if (!/[^A-Za-z0-9]/.test(password))
    return 'Password must contain a special character.';
  return null;
}

function formatFullName(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

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

function PasswordInput({
  value,
  onChange,
  onBlur,
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
        onBlur={onBlur}
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

export default function AuthForm({ onLoginSuccess, swipeState }) {
  const [view, setView] = useState('login');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetStatus, setResetStatus] = useState('idle');

  const [toast, setToast] = useState(null);
  const showToast = (type, message) => setToast({ type, message });

  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardString, setCardString] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loginEmailError, setLoginEmailError] = useState('');
  const [loginStatus, setLoginStatus] = useState('idle');
  const [registerStatus, setRegisterStatus] = useState('idle');
  const [swipeBtnState, setSwipeBtnState] = useState('idle');

  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [shake, setShake] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    label: '',
    level: 0,
  });

  // 🔹 VALIDATION LOGIC
  const validateFullNameLive = (v) => {
    if (!v.trim()) return 'Full name is required.';
    if (v.trim().split(/\s+/).length < 2)
      return 'Enter your first and last name.';
    return '';
  };

  const validateEmailLive = (v) => {
    const val = v.trim().toLowerCase();
    if (!val) return 'Email is required.';
    if (!validateEmailDomain(val)) return 'Must be @mavs.uta.edu or @uta.edu';
    return '';
  };

  const validatePasswordLive = (v) => {
    if (!v) return 'Password required.';
    return validatePassword(v) || '';
  };

  const validateConfirmPasswordLive = (v, pwd) => {
    if (!v) return 'Confirm password.';
    if (v !== pwd) return 'Passwords do not match.';
    return '';
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  // --- HANDLERS ---
  async function handleLogin(e) {
    e.preventDefault();
    if (loginStatus !== 'idle') return;

    const emailErr = validateEmailLive(email);
    if (emailErr || !password) {
      setLoginEmailError(emailErr);
      setLoginStatus('error');
      triggerShake();
      setTimeout(() => setLoginStatus('idle'), 2000);
      return;
    }

    setLoginStatus('loading');
    try {
      const response = await loginWithSession(
        email.trim().toLowerCase(),
        password.trim()
      );
      setLoginStatus('success');
      setTimeout(() => onLoginSuccess?.(response), 1500);
    } catch (err) {
      setLoginStatus('error');
      triggerShake();
      setTimeout(() => setLoginStatus('idle'), 2500);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (registerStatus !== 'idle') return;

    // Force validation on all fields
    const fNameErr = validateFullNameLive(fullName);
    const mEmailErr = validateEmailLive(email);
    const pwdErr = validatePasswordLive(password);
    const confErr = validateConfirmPasswordLive(confirmPassword, password);

    setErrors({
      fullName: fNameErr,
      email: mEmailErr,
      password: pwdErr,
      confirmPassword: confErr,
    });

    if (fNameErr || mEmailErr || pwdErr || confErr) {
      setRegisterStatus('error');
      triggerShake();
      setTimeout(() => setRegisterStatus('idle'), 2000);
      return;
    }

    setRegisterStatus('loading');
    try {
      const result = await registerWithSession(
        fullName,
        email.trim().toLowerCase(),
        password,
        cardString
      );
      if (result && result.error) {
        showToast('error', result.error);
        setRegisterStatus('error');
        triggerShake();
        setTimeout(() => setRegisterStatus('idle'), 2500);
        return;
      }
      setRegisterStatus('success');
      setTimeout(() => {
        setView('login');
        setRegisterStatus('idle');
        setPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err) {
      setRegisterStatus('error');
      triggerShake();
      setTimeout(() => setRegisterStatus('idle'), 2500);
    }
  }

  const getScannerClass = () => {
    if (!swipeState) return '';
    return `scanner-${swipeState.status}`;
  };

  return (
    <div id='auth-container' className='form-container'>
      {toast && (
        <>
          <div className='auth-blur-overlay' />
          <div className='auth-toast-center'>
            <AuthToast
              type={toast.type}
              message={toast.message}
              onClose={() => setToast(null)}
            />
          </div>
        </>
      )}

      <div className={toast ? 'blurred-card' : ''}>
        <h1 className='kiosk-title'>KIOSK ACCESS</h1>

        {!resetMode && (
          <div className='tab-bar'>
            <button
              type='button'
              className={`tab-button ${view === 'login' ? 'active' : ''}`}
              onClick={() => setView('login')}
            >
              SIGN IN
            </button>
            <button
              type='button'
              className={`tab-button ${view === 'register' ? 'active' : ''}`}
              onClick={() => setView('register')}
            >
              SIGN UP
            </button>
          </div>
        )}

        <div className={`form-body ${shake ? 'shake' : ''}`}>
          {resetMode ? (
            <form onSubmit={handleLogin}>
              <div className='form-group'>
                <label>UTA Email</label>
                <input
                  className='input-field'
                  type='email'
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setLoginEmailError(validateEmailLive(e.target.value));
                  }}
                />
                {loginEmailError && (
                  <div className='inline-error'>{loginEmailError}</div>
                )}
              </div>
              <button
                className={`auth-button smart-kinetic-btn ${resetStatus}`}
                style={{ minHeight: '60px' }}
              >
                <div
                  className={`status-layer idle ${
                    resetStatus === 'idle' ? 'active' : ''
                  }`}
                >
                  SEND RESET CODE
                </div>
              </button>
            </form>
          ) : view === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className='form-group'>
                <label>Email</label>
                <div className='input-check-wrap'>
                  <input
                    className='input-field'
                    type='email'
                    placeholder='email@uta.edu'
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (loginEmailError)
                        setLoginEmailError(validateEmailLive(e.target.value));
                    }}
                    onBlur={() => setLoginEmailError(validateEmailLive(email))}
                  />
                  {/* NO TICK ON LOGIN FORM AS REQUESTED */}
                </div>
                {loginEmailError && (
                  <div className='inline-error'>{loginEmailError}</div>
                )}
              </div>

              <div className='form-group'>
                <label>
                  {showCodeInput ? 'Enter 6-Digit Code' : 'Password'}
                </label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={showCodeInput ? '123456' : 'Enter your password'}
                />
              </div>

              <button
                className={`auth-button smart-kinetic-btn ${loginStatus}`}
                style={{ position: 'relative', minHeight: '60px' }}
              >
                <div
                  className={`status-layer idle ${
                    loginStatus === 'idle' ? 'active' : ''
                  }`}
                >
                  {showCodeInput ? 'VERIFY CODE' : 'SIGN IN'}
                </div>
                <div
                  className={`status-layer loading ${
                    loginStatus === 'loading' ? 'active' : ''
                  }`}
                >
                  <span className='galactic-spinner'></span>ENCRYPTING...
                </div>
                <div
                  className={`status-layer success ${
                    loginStatus === 'success' ? 'active' : ''
                  }`}
                >
                  <span className='checkmark-kinetic'>✓</span>IDENTITY SECURED
                </div>
                <div
                  className={`status-layer error ${
                    loginStatus === 'error' ? 'active' : ''
                  }`}
                >
                  <span className='error-cross'>✕</span>DENIED
                </div>
              </button>

              <div className='swipe-section-premium'>
                <div className='premium-divider'>
                  <span className='divider-line'></span>
                  <span className='divider-text'>ALTERNATIVE LOGIN</span>
                  <span className='divider-line'></span>
                </div>
                <div className={`glass-scanner-card ${getScannerClass()}`}>
                  <div className='scanner-beam'></div>
                  <div className='scanner-content'>
                    <div className='scanner-icon'>
                      <div className='card-shape'>
                        <div className='mag-strip'></div>
                        <div className='scan-line'></div>
                      </div>
                    </div>
                    <div className='scanner-text-group'>
                      <span className='scanner-label'>Swipe Access</span>
                      <span className='scanner-status'>
                        {swipeState ? swipeState.message : 'Reader Ready...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className='form-group'>
                <label>Full Name</label>
                <div
                  className={`input-check-wrap ${
                    !validateFullNameLive(fullName) && fullName.trim()
                      ? 'valid-field'
                      : ''
                  }`}
                >
                  <input
                    className='input-field'
                    type='text'
                    placeholder='Jane Doe'
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setErrors((prev) => ({
                        ...prev,
                        fullName: validateFullNameLive(e.target.value),
                      }));
                    }}
                    onBlur={() => setFullName(formatFullName(fullName))}
                  />
                  {!validateFullNameLive(fullName) && fullName.trim() && (
                    <span className='checkmark'>✔</span>
                  )}
                </div>
                {errors.fullName && (
                  <div className='inline-error'>{errors.fullName}</div>
                )}
              </div>

              <div className='form-group'>
                <label>UTA Email</label>
                <div
                  className={`input-check-wrap ${
                    !validateEmailLive(email) && email.trim()
                      ? 'valid-field'
                      : ''
                  }`}
                >
                  <input
                    className='input-field'
                    type='email'
                    placeholder='email@mavs.uta.edu'
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((prev) => ({
                        ...prev,
                        email: validateEmailLive(e.target.value),
                      }));
                    }}
                  />
                  {!validateEmailLive(email) && email.trim() && (
                    <span className='checkmark'>✔</span>
                  )}
                </div>
                {errors.email && (
                  <div className='inline-error'>{errors.email}</div>
                )}
              </div>

              <div className='form-group'>
                <label>Password</label>
                <div
                  className={`input-check-wrap ${
                    !validatePasswordLive(password) && password
                      ? 'valid-field'
                      : ''
                  }`}
                >
                  <PasswordInput
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordStrength(getPasswordStrength(e.target.value));
                      setErrors((prev) => ({
                        ...prev,
                        password: validatePasswordLive(e.target.value),
                      }));
                    }}
                  />
                  {!validatePasswordLive(password) && password && (
                    <span className='checkmark'>✔</span>
                  )}
                </div>
                {errors.password && (
                  <div className='inline-error'>{errors.password}</div>
                )}
                {password && (
                  <div className='pw-strength-container'>
                    <div
                      className={`pw-strength-bar level-${passwordStrength.level}`}
                    />
                    <span className='pw-strength-label'>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className='form-group'>
                <label>Confirm Password</label>
                <div
                  className={`input-check-wrap ${
                    !validateConfirmPasswordLive(confirmPassword, password) &&
                    confirmPassword
                      ? 'valid-field'
                      : ''
                  }`}
                >
                  <PasswordInput
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors((prev) => ({
                        ...prev,
                        confirmPassword: validateConfirmPasswordLive(
                          e.target.value,
                          password
                        ),
                      }));
                    }}
                  />
                  {!validateConfirmPasswordLive(confirmPassword, password) &&
                    confirmPassword && <span className='checkmark'>✔</span>}
                </div>
                {errors.confirmPassword && (
                  <div className='inline-error'>{errors.confirmPassword}</div>
                )}
              </div>

              <div className='form-group' style={{ marginTop: '1.5rem' }}>
                <label>MavID Card (optional)</label>
                <button
                  type='button'
                  className={`auth-button smart-kinetic-btn ${swipeBtnState}`}
                  style={{ minHeight: '56px' }}
                  onClick={() => setCardModalOpen(true)}
                >
                  <div
                    className={`status-layer idle ${
                      swipeBtnState === 'idle' ? 'active' : ''
                    }`}
                  >
                    {cardString ? 'CARD SCANNED' : 'CAPTURE MavID SWIPE'}
                  </div>
                  <div
                    className={`status-layer success ${
                      swipeBtnState === 'success' ? 'active' : ''
                    }`}
                  >
                    <span className='checkmark-kinetic'>✓</span>MavID LINKED
                  </div>
                </button>
              </div>

              <button
                className={`auth-button smart-kinetic-btn ${registerStatus}`}
                style={{ minHeight: '60px', marginTop: '1.5rem' }}
              >
                <div
                  className={`status-layer idle ${
                    registerStatus === 'idle' ? 'active' : ''
                  }`}
                >
                  CREATE ACCOUNT
                </div>
                <div
                  className={`status-layer loading ${
                    registerStatus === 'loading' ? 'active' : ''
                  }`}
                >
                  <span className='galactic-spinner'></span>SYNCING...
                </div>
                <div
                  className={`status-layer success ${
                    registerStatus === 'success' ? 'active' : ''
                  }`}
                >
                  <span className='checkmark-kinetic'>✓</span>SECURED
                </div>
                <div
                  className={`status-layer error ${
                    registerStatus === 'error' ? 'active' : ''
                  }`}
                >
                  <span className='error-cross'>✕</span>FAILED
                </div>
              </button>
            </form>
          )}

          {cardModalOpen &&
            createPortal(
              <CardSwipeModal
                isOpen={cardModalOpen}
                onClose={() => setCardModalOpen(false)}
                onCapture={async (s) => {
                  setSwipeBtnState('loading');
                  setCardString(s);
                  setTimeout(() => {
                    setSwipeBtnState('success');
                    setCardModalOpen(false);
                  }, 800);
                  return true;
                }}
              />,
              document.body
            )}
        </div>
      </div>
    </div>
  );
}
