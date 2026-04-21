import { useEffect, useRef, useState, useCallback } from 'react';
import useTwinStore from '../store/useTwinStore';

const WS_URL = (domain = 'factory') => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const wsBase  = baseUrl.replace(/^http/, 'ws');
  return `${wsBase}/ws/kpis?domain=${domain}`;
};

const STATUS = {
  CONNECTING:   'connecting',
  LIVE:         'live',
  RECONNECTING: 'reconnecting',
  OFFLINE:      'offline',
};

export default function useKpiWebSocket(domain = 'factory') {
  const [status,       setStatus]       = useState(STATUS.CONNECTING);
  const [lastUpdate,   setLastUpdate]   = useState(null);
  const [messageCount, setMessageCount] = useState(0);
  const wsRef          = useRef(null);
  const reconnectTimer = useRef(null);
  const retryDelay     = useRef(1000);
  const mounted        = useRef(true);
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
        retryDelay.current = 1000;
      };

      ws.onmessage = (event) => {
        if (!mounted.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ping') { ws.send(JSON.stringify({ type: 'ping' })); return; }
          if (msg.type === 'snapshot') { msg.readings?.forEach(r => updateKpiFromWS?.(r)); setLastUpdate(new Date()); return; }
          if (msg.type === 'kpi') { updateKpiFromWS?.(msg); setLastUpdate(new Date()); setMessageCount(c => c + 1); }
        } catch {}
      };

      ws.onclose = () => {
        if (!mounted.current) return;
        setStatus(STATUS.RECONNECTING);
        reconnectTimer.current = setTimeout(() => {
          retryDelay.current = Math.min(retryDelay.current * 2, 30000);
          connect();
        }, retryDelay.current);
      };

      ws.onerror = () => { setStatus(STATUS.OFFLINE); ws.close(); };
    } catch { setStatus(STATUS.OFFLINE); }
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

  return { status, lastUpdate, messageCount, STATUS };
}
