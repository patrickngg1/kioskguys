import { useState } from 'react';
import './App.css';

function App() {
  return (
    <div className='app-layout min-h-screen flex flex-row relative'>
      <KioskMap />
      <AuthScreen />
    </div>
  );
}

export default App;
