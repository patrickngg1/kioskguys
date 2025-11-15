// src/components/BaseToast.jsx
import React, { useEffect } from 'react';
import '../styles/AuthToast.css';

export default function BaseToast({
  type = 'info',
  message = '',
  onClose,
  duration = 3600,
}) {
  useEffect(() => {
    const timer = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className='auth-toast-container'>
      <div className={`auth-toast-card ${type}`}>
        <div className='auth-toast-icon'>
          {type === 'success' && '✓'}
          {type === 'error' && '⚠️'}
          {type === 'warning' && '!'}
          {type === 'info' && 'ℹ️'}
        </div>

        <div className='auth-toast-text'>{message}</div>

        <button className='auth-toast-close' onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}
