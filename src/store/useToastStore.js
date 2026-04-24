import { create } from 'zustand';

let _nextId = 1;

const useToastStore = create((set) => ({
  toasts: [],

  addToast: (message, type = 'error', duration = 4500) => {
    const id = _nextId++;
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration);
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

// Helper utilisable en dehors des composants React (ex: service API, stores Zustand)
export const toast = {
  error:   (msg, duration) => useToastStore.getState().addToast(msg, 'error',   duration),
  success: (msg, duration) => useToastStore.getState().addToast(msg, 'success', duration),
  warning: (msg, duration) => useToastStore.getState().addToast(msg, 'warning', duration),
  info:    (msg, duration) => useToastStore.getState().addToast(msg, 'info',    duration),
};

export default useToastStore;
