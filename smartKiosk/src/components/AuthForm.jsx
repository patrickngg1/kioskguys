import React, { useState } from 'react';
import {
  loginWithSession,
  registerWithSession,
  requestPasswordReset, // 🔹 NEW helper
} from '../api/authApi';
import AuthToast from './AuthToast';

/* ===== Helpers ===== */
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

/* Password input with show/hide eye */
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
  const [view, setView] = useState('login'); // 'login' | 'register'
  const [resetMode, setResetMode] = useState(false); // 🔹 NEW: login vs reset-email mode

  const [toast, setToast] = useState(null);
  const showToast = (type, message) => setToast({ type, message });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  const [resetLoading, setResetLoading] = useState(false); // 🔹 NEW

  /* ===== Live validation helpers ===== */
  const validateFullNameLive = (value) => {
    const v = value.trim();
    if (!v) return 'Full name is required.';

    const parts = v.split(/\s+/);
    if (parts.length < 2) return 'Enter your first and last name.';

    for (const p of parts) {
      const cleaned = p.replace('.', '');
      if (cleaned.length < 2) return 'Each name must be at least 2 letters.';
    }
    return '';
  };

  const validateEmailLive = (value) => {
    const v = value.trim().toLowerCase();
    if (!v) return 'Email is required.';
    if (!validateEmailDomain(v)) return 'Must be @mavs.uta.edu or @uta.edu';
    return '';
  };

  const validatePasswordLive = (value) => {
    if (!value) return 'Password required.';
    const rule = validatePassword(value);
    return rule ? rule : '';
  };

  const validateConfirmPasswordLive = (value, pwd) => {
    if (!value) return 'Confirm password.';
    if (value !== pwd) return 'Passwords do not match.';
    return '';
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  /* Derived flag for Register button */
  const isRegisterValid =
    fullName.trim() &&
    email.trim() &&
    password &&
    confirmPassword &&
    !errors.fullName &&
    !errors.email &&
    !errors.password &&
    !errors.confirmPassword;

  /* ===== LOGIN handler (normal or with 6-digit code) ===== */
  async function handleLogin(e) {
    e.preventDefault();

    // 🔥 Always lowercase before use
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail && !trimmedPassword) {
      showToast('error', 'Email and password are required.');
      triggerShake();
      return;
    }

    if (!trimmedEmail) {
      showToast('error', 'Email is required.');
      triggerShake();
      return;
    }

    if (!trimmedPassword) {
      showToast('error', 'Password is required.');
      triggerShake();
      return;
    }

    if (!validateEmailDomain(trimmedEmail)) {
      showToast('error', 'Must use @mavs.uta.edu or @uta.edu email.');
      triggerShake();
      return;
    }

    showToast('success', 'Signing In…');

    try {
      // loginWithSession returns the full response object: { id, email, fullName, ... }
      const response = await loginWithSession(trimmedEmail, trimmedPassword);

      showToast('success', 'Login successful!');

      const userPayload = {
        id: response.id,
        email: response.email,
        fullName: response.fullName,
        isAdmin: response.isAdmin,
        mustSetPassword: !!response.mustSetPassword,
      };

      setTimeout(() => {
        onLoginSuccess?.(userPayload);
      }, 500);
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message.includes('Failed to fetch')
          ? 'Server unreachable. Try again.'
          : 'Invalid email, password, or reset code.',
      });
      triggerShake();
    }
  }

  /* ===== RESET CODE REQUEST handler ===== */
  async function handleResetRequest(e) {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      showToast('error', 'Email is required.');
      triggerShake();
      return;
    }

    if (!validateEmailDomain(trimmedEmail)) {
      showToast('error', 'Must use @mavs.uta.edu or @uta.edu email.');
      triggerShake();
      return;
    }

    try {
      setResetLoading(true);
      showToast('success', 'Sending reset code…');

      await requestPasswordReset(trimmedEmail);

      showToast(
        'success',
        'Reset code sent! Check your email and spam folder.'
      );
      setResetMode(false);
      setPassword('');

      // ✅ Back to login view with email prefilled; user now types the 6-digit code as password
      setResetMode(false);
      setView('login');
      setPassword(''); // clear password

      setTimeout(() => {
        document.querySelector('input[type="password"]')?.focus();
      }, 10);
    } catch (err) {
      showToast(
        'error',
        err?.message || 'Could not send reset code. Please try again.'
      );
      triggerShake();
    } finally {
      setResetLoading(false);
    }
  }

  /* ===== Register handler ===== */
  async function handleRegister(e) {
    e.preventDefault();

    const lowerEmail = email.trim().toLowerCase();

    const fullNameErr = validateFullNameLive(fullName);
    const emailErr = validateEmailLive(lowerEmail);
    const passwordErr = validatePasswordLive(password);
    const confirmErr = validateConfirmPasswordLive(confirmPassword, password);

    setErrors({
      fullName: fullNameErr,
      email: emailErr,
      password: passwordErr,
      confirmPassword: confirmErr,
    });

    if (fullNameErr) {
      showToast('error', fullNameErr);
      triggerShake();
      return;
    }
    if (emailErr) {
      showToast('error', emailErr);
      triggerShake();
      return;
    }
    if (passwordErr) {
      showToast('error', passwordErr);
      triggerShake();
      return;
    }
    if (confirmErr) {
      showToast('error', confirmErr);
      triggerShake();
      return;
    }

    const pwErr = validatePassword(password);
    if (pwErr) {
      showToast('error', pwErr);
      triggerShake();
      return;
    }

    try {
      await registerWithSession(fullName, lowerEmail, password);

      showToast('success', 'Account created! Please sign in.');
      setView('login');
      setResetMode(false);
      setTimeout(() => {
        // focuses the password field specifically, not the email
        document
          .querySelector('#login-password-input, input[type="password"]')
          ?.focus();
      }, 50);

      setPassword('');
      setConfirmPassword('');
      setPasswordStrength({ label: '', level: 0 });
      setErrors({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
    } catch (err) {
      showToast(
        'error',
        err?.message?.includes('already')
          ? 'This email is already registered.'
          : 'Registration failed.'
      );
      triggerShake();
    }
  }

  return (
    <div id='auth-container' className='form-container'>
      {/* Toast overlay */}
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

      {/* Card */}
      <div className={toast ? 'blurred-card' : ''}>
        <h1 className='kiosk-title'>KIOSK ACCESS</h1>

        <div className='tab-bar'>
          <button
            type='button'
            className={`tab-button ${view === 'login' ? 'active' : ''}`}
            onClick={() => {
              setView('login');
              setResetMode(false); // 🔹 reset mode off when switching tabs
              setTimeout(() => {
                document.getElementById('login-email-input')?.focus();
              }, 10);
            }}
          >
            Sign In
          </button>

          <button
            type='button'
            className={`tab-button ${view === 'register' ? 'active' : ''}`}
            onClick={() => {
              setView('register');
              setResetMode(false); // 🔹 reset mode off when switching tabs
              setTimeout(() => {
                document.getElementById('register-fullname-input')?.focus();
              }, 10);
            }}
          >
            Sign Up
          </button>
        </div>

        <div className={`form-body ${shake ? 'shake' : ''}`}>
          {view === 'login' ? (
            /* ========== LOGIN VIEW (normal or reset mode) ========== */
            resetMode ? (
              /* ------ RESET EMAIL MODE ------ */
              <form onSubmit={handleResetRequest}>
                <div className='form-group'>
                  <label>UTA Email</label>
                  <input
                    id='reset-email-input'
                    className='input-field'
                    type='email'
                    placeholder='email@mavs.uta.edu'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete='email'
                  />
                </div>

                <p
                  style={{
                    fontSize: '0.85rem',
                    opacity: 0.85,
                    marginTop: '0.25rem',
                    marginBottom: '1rem',
                    lineHeight: 1.4,
                  }}
                >
                  We will email you a 6-digit reset code you can use to sign in.
                  Please check your inbox and your spam folder.
                </p>

                <button className='auth-button' disabled={resetLoading}>
                  {resetLoading ? 'Sending reset code…' : 'Send Reset Code'}
                </button>
              </form>
            ) : (
              /* ------ NORMAL LOGIN MODE ------ */
              <form onSubmit={handleLogin}>
                <div className='form-group'>
                  <label>Email</label>
                  <input
                    id='login-email-input'
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
                    placeholder='Enter your password or the reset code'
                    inputClass='input-field'
                    autoComplete='current-password'
                  />
                  {/* 🔹 "Reset password" link, right-aligned under the password input (Option A) */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: '0.35rem',
                    }}
                  >
                    <div className='forgot-password-container'>
                      <button
                        type='button'
                        className='forgot-password-link'
                        onClick={() => {
                          setResetMode(true);
                          setTimeout(() => {
                            document
                              .getElementById('reset-email-input')
                              ?.focus();
                          }, 10);
                        }}
                      >
                        Reset password
                      </button>
                    </div>
                  </div>
                </div>

                <button className='auth-button'>Sign In</button>
              </form>
            )
          ) : (
            /* ========== REGISTER FORM ========== */
            <form onSubmit={handleRegister}>
              {/* FULL NAME */}
              <div className='form-group'>
                <label>Full Name</label>
                <div
                  className={`input-check-wrap ${
                    !errors.fullName && fullName.trim() ? 'valid-field' : ''
                  }`}
                >
                  <input
                    id='register-fullname-input'
                    className='input-field'
                    type='text'
                    placeholder='Jane Doe'
                    value={fullName}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setFullName(raw);
                      setErrors((prev) => ({
                        ...prev,
                        fullName: validateFullNameLive(raw),
                      }));
                    }}
                    onBlur={(e) => {
                      const cleaned = formatFullName(e.target.value);
                      setFullName(cleaned);
                      setErrors((prev) => ({
                        ...prev,
                        fullName: validateFullNameLive(cleaned),
                      }));
                    }}
                    autoComplete='name'
                  />
                  {!errors.fullName && fullName.trim() && (
                    <span className='checkmark'>✔</span>
                  )}
                </div>
                {errors.fullName && (
                  <div className='inline-error'>{errors.fullName}</div>
                )}
              </div>

              {/* UTA EMAIL */}
              <div className='form-group'>
                <label>UTA Email</label>
                <div
                  className={`input-check-wrap ${
                    !errors.email && email.trim() ? 'valid-field' : ''
                  }`}
                >
                  <input
                    className='input-field'
                    type='email'
                    placeholder='email@mavs.uta.edu'
                    value={email}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEmail(v);
                      setErrors((prev) => ({
                        ...prev,
                        email: validateEmailLive(v.toLowerCase()),
                      }));
                    }}
                    autoComplete='email'
                  />
                  {!errors.email && email.trim() && (
                    <span className='checkmark'>✔</span>
                  )}
                </div>
                {errors.email && (
                  <div className='inline-error'>{errors.email}</div>
                )}
              </div>

              {/* PASSWORD */}
              <div className='form-group'>
                <label>Password</label>
                <div
                  className={`input-check-wrap ${
                    !errors.password && password ? 'valid-field' : ''
                  }`}
                >
                  <PasswordInput
                    value={password}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPassword(v);
                      setErrors((prev) => ({
                        ...prev,
                        password: validatePasswordLive(v),
                      }));
                      setPasswordStrength(getPasswordStrength(v));
                    }}
                    placeholder='Min. 8 chars, 1 uppercase, 1 number, 1 special symbol'
                    inputClass='input-field'
                    autoComplete='new-password'
                  />
                  {!errors.password && password && (
                    <span className='checkmark'>✔</span>
                  )}
                </div>
                {errors.password && (
                  <div className='inline-error'>{errors.password}</div>
                )}

                {/* Strength bar */}
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

              {/* CONFIRM PASSWORD */}
              <div className='form-group'>
                <label>Confirm Password</label>
                <div
                  className={`input-check-wrap ${
                    !errors.confirmPassword && confirmPassword
                      ? 'valid-field'
                      : ''
                  }`}
                >
                  <PasswordInput
                    value={confirmPassword}
                    onChange={(e) => {
                      const v = e.target.value;
                      setConfirmPassword(v);
                      setErrors((prev) => ({
                        ...prev,
                        confirmPassword: validateConfirmPasswordLive(
                          v,
                          password
                        ),
                      }));
                    }}
                    placeholder='Confirm your password'
                    inputClass='input-field'
                    autoComplete='new-password'
                  />
                  {!errors.confirmPassword && confirmPassword && (
                    <span className='checkmark'>✔</span>
                  )}
                </div>
                {errors.confirmPassword && (
                  <div className='inline-error'>{errors.confirmPassword}</div>
                )}
              </div>

              <button className='auth-button' disabled={!isRegisterValid}>
                Register
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
