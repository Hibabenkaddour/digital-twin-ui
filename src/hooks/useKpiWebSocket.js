/**
 * useKpiWebSocket — connects to the backend WebSocket and feeds
 * real-time KPI readings into the Zustand store.
 *
 * Features:
 * - Auto-reconnect with exponential backoff (1s → 30s max)
 * - On connect: receives snapshot of latest KPI values immediately
 * - Handles ping/pong heartbeats
 * - Exposes connection status: connecting | live | reconnecting | offline
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import useTwinStore from '../store/useTwinStore';

const WS_URL = (domain = 'airport') => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const wsBase = baseUrl.replace(/^http/, 'ws');
  return `${wsBase}/ws/kpis?domain=${domain}`;
};

const STATUS = {
  CONNECTING: 'connecting',
  LIVE: 'live',
  RECONNECTING: 'reconnecting',
  OFFLINE: 'offline',
};

export default function useKpiWebSocket(domain = 'airport') {
  const [status, setStatus] = useState(STATUS.CONNECTING);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [messageCount, setMessageCount] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const retryDelay = useRef(1000);
  const mounted = useRef(true);

  const { updateKpiFromWS } = useTwinStore();

  const connect = useCallback(() => {
    if (!mounted.current) return;

    try {
      setStatus(STATUS.CONNECTING);
      const ws = new WebSocket(WS_URL(domain));
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mounted.current) return;
        setStatus(STATUS.LIVE);
        retryDelay.current = 1000; // reset backoff
        console.log('[WS] Connected to KPI stream');
      };

      ws.onmessage = (event) => {
        if (!mounted.current) return;
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'ping') {
            // respond with pong
            ws.send(JSON.stringify({ type: 'ping' }));
            return;
          }

          if (msg.type === 'snapshot') {
            // Apply all latest values at once
            msg.readings?.forEach(r => updateKpiFromWS?.(r));
            setLastUpdate(new Date());
            return;
          }

          if (msg.type === 'kpi') {
            updateKpiFromWS?.(msg);
            setLastUpdate(new Date());
            setMessageCount(c => c + 1);
          }
        } catch (e) {
          console.warn('[WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        if (!mounted.current) return;
        setStatus(STATUS.RECONNECTING);
        console.log(`[WS] Disconnected — reconnecting in ${retryDelay.current}ms`);
        reconnectTimer.current = setTimeout(() => {
          retryDelay.current = Math.min(retryDelay.current * 2, 30000);
          connect();
        }, retryDelay.current);
      };

      ws.onerror = () => {
        setStatus(STATUS.OFFLINE);
        ws.close();
      };
    } catch (e) {
      setStatus(STATUS.OFFLINE);
    }
  }, [domain, updateKpiFromWS]);

  useEffect(() => {
    mounted.current = true;
    connect();
    return () => {
      mounted.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const disconnect = () => {
    mounted.current = false;
    clearTimeout(reconnectTimer.current);
    wsRef.current?.close();
    setStatus(STATUS.OFFLINE);
  };

  return { status, lastUpdate, messageCount, disconnect, STATUS };
}
