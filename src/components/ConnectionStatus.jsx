import React from 'react';

export default function ConnectionStatus({ isConnected }) {
  return (
    <div className={`connection-badge ${isConnected ? 'connected' : 'offline'}`}>
      <div className={`connection-dot ${isConnected ? 'connected' : 'offline'}`} />
      {isConnected ? 'Live Connected' : 'Offline'}
    </div>
  );
}
