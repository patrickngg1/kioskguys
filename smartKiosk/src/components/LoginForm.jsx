import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase-config';

const LoginForm = ({ displayMessage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Success is handled by the AuthScreen's onAuthStateChanged listener
      displayMessage('Login successful!', 'success');
      setEmail('');
      setPassword('');
    } catch (error) {
      displayMessage('Login failed. Check your email and password.', 'error');
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
