import React, { useEffect, useRef } from 'react';
import AuthForm from './AuthForm';
import { useNavigate } from 'react-router-dom';

export default function AuthScreen() {
  const navigate = useNavigate();
  const bufferRef = useRef('');
  const timerRef = useRef(null);

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

  useEffect(() => {
    const handleKeydown = (e) => {
      // Ignore modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

      // Allow swipe detection even if focused on input, but filter out slow typing
      bufferRef.current += e.key;

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const rawSwipe = bufferRef.current;
        bufferRef.current = '';

        // Professional Logic: If it's a long string (>5 chars), it's a swipe.
        if (rawSwipe.length > 5) {
          console.log('CAPTURED SWIPE (Login):', rawSwipe);

          try {
            // Send RAW data to backend.
            // We pass null for uta_id so the backend does the matching.
            const res = await fetch('/api/card/login/', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                raw_swipe: rawSwipe,
                uta_id: null,
              }),
            });

            const data = await res.json();

            if (data.ok && data.id) {
              handleLoginSuccess(data);
            } else {
              console.error('Login failed:', data.error);
              // Optional: Show a toast here if you have a toast context
            }
          } catch (err) {
            console.error('Login network error:', err);
          }
        }
      }, 100); // 100ms buffer
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [navigate]);

  return (
    <div id='auth-section'>
      <AuthForm onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}
