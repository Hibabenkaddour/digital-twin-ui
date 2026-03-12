import { useState, useEffect, useRef } from 'react';
import useTwinStore from '../store/useTwinStore';

export default function Chatbot() {
    const { chatMessages, sendMessage, kpis } = useTwinStore();
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const bottomRef = useRef();

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;
        setInput('');
        setIsTyping(true);
        sendMessage(text);
        setTimeout(() => setIsTyping(false), 900);
    };

    const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

    const suggestions = ['System status?', 'Critical alerts?', 'Recommendations?', 'KPI trends?'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-1)' }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg,#6395ff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    🤖
                </div>
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-0)' }}>Analytics AI</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10d98d', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                        Analyzing live KPI data
                    </div>
                </div>
                {/* Live KPI count badge */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                    {[{ color: '#10d98d', count: kpis.filter(k => k.status === 'green').length, label: 'OK' },
                    { color: '#f59e0b', count: kpis.filter(k => k.status === 'orange').length, label: 'Warn' },
                    { color: '#ef4444', count: kpis.filter(k => k.status === 'red').length, label: 'Crit' }].map(({ color, count, label }) => (
                        <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3px 7px', background: `${color}18`, borderRadius: '6px', border: `1px solid ${color}30` }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color }}>{count}</span>
                            <span style={{ fontSize: '9px', color: 'var(--text-2)' }}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {chatMessages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                            maxWidth: '88%',
                            padding: '9px 13px',
                            borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            background: msg.role === 'user'
                                ? 'linear-gradient(135deg,#6395ff,#8b5cf6)'
                                : 'var(--bg-0)',
                            border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                            fontSize: '12px',
                            lineHeight: 1.55,
                            color: msg.role === 'user' ? '#fff' : 'var(--text-1)',
                            whiteSpace: 'pre-wrap',
                        }}>
                            {formatMessage(msg.text)}
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-2)', marginTop: '3px', marginLeft: '4px', marginRight: '4px' }}>
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
                {isTyping && (
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'var(--bg-0)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {[0, 1, 2].map(i => (
                                    <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Suggestion chips */}
            <div style={{ padding: '6px 14px', display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                {suggestions.map(s => (
                    <button
                        key={s}
                        onClick={() => { setInput(s); setTimeout(handleSend, 50); }}
                        style={{
                            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500,
                            background: 'rgba(99,149,255,0.08)', border: '1px solid rgba(99,149,255,0.2)',
                            color: 'var(--accent)', cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,149,255,0.16)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,149,255,0.08)'}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', flexShrink: 0 }}>
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask about your KPIs, alerts, recommendations..."
                    rows={2}
                    style={{
                        flex: 1, background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '10px',
                        padding: '8px 12px', color: 'var(--text-0)', fontSize: '12px', resize: 'none', outline: 'none',
                        fontFamily: 'inherit',
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    style={{
                        width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, alignSelf: 'flex-end',
                        background: input.trim() ? 'linear-gradient(135deg,#6395ff,#8b5cf6)' : 'var(--bg-0)',
                        border: '1px solid var(--border)', cursor: input.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                        transition: 'all 0.15s',
                    }}
                >
                    ➤
                </button>
            </div>

            <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
        </div>
    );
}

function formatMessage(text) {
    // Bold ** marks
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={i} style={{ color: 'inherit', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        return part;
    });
}
