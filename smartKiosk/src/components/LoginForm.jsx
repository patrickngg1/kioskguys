// src/components/LoginForm.jsx
// Simple login form using Django session-based auth
// NOTE: New kiosk flow uses AuthForm.jsx, but this stays compatible.

import React, { useState } from 'react';
import { loginWithSession } from '../api/authApi';

const LoginForm = ({ displayMessage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail && !trimmedPassword) {
      displayMessage('Email and password are required.', 'error');
      return;
    }
    if (!trimmedEmail) {
      displayMessage('Email is required.', 'error');
      return;
    }
    if (!trimmedPassword) {
      displayMessage('Password is required.', 'error');
      return;
    }

    setLoading(true);
    try {
      const user = await loginWithSession(trimmedEmail, trimmedPassword);
      // You could also pass user back if needed:
      // displayMessage(`Welcome, ${user.fullName}!`, 'success');
      displayMessage('Login successful!', 'success');
      setEmail('');
      setPassword('');
    } catch (error) {
      displayMessage(
        error.message || 'Login failed. Check your email and password.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'input-field border border-gray-300 p-3 rounded-md w-full transition focus:outline-none focus:border-blue-500';
  const buttonClass =
    'auth-button w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition';

  return (
    <form onSubmit={handleLogin}>
      <div className='mb-4'>
        <label
          htmlFor='login-email'
          className='block text-sm font-medium text-gray-600 mb-1'
        >
          Email
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
      <button type='submit' disabled={loading} className={buttonClass}>
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  );
};

export default LoginForm;
