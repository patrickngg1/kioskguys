import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase-config';
import MessageAlert from './MessageAlert';

// --- Validation Functions (Copied from your HTML/JS) ---

const YOUR_APP_ID_FOR_FIRESTORE = 'kiosk-room-booking-v1';
const appId = YOUR_APP_ID_FOR_FIRESTORE;

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
  // The original Register.html required a special character, but the JS validation only checks length, uppercase, and number. Sticking to the JS logic from Login Test.html.
  // if (!/[!@#$%^&*]/.test(password)) return "Password must contain at least one special character.";
  return null;
}

// --- Component ---

const AuthForm = ({ displayMessage, currentView, setView }) => {
  // Shared State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Register-specific State
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const inputClass =
    'input-field border border-gray-300 p-3 rounded-md w-full transition focus:outline-none focus:border-blue-500';
  const buttonClass =
    'auth-button w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition';

  // --- HANDLERS ---

  const handleLogin = async (e) => {
    e.preventDefault();
    displayMessage('', 'clear');

    if (!email || !password) {
      return displayMessage(
        'Please fill out both email and password fields.',
        'error'
      );
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      displayMessage('Login successful!', 'success');
    } catch (error) {
      let message = 'Login failed.';
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        message = 'Invalid email or password.';
      } else {
        console.error('Login Error:', error);
      }
      displayMessage(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    displayMessage('', 'clear');

    // 1. Client-Side Validation (Matching JS logic)
    if (!fullName)
      return displayMessage('Please enter your full name.', 'error');
    if (!validateEmailDomain(email))
      return displayMessage(
        'Registration email must end with @mavs.uta.edu or @uta.edu.',
        'error'
      );
    if (password !== confirmPassword)
      return displayMessage('Passwords do not match.', 'error');

    const passwordError = validatePassword(password);
    if (passwordError) return displayMessage(passwordError, 'error');

    setLoading(true);
    try {
      // 2. Create user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // 3. Save profile data to Firestore
      const userProfileDocRef = doc(
        db,
        'artifacts',
        appId,
        'users',
        user.uid,
        'user_profiles',
        user.uid
      );
      await setDoc(userProfileDocRef, {
        fullName: fullName,
        email: email,
        createdAt: new Date().toISOString(),
      });

      displayMessage(
        'Registration successful! Profile saved. You are now signed in.',
        'success'
      );
      // Auth state listener in AuthScreen handles UI change to authenticated view
    } catch (error) {
      let message = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use')
        message = 'This email is already registered. Try signing in.';
      else console.error('Registration Error:', error);
      displayMessage(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER FUNCTIONS ---

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} id='login-form'>
      <div className='mb-4'>
        <label
          htmlFor='login-email'
          className='block text-sm font-medium text-gray-600 mb-1'
        >
          Email (uta.edu or mavs.uta.edu)
        </label>
        <input
          type='email'
          id='login-email'
          required
          className={inputClass}
          placeholder='email@uta.edu'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className='mb-6'>
        <label
          htmlFor='login-password'
          className='block text-sm font-medium text-gray-600 mb-1'
        >
          Password
        </label>
        <input
          type='password'
          id='login-password'
          required
          className={inputClass}
          placeholder='Enter your password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className='flex justify-between items-center mb-4 text-sm'>
        {/* Note: Linking these to actual functions would require more Firebase code for password reset/email verification */}
        <a
          href='#'
          id='resend-verification-link'
          className='font-medium text-indigo-600 hover:text-indigo-500 hidden'
        >
          Resend verification email
        </a>
        <a
          href='#'
          id='forgot-password-link'
          className='font-medium text-blue-600 hover:text-blue-800 ml-auto'
        >
          Forgot Password?
        </a>
      </div>
      <button
        type='submit'
        id='login-btn'
        className={buttonClass}
        disabled={loading}
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={handleRegister} id='register-form'>
      <div className='mb-4'>
        <label
          htmlFor='register-full-name'
          className='block text-sm font-medium text-gray-600 mb-1'
        >
          Full Name
        </label>
        <input
          type='text'
          id='register-full-name'
          required
          className={inputClass}
          placeholder='Jane Doe'
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div className='mb-4'>
        <label
          htmlFor='register-email'
          className='block text-sm font-medium text-gray-600 mb-1'
        >
          UTA Email
        </label>
        <input
          type='email'
          id='register-email'
          required
          className={inputClass}
          placeholder='netid@mavs.uta.edu'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className='mb-4'>
        <label
          htmlFor='register-password'
          className='block text-sm font-medium text-gray-600 mb-1'
        >
          Password
        </label>
        <input
          type='password'
          id='register-password'
          required
          className={inputClass}
          placeholder='Min. 8 chars, 1 number, 1 uppercase'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className='text-xs text-gray-500 mt-1'>
          Must be at least 8 characters long and include an uppercase letter and
          a number.
        </p>
      </div>
      <div className='mb-6'>
        <label
          htmlFor='confirm-password'
          className='block text-sm font-medium text-gray-600 mb-1'
        >
          Confirm Password
        </label>
        <input
          type='password'
          id='confirm-password'
          required
          className={inputClass}
          placeholder='Confirm your password'
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <button
        type='submit'
        id='register-btn'
        className={buttonClass}
        disabled={loading}
      >
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );

  const loginBtnClasses = `flex-1 py-3 rounded-l-lg font-semibold transition ${
    currentView === 'login' ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
  }`;
  const registerBtnClasses = `flex-1 py-3 rounded-r-lg font-semibold transition ${
    currentView === 'register' ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
  }`;

  return (
    <div
      id='auth-container'
      className='form-container w-full max-w-md bg-white p-8 rounded-xl'
    >
      <h1 className='text-3xl font-extrabold text-gray-900 mb-6 text-center'>
        Kiosk Access
      </h1>

      <div className='flex mb-6'>
        <button
          id='show-login'
          className={loginBtnClasses}
          onClick={() => setView('login')}
        >
          Sign In
        </button>
        <button
          id='show-register'
          className={registerBtnClasses}
          onClick={() => setView('register')}
        >
          Sign Up
        </button>
      </div>

      <div id='message-container-wrapper'>
        {/* MessageAlert will be rendered here by the parent AuthScreen for consistency */}
      </div>

      <div
        id='login-view'
        className={currentView === 'login' ? 'block' : 'hidden'}
      >
        {renderLoginForm()}
      </div>

      <div
        id='register-view'
        className={currentView === 'register' ? 'block' : 'hidden'}
      >
        {renderRegisterForm()}
      </div>
    </div>
  );
};

export default AuthForm;
