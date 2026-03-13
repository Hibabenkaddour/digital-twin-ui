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

export async function getLayoutState(layoutId = 'default') {
    return apiFetch(`/layout/state/${layoutId}`);
}

export async function saveLayoutState(state) {
    return apiFetch('/layout/state', {
        method: 'PUT',
        body: JSON.stringify(state),
    });
}

// ─── KPI API ──────────────────────────────────────────────────────────────────

export async function importKpiFile(file, componentId, kpiName, { valueCol, timestampCol, unit } = {}) {
    const form = new FormData();
    form.append('file', file);
    form.append('component_id', componentId);
    form.append('kpi_name', kpiName);
    if (valueCol) form.append('value_col', valueCol);
    if (timestampCol) form.append('timestamp_col', timestampCol);
    if (unit) form.append('unit', unit);

    const res = await fetch(`${BASE_URL}/kpis/import`, { method: 'POST', body: form });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Import failed');
    }
    return res.json();
}

export async function getComponentKpis(componentId, kpiName, limit = 200) {
    const params = new URLSearchParams();
    if (kpiName) params.set('kpi_name', kpiName);
    params.set('limit', limit);
    return apiFetch(`/kpis/${componentId}?${params}`);
}

export async function getKpiSummary() {
    return apiFetch('/kpis/summary');
}

export async function pushRealtimeKpi(componentId, kpiName, value, unit = '') {
    const params = new URLSearchParams({ component_id: componentId, kpi_name: kpiName, value, unit });
    return apiFetch(`/kpis/realtime?${params}`, { method: 'POST' });
}

// ─── Analytics API ────────────────────────────────────────────────────────────

export async function nlqQuery(question, { componentId, timeRange = '24h' } = {}) {
    return apiFetch('/analytics/query', {
        method: 'POST',
        body: JSON.stringify({ question, componentId, timeRange }),
    });
}

export async function chartFromPrompt(prompt, data) {
    return apiFetch('/analytics/chart', {
        method: 'POST',
        body: JSON.stringify({ prompt, data }),
    });
}

export async function getQueryHistory(limit = 20) {
    return apiFetch(`/analytics/history?limit=${limit}`);
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
