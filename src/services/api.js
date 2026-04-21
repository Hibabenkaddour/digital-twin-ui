/**
 * API Client — typed service for all backend calls.
 * Uses Vite dev proxy (see vite.config.js) — no CORS issues.
 * In production, set VITE_API_URL env var to backend URL.
 */

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

// ─── Layout API ───────────────────────────────────────────────────────────────

export async function layoutPrompt(prompt, currentState) {
    return apiFetch('/layout/prompt', {
        method: 'POST',
        body: JSON.stringify({ prompt, currentState }),
    });
}

// ─── KPI API ──────────────────────────────────────────────────────────────────

export async function proposeKpis(domain, columns) {
    return apiFetch('/source/propose_kpis', {
        method: 'POST',
        body: JSON.stringify({ domain, columns }),
    });
}

// ─── Analytics API ────────────────────────────────────────────────────────────

export async function nlqQuery(question, { componentId, timeRange = '24h' } = {}) {
    return apiFetch('/analytics/query', {
        method: 'POST',
        body: JSON.stringify({ question, componentId, timeRange }),
    });
}

export async function getQuerySuggestions() {
    return apiFetch('/analytics/suggestions');
}

// ─── Health check ─────────────────────────────────────────────────────────────

export async function checkBackendHealth() {
    try {
        const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
        return res.ok;
    } catch {
        return false;
    }
}
