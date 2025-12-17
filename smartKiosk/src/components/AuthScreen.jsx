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

  useEffect(() => {
    const handleKeydown = (e) => {
      // 1. IGNORE SPECIAL KEYS (Shift, Ctrl, etc.)
      if (['Shift', 'Control', 'Alt', 'Meta', 'Enter', 'Tab'].includes(e.key))
        return;

      // 2. BUFFER KEYSTROKES
      bufferRef.current += e.key;

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const rawSwipe = bufferRef.current;
        bufferRef.current = '';

        // 3. CHECK BUFFER LENGTH
        // Short bursts are likely manual typing or small autofills.
        if (rawSwipe.length < 5) return;

        // 4. CRITICAL FIX: DETECT IF IT IS ACTUALLY A CARD
        // Magnetic cards ALWAYS start with '%' (Track 1) or ';' (Track 2).
        // If the data doesn't have these, it's just an Autofill/Paste event.
        // We simply RETURN and do nothing.
        const isLikelyCard = /[%?;]/.test(rawSwipe);

        if (!isLikelyCard) {
          console.log('Ignored fast input (likely autofill/paste):', rawSwipe);
          return;
        }

        console.log('CAPTURED VALID SWIPE:', rawSwipe);

        // 5. IF WE GET HERE, IT IS A CARD -> PROCESS IT
        setSwipeState({ status: 'processing', message: 'Verifying ID...' });

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

          if (data.ok && data.id) {
            setSwipeState({
              status: 'success',
              message: `Welcome, ${
                data.fullName ? data.fullName.split(' ')[0] : 'User'
              }!`,
            });

            setTimeout(() => {
              handleLoginSuccess(data);
            }, 1200);
          } else {
            console.error('Login failed:', data.error);

            let errorMsg = 'Invalid Card';
            if (data.error?.includes('not found')) errorMsg = 'Card Not Linked';
            if (data.error?.includes('format')) errorMsg = 'Unknown Format';

            setSwipeState({ status: 'error', message: errorMsg });

            setTimeout(() => {
              setSwipeState({ status: 'idle', message: 'Reader Ready...' });
            }, 3000);
          }
        } catch (err) {
          console.error('Login network error:', err);
          setSwipeState({ status: 'error', message: 'System Offline' });
          setTimeout(
            () => setSwipeState({ status: 'idle', message: 'Reader Ready...' }),
            3000
          );
        }
      }, 100); // 100ms buffer window
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [navigate]);

  return (
    <div id='auth-section'>
      <AuthForm onLoginSuccess={handleLoginSuccess} swipeState={swipeState} />
    </div>
  );
}
