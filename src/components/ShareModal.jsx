import { useState } from 'react';
import { Share2, Copy, Check, X, AlertCircle } from 'lucide-react';
import useTwinStore from '../store/useTwinStore';

export default function ShareModal({ twinId, onClose }) {
    const { createShareLink } = useTwinStore();
    
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generatedLink, setGeneratedLink] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleCreate = async () => {
        if (!name.trim() || !password.trim()) {
            setError('Name and password are required');
            return;
        }
        if (!twinId) {
            setError('Please save the Twin first before sharing.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const link = await createShareLink({ twin_id: twinId, name, password });
            const url = `${window.location.origin}/live/${link.id}`;
            setGeneratedLink(url);
        } catch (e) {
            setError('Failed to create share link: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div className="glass" style={{
                padding: '32px', borderRadius: '20px', width: '400px',
                border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
                background: 'var(--surface-0)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(72,101,242,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Share2 size={20} color="#4865f2" />
                        </div>
                        <div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-0)' }}>Share Live View</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Create a secure link</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                {!generatedLink ? (
                    <>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>Share Name</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g. Manager View"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                style={{ width: '100%', fontSize: '14px' }}
                            />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px' }}>Password</label>
                            <input
                                type="password"
                                className="input"
                                placeholder="Set a secure password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                style={{ width: '100%', fontSize: '14px' }}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: '13px' }}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={loading} style={{ fontSize: '13px' }}>
                                {loading ? 'Creating...' : 'Create Link'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p style={{ fontSize: '13px', color: 'var(--text-1)', marginBottom: '16px' }}>
                            Your share link is ready. Anyone with this link and the password can view the live twin.
                        </p>
                        
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px',
                            background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: '10px',
                            marginBottom: '24px'
                        }}>
                            <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {generatedLink}
                            </div>
                            <button 
                                onClick={handleCopy}
                                style={{ 
                                    padding: '6px 12px', borderRadius: '6px', border: 'none', 
                                    background: copied ? '#10d98d' : 'var(--accent)', color: '#fff', 
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '12px', fontWeight: 600
                                }}
                            >
                                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: '13px' }}>
                                Close
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
