import React, { useState, useEffect, useCallback } from 'react';

// Must match the value used in the Ambulance Navigator App
const ALERT_EXPIRY_MS = 5 * 60 * 1000;

// Predefined landmarks — fallback when reverse geocoding fails
const KNOWN_LOCATIONS = [
  { name: 'Columbia University Medical Center, NY', lat: 40.8424, lng: -73.9430 },
  { name: 'Central Park, NY', lat: 40.7851, lng: -73.9683 },
  { name: 'Times Square, NY', lat: 40.7588, lng: -73.9851 },
  { name: 'Stanford University, CA', lat: 37.4275, lng: -122.1697 },
  { name: 'Golden Gate Bridge, CA', lat: 37.8199, lng: -122.4783 },
  { name: 'Kempegowda International Airport, Bengaluru', lat: 13.1986, lng: 77.7066 },
  { name: 'MG Road, Bengaluru', lat: 12.9754, lng: 77.6068 },
  { name: 'Indiranagar, Bengaluru', lat: 12.9719, lng: 77.6412 },
  { name: 'Electronic City, Bengaluru', lat: 12.8452, lng: 77.6602 },
  { name: 'Koramangala, Bengaluru', lat: 12.9352, lng: 77.6245 },
  { name: 'Hebbal, Bengaluru', lat: 13.0358, lng: 77.5970 },
  { name: 'Belagavi Fort, Belagavi', lat: 15.8497, lng: 74.4977 },
  { name: 'Tilakwadi, Belagavi', lat: 15.8281, lng: 74.5042 },
  { name: 'Vadgaon, Belagavi', lat: 15.8672, lng: 74.5083 },
  { name: 'Shahapur, Belagavi', lat: 15.8143, lng: 74.4892 },
  { name: 'College Road / KLE, Belagavi', lat: 15.8392, lng: 74.5218 },
];

function getFallbackLocation(lat, lng) {
  let minDist = Infinity;
  let nearest = 'Unknown Landmark';
  KNOWN_LOCATIONS.forEach((loc) => {
    const d = Math.sqrt(Math.pow(loc.lat - lat, 2) + Math.pow(loc.lng - lng, 2));
    if (d < minDist) { minDist = d; nearest = loc.name; }
  });
  return minDist > 1.5 ? `Area near ${lat.toFixed(4)}, ${lng.toFixed(4)}` : nearest;
}

export default function AlertsList({ alerts, selectedAlertId, onSelectAlert, preExistingAlertIds }) {
  const [now, setNow] = useState(Date.now());
  const [locationNames, setLocationNames] = useState({});

  // Tick every second for live countdown / elapsed time
  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // Reverse-geocode each alert's coordinates (same approach as Navigator app)
  useEffect(() => {
    alerts.forEach(async (alert) => {
      if (alert.gpsValid && !locationNames[alert.id]) {
        // Try Nominatim (OpenStreetMap) reverse geocoding
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${alert.lat}&lon=${alert.lng}&zoom=18&addressdetails=1`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'HospitalDashboard/1.0' },
          });
          const data = await res.json();
          if (data && data.display_name) {
            const shortName = data.display_name.split(',').slice(0, 3).join(',').trim();
            setLocationNames((prev) => ({ ...prev, [alert.id]: shortName }));
            return;
          }
        } catch (err) {
          console.warn('Nominatim geocoding failed:', err);
        }
        // Fallback to predefined landmarks
        const fallback = getFallbackLocation(alert.lat, alert.lng);
        setLocationNames((prev) => ({ ...prev, [alert.id]: fallback }));
      }
    });
  }, [alerts]);

  const formatElapsed = useCallback((timestampMs) => {
    const diffSec = Math.max(0, Math.floor((now - timestampMs) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins}m ${secs}s ago`;
  }, [now]);

  const formatCountdown = useCallback((timestampMs) => {
    const remainMs = Math.max(0, ALERT_EXPIRY_MS - (now - timestampMs));
    const mins = Math.floor(remainMs / 60000);
    const secs = Math.floor((remainMs % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [now]);

  const getCountdownUrgency = useCallback((timestampMs) => {
    const remainMs = ALERT_EXPIRY_MS - (now - timestampMs);
    if (remainMs <= 60000) return 'critical';
    if (remainMs <= 120000) return 'warning';
    return 'normal';
  }, [now]);

  const getProgressPercent = useCallback((timestampMs) => {
    const remainMs = Math.max(0, ALERT_EXPIRY_MS - (now - timestampMs));
    return (remainMs / ALERT_EXPIRY_MS) * 100;
  }, [now]);

  if (alerts.length === 0) {
    return (
      <div className="no-alerts">
        <div className="no-alerts-icon">🔔</div>
        <p>No active alerts right now.</p>
      </div>
    );
  }

  return (
    <div>
      {alerts.map((alert) => {
        const isAccepted = alert.status === 'accepted';
        const isSelected = alert.id === selectedAlertId;
        // Pre-existing alerts (loaded from Firebase on first open) don't get timers or time-based expiry
        const isPreExisting = preExistingAlertIds && preExistingAlertIds.has(alert.id);
        // Alerts only expire if they are marked as expired in Firebase
        // (This matches the exact logic in the Navigator app)
        const isExpired = alert.status === 'expired';
        const hasTimer = !isAccepted && !isExpired && !isPreExisting;
        const urgency = hasTimer ? getCountdownUrgency(alert.timestampMs) : 'normal';

        return (
          <div
            key={alert.id}
            className={`alert-card${isSelected ? ' selected' : ''}${isAccepted ? ' accepted' : ''}${isExpired ? ' expired' : ''}${hasTimer && urgency === 'critical' ? ' urgent' : ''}`}
            onClick={() => onSelectAlert(alert.id)}
            id={`alert-card-${alert.id}`}
          >
            <div className="alert-card-header">
              <div>
                <div className="alert-event">{alert.event}</div>
                <div className="alert-device">{alert.deviceId}</div>
              </div>
              <div className="alert-time-group">
                <div className="alert-time">
                  {new Date(alert.timestampMs).toLocaleTimeString()}
                </div>
                <div className="alert-elapsed">
                  ⏱ {formatElapsed(alert.timestampMs)}
                </div>
              </div>
            </div>

            {/* Countdown timer — only for NEW pending alerts (not pre-existing) */}
            {hasTimer && (
              <div className={`countdown-bar countdown-${urgency}`}>
                <div className="countdown-bar-inner">
                  <span className="countdown-label">
                    {urgency === 'critical' ? '⚠ Expiring Soon' : 'Expires In'}
                  </span>
                  <span className="countdown-value">
                    {formatCountdown(alert.timestampMs)}
                  </span>
                </div>
                <div className="countdown-progress-track">
                  <div
                    className={`countdown-progress-fill countdown-fill-${urgency}`}
                    style={{ width: `${getProgressPercent(alert.timestampMs)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Expired badge */}
            {isExpired && (
              <div className="countdown-bar countdown-expired">
                <div className="countdown-bar-inner">
                  <span className="countdown-label">⛔ Expired</span>
                  <span className="countdown-value">0:00</span>
                </div>
              </div>
            )}

            <div className="alert-badges">
              {alert.gpsValid ? (
                <span className="badge badge-gps">
                  📍 {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                </span>
              ) : (
                <span className="badge badge-gps" style={{ opacity: 0.5 }}>
                  GPS: Invalid
                </span>
              )}

              {isAccepted ? (
                <span className="badge badge-status-accepted">✓ Accepted</span>
              ) : isExpired ? (
                <span className="badge badge-status-expired">✕ Expired</span>
              ) : (
                <span className="badge badge-status-pending">● Pending</span>
              )}
            </div>

            {/* Nearby location — resolved via reverse geocoding */}
            {alert.gpsValid && (
              <div className="alert-location-row">
                <span className="alert-location-label">Near:</span>
                <span className="alert-location-name">
                  {locationNames[alert.id] || 'Resolving location...'}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
