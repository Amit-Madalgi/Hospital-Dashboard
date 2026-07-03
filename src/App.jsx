import React, { useEffect, useState, useRef } from 'react';
import { database } from './firebaseConfig';
import { ref, onValue } from 'firebase/database';
import AlertsList from './components/AlertsList';
import VitalsMonitor from './components/VitalsMonitor';

// Must match the Ambulance Navigator App expiry duration
const ALERT_EXPIRY_MS = 5 * 60 * 1000;

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  // Track which alerts already existed when the dashboard first loaded.
  // These are exempt from the countdown timer (same as Navigator app).
  const preExistingAlertIds = useRef(new Set());
  const isFirstLoad = useRef(true);
  
  // Track local arrival times to fallback when ESP32 sends a bad timestamp (e.g., 0)
  const localArrivalTimes = useRef({});

  // Listen to Firebase RTDB for alerts — same pattern as index.tsx L133-154
  useEffect(() => {
    const alertsRef = ref(database, 'alerts');
    const unsubscribe = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const alertsList = Object.keys(data).map((key) => {
          let ts = data[key].timestampMs;
          // Fix bogus ESP32 timestamps (e.g., missing, 0, or before 2020) by assigning local arrival time
          if (!ts || ts < 1577836800000) {
            if (!localArrivalTimes.current[key]) {
              localArrivalTimes.current[key] = Date.now();
            }
            ts = localArrivalTimes.current[key];
          }
          return {
            id: key,
            ...data[key],
            timestampMs: ts,
          };
        });
        // Sort by newest first
        alertsList.sort((a, b) => b.timestampMs - a.timestampMs);

        // First load — record all existing alert IDs so they are exempt from timer
        if (isFirstLoad.current) {
          preExistingAlertIds.current = new Set(alertsList.map((a) => a.id));
          isFirstLoad.current = false;
        }

        setAlerts(alertsList);

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
            preExistingAlertIds={preExistingAlertIds.current}
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
