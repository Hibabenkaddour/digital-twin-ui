import useToastStore from '../store/useToastStore';

const STYLES = {
  error:   { bg: '#1a0a0a', border: '#ef4444', icon: '✕', color: '#ef4444' },
  success: { bg: '#0a1a0f', border: '#10d98d', icon: '✓', color: '#10d98d' },
  warning: { bg: '#1a1200', border: '#f59e0b', icon: '!', color: '#f59e0b' },
  info:    { bg: '#0a0f1a', border: '#4865f2', icon: 'i', color: '#4865f2' },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px',
      maxWidth: '380px', width: '100%',
    }}>
      {toasts.map(t => {
        const s = STYLES[t.type] || STYLES.info;
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            padding: '12px 14px', borderRadius: '10px',
            background: s.bg, border: `1px solid ${s.border}40`,
            boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${s.border}20`,
            animation: 'slideInRight 0.2s ease',
          }}>
            <span style={{
              width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
              background: `${s.border}20`, border: `1px solid ${s.border}60`,
              color: s.color, fontSize: '10px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {s.icon}
            </span>
            <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-0)', lineHeight: 1.5 }}>
              {t.message}
            </span>
            <button onClick={() => removeToast(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-2)', fontSize: '14px', lineHeight: 1,
              padding: '0 2px', flexShrink: 0,
            }}>×</button>
          </div>
        );
      })}
    </div>
  );
}
