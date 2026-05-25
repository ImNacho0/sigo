import React, { useState } from 'react';
import israelLogo from '../assets/branding/israel.png';

interface LoginProps {
    onLoginSuccess: (data: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!key.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('operator_key', key);
                // Subtle delay for "verification" feel without heavy animation
                setTimeout(() => {
                    onLoginSuccess(data);
                }, 800);
            } else {
                setError(data.error || 'ACCESS_DENIED: INVALID_TOKEN');
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setError('LINK_FAILURE: CONTEXT_LOST');
            setLoading(false);
        }
    };

    return (
        <div style={{
            fontFamily: "'Inter', sans-serif",
            backgroundColor: 'var(--bg-base)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            width: '100vw',
            margin: 0,
            color: 'var(--text-primary)',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999,
            overflow: 'hidden'
        }}>
            {/* Subtle Grid Background */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(var(--border-subtle) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.1,
                zIndex: 0
            }} />

            <div className="animate-fade-in" style={{
                width: '100%',
                maxWidth: '380px',
                position: 'relative',
                zIndex: 1,
                padding: '2rem'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <img
                        src={israelLogo}
                        alt="Mossad"
                        style={{
                            width: '40px',
                            height: '40px',
                            marginBottom: '1.5rem',
                            opacity: 0.6,
                            filter: 'grayscale(1)'
                        }}
                    />
                    <h1 className="mono" style={{
                        fontSize: '11px',
                        letterSpacing: '5px',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        margin: 0
                    }}>System Authentication</h1>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="OPERATOR_KEY"
                            autoFocus
                            required
                            className="mono"
                            style={{
                                width: '100%',
                                padding: '12px 0',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderBottom: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            height: '1px',
                            width: loading ? '100%' : '0%',
                            backgroundColor: 'var(--accent-blue)',
                            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mono"
                        style={{
                            width: '100%',
                            padding: '14px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border-subtle)',
                            color: loading ? 'var(--text-muted)' : 'var(--text-primary)',
                            fontSize: '10px',
                            letterSpacing: '3px',
                            textTransform: 'uppercase',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {loading ? 'Verifying...' : 'Establish Link'}
                        {loading && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(transparent, rgba(59, 130, 246, 0.1), transparent)',
                                animation: 'scan 1.5s infinite linear'
                            }} />
                        )}
                    </button>
                </form>

                {error && (
                    <div className="mono" style={{
                        color: 'var(--vuln-critical)',
                        fontSize: '9px',
                        marginTop: '1.5rem',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        {error}
                    </div>
                )}

                <div className="mono" style={{
                    marginTop: '4rem',
                    textAlign: 'center',
                    fontSize: '8px',
                    color: 'var(--text-muted)',
                    opacity: 0.4,
                    letterSpacing: '2px'
                }}>
                    70.21.144.1 // SECURE_NODE_04
                </div>
            </div>

            <style>
                {`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
                .mono {
                    font-family: 'JetBrains Mono', monospace !important;
                }
                `}
            </style>
        </div>
    );
};

export default Login;
