import React from 'react';

export default function AlertsList({ alerts, selectedAlertId, onSelectAlert }) {
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

        return (
          <div
            key={alert.id}
            className={`alert-card${isSelected ? ' selected' : ''}${isAccepted ? ' accepted' : ''}`}
            onClick={() => onSelectAlert(alert.id)}
            id={`alert-card-${alert.id}`}
          >
            <div className="alert-card-header">
              <div>
                <div className="alert-event">{alert.event}</div>
                <div className="alert-device">{alert.deviceId}</div>
              </div>
              <div className="alert-time">
                {new Date(alert.timestampMs).toLocaleTimeString()}
              </div>
            </div>

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
