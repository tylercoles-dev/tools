'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useRealtimeUpdates, useRealtimeConnection } from '@/hooks/use-realtime';
import { ConnectionStatusBanner } from './connection-status';

interface RealtimeContextType {
  connectionStatus: string;
  isConnected: boolean;
  sendMessage: (type: string, payload: any) => string | null;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  // Initialize real-time connection
  const connection = useRealtimeConnection();
  
  // Set up real-time update handlers
  useRealtimeUpdates();

  const contextValue: RealtimeContextType = {
    connectionStatus: connection.connectionStatus,
    isConnected: connection.isConnected,
    sendMessage: connection.sendMessage,
    reconnect: connection.connect,
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      <ConnectionStatusBanner 
        status={connection.connectionStatus}
        onReconnect={connection.connect}
      />
      {children}
    </RealtimeContext.Provider>
  );
}