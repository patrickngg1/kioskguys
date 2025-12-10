// src/components/AuthScreen.jsx
import React, { useEffect, useState, useRef } from 'react';
import AuthForm from './AuthForm';
import { useNavigate } from 'react-router-dom';

export default function AuthScreen() {
  // -----------------------------
  // HOOKS MUST COME FIRST
  // -----------------------------
  const [swipeBuffer, setSwipeBuffer] = useState('');
  const swipeTimeout = useRef(null);
  const navigate = useNavigate();

  // -----------------------------
  // HANDLE LOGIN SUCCESS
  // -----------------------------
  const handleLoginSuccess = (user) => {
    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName || user.email.split('@')[0],
      isAdmin: !!user.isAdmin,
      mustSetPassword: user.mustSetPassword ?? false,
    };

    // Store globally
    sessionStorage.setItem('logged-in-user', JSON.stringify(safeUser));
    sessionStorage.setItem(
      'reset-required',
      safeUser.mustSetPassword ? '1' : '0'
    );

    navigate('/dashboard', {
      state: { user: safeUser },
    });
  };

  // -----------------------------
  // CARD SWIPE LISTENER (RUNS ONCE)
  // -----------------------------
  useEffect(() => {
    const handleKeyPress = (e) => {
      const char = e.key;

      setSwipeBuffer((prev) => {
        const updated = prev + char;

        clearTimeout(swipeTimeout.current);
        swipeTimeout.current = setTimeout(async () => {
          const swipe = updated;

          if (swipe.length > 20) {
            try {
              const res = await fetch('/api/card/login/', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardString: swipe.trim() }),
              });

              const data = await res.json();
              if (res.ok && data?.id) {
                handleLoginSuccess(data);
              }
            } catch {
              // Ignore swipe errors silently
            }
          }

          setSwipeBuffer('');
        }, 250);

        return updated;
      });
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []); // IMPORTANT: run once only

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div id='auth-section'>
      <AuthForm onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}
