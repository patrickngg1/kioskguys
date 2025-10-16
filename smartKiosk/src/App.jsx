import './App.css';
import KioskMap from './components/KioskMap';
import AuthScreen from './components/AuthScreen';

function App() {
  return (
    <div className='app-layout'>
      <div id='map-container'>
        <KioskMap />
      </div>
      <div id='auth-section'>
        <AuthScreen />
      </div>
    </div>
  );
}

export default App;
