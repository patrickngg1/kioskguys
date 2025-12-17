import React, { useState, useEffect } from 'react';
import '../styles/App.css';

export default function StartOverlay({ onStart }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const [banners, setBanners] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    fetch('/api/banners/active/')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.banners)) {
          setBanners(data.banners);
        }
      })
      .catch(() => {});

    const timer = setTimeout(() => setFadeIn(false), 700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, 6000); // 6 seconds per banner

    return () => clearInterval(interval);
  }, [banners]);

  return (
    <div
      className={`start-overlay ${fadeOut ? 'fade-out' : ''} ${
        fadeIn ? 'fade-in' : ''
      }`}
      style={
        banners.length > 0
          ? {
              backgroundImage: `url(${banners[activeIndex].image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              transition: 'background-image 0.8s ease-in-out',
            }
          : undefined
      }
      onClick={(e) => {
        // Prevent click if they are trying to scan/touch the QR code
        if (e.target.closest('.start-qr-container')) return;

        setFadeOut(true);
        setTimeout(() => onStart(), 0);
      }}
    >
      <div
        className={`start-text ${
          banners.length > 0 ? 'start-text-bottom' : ''
        }`}
      >
        <span>Tap to Begin</span>
      </div>

      {/* ✅ QR CODE OVERLAY (Only if link exists) */}
      {banners[activeIndex]?.link && (
        <div
          className='start-qr-container'
          style={{
            position: 'absolute',
            bottom: '2.5rem',
            right: '2.5rem',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(12px)',
            padding: '0.85rem',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.4)',
            animation: 'fadeIn 1.5s ease-out',
          }}
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
              banners[activeIndex].link
            )}`}
            alt='Scan for info'
            style={{
              width: '110px',
              height: '110px',
              display: 'block',
              borderRadius: '6px',
              mixBlendMode: 'multiply',
            }}
          />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#1e293b',
              marginTop: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Scan for Info
          </span>
        </div>
      )}
    </div>
  );
}
