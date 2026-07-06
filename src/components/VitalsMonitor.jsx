import React, { useEffect, useState, useRef } from 'react';
import { database } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import ConnectionStatus from './ConnectionStatus';
import WaveformChart from './WaveformChart';

export default function VitalsMonitor({ alertId }) {
  const [vitals, setVitals] = useState(null);
  const [alertDetails, setAlertDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const containerRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(600);

  // Responsive chart width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setChartWidth(containerRef.current.offsetWidth - 48);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Listen to Firebase RTDB for live vitals — same pattern as vitals.tsx L34-65
  useEffect(() => {
    if (!alertId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const alertRef = ref(database, `alerts/${alertId}`);
    const unsubscribe = onValue(alertRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAlertDetails({
          event: data.event || 'Alert',
          deviceId: data.deviceId || 'Wearable Device',
        });

        // Vitals: check patient_vitals (handles both hr and bpm formats), fall back to initial alert vitals or 0
        const hrVal = Math.max(data.patient_vitals?.hr || 0, data.patient_vitals?.bpm || 0) || data.heartRate || 0;
        const spo2Val = data.patient_vitals?.spo2 || data.spo2 || 0;

        setVitals({
          hr: hrVal,
          spo2: spo2Val,
        });

        setIsConnected(true);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [alertId]);

  if (!alertId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📡</div>
        <p>Select an alert to view live patient vitals</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <div className="loading-text">Connecting to live vitals stream...</div>
      </div>
    );
  }

  // Determine status labels
  const hrStatus = vitals
    ? vitals.hr > 100 || vitals.hr < 50
      ? 'abnormal'
      : 'normal'
    : 'waiting';

  const spo2Status = vitals
    ? vitals.spo2 < 95
      ? 'hypoxia'
      : 'healthy'
    : 'waiting';

  const hrStatusLabel = vitals
    ? vitals.hr > 100 || vitals.hr < 50
      ? 'ABNORMAL'
      : 'NORMAL'
    : 'WAITING...';

  const spo2StatusLabel = vitals
    ? vitals.spo2 < 95
      ? 'HYPOXIA'
      : 'HEALTHY'
    : 'WAITING...';

  return (
    <div className="animate-in" ref={containerRef}>
      {/* Top Header */}
      <div className="vitals-header">
        <div />
        <ConnectionStatus isConnected={isConnected} />
      </div>

      {/* Patient Detail Panel */}
      <div className="card patient-panel">
        <div className="label">Active Incident</div>
        <div className="event-name">
          {alertDetails?.event.toUpperCase() || 'PATIENT SIGNAL'}
        </div>
        <div className="patient-detail-row">
          <div>
            <div className="detail-label">Device Name</div>
            <div className="detail-value">
              {alertDetails?.deviceId || 'Simulated Wearable'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="detail-label">Signal Source</div>
            <div className="detail-value info">Pulse IoT Sensor</div>
          </div>
        </div>
      </div>

      {/* Dynamic Vitals Indicators Row */}
      <div className="vitals-row">
        {/* BPM Card */}
        <div className="card vital-card">
          <div className="vital-header">
            <div className="vital-label hr">Heart Rate</div>
            <div className="vital-icon">❤️</div>
          </div>
          <div className="vital-value-row">
            <div className="vital-number">{vitals?.hr ?? '--'}</div>
            <div className="vital-unit hr">BPM</div>
          </div>
          <div className={`vital-status ${hrStatus}`}>{hrStatusLabel}</div>
        </div>

        {/* SpO2 Card */}
        <div className="card vital-card">
          <div className="vital-header">
            <div className="vital-label spo2">Oxygen (SpO2)</div>
            <div className="vital-icon">💧</div>
          </div>
          <div className="vital-value-row">
            <div className="vital-number">{vitals?.spo2 ?? '--'}</div>
            <div className="vital-unit spo2">%</div>
          </div>
          <div className={`vital-status ${spo2Status}`}>{spo2StatusLabel}</div>
        </div>
      </div>

      {/* EKG / PPG Live Graph Box */}
      <div className="card waveform-card">
        <div className="waveform-header">
          <div className="waveform-title">Pulse</div>
          <div className="waveform-label ecg">Live ECG Trace</div>
        </div>
        <WaveformChart
          type="ppg"
          hrValue={vitals?.hr ?? 75}
          spo2Value={vitals?.spo2 ?? 98}
          width={chartWidth}
          height={120}
          strokeColor="#D62828"
          glowColor="rgba(214, 40, 40, 0.1)"
        />
      </div>

      {/* SpO2 Oxygen Plethysmograph Live Graph */}
      <div className="card waveform-card">
        <div className="waveform-header">
          <div className="waveform-title">SpO2 Wave</div>
          <div className="waveform-label spo2">Respiratory Flow</div>
        </div>
        <WaveformChart
          type="spo2"
          hrValue={vitals?.hr ?? 75}
          spo2Value={vitals?.spo2 ?? 98}
          width={chartWidth}
          height={120}
          strokeColor="#0694A2"
          glowColor="rgba(6, 148, 162, 0.1)"
        />
      </div>

      {/* Signal Diagnostics Panel */}
      <div className="card diagnostics-card">
        <div className="diagnostics-title">Diagnostics & Parameters</div>
        <div className="diagnostic-row">
          <div className="diag-label">Battery Level</div>
          <div className="diag-value">89%</div>
        </div>
        <div className="diagnostic-row">
          <div className="diag-label">Sampling Frequency</div>
          <div className="diag-value">25 Hz</div>
        </div>
        <div className="diagnostic-row">
          <div className="diag-label">Sensor Link Quality</div>
          <div className="diag-value success">Excellent (RSSI -58 dBm)</div>
        </div>
        <div className="diagnostic-row">
          <div className="diag-label">Data Refresh Interval</div>
          <div className="diag-value">Real-time (Streamed)</div>
        </div>
      </div>
    </div>
  );
}
