import React from 'react';
import israelLogo from '../assets/branding/israel.png';
import { X, Shield, Globe, Lock, Cpu, Database, Eye, AlertTriangle } from 'lucide-react';

interface AboutModalProps {
    onClose: () => void;
    isClosing?: boolean;
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose, isClosing }) => {
    const countries = [
        { flag: 'es', name: 'España' },
        { flag: 'cl', name: 'Chile' },
        { flag: 'ar', name: 'Argentina' },
        { flag: 'pe', name: 'Perú' },
        { flag: 'bo', name: 'Bolivia' },
        { flag: 'ec', name: 'Ecuador' },
        { flag: 've', name: 'Venezuela' },
        { flag: 'py', name: 'Paraguay' },
        { flag: 'ni', name: 'Nicaragua' },
        { flag: 'sv', name: 'El Salvador' },
    ];

    return (
        <div className={isClosing ? 'animate-fade-out' : 'animate-fade-in'} style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(2, 4, 10, 0.97)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
        }}>
            <style>{`
                .about-card {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 20px;
                    padding: 28px;
                    transition: border-color 0.3s ease;
                }
                .about-card:hover { border-color: rgba(255,255,255,0.12); }
                .about-flag {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 8px;
                    font-size: 11px;
                    font-weight: 700;
                    color: rgba(255,255,255,0.6);
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                    transition: all 0.2s;
                }
                .about-flag:hover {
                    background: rgba(255,255,255,0.06);
                    color: #fff;
                    border-color: rgba(255,255,255,0.15);
                }
                .about-capability-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    padding: 18px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                }
                .about-capability-row:last-child { border-bottom: none; }
                .about-icon-box {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
            `}</style>

            <div className={`custom-scrollbar ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`} style={{
                width: '100%',
                maxWidth: '860px',
                height: '85vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(10, 15, 28, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
                position: 'relative'
            }}>
                {/* Ambient glow top-right */}
                <div style={{
                    position: 'absolute', top: '-80px', right: '-80px',
                    width: '320px', height: '320px',
                    background: 'radial-gradient(circle, rgba(255,42,95,0.07) 0%, transparent 70%)',
                    pointerEvents: 'none', zIndex: 0
                }} />
                <div style={{
                    position: 'absolute', bottom: '-60px', left: '-60px',
                    width: '260px', height: '260px',
                    background: 'radial-gradient(circle, rgba(0,240,255,0.05) 0%, transparent 70%)',
                    pointerEvents: 'none', zIndex: 0
                }} />

                {/* ── HERO HEADER ── */}
                <div style={{
                    position: 'relative', zIndex: 1,
                    padding: '40px 48px 36px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'linear-gradient(180deg, rgba(255,42,95,0.04) 0%, transparent 100%)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                                <img src={israelLogo} alt="" style={{ height: '28px', opacity: 0.9 }} />
                                <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.12)' }} />
                                <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '3px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                                    DOSSIER OPERACIONAL
                                </span>
                            </div>
                            <h1 style={{ fontSize: '36px', fontWeight: 900, margin: '0 0 10px 0', letterSpacing: '2px', color: '#fff', lineHeight: 1 }}>
                                RED<span style={{ color: 'var(--vuln-critical)' }}>SIGO</span>
                            </h1>
                            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5', maxWidth: '520px' }}>
                                Plataforma de inteligencia que indexa filtraciones masivas de datos y las expone al operador mediante búsqueda directa sobre cualquier identificador personal.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.5)',
                                width: '40px', height: '40px',
                                borderRadius: '12px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s', flexShrink: 0
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── BODY ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '36px 48px', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }} className="custom-scrollbar">

                    {/* ── AVISO DESTACADO ── */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '16px',
                        background: 'rgba(255,42,95,0.06)',
                        border: '1px solid rgba(255,42,95,0.2)',
                        borderRadius: '14px', padding: '18px 24px'
                    }}>
                        <AlertTriangle size={20} color="#ff2a5f" style={{ flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.5' }}>
                            <strong style={{ color: '#fff' }}>Aviso de acceso:</strong> Esta plataforma maneja datos sensibles procedentes de filtraciones ilegales. El acceso está restringido a operadores con licencia activa. El uso queda bajo la responsabilidad exclusiva del operador.
                        </p>
                    </div>

                    {/* ── DOS COLUMNAS: QUÉ ES + DATOS ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="about-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                                <div className="about-icon-box" style={{ background: 'rgba(255,42,95,0.1)', border: '1px solid rgba(255,42,95,0.2)' }}>
                                    <Eye size={18} color="#ff2a5f" />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>¿Qué hace?</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.7' }}>
                                Cualquier búsqueda —por nombre, DNI, NIE, teléfono, correo u otro campo— lanza consultas simultáneas sobre las bases de datos indexadas y devuelve los registros coincidentes en tiempo real, incluyendo variantes automáticas del identificador.
                            </p>
                        </div>

                        <div className="about-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                                <div className="about-icon-box" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                    <Database size={18} color="#3b82f6" />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>Origen de los datos</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.7' }}>
                                Filtraciones de bases de datos gubernamentales, censales y comerciales. Los volúmenes van desde decenas de miles hasta cientos de millones de registros por país, incluyendo PII crítica: DNI, direcciones, credenciales y datos financieros.
                            </p>
                        </div>
                    </div>

                    {/* ── CAPACIDADES ── */}
                    <div className="about-card" style={{ padding: '28px 32px' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                            Capacidades del sistema
                        </p>
                        <div>
                            <div className="about-capability-row">
                                <div className="about-icon-box" style={{ background: 'rgba(255,42,95,0.08)', border: '1px solid rgba(255,42,95,0.15)' }}>
                                    <Cpu size={17} color="#ff2a5f" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Búsqueda avanzada con IA</div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>Analiza los resultados, genera variantes del identificador y lanza búsquedas secundarias automáticamente. El asistente cruza fuentes y consolida perfiles en una sola vista.</div>
                                </div>
                            </div>
                            <div className="about-capability-row">
                                <div className="about-icon-box" style={{ background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.15)' }}>
                                    <Globe size={17} color="#00f0ff" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Cobertura multinacional</div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>Mapa interactivo con 10 países activos. Cada nación expone sus propias bases de datos, estadísticas de filtración, nivel de riesgo y perfil de inteligencia nacional.</div>
                                </div>
                            </div>
                            <div className="about-capability-row">
                                <div className="about-icon-box" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                    <Lock size={17} color="#10b981" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Infraestructura anónima</div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>Servida como hidden service en Tor. Sin recursos externos ni Google Fonts. Sin logs de sesión. El acceso se valida mediante licencias de operador con roles diferenciados.</div>
                                </div>
                            </div>
                            <div className="about-capability-row">
                                <div className="about-icon-box" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
                                    <Shield size={17} color="#fbbf24" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Fichas administrativas</div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>Generación de documentos oficiales (TA.1 y Modelo 030) con datos volcados directamente desde los registros encontrados, listos para su uso operacional.</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── PAÍSES ── */}
                    <div>
                        <p style={{ margin: '0 0 14px 0', fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                            Naciones cubiertas
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {countries.map(c => (
                                <div key={c.flag} className="about-flag">
                                    <img src={`https://flagcdn.com/w20/${c.flag}.png`} alt="" style={{ width: '16px', borderRadius: '2px' }} />
                                    {c.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── FOOTER ── */}
                <div style={{
                    padding: '20px 48px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    zIndex: 1, position: 'relative'
                }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                        RED SIGO · Acceso por licencia de operador
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(16,185,129,0.8)', letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
                            SISTEMAS ONLINE
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutModal;
