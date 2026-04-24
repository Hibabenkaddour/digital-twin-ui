import { toast } from '../store/useToastStore';

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

export async function layoutPrompt(prompt, currentState) {
  return apiFetch('/layout/prompt', { method: 'POST', body: JSON.stringify({ prompt, currentState }) });
}

export async function saveLayoutState(state) {
  return apiFetch('/layout/state', { method: 'PUT', body: JSON.stringify(state) });
}

export async function proposeKpis(domain, columns) {
  return apiFetch('/source/propose_kpis', { method: 'POST', body: JSON.stringify({ domain, columns }) });
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// Wrapper utilitaire : exécute un appel API et affiche un toast en cas d'erreur.
// Retourne null si l'appel échoue (évite les try/catch répétitifs dans les composants).
export async function safeApiFetch(path, options = {}, errorMessage = null) {
  try {
    return await apiFetch(path, options);
  } catch (e) {
    toast.error(errorMessage || e.message);
    return null;
  }
}
