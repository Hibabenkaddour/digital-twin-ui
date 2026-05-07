import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { initKeycloak } from './services/keycloak';
import useTwinStore from './store/useTwinStore';

const root = createRoot(document.getElementById('root'));

// ── Premium DXC loading screen while Keycloak initialises ──────────────────
root.render(
    <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-0, #f4f5f7)',
        gap: '24px', fontFamily: "'Inter', sans-serif",
    }}>
        {/* Animated logo mark */}
        <div style={{
            width: '64px', height: '64px', borderRadius: '18px',
            background: 'linear-gradient(135deg, #4865f2, #f4723e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: 900, color: 'white',
            boxShadow: '0 0 40px rgba(72,101,242,0.4)',
            animation: 'pulse 2s ease-in-out infinite',
        }}>
            ⬡
        </div>
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-0, #1e293b)' }}>
                Digital Twin Platform
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-2, #64748b)', marginTop: '4px' }}>
                Authenticating with Keycloak…
            </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 30px rgba(72,101,242,.3)} 50%{box-shadow:0 0 60px rgba(72,101,242,.6)} }`}</style>
    </div>
);

// ── Initialise Keycloak — redirects to login if not authenticated ───────────
initKeycloak(
    (token, tokenParsed) => {
        // Store auth state in Zustand so all components can access user info
        useTwinStore.getState().setAuth(token, tokenParsed);

        // Render the actual app
        root.render(
            <StrictMode>
                <App />
            </StrictMode>
        );
    },
    (_err) => {
        // Show a clear error state if Keycloak can't be reached
        root.render(
            <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                height: '100vh', background: '#f4f5f7',
                gap: '16px', fontFamily: "'Inter', sans-serif",
                color: '#ef4444',
            }}>
                <div style={{ fontSize: '32px' }}>⚠️</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>
                    Cannot connect to Keycloak
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '360px', textAlign: 'center' }}>
                    Make sure Keycloak is running on <code>http://localhost:8080</code> and the
                    realm <code>DigitalTwin</code> with client <code>digital-twin-client</code> exists.
                </div>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '8px 20px', borderRadius: '8px',
                        background: '#4865f2', color: 'white', border: 'none',
                        cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }
);
