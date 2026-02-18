import React, { useEffect, useRef, useState } from 'react';
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

    sessionStorage.setItem('logged-in-user', JSON.stringify(safeUser));
    sessionStorage.setItem(
      'reset-required',
      safeUser.mustSetPassword ? '1' : '0'
    );

    navigate('/dashboard', { state: { user: safeUser } });
  };

  
  return (
    <div id='auth-section'>
      <AuthForm onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}
