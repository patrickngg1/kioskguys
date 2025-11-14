import React, { useState } from 'react';
import AuthForm from './AuthForm';
import { useNavigate } from 'react-router-dom';
import AuthToast from './AuthToast';

export default function AuthScreen() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => setToast({ type, message });

  const handleLoginSuccess = (user) => {
    navigate('/dashboard', { state: { user } });
  };

  return (
    <div id='auth-section'>
      {toast && (
        <AuthToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <AuthForm onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}
