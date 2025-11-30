// src/components/AuthScreen.jsx
import React from 'react';
import AuthForm from './AuthForm';
import { useNavigate } from 'react-router-dom';

export default function AuthScreen() {
  const navigate = useNavigate();

  const handleLoginSuccess = (user) => {
    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName || user.email.split('@')[0],
      isAdmin: !!user.isAdmin,
      mustSetPassword: user.mustSetPassword ?? false,
    };

    // 🔵 Store user globally
    sessionStorage.setItem('logged-in-user', JSON.stringify(safeUser));

    // 🔥 CRITICAL FIX — force overlay if backend says mustSetPassword
    if (safeUser.mustSetPassword === true) {
      sessionStorage.setItem('reset-required', '1');
    } else {
      sessionStorage.setItem('reset-required', '0');
    }

    // Navigate to dashboard
    navigate('/dashboard', {
      state: { user: safeUser },
    });
  };

  return (
    <div id='auth-section'>
      <AuthForm onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}
