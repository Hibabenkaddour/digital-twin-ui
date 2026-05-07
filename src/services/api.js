/**
 * API Client — typed service for all backend calls.
 * Uses Vite dev proxy (see vite.config.js) — no CORS issues.
 * In production, set VITE_API_URL env var to backend URL.
 *
 * Auth: automatically refreshes the Keycloak token before each request
 * and injects the Bearer header. No manual token management needed.
 */

import keycloak from './keycloak';
import useTwinStore from '../store/useTwinStore';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path, options = {}) {
    // Refresh token if it expires within the next 30 seconds
    try {
        // Only attempt refresh if keycloak is properly initialized and authenticated
        if (keycloak && keycloak.authenticated && keycloak.token) {
            await keycloak.updateToken(30).catch(err => {
                console.warn('Token refresh silent failure:', err);
            });
            // Sync store with whatever token we have now
            useTwinStore.getState().setAuth(keycloak.token, keycloak.tokenParsed);
        }
    } catch (e) {
        console.error('Keycloak updateToken critical error:', e);
    }

    const token = keycloak?.token || useTwinStore.getState().token;

    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        let errStr = `Erreur ${res.status} ${res.statusText}`;
        try {
            const txt = await res.text();
            if (txt) {
                const j = JSON.parse(txt);
                errStr = j.detail || errStr;
            }
        } catch (e) {}
        throw new Error(errStr);
    }

    const txt = await res.text();
    try {
        return txt ? JSON.parse(txt) : {};
    } catch (e) {
        throw new Error('Invalid JSON from API: ' + txt.substring(0, 50));
    }
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

// ─── Data Source API ─────────────────────────────────────────────────────────

export async function connectTelemetryDb(sourceType, dbUrl, credentials = {}) {
    return apiFetch('/source/connect', {
        method: 'POST',
        body: JSON.stringify({ source_type: sourceType, db_url: dbUrl, credentials }),
    });
}

export async function selectTelemetryTable(tableName) {
    return apiFetch('/source/table', {
        method: 'POST',
        body: JSON.stringify({ table_name: tableName }),
    });
}

export async function getTelemetrySchema() {
    return apiFetch('/source/schema');
}

export async function uploadTelemetryFile(file) {
    const form = new FormData();
    form.append('file', file);
    return apiFetch('/source/upload', {
        method: 'POST',
        body: form,
    });
}

export async function saveTelemetryAssignments(domain, assignments) {
    return apiFetch('/source/assign', {
        method: 'POST',
        body: JSON.stringify({ domain, assignments }),
    });
}

export async function disconnectTelemetry() {
    return apiFetch('/source', { method: 'DELETE' });
}

export async function getTelemetryStatus() {
    return apiFetch('/source/status');
}

export async function proposeKpis(domain, columns) {
    return apiFetch('/source/propose_kpis', {
        method: 'POST',
        body: JSON.stringify({ domain, columns }),
    });
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

// ─── Twins CRUD API ───────────────────────────────────────────────────────────

export async function listTwins() {
    return apiFetch('/twins');
}

export async function getTwin(twinId) {
    return apiFetch(`/twins/${twinId}`);
}

export async function saveTwin(twinId, state) {
    return apiFetch(`/twins/${twinId}`, {
        method: 'PUT',
        body: JSON.stringify(state),
    });
}

export async function deleteTwin(twinId) {
    return apiFetch(`/twins/${twinId}`, { method: 'DELETE' });
}

// ─── Share Link API ───────────────────────────────────────────────────────────

export async function createShareLink(data) {
    return apiFetch('/share', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function listShareLinks() {
    return apiFetch('/share');
}

export async function updateShareLink(shareId, data) {
    return apiFetch(`/share/${shareId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteShareLink(shareId) {
    return apiFetch(`/share/${shareId}`, { method: 'DELETE' });
}

export async function verifyShareLink(shareId, password) {
    // NOTE: This call does NOT go through apiFetch because it's intentionally
    // unauthenticated — the shared viewer may not have a Keycloak account.
    const BASE = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${BASE}/share/${shareId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    });
    if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || `Error ${res.status}`);
    }
    return res.json();
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
