import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase-config';

const APP_ID = 'kiosk-room-booking-v1';

function validateEmailDomain(email) {
  const domain = email.substring(email.lastIndexOf('@'));
  return domain === '@mavs.uta.edu' || domain === '@uta.edu';
}
function validatePassword(password) {
  if (password.length < 8)
    return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password))
    return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password))
    return 'Password must contain at least one number.';
  return null;
}

export default function AuthForm({ displayMessage, currentView, setView }) {
  const [localView, setLocalView] = useState('login');
  const view = currentView ?? localView;
  const setViewSafe = setView ?? setLocalView;

  const [loading, setLoading] = useState(false);

  // shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // register-only
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const inputClass = 'input-field';
  const buttonClass = 'auth-button';

  async function handleLogin(e) {
    e.preventDefault();
    displayMessage?.('', 'clear');
    if (!email || !password) {
      return displayMessage?.(
        'Please fill out both email and password fields.',
        'error'
      );
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      displayMessage?.('Login successful!', 'success');
    } catch (err) {
      const msg =
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential'
          ? 'Invalid email or password.'
          : 'Login failed.';
      displayMessage?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    displayMessage?.('', 'clear');

    if (!fullName)
      return displayMessage?.('Please enter your full name.', 'error');
    if (!validateEmailDomain(email))
      return displayMessage?.(
        'Registration email must end with @mavs.uta.edu or @uta.edu.',
        'error'
      );
    if (password !== confirmPassword)
      return displayMessage?.('Passwords do not match.', 'error');
    const pwErr = validatePassword(password);
    if (pwErr) return displayMessage?.(pwErr, 'error');

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      const ref = doc(
        db,
        'artifacts',
        APP_ID,
        'users',
        user.uid,
        'user_profiles',
        user.uid
      );
      await setDoc(ref, {
        fullName,
        email,
        createdAt: new Date().toISOString(),
      });

      displayMessage?.(
        'Registration successful! You are now signed in.',
        'success'
      );
    } catch (err) {
      const msg =
        err?.code === 'auth/email-already-in-use'
          ? 'This email is already registered. Try signing in.'
          : 'Registration failed. Please try again.';
      displayMessage?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id='auth-container' className='form-container'>
      <h1>Kiosk Access</h1>

      {/* Tabs */}
      <div className='tab-bar'>
        <button
          type='button'
          className={`tab-btn ${view === 'login' ? 'active' : ''}`}
          onClick={() => setViewSafe('login')}
          aria-selected={view === 'login'}
        >
          Sign In
        </button>
        <button
          type='button'
          className={`tab-btn ${view === 'register' ? 'active' : ''}`}
          onClick={() => setViewSafe('register')}
          aria-selected={view === 'register'}
        >
          Sign Up
        </button>
      </div>

      {/* Body with grouped fields (fixes label↔input gap) */}
      <div className='form-body'>
        {view === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className='form-group'>
              <label className='form-label'>Email</label>
              <input
                className={inputClass}
                type='email'
                placeholder='email@uta.edu'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className='form-group'>
              <label className='form-label'>Password</label>
              <input
                className={inputClass}
                type='password'
                placeholder='Enter your password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className='forgot-row'>
              <a className='link' href='#'>
                Forgot Password?
              </a>
            </div>

            <button className={buttonClass} type='submit' disabled={loading}>
              {loading ? 'Signing In…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className='form-group'>
              <label className='form-label'>Full Name</label>
              <input
                className={inputClass}
                type='text'
                placeholder='Jane Doe'
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className='form-group'>
              <label className='form-label'>UTA Email</label>
              <input
                className={inputClass}
                type='email'
                placeholder='netid@mavs.uta.edu'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className='form-group'>
              <label className='form-label'>Password</label>
              <input
                className={inputClass}
                type='password'
                placeholder='Min. 8 chars, 1 number, 1 uppercase'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p
                className='text-xs'
                style={{ color: '#6b7280', marginTop: '.25rem' }}
              >
                Must be at least 8 characters long and include an uppercase
                letter and a number.
              </p>
            </div>

            <div className='form-group'>
              <label className='form-label'>Confirm Password</label>
              <input
                className={inputClass}
                type='password'
                placeholder='Confirm your password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button className={buttonClass} type='submit' disabled={loading}>
              {loading ? 'Registering…' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
