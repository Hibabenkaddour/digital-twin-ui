import { create } from 'zustand';
import useTwinStore from './useTwinStore';

const _loadFromStorage = () => {
  try { return JSON.parse(localStorage.getItem('dt2_sessions') || '[]'); }
  catch { return []; }
};

const useSessionStore = create((set) => {
  // Closure variable to track the reset timeout and prevent early clearing
  let _saveTimeout = null;

  return {
  savedSessions: _loadFromStorage(),
  sessionSaved: false,

  saveSession: () => {
    const s = useTwinStore.getState();
    const id = `session_${Date.now()}`;
    const session = {
      id,
      name: s.twinName || 'Unnamed Twin',
      domain: s.selectedDomain || 'factory',
      savedAt: new Date().toISOString(),
      stats: {
        components: s.components.length,
        connections: s.connections.length,
        kpis: s.kpis.length,
      },
      snapshot: {
        twinName: s.twinName,
        selectedDomain: s.selectedDomain,
        width: s.width, length: s.length,
        gridCols: s.gridCols, gridRows: s.gridRows, cellSize: s.cellSize,
        components: s.components,
        connections: s.connections,
        kpis: s.kpis,
        activePanel: s.activePanel,
      },
    };
    const existing = _loadFromStorage();
    const idx = existing.findIndex(e => e.name === session.name && e.domain === session.domain);
    if (idx >= 0) existing[idx] = session; else existing.unshift(session);
    const updated = existing.slice(0, 10);
    localStorage.setItem('dt2_sessions', JSON.stringify(updated));
    if (_saveTimeout) clearTimeout(_saveTimeout);
    set({ savedSessions: updated, sessionSaved: true });
    _saveTimeout = setTimeout(() => { _saveTimeout = null; set({ sessionSaved: false }); }, 2500);
  },

  loadSession: (id) => {
    const sessions = _loadFromStorage();
    const session = sessions.find(s => s.id === id);
    if (!session?.snapshot) return;
    useTwinStore.setState({
      ...session.snapshot,
      currentStep: 5,
      kpiHistory: [],
      selectedComponentId: null,
      hoveredComponentId: null,
      activePanel: session.snapshot.activePanel || 'kpi',
    });
  },

  deleteSession: (id) => set(s => {
    const updated = s.savedSessions.filter(x => x.id !== id);
    localStorage.setItem('dt2_sessions', JSON.stringify(updated));
    return { savedSessions: updated };
  }),
  };
});

export default useSessionStore;
