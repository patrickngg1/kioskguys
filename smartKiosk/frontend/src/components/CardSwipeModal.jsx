// src/components/CardSwipeModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import '../styles/CardSwipeModal.css';

export default function CardSwipeModal({ isOpen, onClose, onCapture }) {
  const bufferRef = useRef('');
  const timerRef = useRef(null);
  const modalRef = useRef(null); // Ref for 3D floating effect

  // Premium UX: Show that we are actively receiving data
  const [status, setStatus] = useState('idle'); // 'idle' | 'reading' | 'processing'

  // --- 1 TRILLION DOLLAR FLOATING PHYSICS ---
  const handleMouseMove = (e) => {
    if (!modalRef.current) return;
    const { left, top, width, height } =
      modalRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;

    // Apply dynamic 3D perspective tilt
    modalRef.current.style.transform = `perspective(1000px) rotateY(${
      x * 4
    }deg) rotateX(${y * -4}deg) translateY(-8px)`;
  };

  const handleMouseLeave = () => {
    if (!modalRef.current) return;
    // Return to default floating state
    modalRef.current.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg) translateY(0)`;
  };

  // src/components/CardSwipeModal.jsx

  // src/components/CardSwipeModal.jsx

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      return;
    }

    // 1. MUST be async to prevent the "silent" skip
    const handleKey = async (e) => {
      if (
        ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)
      )
        return;

      // Safety Guard: Don't allow multiple swipes during processing
      if (status === 'processing' || status === 'saved') return;

      if (timerRef.current) clearTimeout(timerRef.current);

      if (e.key === 'Enter') {
        const rawSwipe = bufferRef.current.trim();
        if (rawSwipe.length > 5) {
          // 2. SET PROCESSING FIRST
          setStatus('processing');

          // 3. AWAIT the registration result from Dashboard
          const success = await onCapture({ raw: rawSwipe, uta_id: null });

          if (success) {
            setStatus('saved'); // Triggers "Identity Secured"
            bufferRef.current = '';
            setTimeout(() => onClose(), 2200);
          } else {
            // 4. NEW: Handle invalid card type/error visually
            setStatus('error');
            setTimeout(() => {
              setStatus('idle');
              bufferRef.current = '';
            }, 2000);
          }
        }
        return;
      }

      bufferRef.current += e.key;
      if (status !== 'reading') setStatus('reading');

      timerRef.current = setTimeout(() => {
        if (
          status !== 'processing' &&
          status !== 'saved' &&
          status !== 'error'
        ) {
          bufferRef.current = '';
          setStatus('idle');
        }
      }, 200);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, status, onCapture, onClose]);

  if (!isOpen) return null;

  // src/components/CardSwipeModal.jsx

  return (
    <div className='swipe-modal-overlay'>
      <div
        className={`swipe-modal ${
          status === 'saved' ? 'status-saved-glow' : ''
        }`}
        ref={modalRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => e.stopPropagation()}
      >
        <button className='close-btn' onClick={onClose}>
          ✕
        </button>

        <div className='swipe-animation-container'>
          <div
            className={`laser-beam ${status === 'reading' ? 'active' : ''}`}
          ></div>

          <div
            className={`card-graphic uta-card ${
              status === 'saved' ? 'card-saved-bloom' : ''
            }`}
          >
            <div className='holo-sheen'></div>
            <div className='uta-header'>
              <div className='uta-a-logo'>A</div>
              <span className='uta-label'>Student/Faculty</span>
              <div className='uta-horse-logo'></div>
            </div>

            <div className='uta-body'>
              {/* The Robot Portrait */}
              <div
                className='uta-photo-box'
                style={{
                  position: 'relative',
                  padding: '2px',
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
                  borderRadius: '14px',
                  boxShadow:
                    'inset 0 0 10px rgba(0, 0, 0, 0.5), 0 0 15px rgba(37, 99, 235, 0.2)',
                  overflow: 'hidden',
                }}
              >
                {/* THE IMAGE */}
                <img
                  src='https://api.dicebear.com/7.x/avataaars/svg?seed=MavBot&backgroundColor=0f172a&baseColor=2563eb&accessories=eyepatch&clothing=graphicShirt&clothingColor=0f172a&eyebrows=default&eyes=squint&mouth=smile'
                  alt='Portrait'
                  className='uta-photo-img'
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    filter: 'contrast(1.1) brightness(1.1)',
                  }}
                />

                {/* THE BIOMETRIC SCAN OVERLAY */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to bottom, transparent 45%, rgba(37, 99, 235, 0.4) 50%, transparent 55%)',
                    backgroundSize: '100% 200%',
                    animation: 'photoScan 3s linear infinite',
                    pointerEvents: 'none',
                    zIndex: 3,
                  }}
                ></div>

                {/* DIGITAL VIGNETTE */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)',
                    borderRadius: '12px',
                    pointerEvents: 'none',
                  }}
                ></div>
              </div>

              <div className='uta-info'>
                <div className='uta-name'>MAVERICK, UTA</div>
                <div className='uta-id-bar'></div>
                <div className='uta-issue'>Issued Date: 08/25/25</div>

                {/* 1 TRILLION DOLLAR PREMIUM LOGO EMBLEM */}
                <div className='uta-premium-emblem'>
                  <img
                    src='/backend/static/ui_assets/apple-touch-icon.png'
                    alt='UTA Emblem'
                    className='uta-emblem-img'
                  />
                </div>
              </div>
            </div>

            <div className='uta-footer'>
              THE UNIVERSITY OF TEXAS AT ARLINGTON
            </div>
          </div>
          <div className='card-reader-slot'></div>
        </div>
        <h2 className='swipe-title'>
          {status === 'processing' && 'Verifying Identity...'}
          {status === 'reading' && 'Reading Card...'}
          {status === 'saved' && 'Identity Secured'}
          {status === 'error' && 'Access Denied'} {/* Add this */}
          {status === 'idle' && 'Swipe Your UTA Card'}
        </h2>

        <p className='swipe-subtitle'>
          {status === 'saved'
            ? 'Your information has been safely encrypted and stored.'
            : 'Slide your MavID through the reader. The kiosk will capture it automatically.'}
        </p>
        {/* Inside the return block of CardSwipeModal.jsx */}

        <div className={`swipe-hint ${status}`}>
          {status === 'reading' && 'Reading Magnetic Stripe...'}
          {status === 'processing' && 'Processing...'}
          {status === 'saved' && '✓ Card Info Saved'}
          {status === 'error' && '✗ Invalid Card Type'} {/* Add this */}
          {status === 'idle' && 'Waiting for swipe...'}
        </div>
      </div>
    </div>
  );
}
