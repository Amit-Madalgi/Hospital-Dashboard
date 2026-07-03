import React, { useEffect, useState } from 'react';
import { database } from './firebaseConfig';
import { ref, onValue, remove } from 'firebase/database';
import AlertsList from './components/AlertsList';
import VitalsMonitor from './components/VitalsMonitor';

// Must match the Ambulance Navigator App expiry duration
const ALERT_EXPIRY_MS = 5 * 60 * 1000;

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  // Listen to Firebase RTDB for alerts — same pattern as index.tsx L133-154
  useEffect(() => {
    const alertsRef = ref(database, 'alerts');
    const unsubscribe = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const alertsList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        // Sort by newest first
        alertsList.sort((a, b) => b.timestampMs - a.timestampMs);
        setAlerts(alertsList);

        // Auto-remove expired pending alerts from Firebase
        const currentTime = Date.now();
        alertsList.forEach((alert) => {
          if (alert.status !== 'accepted' && (currentTime - alert.timestampMs) >= ALERT_EXPIRY_MS) {
            remove(ref(database, `alerts/${alert.id}`)).catch(console.error);
          }
        });

        // Auto-select the first alert if none selected
        if (!selectedAlertId && alertsList.length > 0) {
          setSelectedAlertId(alertsList[0].id);
        }
      } else {
        setAlerts([]);
        setSelectedAlertId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Count stats
  const totalAlerts = alerts.length;
  const acceptedAlerts = alerts.filter((a) => a.status === 'accepted').length;
  const pendingAlerts = totalAlerts - acceptedAlerts;

  return (
    <div className="dashboard-layout">
      {/* Sidebar — Alerts List */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>🏥 Hospital Dashboard</h1>
          <p>Real-time Emergency Alert Monitor</p>
        </div>

        <div className="sidebar-scroll">
          <AlertsList
            alerts={alerts}
            selectedAlertId={selectedAlertId}
            onSelectAlert={setSelectedAlertId}
          />
        </div>

        <div className="sidebar-stats">
          <div className="stat-item">
            <div className="stat-value">{totalAlerts}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: 'var(--warning-500)' }}>{pendingAlerts}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: 'var(--success-600)' }}>{acceptedAlerts}</div>
            <div className="stat-label">Accepted</div>
          </div>
        </div>
      </aside>

      {/* Main Content — Vitals Monitor */}
      <main className="main-content">
        <VitalsMonitor alertId={selectedAlertId} />
      </main>
    </div>
  );
}
