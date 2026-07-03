import React, { useState, useEffect, useCallback } from 'react';

// Must match the value used in the Ambulance Navigator App
const ALERT_EXPIRY_MS = 5 * 60 * 1000;

export default function AlertsList({ alerts, selectedAlertId, onSelectAlert }) {
  const [now, setNow] = useState(Date.now());

  // Tick every second for live countdown / elapsed time
  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

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
        const isExpired = !isAccepted && (now - alert.timestampMs) >= ALERT_EXPIRY_MS;
        const urgency = !isAccepted ? getCountdownUrgency(alert.timestampMs) : 'normal';

        return (
          <div
            key={alert.id}
            className={`alert-card${isSelected ? ' selected' : ''}${isAccepted ? ' accepted' : ''}${isExpired ? ' expired' : ''}${!isAccepted && urgency === 'critical' ? ' urgent' : ''}`}
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

            {/* Countdown timer — only for pending (non-accepted) alerts */}
            {!isAccepted && !isExpired && (
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
          </div>
        );
      })}
    </div>
  );
}
