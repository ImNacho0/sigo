import React, { useState } from 'react';
import { ChevronLeft, Key, Copy, Activity, Crown, User, Database, Search, Eye, EyeOff, Cpu, Globe, Zap } from 'lucide-react';

interface ProfileViewProps {
    onBack: () => void;
    profileData?: any;
    licenseName?: string;
    licenseRole?: string;
    licenseType?: string;
    isClosing?: boolean;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onBack, profileData, licenseName, licenseRole, licenseType, isClosing }) => {
    const [showKey, setShowKey] = useState(false);
    const [copied, setCopied] = useState(false);

    const safeProfile = profileData || {};

    const role = licenseRole || safeProfile.role || 'user';
    const name = licenseName || safeProfile.name || 'OPERADOR';
    const type = licenseType || safeProfile.type || safeProfile.license_type || 'N/A';
    const key = safeProfile.key || '';

    // Explicitly check for fields in safeProfile (prioritizing backend data)
    const used_search = safeProfile.used_search !== undefined ? safeProfile.used_search : 0;
    const quota_search = safeProfile.quota_search !== undefined ? safeProfile.quota_search : 0;
    const used_padron = safeProfile.used_padron !== undefined ? safeProfile.used_padron : 0;
    const quota_padron = safeProfile.quota_padron !== undefined ? safeProfile.quota_padron : 0;

    const handleCopy = () => {
        if (key) {
            navigator.clipboard.writeText(key);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const censorKey = (k: string) => {
        if (!k || k.length < 8) return '•••• •••• ••••';
        const start = k.slice(0, 4);
        const end = k.slice(-4);
        return `${start} •••• •••• ${end}`;
    };

    const calculatePercentage = (used: number, quota: number) => {
        if (!quota || quota === 0) return 0;
        return Math.min(100, Math.round((used / quota) * 100));
    };

    if (!profileData) {
        return (
            <div style={{ position: 'absolute', inset: 0, zIndex: 2000, background: '#020617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <div style={{ color: '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>Error: No hay datos de sesión disponibles.</div>
                <button onClick={onBack} style={{ marginTop: '20px', padding: '10px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', border: 'none', cursor: 'pointer' }}>Regresar</button>
            </div>
        );
    }

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: isClosing ? 'fadeOutOverlay 0.5s ease forwards' : 'fadeInOverlay 0.5s ease forwards',
            overflow: 'hidden'
        }}>
            <style>
                {`
                @keyframes fadeInOverlay { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(12px); } }
                @keyframes fadeOutOverlay { from { opacity: 1; backdrop-filter: blur(12px); } to { opacity: 0; backdrop-filter: blur(0px); } }
                @keyframes slideUpCard { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes slideDownCard { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(40px) scale(0.95); } }
                @keyframes pulseGlow { 0% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.1); } 50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.2); } 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.1); } }
                @keyframes meshGradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                
                .glass-card {
                    background: rgba(13, 17, 28, 0.8);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                
                .stat-box {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    transition: all 0.3s ease;
                }
                
                .stat-box:hover {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: rgba(59, 130, 246, 0.3);
                    transform: translateY(-2px);
                }

                .progress-glow {
                    filter: drop-shadow(0 0 8px currentColor);
                }
                `}
            </style>

            {/* Background Mesh */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.05) 0%, transparent 50%), #0B0F19',
                zIndex: -1
            }}></div>

            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '900px',
                animation: isClosing ? 'slideDownCard 0.4s ease-in forwards' : 'slideUpCard 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}>
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', padding: '0 8px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px', animation: 'pulseGlow 2s infinite' }}></div>
                            <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6', letterSpacing: '4px', textTransform: 'uppercase', margin: 0 }}>Terminal de Operador</h2>
                        </div>
                        <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>Panel de Ajustes</h1>
                    </div>
                    <button onClick={onBack} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        backdropFilter: 'blur(10px)'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                        <ChevronLeft size={18} /> Salir
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>

                    {/* Left Column: Identity & Access */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Identity Card */}
                        <div className="glass-card" style={{ borderRadius: '24px', padding: '32px', position: 'relative', overflow: 'hidden' }}>
                            {/* Decorative Icon in background */}
                            <Crown size={120} style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.03, transform: 'rotate(-15deg)', color: '#fff' }} />

                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '24px',
                                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                                }}>
                                    {role === 'owner' ? <Crown size={40} color="#fbbf24" strokeWidth={1.5} /> : <User size={40} color="#3b82f6" strokeWidth={1.5} />}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>Personal de Campo</span>
                                        <div style={{
                                            padding: '4px 10px',
                                            background: role === 'owner' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                            borderRadius: '6px',
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            color: role === 'owner' ? '#fbbf24' : '#3b82f6',
                                            border: `1px solid ${role === 'owner' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
                                        }}>{role.toUpperCase()}</div>
                                    </div>
                                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>{name}</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                <div className="stat-box" style={{ padding: '16px', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                                        <Globe size={14} /> Región de Operación
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{safeProfile.region || 'Israel (Mossad)'}</div>
                                </div>
                                <div className="stat-box" style={{ padding: '16px', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                                        <Cpu size={14} /> Tipo Licencia
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: (type === 'all' || type === 'ultimate') ? '#fbbf24' : '#3b82f6', textTransform: 'capitalize' }}>{type}</div>
                                </div>
                            </div>

                            {/* License Key Section */}
                            <div style={{ marginTop: '32px' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px', paddingLeft: '4px' }}>Token de Acceso Seguro (UCO)</div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '16px 20px',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <Key size={18} color="#3b82f6" />
                                    <span style={{
                                        flex: 1,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: '15px',
                                        letterSpacing: '1px',
                                        color: showKey ? '#fff' : 'rgba(255,255,255,0.3)',
                                        transition: 'color 0.3s ease'
                                    }}>
                                        {showKey ? key : censorKey(key)}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => setShowKey(!showKey)}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        >
                                            {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                        <button
                                            onClick={handleCopy}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: copied ? '#10b981' : '#fff', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        >
                                            <Copy size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Statistics & Usage */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="glass-card" style={{ borderRadius: '24px', padding: '32px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Activity size={20} color="#3b82f6" />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Uso de Cuotas</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', flex: 1 }}>

                                {/* Searches Quota */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                                                <Search size={14} /> Búsquedas Generales
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>
                                                {used_search} <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 500, fontSize: '18px' }}>/ {quota_search}</span>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#3b82f6' }}>{calculatePercentage(used_search, quota_search)}%</div>
                                    </div>

                                    <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '100px', overflow: 'hidden', padding: '2px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${calculatePercentage(used_search, quota_search)}%`,
                                            background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                            borderRadius: '100px',
                                            transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                            boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)'
                                        }}></div>
                                    </div>

                                    <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>RECURSOS CONSUMIDOS</span>
                                        <span>FALTAN {Math.max(0, quota_search - used_search)} CONSULTAS</span>
                                    </div>
                                </div>

                                {/* Padron Quota */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                                                <Database size={14} /> Consultas de Padrón
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>
                                                {used_padron} <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 500, fontSize: '18px' }}>/ {quota_padron}</span>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#10b981' }}>{calculatePercentage(used_padron, quota_padron)}%</div>
                                    </div>

                                    <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '100px', overflow: 'hidden', padding: '2px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${calculatePercentage(used_padron, quota_padron)}%`,
                                            background: 'linear-gradient(90deg, #10b981, #34d399)',
                                            borderRadius: '100px',
                                            transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                            boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)'
                                        }}></div>
                                    </div>

                                    <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>INTELIGENCIA CIVIL</span>
                                        <span>FALTAN {Math.max(0, quota_padron - used_padron)} CONSULTAS</span>
                                    </div>
                                </div>

                                <div style={{
                                    marginTop: 'auto',
                                    padding: '20px',
                                    background: 'rgba(59, 130, 246, 0.05)',
                                    borderRadius: '16px',
                                    border: '1px dashed rgba(59, 130, 246, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px'
                                }}>
                                    <div style={{ width: '64px', height: '32px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Zap size={16} color="#3b82f6" />
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4' }}>
                                        Las cuotas se reinician diariamente a las <span style={{ color: '#fff', fontWeight: 700 }}>00:00 CET</span>. El uso indebido puede resultar en suspensión.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.15)', textTransform: 'uppercase', letterSpacing: '6px', fontWeight: 800 }}>MOSSAD INTEL ENGINE // HA-MOʿADON</div>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;
