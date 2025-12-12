// src/components/CardSwipeModal.jsx
import React, { useEffect, useRef, useState } from 'react';

export default function CardSwipeModal({ isOpen, onClose, onCapture }) {
  const [buffer, setBuffer] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e) => {
      const char = e.key;

      // Card readers "type" characters extremely fast; we accumulate them.
      setBuffer((prev) => prev + char);

      // Reset after 300ms of no input
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (buffer.length > 20) {
          // long strings are legitimate card tracks
          onCapture(buffer.trim());
          setBuffer('');
        }
      }, 250);
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [isOpen, buffer, onCapture]);

  if (!isOpen) return null;

  return (
    <div className='swipe-modal-overlay' onClick={onClose}>
      <div
        className='modal-box swipe-modal'
        style={{ maxWidth: 420, textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className='close-btn' onClick={onClose}>
          ✕
        </button>

        {/* Swipe animation */}
        <div className='swipe-animation-container'>
          <div className='card-reader-slot'></div>

          <div className='card-graphic'>
            <div className='mag-stripe' />
          </div>
        </div>

        <h2 className='swipe-title'>Swipe Your UTA Card</h2>
        <p className='swipe-subtitle'>
          Slide your MavID through the reader. The kiosk will capture it
          automatically.
        </p>

        <div className='swipe-hint'>Waiting for card swipe…</div>
      </div>
    </div>
  );
}
