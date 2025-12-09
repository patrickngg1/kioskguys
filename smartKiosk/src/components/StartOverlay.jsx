import React, { useState, useEffect } from 'react';
import '../styles/App.css';

export default function StartOverlay({ onStart }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const [bannerUrl, setBannerUrl] = useState(null);

  useEffect(() => {
    fetch('/api/banners/active/')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.banner) {
          setBannerUrl(data.banner.image_url);
        }
      })
      .catch(() => {});

    const timer = setTimeout(() => setFadeIn(false), 700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`start-overlay ${fadeOut ? 'fade-out' : ''} ${
        fadeIn ? 'fade-in' : ''
      }`}
      style={
        bannerUrl
          ? {
              backgroundImage: `url(${bannerUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : undefined // fallback uses your CSS background
      }
      onClick={() => {
        setFadeOut(true);
        setTimeout(() => onStart(), 0);
      }}
    >
      <div className={`start-text ${bannerUrl ? 'start-text-bottom' : ''}`}>
        <span>Tap to Begin</span>
      </div>
    </div>
  );
}
