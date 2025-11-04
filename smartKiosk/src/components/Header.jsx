import React, { useEffect, useState } from 'react';
import utaLogo from '../assets/apple-touch-icon.png'; // ✅ local import

export default function Header() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d) =>
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const formatDate = (d) =>
    d.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  return (
    <>
      <header
        className='kiosk-header'
        role='banner'
        aria-label='Smart kiosk header'
      >
        {/* ===== Left Brand Section ===== */}
        <div className='brand-left'>
          <img src={utaLogo} alt='UTA logo' className='uta-logo' />

          <div className='brand-text'>
            <div className='brand-title'>ERSA Smart Kiosk</div>
            <div className='brand-sub'>Engineering Research South • BLDG A</div>
          </div>
        </div>

        {/* ===== Center Accent Message ===== */}
        <div className='header-center' aria-hidden='true'>
          <span className='welcome-msg'>Welcome</span>
        </div>

        {/* ===== Right Clock Section ===== */}
        <div className='brand-right'>
          <div className='kiosk-date'>{formatDate(time)}</div>
          <div className='kiosk-time' aria-live='polite'>
            {formatTime(time)}
          </div>
        </div>
      </header>

      {/* ===== Animated Accent Bar Below Header ===== */}
      <div className='kiosk-accent' aria-hidden='true' />
    </>
  );
}
