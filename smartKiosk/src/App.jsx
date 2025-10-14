import KioskMap from './components/KioskMap';
import AuthScreen from './components/AuthScreen';
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
