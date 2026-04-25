import React from 'react';
import israelLogo from '../assets/branding/israel.png';
import { X, Shield, Globe, Lock, Cpu, Database, Eye } from 'lucide-react';

interface AboutModalProps {
    onClose: () => void;
    isClosing?: boolean;
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose, isClosing }) => {
    return (
        <div className={isClosing ? 'animate-fade-out' : 'animate-fade-in'} style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(2, 4, 8, 0.98)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
        }}>
            <div className={`glass-panel custom-scrollbar ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`} style={{
                width: '100%',
                maxWidth: '900px',
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                position: 'relative'
            }}>
                {/* Background Accent */}
                <div style={{
                    position: 'absolute',
                    top: '-100px',
                    right: '-100px',
                    width: '300px',
                    height: '300px',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
                    zIndex: 0,
                    pointerEvents: 'none'
                }} />

                {/* Header */}
                <div style={{
                    padding: '40px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <img src={israelLogo} alt="Israel" style={{ height: '32px' }} />
                            <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '4px', margin: 0, color: '#fff' }}>
                                DOSSIER <span style={{ color: 'var(--vuln-critical)' }}>SIGO</span>
                            </h1>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase' }}>
                            Protocolo de Vigilancia y Mapeo de Vulnerabilidades Globales
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div style={{ padding: '40px', overflowY: 'auto', zIndex: 1, flex: 1 }} className="custom-scrollbar">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px' }}>
                        {/* Section 1: Vision */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--vuln-critical)' }}>
                                <Eye size={20} />
                                <h2 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Visión Estratégica</h2>
                            </div>
                            <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                                RED - SIGO opera como un nexo de inteligencia asíncrona para la detección de fugas masivas de datos gubernamentales y civiles. Monitorizamos activamente la Dark Web para anticipar amenazas a la soberanía digital.
                            </p>
                        </div>

                        {/* Section 2: Coverage */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#3b82f6' }}>
                                <Globe size={20} />
                                <h2 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Cobertura Global</h2>
                            </div>
                            <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                                Actualmente centrado en Israel, España y nodos clave en Latinoamérica (Chile, Argentina, Perú, Nicaragua, El Salvador). Nuestro mapa se expande modularmente según la relevancia de los incidentes detectados.
                            </p>
                        </div>

                        {/* Section 3: Tools */}
                        <div style={{ gridColumn: 'span 2', background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Integraciones del Sistema</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <Database size={24} color="var(--vuln-critical)" style={{ marginBottom: '12px' }} />
                                    <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '4px' }}>Enciclopedia</h4>
                                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Base de datos de ciberdelincuentes perfiles tácticos.</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <Cpu size={24} color="#3b82f6" style={{ marginBottom: '12px' }} />
                                    <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '4px' }}>Analítica</h4>
                                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Comparación masiva de volúmenes de filtración.</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <Lock size={24} color="#10b981" style={{ marginBottom: '12px' }} />
                                    <h4 style={{ fontSize: '13px', color: '#fff', marginBottom: '4px' }}>Encriptación</h4>
                                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Protocolos de túnel seguro para visualización de censos.</p>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Operational Status */}
                        <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,42,95,0.05)', padding: '16px 24px', borderRadius: '12px', border: '1px solid rgba(255,42,95,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Shield size={18} color="var(--vuln-critical)" />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>ESTADO COMERCIAL: OPERACIÓN ACTIVA</span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'rgba(255,42,95,0.6)', letterSpacing: '1px' }}>ID: 0x8F2E-MOSSAD-CORE</span>
                        </div>
                    </div>
                </div>

                {/* Footer Footer */}
                <div style={{ padding: '24px 40px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center' }}>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'center' }}>
                        Propiedad Intelectual de RED SIGO - En colaboración con departamentos de seguridad internacional
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AboutModal;
