import React from 'react';
import { LogOut, X } from 'lucide-react';

interface LogoutModalProps {
    onConfirm: () => void;
    onClose: () => void;
    isClosing: boolean;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ onConfirm, onClose, isClosing }) => {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            animation: isClosing ? 'fadeOut 0.3s ease-in forwards' : 'fadeIn 0.3s ease-out forwards'
        }}>
            <style>{`
                @keyframes modalEntry {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .modal-content {
                    animation: modalEntry 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            <div className="glass-panel modal-content" style={{
                width: '100%',
                maxWidth: '400px',
                padding: '40px',
                textAlign: 'center',
                border: '1px solid rgba(255, 42, 95, 0.2)',
                boxShadow: '0 40px 100px rgba(0, 0, 0, 0.8)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Visual Accent */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: '60px', height: '2px',
                    background: 'var(--vuln-critical)',
                    opacity: 0.5
                }} />

                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(255, 42, 95, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    color: 'var(--vuln-critical)'
                }}>
                    <LogOut size={32} />
                </div>

                <h2 className="mono" style={{
                    fontSize: '14px',
                    letterSpacing: '3px',
                    color: '#fff',
                    textTransform: 'uppercase',
                    marginBottom: '12px'
                }}>
                    Confirmar Desconexión
                </h2>

                <p className="mono" style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6',
                    marginBottom: '32px',
                    opacity: 0.8
                }}>
                    ¿Desea finalizar la sesión segura actual?<br />
                    El túnel encriptado se destruirá inmediatamente.
                </p>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    <button
                        onClick={onConfirm}
                        className="mono"
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'var(--vuln-critical)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                    >
                        Terminar Conexión
                    </button>
                    <button
                        onClick={onClose}
                        className="mono"
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                        }}
                    >
                        Permanecer Online
                    </button>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.2)'}
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default LogoutModal;
