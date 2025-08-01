/**
 * WebSocket client for real-time updates
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  id: string;
}

export interface WebSocketConfig {
  url?: string;
  protocols?: string | string[];
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

export function useWebSocket(config: WebSocketConfig) {
  const {
    url = process.env.WS_BASE_URL || 'ws://localhost:3000',
    protocols,
    onOpen,
    onClose,
    onError,
    onMessage,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
  } = config;

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const reconnectCount = useRef(0);
  const { toast } = useToast();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const sendHeartbeat = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'heartbeat',
        payload: {},
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substring(2, 9),
      }));
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutId.current) {
      clearInterval(heartbeatTimeoutId.current);
    }
    heartbeatTimeoutId.current = setInterval(sendHeartbeat, heartbeatInterval);
  }, [sendHeartbeat, heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutId.current) {
      clearInterval(heartbeatTimeoutId.current);
      heartbeatTimeoutId.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    try {
      setConnectionStatus('connecting');
      
      ws.current = new WebSocket(url, protocols);

      ws.current.onopen = (event) => {
        setConnectionStatus('connected');
        reconnectCount.current = 0;
        startHeartbeat();
        onOpen?.(event);
        
        toast({
          title: 'Connected',
          description: 'Real-time connection established',
          variant: 'success',
        });
      };

      ws.current.onclose = (event) => {
        setConnectionStatus('disconnected');
        stopHeartbeat();
        onClose?.(event);

        // Attempt to reconnect if not a clean close
        if (!event.wasClean && reconnectCount.current < reconnectAttempts) {
          setConnectionStatus('reconnecting');
          reconnectCount.current++;
          
          toast({
            title: 'Connection lost',
            description: `Attempting to reconnect... (${reconnectCount.current}/${reconnectAttempts})`,
            variant: 'warning',
          });

          reconnectTimeoutId.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectCount.current >= reconnectAttempts) {
          setConnectionStatus('error');
          toast({
            title: 'Connection failed',
            description: 'Unable to establish real-time connection',
            variant: 'destructive',
          });
        }
      };

      ws.current.onerror = (event) => {
        setConnectionStatus('error');
        onError?.(event);
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Skip heartbeat responses
          if (message.type !== 'heartbeat') {
            onMessage?.(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      setConnectionStatus('error');
      console.error('WebSocket connection error:', error);
    }
  }, [url, protocols, onOpen, onClose, onError, onMessage, reconnectAttempts, reconnectInterval, startHeartbeat, stopHeartbeat, toast]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutId.current) {
      clearTimeout(reconnectTimeoutId.current);
      reconnectTimeoutId.current = null;
    }
    
    stopHeartbeat();
    
    if (ws.current) {
      ws.current.close(1000, 'Client disconnect');
      ws.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, [stopHeartbeat]);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        payload,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substring(2, 9),
      };
      
      ws.current.send(JSON.stringify(message));
      return message.id;
    } else {
      console.warn('WebSocket is not connected');
      return null;
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectionStatus,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting' || connectionStatus === 'reconnecting',
  };
}

// Hook for specific message types
export function useWebSocketSubscription(
  messageType: string,
  handler: (payload: any) => void,
  config?: Omit<WebSocketConfig, 'onMessage'>
) {
  const { lastMessage, ...websocket } = useWebSocket({
    ...config,
    onMessage: (message) => {
      if (message.type === messageType) {
        handler(message.payload);
      }
      config?.onOpen?.()
    },
  });

  useEffect(() => {
    if (lastMessage && lastMessage.type === messageType) {
      handler(lastMessage.payload);
    }
  }, [lastMessage, messageType, handler]);

  return websocket;
}