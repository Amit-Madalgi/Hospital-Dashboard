import React, { useState, useEffect } from 'react';
import { database } from './firebase'; 
import { ref, onValue } from "firebase/database";
import './App.css';

function App() {
  const [crashData, setCrashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light'); // Theme state

  useEffect(() => {
    // Apply theme to body
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const alertRef = ref(database, 'alerts/crash_001');
    const unsubscribe = onValue(alertRef, (snapshot) => {
      const data = snapshot.val();
      setCrashData(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  if (loading) return <h1 style={{textAlign:'center', marginTop:'20%'}}>Initializing System...</h1>;
  if (!crashData) return <h1 style={{textAlign:'center', marginTop:'20%'}}>System Online: Waiting for Data...</h1>;

  const isCritical = crashData.status === "ACTIVE" || crashData.severity === "CRITICAL";

  return (
    <div className="dashboard-container">
      
      {/* HEADER BAR */}
      <div className="header-bar">
        <h1>🚑 Trauma Response Unit</h1>
        <button className="theme-btn" onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </div>

      <div className="grid">
        {/* CARD 1: STATUS */}
        <div className="card" style={{ borderTop: isCritical ? '5px solid #ff4d4d' : '5px solid #22c55e' }}>
          <h2>Incident Status</h2>
          <div className={isCritical ? "status-critical" : "status-normal"} style={{ fontSize: '2.5rem', textAlign: 'center', margin: '20px 0' }}>
            {crashData.status}
          </div>
          <p style={{fontSize: '1.2rem'}}><strong>Severity:</strong> {crashData.severity}</p>
          <p style={{color: 'var(--text-secondary)'}}>Time: {new Date(crashData.timestamp * 1000).toLocaleTimeString()}</p>
        </div>

        {/* CARD 2: PATIENT VITALS */}
        <div className="card">
          <h2>Patient Biometrics</h2>
          <div className="vital-container">
            <div>
              <span className="vital-box" style={{ color: '#ff4d4d' }}>{crashData.patient_vitals.bpm}</span>
              <span className="label">Heart Rate (BPM)</span>
            </div>
            <div style={{borderLeft: '1px solid rgba(128,128,128,0.3)', margin: '0 10px'}}></div>
            <div>
              <span className="vital-box" style={{ color: '#3b82f6' }}>{crashData.patient_vitals.spo2}%</span>
              <span className="label">Oxygen (SpO2)</span>
            </div>
          </div>
        </div>

        {/* CARD 3: LOGISTICS */}
        <div className="card">
          <h2>Logistics Routing</h2>
          <div style={{marginBottom: '15px'}}>
            <p style={{fontSize: '1.1rem', margin: '5px 0'}}><strong>Target Facility:</strong></p>
            <p style={{fontSize: '1.4rem', color: '#3b82f6', fontWeight: 'bold', margin: '5px 0'}}>
              {crashData.assigned_hospital.name}
            </p>
          </div>
          <p style={{color: 'var(--text-secondary)'}}>📍 Lat: {crashData.assigned_hospital.lat} | Lng: {crashData.assigned_hospital.lng}</p>
          
          <button className="map-btn"
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${crashData.location.lat},${crashData.location.lng}`, '_blank')}
          >
            🗺️ View Live Location
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;