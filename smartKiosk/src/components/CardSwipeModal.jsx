import React, { useEffect, useRef } from 'react';

export default function CardSwipeModal({ isOpen, onClose, onCapture }) {
  const bufferRef = useRef('');
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    bufferRef.current = '';

    const handleKey = (e) => {
      // Ignore modifier keys to prevent capturing 'Shift', 'Control', etc.
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key))
        return;

      bufferRef.current += e.key;

      // Restart timer — swipe finishes within ~100ms
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        const rawSwipe = bufferRef.current;
        bufferRef.current = '';

        // Professional Logic: If we got a long string, send it.
        // We do NOT validate here. We let the backend handle the complex parsing.
        if (rawSwipe.length > 5) {
          console.log('CAPTURED RAW SWIPE:', rawSwipe);
          // Send raw data with uta_id as null (Backend will extract it)
          onCapture({ raw: rawSwipe, uta_id: null });
        }
      }, 100); // 100ms buffer window
    };

    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, onCapture]);

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

        {/* Premium animation preserved */}
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
