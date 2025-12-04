// src/components/DashboardToast.jsx
import React, { useEffect, useState } from 'react';
import '../styles/Dashboard.css';

export default function DashboardToast({ type, message, visible, onClose }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!visible || !message) return;

    // Start as fade-in whenever a new toast appears
    setFadeOut(false);

    // Decide how long this toast should live
    let duration;
    switch (type) {
      case 'error':
        duration = 2500; // 2.5s
        break;
      case 'success':
        duration = 3000; // 3s
        break;
      case 'loading':
        duration = 8000; // stays longer
        break;
      default:
        duration = 3000; // info, etc
        break;
    }

    // Start fade-out slightly before we remove it
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, Math.max(0, duration - 280)); // ~0.28s matches CSS transition

    const closeTimer = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [visible, type, message, onClose]);

  if (!visible || !message) return null;

  const getEmoji = () => {
    if (type === 'success') return '✅';
    if (type === 'error') return '⚠️';
    if (type === 'loading') return '⏳';
    return 'ℹ️';
  };

  return (
    <div className='dash-toast-wrapper'>
      <div
        className={
          `dash-toast-card ${type} ` +
          `${type === 'error' ? 'shake' : ''} ` +
          `${fadeOut ? 'fade-out' : 'fade-in'}`
        }
      >
        {/* EMOJI */}
        <span className='dash-toast-emoji'>{getEmoji()}</span>

        {/* TEXT */}
        <span className='dash-toast-text' style={{ whiteSpace: 'pre-line' }}>
          {message}
        </span>

        {/* PREMIUM CLOSE BUTTON (NEW) */}
        {/* Orange-glow premium close X */}
        <span
          className='close-btn'
          onClick={() => {
            setFadeOut(true);
            setTimeout(() => onClose(), 200);
          }}
        >
          ✕
        </span>
      </div>
    </div>
  );
}
