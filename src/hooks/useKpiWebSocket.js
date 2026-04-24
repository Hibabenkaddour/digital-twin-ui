import { useEffect, useRef, useState, useCallback } from 'react';
import useTwinStore from '../store/useTwinStore';

const WS_URL = (domain = 'factory') => {
  // In dev: VITE_API_URL = 'http://localhost:8000' → ws://localhost:8000/ws/...
  // In prod: no env var → use current browser host with ws:// or wss://
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return `${envUrl.replace(/^http/, 'ws')}/ws/kpis?domain=${domain}`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/kpis?domain=${domain}`;
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
  // Tracks the domain that the current WebSocket was opened for.
  // Prevents stale messages from a closing WS polluting the new domain's state.
  const activeDomainRef = useRef(domain);

  // When domain changes, clear stale KPI data immediately so the old domain's
  // values never appear under the new domain.
  useEffect(() => {
    activeDomainRef.current = domain;
    useTwinStore.getState().clearKpis();
  }, [domain]);

  // Ref pattern : évite de mettre updateKpiFromWS dans les dépendances de useCallback.
  // Sans ça, chaque update du store crée une nouvelle référence de fonction → connect()
  // se recrée → useEffect se relance → reconnexion WebSocket infinie.
  const updateKpiFromWSRef = useRef(null);
  updateKpiFromWSRef.current = useTwinStore.getState().updateKpiFromWS;

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
        // Drop messages from a stale WS that was opened for a different domain
        if (activeDomainRef.current !== domain) return;
        try {
          const msg = JSON.parse(event.data);
          const handler = updateKpiFromWSRef.current;
          if (msg.type === 'ping') { ws.send(JSON.stringify({ type: 'ping' })); return; }
          if (msg.type === 'snapshot') { msg.readings?.forEach(r => handler?.(r)); setLastUpdate(new Date()); return; }
          if (msg.type === 'kpi') { handler?.(msg); setLastUpdate(new Date()); setMessageCount(c => c + 1); }
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
  }, [domain]); // domain est la seule vraie dépendance

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
