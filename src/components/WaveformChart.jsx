import React, { useEffect, useState, useRef, useMemo } from 'react';

export default function WaveformChart({
  hrValue = 75,
  spo2Value = 98,
  type = 'ppg', // 'ppg' or 'spo2'
  width = 600,
  height = 120,
  strokeColor = '#D62828',
  glowColor = 'rgba(214, 40, 40, 0.1)',
}) {
  const [points, setPoints] = useState(() => Array(80).fill(0));
  const tickRef = useRef(0);
  const hrRef = useRef(hrValue);
  const spo2Ref = useRef(spo2Value);

  // Keep refs in sync with props
  useEffect(() => {
    hrRef.current = hrValue;
  }, [hrValue]);

  useEffect(() => {
    spo2Ref.current = spo2Value;
  }, [spo2Value]);

  // Waveform generation loop — identical algorithm from vitals.tsx L68-117
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      const currentHr = hrRef.current;
      const currentSpo2 = spo2Ref.current;

      let val = 10;

      if (type === 'ppg') {
        // PPG (Heart Rate Pulse) waveform with systolic and diastolic peaks
        const ppgPeriod = Math.max(12, Math.min(40, Math.floor((60 / currentHr) * 20)));
        const ppgPhase = tickRef.current % ppgPeriod;

        if (ppgPhase < ppgPeriod * 0.15) {
          // Fast Systolic Upslope
          val = 10 + Math.sin((ppgPhase / (ppgPeriod * 0.15)) * Math.PI / 2) * 55;
        } else if (ppgPhase < ppgPeriod * 0.3) {
          // Systolic Peak Decay
          val = 65 - Math.sin(((ppgPhase - ppgPeriod * 0.15) / (ppgPeriod * 0.15)) * Math.PI / 2) * 25;
        } else if (ppgPhase < ppgPeriod * 0.45) {
          // Dicrotic Notch Bounce
          val = 40 + Math.sin(((ppgPhase - ppgPeriod * 0.3) / (ppgPeriod * 0.15)) * Math.PI / 2) * 10;
        } else {
          // Diastolic Decay
          const decayProgress = (ppgPhase - ppgPeriod * 0.45) / (ppgPeriod * 0.55);
          val = 10 + 40 * Math.exp(-decayProgress * 2.5);
        }
        // Slight noise for realism
        val += (Math.random() - 0.5) * 1.5;
      } else {
        // SpO2 (Oxygen Wave) — slow undulating respiratory wave
        const ppgPeriod = Math.max(12, Math.min(40, Math.floor((60 / currentHr) * 20)));
        const spo2Period = ppgPeriod * 2.5;
        const spo2Phase = tickRef.current % spo2Period;

        val = 20;
        if (spo2Phase < spo2Period * 0.4) {
          val = 20 + Math.sin((spo2Phase / (spo2Period * 0.4)) * Math.PI) * 25;
        } else {
          const decayProgress = (spo2Phase - spo2Period * 0.4) / (spo2Period * 0.6);
          val = 20 + 25 * Math.cos(decayProgress * Math.PI / 2);
        }
        // Noise based on current SpO2 level
        const noise = (Math.random() - 0.5) * (100 - currentSpo2) * 0.5;
        val += noise;
      }

      setPoints((prev) => [...prev.slice(1), val]);
    }, 40); // ~25 FPS

    return () => clearInterval(interval);
  }, [type]);

  // Generate SVG path
  const path = useMemo(() => {
    if (points.length === 0) return '';
    const maxVal = 80;
    return points
      .map((val, idx) => {
        const x = (idx / (points.length - 1)) * width;
        const y = height - (val / maxVal) * (height - 20) - 10;
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [points, width, height]);

  // Grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    const numCols = 15;
    const numRows = 6;
    for (let i = 0; i <= numCols; i++) {
      const x = (i / numCols) * width;
      lines.push(
        <line key={`v-${i}`} x1={x} y1={0} x2={x} y2={height} stroke="rgba(0, 0, 0, 0.06)" strokeWidth={1} />
      );
    }
    for (let i = 0; i <= numRows; i++) {
      const y = (i / numRows) * height;
      lines.push(
        <line key={`h-${i}`} x1={0} y1={y} x2={width} y2={y} stroke="rgba(0, 0, 0, 0.06)" strokeWidth={1} />
      );
    }
    return lines;
  }, [width, height]);

  return (
    <div className="waveform-container">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {gridLines}
        {/* Glow effect — thicker transparent stroke behind main line */}
        {path && (
          <path d={path} fill="none" stroke={glowColor} strokeWidth={7} />
        )}
        {/* Main line */}
        {path && (
          <path
            d={path}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}
