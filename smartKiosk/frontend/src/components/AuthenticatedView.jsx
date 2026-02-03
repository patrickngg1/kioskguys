import React from 'react';

/**
 * Displays the successful login screen with user details and a logout button.
 * @param {object} props
 * @param {object} props.user - User object from backend (or legacy Firebase).
 * @param {function} props.handleLogout - Function to sign the user out.
 */
const AuthenticatedView = ({ user, handleLogout }) => {
  const containerClasses =
    'w-full max-w-md bg-white p-8 rounded-xl form-container text-center';
  const buttonClass =
    'auth-button bg-red-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-600 transition mt-8';

  // Support both Django user object and old Firebase shape
  const fullName =
    user?.fullName || user?.first_name || user?.firstName || 'Kiosk User';
  const email = user?.email || user?.username || '';
  const userId = user?.id || user?.uid || '';

  return (
    <div id='authenticated-view' className={containerClasses}>
      <svg
        className='mx-auto h-12 w-12 text-blue-500'
        fill='none'
        viewBox='0 0 24 24'
        stroke='currentColor'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2'
          d='M9 12l2 2 4-4m5.618 4.618a8.257 8.257 0 01-1.373 2.155c-.32.378-.696.721-1.1.996.114.16.223.325.328.497.525.867.75 1.834.61 2.805A7.846 7.846 0 0112 21c-1.396 0-2.73-.396-3.882-1.127-.145-.09-.289-.18-.432-.27-.29-.18-.57-.375-.84-.585-.4-.32-.78-.67-1.14-1.05-.72-.77-1.28-1.63-1.69-2.58A8.068 8.068 0 013 12c0-1.22.28-2.39.81-3.46.41-.83.99-1.58 1.74-2.22.6-.5.4-.5.4-.5.72-.65 1.54-1.18 2.5-1.58A8.01 8.01 0 0112 3c1.396 0 2.73.396 3.882 1.127.145.09.289.18.432.27.29.18.57.375.84.585.4.32.78.67 1.14 1.05.72.77 1.28 1.63 1.69 2.58A8.068 8.068 0 0121 12z'
        />
      </svg>
      <h2 className='text-2xl font-bold mt-4 text-gray-800'>Welcome!</h2>
      <p className='text-gray-600 mt-2'>
        You are successfully authenticated as:
      </p>

      <p
        id='user-email-display'
        className='text-xl font-mono text-blue-600 mt-3 break-words'
      >
        {fullName} {email && `(${email})`}
        {userId && <br />}
        {userId && (
          <span className='text-sm font-light text-gray-400'>
            User ID: {userId}
          </span>
        )}
      </p>

      <p className='text-sm text-gray-500 mt-4'>
        This is where your Room Reservation and Supply Request features will go.
      </p>

      <button onClick={handleLogout} className={buttonClass}>
        Sign Out
      </button>
    </div>
  );
};

export default AuthenticatedView;
