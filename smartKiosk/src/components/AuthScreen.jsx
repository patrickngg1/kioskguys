// src/components/AuthScreen.jsx
import React from 'react';
import AuthForm from './AuthForm';
import { useNavigate } from 'react-router-dom';

export default function AuthScreen() {
  const navigate = useNavigate();

  const handleLoginSuccess = (user) => {
    navigate('/dashboard', { state: { user } });
  };

  return (
    <div id='auth-section'>
      <AuthForm onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}
