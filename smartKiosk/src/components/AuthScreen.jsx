import React, { useEffect, useRef, useState } from 'react';
import AuthForm from './AuthForm';
import { useNavigate } from 'react-router-dom';

export default function AuthScreen() {
  const navigate = useNavigate();
  const bufferRef = useRef('');
  const timerRef = useRef(null);

  // 🔹 STATE: Manage the visual feedback for the swipe
  const [swipeState, setSwipeState] = useState({
    status: 'idle', // 'idle' | 'processing' | 'success' | 'error'
    message: 'Reader Ready...',
  });

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

  // src/components/AuthScreen.jsx

  useEffect(() => {
    const handleKeydown = (e) => {
      // 1. IGNORE SPECIAL KEYS
      if (['Shift', 'Control', 'Alt', 'Meta', 'Enter', 'Tab'].includes(e.key))
        return;

      // 2. BUFFER KEYSTROKES
      bufferRef.current += e.key;

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const rawSwipe = bufferRef.current;
        bufferRef.current = '';

        if (rawSwipe.length < 5) return;

        // 4. DETECT IF IT IS ACTUALLY A CARD
        const isLikelyCard = /[%?;]/.test(rawSwipe);
        if (!isLikelyCard) return;

        setSwipeState({ status: 'processing', message: 'Verifying ID...' });

        // src/components/AuthScreen.jsx

        try {
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

          // src/components/AuthScreen.jsx

          if (data.ok && data.id) {
            // 1. Take the name from backend and split by space OR period just in case
            const rawName = data.fullName || 'Maverick';

            // 2. Split by any non-alphabetical character to isolate the first name
            const firstName = rawName.split(/[^a-zA-Z]/)[0];

            // 3. Final Format (e.g., PRAKASH -> Prakash)
            const cleanFirstName =
              firstName.charAt(0).toUpperCase() +
              firstName.slice(1).toLowerCase();

            setSwipeState({
              status: 'success',
              message: `Welcome, ${cleanFirstName}!`, // ✅ Will show "Welcome, Prakash!"
            });

            setTimeout(() => {
              handleLoginSuccess(data);
            }, 1200);
          } else {
            // ... existing error handling ...
            let errorMsg = 'Invalid Card';
            if (data.error?.includes('not found')) errorMsg = 'Card Not Linked';
            setSwipeState({ status: 'error', message: errorMsg });
            setTimeout(() => {
              setSwipeState({ status: 'idle', message: 'Reader Ready...' });
            }, 3000);
          }
        } catch (err) {
          console.error('Login network error:', err);
          setSwipeState({ status: 'error', message: 'System Offline' });
          setTimeout(() => {
            setSwipeState({ status: 'idle', message: 'Reader Ready...' });
          }, 3000);
        }
      }, 100);
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [navigate]); // Added proper dependencies and closing
  return (
    <div id='auth-section'>
      <AuthForm onLoginSuccess={handleLoginSuccess} swipeState={swipeState} />
    </div>
  );
}
