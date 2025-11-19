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

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '💎'; // premium diamond for success
      case 'error':
        return '⚠️'; // error icon
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className='auth-toast-container'>
      <div className={`auth-toast-card ${type}`}>
        {/* ICON */}
        <div className='auth-toast-icon'>{getIcon()}</div>

        {/* TEXT */}
        <div className='auth-toast-text'>{message}</div>

        {/* CLOSE BUTTON */}
        <button className='auth-toast-close' onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}
