import React, { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '../firebase-config';
import AuthForm from './AuthForm'; // NEW IMPORT
import AuthenticatedView from './AuthenticatedView';
import MessageAlert from './MessageAlert';

const YOUR_APP_ID_FOR_FIRESTORE = 'kiosk-room-booking-v1';
const appId = YOUR_APP_ID_FOR_FIRESTORE;

// Custom hook to manage the view, user, and profile state
const useAuthManager = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // NEW STATE for Firestore profile
  const [view, setView] = useState('login');
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchUserProfile = async (userId) => {
    const userProfileDocRef = doc(
      db,
      'artifacts',
      appId,
      'users',
      userId,
      'user_profiles',
      userId
    );
    try {
      const docSnap = await getDoc(userProfileDocRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    setPersistence(auth, browserSessionPersistence);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setProfile(null); // Clear profile on state change

      if (currentUser && currentUser.email) {
        // Fetch profile only if a non-anonymous user is logged in
        const userProfile = await fetchUserProfile(currentUser.uid);
        setProfile(userProfile);
        setView('authenticated');
      } else {
        // If signed out or anonymous, show the login view
        setView('login');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setMessage({ text: 'You have been signed out.', type: 'info' });
    setProfile(null);
    setView('login');
  };

  const displayMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  return {
    user,
    profile,
    view,
    setView,
    message,
    displayMessage,
    handleLogout,
  };
};

const AuthScreen = () => {
  const {
    user,
    profile,
    view,
    setView,
    message,
    displayMessage,
    handleLogout,
  } = useAuthManager();

  // The entire view will be controlled by AuthScreen's logic
  const isAuthenticated = user && user.email && view === 'authenticated';

  return (
    <div
      id='auth-section'
      className='flex-1 flex items-center justify-center p-8 backdrop-blur-sm'
    >
      <div className='w-full max-w-lg'>
        <MessageAlert text={message.text} type={message.type} />

        {/* Render AuthForm or AuthenticatedView based on state */}
        {isAuthenticated ? (
          <AuthenticatedView
            user={user}
            profile={profile}
            handleLogout={handleLogout}
          />
        ) : (
          <AuthForm
            displayMessage={displayMessage}
            currentView={view}
            setView={setView}
          />
        )}
      </div>
    </div>
  );
};

export default AuthScreen;
