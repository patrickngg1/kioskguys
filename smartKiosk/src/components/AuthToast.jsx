import React, { useEffect } from 'react';
import '../styles/AuthToast.css';

export default function AuthToast({ type = 'info', message = '', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`auth-toast ${type}`}>
      <div className='auth-toast-card'>
        <span>
          {type === 'error' ? '⚠️' : type === 'success' ? '✨' : 'ℹ️'}
        </span>
        <span>{message}</span>
        <button className='auth-close' onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}
