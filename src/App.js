import React, { useState, useEffect } from 'react';
import { database } from './firebase';
import { ref, onValue } from "firebase/database";
import './App.css';

function formatTs(ms) {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

function App() {
  const [alerts, setAlerts] = useState([]); // array of alerts sorted by timestamp desc
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const alertsRef = ref(database, 'alerts/');
    const unsub = onValue(alertsRef, (snap) => {
      const val = snap.val();
      if (!val) {
        setAlerts([]);
        setLoading(false);
        return;
      }
      // convert object -> array and add key
      const arr = Object.keys(val).map(k => ({ key: k, ...val[k] }));
      // Some records may have timestampMs, some may have timestamp: convert both
      arr.forEach(item => {
        if (!item.timestampMs && item.timestamp) {
          // timestamp may be seconds — normalize to ms if needed
          const t = Number(item.timestamp);
          item.timestampMs = (t > 1e12) ? t : t * 1000;
        }
      });
      // sort by timestampMs desc (newest first)
      arr.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
      setAlerts(arr);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  if (loading) return <h1 style={{ textAlign: 'center', marginTop: '20%' }}>Initializing System...</h1>;
  if (!alerts.length) return <h1 style={{ textAlign: 'center', marginTop: '20%' }}>System Online: Waiting for Data...</h1>;

  const latest = alerts[0];

  return (
    <div className="dashboard-container">
      <div className="header-bar">
        <h1>🚑 Trauma Response Unit</h1>
        <div style={{display:'flex', gap: '12px', alignItems:'center'}}>
          <div style={{textAlign:'right', fontSize:'0.9rem', color:'var(--text-secondary)'}}>
            <div><strong>Device:</strong> {latest.deviceId || 'ESP32'}</div>
            <div style={{fontSize:'0.85rem'}}>Last update: {formatTs(latest.timestampMs)}</div>
          </div>
          <button className="theme-btn" onClick={toggleTheme}>
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </div>
      </div>

      <div className="grid">
        {/* Latest Incident Card */}
        <div className="card large">
          <h2>Latest Incident</h2>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'20px'}}>
            <div style={{flex:1}}>
              <p style={{margin:'6px 0'}}><strong>Event:</strong> {latest.event || 'accident'}</p>
              <p style={{margin:'6px 0'}}><strong>Accel Magnitude (g):</strong> {latest.accelMagG ?? latest.accelG ?? '—'}</p>
              <p style={{margin:'6px 0'}}><strong>Gyro (dps):</strong> {latest.gyroMagDps ?? latest.gyroMag ?? '—'}</p>
              <p style={{margin:'6px 0'}}><strong>GPS Valid:</strong> {latest.gpsValid ? 'Yes' : 'No'}</p>
              <p style={{margin:'6px 0'}}><strong>Timestamp:</strong> {formatTs(latest.timestampMs)}</p>
            </div>

            <div style={{width:'320px', textAlign:'center'}}>
              <h3 style={{margin:'6px 0'}}>Patient Vitals</h3>
              <div style={{display:'flex', justifyContent:'space-around', alignItems:'center'}}>
                <div>
                  <div className="vital-box big" style={{color:'#ff4d4d'}}>{latest.heartRate ?? '—'}</div>
                  <div className="label">Heart Rate (BPM)</div>
                </div>
                <div>
                  <div className="vital-box big" style={{color:'#3b82f6'}}>{latest.spo2 ?? '—'}</div>
                  <div className="label">SpO2 (%)</div>
                </div>
              </div>

              <div style={{marginTop:'12px', fontSize:'0.95rem', color:'var(--text-secondary)'}}>
                <div>Lat: {latest.lat ?? '—'}</div>
                <div>Lng: {latest.lng ?? '—'}</div>
                <button className="map-btn"
                  onClick={() => {
                    if (latest.lat && latest.lng) {
                      window.open(`https://www.google.com/maps/search/?api=1&query=${latest.lat},${latest.lng}`, '_blank');
                    }
                  }}
                  style={{marginTop:'8px'}}
                >
                  🗺️ View Live Location
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Alerts List */}
        <div className="card" style={{gridColumn:'span 2'}}>
          <h2>Recent Alerts</h2>
          <div style={{maxHeight: '360px', overflowY: 'auto'}}>
            {alerts.map((a,i) => (
              <div key={a.key} className="alert-row" style={{
                display:'flex', justifyContent:'space-between', padding:'10px', borderBottom:'1px solid rgba(128,128,128,0.08)'
              }}>
                <div>
                  <div style={{fontWeight:700}}>{a.deviceId || 'device' } · {a.event || 'accident'}</div>
                  <div style={{color:'var(--text-secondary)', fontSize:'0.9rem'}}>{formatTs(a.timestampMs)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div>HR: <strong>{a.heartRate ?? '—'}</strong></div>
                  <div>SpO2: <strong>{a.spo2 ?? '—'}</strong></div>
                  <div>G: <strong>{a.accelMagG ?? a.accelG ?? '—'}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
