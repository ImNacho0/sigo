import React, { useState } from 'react';
import {
    X, Fingerprint,
    Users, Database, Info,
    TrendingUp, Shield
} from 'lucide-react';
import { mockVulnerabilityData, getSeverityColor } from '../data/mockData';

interface EnciclopediaModalProps {
    onClose: () => void;
}

export const EnciclopediaModal: React.FC<EnciclopediaModalProps> = ({ onClose }) => {
    const [selectedId, setSelectedId] = useState(mockVulnerabilityData[0].id);
    const [isClosing, setIsClosing] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const selectedCountry = mockVulnerabilityData.find(c => c.id === selectedId) || mockVulnerabilityData[0];

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300); // Match animation duration
    };

    return (
        <>
            <style>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalFadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                @keyframes modalContentSlideIn {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes modalContentSlideOut {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(20px); opacity: 0; }
                }
                .modal-overlay-fade-in {
                    animation: modalFadeIn 0.3s ease-out forwards;
                }
                .modal-overlay-fade-out {
                    animation: modalFadeOut 0.3s ease-in forwards;
                }
                .modal-content-slide-in {
                    animation: modalContentSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .modal-content-slide-out {
                    animation: modalContentSlideOut 0.3s ease-in forwards;
                }
                @keyframes contentFadeInScale {
                    from { opacity: 0; transform: scale(0.98) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .content-transition {
                    animation: contentFadeInScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @media (max-width: 768px) {
                    .enc-modal-container {
                        width: 100% !important;
                        height: 100% !important;
                        max-height: 100vh !important;
                        max-width: 100vw !important;
                        flex-direction: column !important;
                        border-radius: 0 !important;
                    }
                    .enc-sidebar {
                        width: 100% !important;
                        height: 80px !important;
                        flex-direction: row !important;
                        overflow-x: auto !important;
                        overflow-y: hidden !important;
                        border-right: none !important;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                        padding: 10px !important;
                    }
                    .enc-sidebar-header { display: none !important; }
                    .enc-header { padding: 16px 20px !important; flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
                    .enc-header-title { fontSize: 24px !important; }
                    .enc-header-subtitle { display: none !important; }
                    .enc-content-scroll { padding: 20px !important; }
                    .enc-stats-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                    .enc-two-col { grid-template-columns: 1fr !important; gap: 24px !important; }
                    .hacker-card { flex-direction: column !important; }
                    .hacker-photo-container { width: 100% !important; height: 250px !important; }
                    .mobile-hide { display: none !important; }
                    .enc-close-btn { 
                        position: fixed !important; 
                        top: 15px !important; 
                        right: 15px !important; 
                        z-index: 10000 !important;
                        background: rgba(255, 42, 95, 0.2) !important;
                        border: 1px solid rgba(255, 42, 95, 0.4) !important;
                    }
                }
            `}</style>
            <div
                className={isClosing ? 'modal-overlay-fade-out' : 'modal-overlay-fade-in'}
                onClick={handleClose}
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: isMobile ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: isMobile ? 'none' : 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: isMobile ? '0' : '40px'
                }}
            >
                <div
                    className={`${isClosing ? 'modal-content-slide-out' : 'modal-content-slide-in'} enc-modal-container`}
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '1280px',
                        height: '85vh',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)',
                        display: 'flex',
                        overflow: 'hidden'
                    }}>
                    {/* Sidebar */}
                    <div className="enc-sidebar" style={{
                        width: '320px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        flexShrink: 0,
                        overflowX: isMobile ? 'auto' : 'visible',
                        overflowY: isMobile ? 'hidden' : 'auto'
                    }}>
                        <div className="enc-sidebar-header" style={{ padding: '32px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <Fingerprint size={24} color="var(--vuln-critical)" />
                                <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
                                    Enciclopedia
                                </h2>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Base de Datos de Inteligencia
                            </p>
                        </div>

                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: isMobile ? 'hidden' : 'auto', padding: isMobile ? '0 10px' : '16px' }}>
                            <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '8px' }}>
                                {mockVulnerabilityData.map((country) => (
                                    <button
                                        key={country.id}
                                        onClick={() => setSelectedId(country.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            background: selectedId === country.id ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                            border: '1px solid',
                                            borderColor: selectedId === country.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                            color: selectedId === country.id ? '#fff' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            textAlign: 'left',
                                            width: isMobile ? 'auto' : '100%',
                                            whiteSpace: 'nowrap'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedId !== country.id) {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                                e.currentTarget.style.color = '#fff';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedId !== country.id) {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                            }
                                        }}
                                    >
                                        <img
                                            src={`https://flagcdn.com/w40/${country.id}.png`}
                                            alt={country.country}
                                            style={{ width: '24px', borderRadius: '3px', filter: selectedId === country.id ? 'none' : 'grayscale(0.5) opacity(0.7)' }}
                                        />
                                        <span style={{ fontSize: '14px', fontWeight: selectedId === country.id ? 700 : 500, flex: 1 }}>{country.country}</span>
                                        {selectedId === country.id && (
                                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: getSeverityColor(country.status) }} />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {!isMobile && (
                            <div style={{ padding: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Estado Global</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--vuln-critical)', boxShadow: '0 0 10px var(--vuln-critical)' }} />
                                    <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>Alerta de Amenaza Alta</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Main Content Area */}
                    <div key={selectedId} className="content-transition" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(0,0,0,0.1)', position: 'relative' }}>
                        {/* Header */}
                        <div className="enc-header" style={{
                            padding: '32px 48px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.01)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '16px' : '24px' }}>
                                <img
                                    src={`https://flagcdn.com/w160/${selectedCountry.id}.png`}
                                    alt={selectedCountry.country}
                                    style={{ width: '64px', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                                />
                                <div>
                                    <h1 className="enc-header-title" style={{ color: '#fff', fontSize: '32px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                                        {selectedCountry.country}
                                    </h1>
                                    <div className="enc-header-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            color: getSeverityColor(selectedCountry.status),
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            textTransform: 'uppercase'
                                        }}>
                                            <Shield size={14} /> Riesgo: {selectedCountry.status}
                                        </div>
                                        <div className="mobile-hide" style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)' }} />
                                        <button
                                            className="mobile-hide"
                                            onClick={() => {
                                                const el = document.getElementById('cybercriminals-section');
                                                el?.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            style={{
                                                background: 'rgba(255,42,95,0.1)',
                                                border: '1px solid rgba(255,42,95,0.2)',
                                                color: 'var(--vuln-critical)',
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s ease',
                                                outline: 'none',
                                                boxShadow: '0 0 10px rgba(255,42,95,0.1)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255,42,95,0.2)';
                                                e.currentTarget.style.boxShadow = '0 0 15px rgba(255,42,95,0.3)';
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255,42,95,0.1)';
                                                e.currentTarget.style.boxShadow = '0 0 10px rgba(255,42,95,0.1)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            <Users size={12} /> CIBERDELINCUENTES DESTACADOS
                                        </button>
                                        <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)' }} />
                                        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                            ID: {selectedCountry.id.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                className="enc-close-btn"
                                onClick={handleClose}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,42,95,0.1)';
                                    e.currentTarget.style.color = 'var(--vuln-critical)';
                                    e.currentTarget.style.borderColor = 'rgba(255,42,95,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.color = '#fff';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                }}
                            >
                                <X size={isMobile ? 18 : 20} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="custom-scrollbar enc-content-scroll" style={{ padding: '48px', overflowY: 'auto', flex: 1 }}>
                            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                                {/* Top Stats Grid */}
                                <div className="enc-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-blue)', marginBottom: '16px' }}>
                                            <Database size={18} />
                                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Exfiltración Total</span>
                                        </div>
                                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>{selectedCountry.leakSize}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Volumen de datos recuperados.</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--vuln-critical)', marginBottom: '16px' }}>
                                            <Users size={18} />
                                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Población Afectada</span>
                                        </div>
                                        <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>{selectedCountry.docs.toLocaleString()}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedCountry.totalPopulation > 0 ? Math.min(100, Math.round((selectedCountry.docs / selectedCountry.totalPopulation) * 100)) : 0}% de la población expuesta.</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--vuln-medium)', marginBottom: '16px' }}>
                                            <TrendingUp size={18} />
                                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Valor de Mercado</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>{selectedCountry.censusPrice}</span>
                                                {selectedCountry.id === 'es' && (
                                                    <span style={{ fontSize: '14px', color: 'var(--vuln-critical)', fontWeight: 700 }}>
                                                        {selectedCountry.extraDataValue}
                                                    </span>
                                                )}
                                            </div>
                                            {selectedCountry.id === 'es' && (
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: 'rgba(255,42,95,0.9)',
                                                    fontWeight: 600,
                                                    background: 'rgba(255,42,95,0.08)',
                                                    padding: '2px 10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid rgba(255,42,95,0.15)',
                                                    width: 'fit-content',
                                                    marginTop: '4px'
                                                }}>
                                                    PAQUETE COMPLETO (300GB)
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Precio estimado en Dark Web.</div>
                                    </div>
                                </div>

                                {/* Two Column Layout for Details */}
                                <div className="enc-two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '48px', marginBottom: '48px' }}>
                                    <div>
                                        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Info size={20} color="var(--accent-blue)" /> Detalles
                                        </h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.8, marginBottom: '32px' }}>
                                            {selectedCountry.leakDetails}. La infraestructura crítica ha mostrado brechas significativas en los últimos ciclos de auditoría.
                                        </p>

                                        <h4 style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>
                                            Vectores de Datos Comprometidos
                                        </h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {selectedCountry.sensitiveDataHeaders.map((header, idx) => (
                                                <span key={idx} style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    color: '#fff',
                                                    fontSize: '12px',
                                                    padding: '6px 14px',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    fontFamily: 'monospace'
                                                }}>
                                                    {header}
                                                </span>
                                            ))}
                                        </div>

                                        <div style={{ marginTop: '40px' }}>
                                            <h4 style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>
                                                Actividad Reciente de Brechas
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {(() => {
                                                    const breachData: Record<string, { date: string, event: string, status: string }[]> = {
                                                        'es': [
                                                            { date: '2023', event: 'Endesa (Ransomware / Intrusión)', status: 'CRÍTICO' },
                                                            { date: '2024', event: 'Banco Santander (Filtración interna)', status: 'ALTO' },
                                                            { date: '2023', event: 'Hospital Clínic (Ransomware)', status: 'CRÍTICO' }
                                                        ],
                                                        'cl': [
                                                            { date: '2022', event: 'Estado Mayor Conjunto (Correos)', status: 'CRÍTICO' },
                                                            { date: '2023', event: 'Poder Judicial (Ransomware)', status: 'ALTO' },
                                                            { date: '2020', event: 'BancoEstado (Intrusión)', status: 'ALTO' }
                                                        ],
                                                        'pe': [
                                                            { date: '2023', event: 'DIRIN (Inteligencia Policial)', status: 'CRÍTICO' },
                                                            { date: '2022', event: 'RENIEC (Datos Ciudadanos)', status: 'ALTO' },
                                                            { date: '2023', event: 'Ministerio de Salud (Ataque)', status: 'MEDIO' }
                                                        ],
                                                        'ar': [
                                                            { date: '2023', event: 'Mi Argentina (Cuentas)', status: 'ALTO' },
                                                            { date: '2022', event: 'Poder Judicial CBA (Ransomware)', status: 'CRÍTICO' },
                                                            { date: '2023', event: 'CNV (Filtración de Datos)', status: 'ALTO' }
                                                        ],
                                                        'ni': [
                                                            { date: '2023', event: 'Min. Gobernación (Webs Ofic.)', status: 'ALTO' },
                                                            { date: '2022', event: 'Consejo Supremo Electoral', status: 'MEDIO' },
                                                            { date: '2023', event: 'Portales Gubernamentales', status: 'ALTO' }
                                                        ],
                                                        'sv': [
                                                            { date: '2023', event: 'Movistar (Datos Clientes)', status: 'ALTO' },
                                                            { date: '2023', event: 'Procuraduría Gral. (Fuga)', status: 'CRÍTICO' },
                                                            { date: '2022', event: 'Ministerio de Salud', status: 'ALTO' }
                                                        ],
                                                        'py': [
                                                            { date: '2023', event: 'Novaestrat (Registros Gubernamentales)', status: 'ALTO' },
                                                            { date: '2022', event: 'IPS (Instituto de Previsión Social)', status: 'MEDIO' },
                                                            { date: '2023', event: 'Ministerio de Hacienda', status: 'MEDIO' }
                                                        ]
                                                    };
                                                    const cases = breachData[selectedCountry.id] || breachData['es'];
                                                    return cases.map((item, idx) => (
                                                        <div key={idx} style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '12px 16px',
                                                            background: 'rgba(255,255,255,0.02)',
                                                            borderRadius: '12px',
                                                            border: '1px solid rgba(255,255,255,0.03)'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.date}</div>
                                                                <div style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>{item.event}</div>
                                                            </div>
                                                            <div style={{
                                                                fontSize: '10px',
                                                                fontWeight: 800,
                                                                color: item.status === 'CRÍTICO' ? 'var(--vuln-critical)' : item.status === 'ALTO' ? 'var(--vuln-high)' : 'var(--vuln-medium)'
                                                            }}>
                                                                {item.status}
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.015)', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)' }}>
                                        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Shield size={20} color="var(--vuln-high)" /> Inteligencia Nacional
                                        </h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            {/* Leaders Section */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
                                                    <img src={selectedCountry.presidentPhoto} alt={selectedCountry.president} style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '2px' }}>Líder Ejecutivo</div>
                                                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{selectedCountry.president}</div>
                                                    </div>
                                                </div>

                                                {selectedCountry.id === 'es' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <img src="/fotos/felipe_vi.jpg" alt="Felipe VI" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                        <div>
                                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', marginBottom: '2px' }}>Jefe de Estado</div>
                                                            <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Felipe VI (Rey de España)</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Intel Cards */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)' }}>
                                                            <Info size={14} color="#3b82f6" />
                                                        </div>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>SERVICIO DE INTELIGENCIA</span>
                                                    </div>
                                                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', paddingLeft: '32px' }}>{selectedCountry.secretService}</div>
                                                </div>

                                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.1)' }}>
                                                            <TrendingUp size={14} color="#f43f5e" />
                                                        </div>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Índice de Cibercrimen</span>
                                                    </div>
                                                    <div style={{ paddingLeft: '32px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                            <span style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>{selectedCountry.cybercrimePercentage}</span>
                                                            <span style={{ color: 'var(--vuln-critical)', fontSize: '10px', fontWeight: 800 }}>RIESGO ALTO</span>
                                                        </div>
                                                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                            <div style={{
                                                                width: selectedCountry.cybercrimePercentage.split('-')[1].trim(),
                                                                height: '100%',
                                                                background: 'linear-gradient(90deg, #3b82f6, #f43f5e)',
                                                                borderRadius: '2px'
                                                            }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION: Ciberdelincuentes destacados */}
                                <div id="cybercriminals-section" style={{ marginTop: '64px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '64px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                                        <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <Users size={28} color="var(--vuln-critical)" /> Ciberdelincuentes destacados
                                        </h2>
                                        <div style={{ fontSize: '12px', color: 'var(--vuln-critical)', background: 'rgba(255,42,95,0.1)', padding: '6px 12px', borderRadius: '20px', fontWeight: 700, border: '1px solid rgba(255,42,95,0.2)' }}>
                                            INTELIGENCIA NACIONAL
                                        </div>
                                    </div>

                                    {(() => {
                                        const hackerProfiles: Record<string, { name: string, realName?: string, type: string, info: string, cases: string[], photo?: string }> = {
                                            'es': {
                                                name: '"Alcasec"',
                                                realName: 'Jose Luis Huertas Rubio',
                                                type: 'Intrusión Avanzada',
                                                info: 'Experto en exfiltración de bases de datos estatales. Su arquitectura de ataque se centraba en la explotación de vulnerabilidades en el Punto Neutro Judicial y la Policía Nacional.',
                                                cases: ['Punto Neutro Judicial', 'Agencia Tributaria', 'Censo Electoral'],
                                                photo: new URL('../assets/hackers/alcasec.jpg', import.meta.url).href
                                            },
                                            'cl': {
                                                name: 'AnonGhost Chile',
                                                type: 'Hacktivismo',
                                                info: 'Vinculado a Anonymous Chile, este grupo se especializó en ataques coordinados contra portales estatales para denuncias sociales.',
                                                cases: ['Webs Gubernamentales', 'Anonymous Operation', 'Defacements 2013'],
                                                photo: new URL('../assets/hackers/chileciber.jpg', import.meta.url).href
                                            },
                                            'pe': {
                                                name: 'InkaRoot',
                                                type: 'Exfiltración Crítica',
                                                info: 'Entidad responsable de una de las filtraciones más graves de inteligencia policial en Perú, comprometiendo años de registros internos.',
                                                cases: ['DIRIN Leaks', 'Fuga de Inteligencia', 'Archivos SIPOL']
                                            },
                                            'ar': {
                                                name: 'Julio César Ardita',
                                                type: 'Intrusión Militar',
                                                info: 'Histórico de los años 90 conocido como "El Gritón". Logró penetrar redes de máxima seguridad incluyendo la NASA y el Departamento de Defensa de EE.UU.',
                                                cases: ['NASA Access', 'DoD Network', 'Harvard Servers'],
                                                photo: new URL('../assets/hackers/argentinaciber.jpg', import.meta.url).href
                                            },
                                            'ni': {
                                                name: 'Anonymous Nicaragua',
                                                type: 'Hacktivismo Político',
                                                info: 'Célula local centrada en la denuncia de censura y control estatal mediante la caída de servicios críticos del gobierno.',
                                                cases: ['Sitos Gov', 'OpNicaragua', 'Bases Electorales'],
                                                photo: new URL('../assets/hackers/nicaraguaciber.jpg', import.meta.url).href
                                            },
                                            'sv': {
                                                name: 'Guacamaya',
                                                type: 'Hacktivismo Regional',
                                                info: 'Grupo de gran impacto que operó contra instituciones militares salvadoreñas, exponiendo masivamente correos y planes de seguridad del Estado.',
                                                cases: ['Fuerzas Armadas', 'Correos Militares', 'OpCentla']
                                            },
                                            'py': {
                                                name: 'Ciber-PY',
                                                type: 'Exfiltración de Datos',
                                                info: 'Grupo emergente centrado en el compromiso de infraestructura crítica y registros civiles en Paraguay.',
                                                cases: ['Novaestrat Leak', 'IPS Data Breaches', 'Gov.py Intrusions']
                                            },
                                            'bo': {
                                                name: 'Anonymous Bolivia',
                                                type: 'Hacktivismo',
                                                info: 'Células vinculadas a Anonymous han participado en ataques y filtraciones contra instituciones bolivianas en contextos políticos y sociales.',
                                                cases: ['Páginas gubernamentales', 'Filtración de datos institucionales', 'Ataques DDoS a portales oficiales']
                                            },
                                            've': {
                                                name: 'The Binary Guardians',
                                                type: 'Hacktivismo',
                                                info: 'Grupo venezolano conocido por atacar sitios web gubernamentales y difundir mensajes políticos mediante intrusiones y desfiguraciones.',
                                                cases: ['Consejo Nacional Electoral', 'Portales del gobierno', 'Medios estatales']
                                            },
                                            'ec': {
                                                name: 'Machete',
                                                type: 'Ciberespionaje',
                                                info: 'Grupo de ciberespionaje activo en Latinoamérica, identificado por campañas dirigidas contra gobiernos y fuerzas militares, incluyendo objetivos en Ecuador.',
                                                cases: ['Fuerzas armadas', 'Ministerios gubernamentales', 'Correos institucionales']
                                            }
                                        };

                                        const hacker = hackerProfiles[selectedCountry.id] || hackerProfiles['es'];

                                        return (
                                            <div className="hacker-card" style={{
                                                background: 'linear-gradient(135deg, rgba(255, 42, 95, 0.05) 0%, rgba(0, 0, 0, 0.4) 100%)',
                                                border: '1px solid rgba(255, 42, 95, 0.15)',
                                                borderRadius: '24px',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                                                flexDirection: isMobile ? 'column' : 'row'
                                            }}>
                                                <div className="hacker-photo-container" style={{ width: isMobile ? '100%' : '300px', flexShrink: 0, position: 'relative', height: isMobile ? '250px' : 'auto' }}>
                                                    {hacker.photo ? (
                                                        <img src={hacker.photo} alt={hacker.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', background: 'rgba(15, 23, 42, 1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Users size={80} color="rgba(255, 42, 95, 0.2)" />
                                                        </div>
                                                    )}
                                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
                                                        <div style={{ color: 'var(--vuln-critical)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}></div>
                                                        <div style={{ color: '#fff', fontSize: '24px', fontWeight: 800 }}>{hacker.name}</div>
                                                    </div>
                                                </div>
                                                <div style={{ flex: 1, padding: isMobile ? '24px' : '40px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {hacker.realName && (
                                                                <div style={{ color: '#fff', fontSize: '18px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                                    {hacker.realName}
                                                                </div>
                                                            )}
                                                            <div style={{ background: 'rgba(255, 42, 95, 0.1)', padding: '6px 14px', borderRadius: '12px', border: '1px solid rgba(255, 42, 95, 0.2)', color: 'var(--vuln-critical)', fontSize: '12px', fontWeight: 700, width: 'fit-content' }}>
                                                                {hacker.type}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7, marginBottom: '24px' }}>
                                                        {hacker.info}
                                                    </p>

                                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
                                                        {hacker.cases.map((c, i) => (
                                                            <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 10px rgba(255,42,95,0.05)' }}>
                                                                <div style={{ color: 'var(--vuln-critical)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>HIT #{i + 1}</div>
                                                                <div style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>{c}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
