// src/components/CardSwipeModal.jsx
import React, { useEffect, useRef } from 'react';
import '../styles/CardSwipeModal.css';

export default function CardSwipeModal({ isOpen, onClose, onCapture }) {
  const bufferRef = useRef('');
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    bufferRef.current = '';

    const handleKey = (e) => {
      // Ignore modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key))
        return;

      bufferRef.current += e.key;

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        const rawSwipe = bufferRef.current;
        bufferRef.current = '';
        if (rawSwipe.length > 5) {
          onCapture({ raw: rawSwipe, uta_id: null });
        }
      }, 100);
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, onCapture]);

  if (!isOpen) return null;

  return (
    <div className='swipe-modal-overlay'>
      <div className='swipe-modal' onClick={(e) => e.stopPropagation()}>
        <button className='close-btn' onClick={onClose}>
          ✕
        </button>

        {/* 3D Animation Stage */}
        <div className='swipe-animation-container'>
          {/* The Laser Beam */}
          <div className='laser-beam'></div>

          {/* The Digital UTA Card */}
          <div className='card-graphic uta-card'>
            {/* Holographic Shine Overlay */}
            <div className='holo-sheen'></div>

            {/* Orange Header */}
            <div className='uta-header'>
              <div className='uta-a-logo'>A</div>
              {/* ✅ UPDATED TEXT */}
              <span className='uta-label'>Student/Faculty</span>
              <div className='uta-horse-logo'></div>
            </div>

            {/* Blue Body */}
            <div className='uta-body'>
              <div className='uta-photo-box'>
                <div className='photo-shimmer'></div>
              </div>
              <div className='uta-info'>
                <div className='uta-name'>MAVERICK, SAM</div>
                <div className='uta-id-bar'></div>
                <div className='uta-issue'>Issue Date: 08/25/25</div>
              </div>
            </div>

            {/* Footer */}
            <div className='uta-footer'>
              THE UNIVERSITY OF TEXAS AT ARLINGTON
            </div>
          </div>

          {/* The Reader Slot */}
          <div className='card-reader-slot'></div>
        </div>

        <h2 className='swipe-title'>Swipe Your UTA Card</h2>
        <p className='swipe-subtitle'>
          Slide your MavID through the reader. The kiosk will capture it
          automatically.
        </p>

        <div className='swipe-hint'>Waiting for swipe...</div>
      </div>
    </div>
  );
}
