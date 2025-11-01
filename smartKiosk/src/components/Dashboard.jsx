import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import KioskMap from './KioskMap';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase-config';

const APP_ID = 'kiosk-room-booking-v1';
const DEV_MODE = true; // toggle false later for real auth

function Banner({ item }) {
  if (!item) return null;
  return (
    <div className='card banner-block'>
      <img
        className='banner-img'
        src={item.image}
        alt={item.alt || 'Announcement'}
      />
      {item.cta && (
        <a className='btn btn-primary banner-cta' href={item.cta.href}>
          {item.cta.label}
        </a>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // ---------- AUTH STATE ----------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (DEV_MODE && (!u || !u.email)) {
        console.warn('🧩 Running in DEV MODE — no auth required');
        setUser({ email: 'dev@uta.edu', uid: 'DEVUSER12345' });
        setProfile({ fullName: 'Developer Mode User' });
        return;
      }

      if (!u || !u.email) {
        navigate('/');
        return;
      }

      setUser(u);
      try {
        const ref = doc(
          db,
          'artifacts',
          APP_ID,
          'users',
          u.uid,
          'user_profiles',
          u.uid
        );
        const snap = await getDoc(ref);
        setProfile(snap.exists() ? snap.data() : null);
      } catch (e) {
        console.error('Failed to load user profile', e);
        setProfile(null);
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      navigate('/');
    }
  };

  // ---------- DISPLAY INFO ----------
  const display = {
    name: profile?.fullName || user?.email || 'Kiosk User',
    id: user?.uid?.slice(0, 10) || '—',
    role: DEV_MODE ? 'Developer Mode' : 'Authenticated User',
    email: user?.email || '—',
    avatar:
      'https://api.dicebear.com/7.x/thumbs/svg?seed=uta&backgroundType=gradientLinear&shapeColor=1d4ed8,2563eb',
  };

  // ---------- BANNERS ----------
  const [bannerIdx, setBannerIdx] = useState(0);
  const banners = [
    {
      image:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1200&auto=format&fit=crop',
      alt: 'Welcome to Woolf Hall — New Kiosk Live',
      cta: { href: '/reserve', label: 'Reserve a Room' },
    },
    {
      image:
        'https://images.unsplash.com/photo-1472224371017-08207f84aaae?q=80&w=1200&auto=format&fit=crop',
      alt: 'Need markers or adapters?',
      cta: { href: '/supplies', label: 'Request Supplies' },
    },
  ];
  useEffect(() => {
    const id = setInterval(() => {
      setBannerIdx((i) => (i + 1) % banners.length);
    }, 7000);
    return () => clearInterval(id);
  }, [banners.length]);

  console.log('🧭 Dashboard component mounted');

  // ---------- RENDER ----------
  return (
    <div className='app-layout dashboard-view'>
      <div className='dashboard-grid'>
        {/* LEFT: User panel */}
        <aside className='dash-left'>
          <div className='card user-card'>
            <div className='user-row'>
              <img className='user-avatar' src={display.avatar} alt='' />
              <div>
                <div className='user-name'>{display.name}</div>
                <div className='user-id'>User ID: {display.id}</div>
              </div>
            </div>
            <div className='user-meta'>{display.role}</div>

            <div className='user-links'>
              <a href={`mailto:${display.email}`} className='pill-link'>
                Email
              </a>
              <a href='https://www.uta.edu/maps' className='pill-link'>
                UTA Map
              </a>
              <a href='https://www.uta.edu/alerts' className='pill-link'>
                Alerts
              </a>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <button onClick={handleLogout} className='auth-button'>
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* CENTER: Banner + Map */}
        <section className='dash-center'>
          <Banner item={banners[bannerIdx]} />
          <div className='card map-card'>
            <div className='map-head'>Map</div>
            <div style={{ height: '65vh' }}>
              <KioskMap />
            </div>
          </div>
        </section>

        {/* RIGHT: Actions */}
        <aside className='dash-right'>
          <div className='card action-card'>
            <div className='action-head'>
              <div className='action-title'>Reserve Conference Room</div>
              <span className='action-check' aria-hidden>
                ✓
              </span>
            </div>
            <p className='action-copy'>
              Book a meeting space by date, time, capacity, and equipment.
            </p>
            <Link to='/reserve' className='btn btn-primary w-full'>
              Open Scheduler
            </Link>
          </div>

          <div className='card action-card'>
            <div className='action-head'>
              <div className='action-title'>Request Supplies</div>
              <span className='action-check' aria-hidden>
                ✓
              </span>
            </div>
            <p className='action-copy'>
              Markers, HDMI/USB-C adapters, whiteboard erasers, cables, etc.
            </p>
            <Link to='/supplies' className='btn btn-primary w-full'>
              Open Request Form
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
