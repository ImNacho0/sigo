import React, { useState, useRef, useEffect } from 'react';
import type { VulnerabilityData } from '../data/mockData';
import { mockVulnerabilityData } from '../data/mockData';
import { Info, Activity, ChevronDown, Compass, LogOut, User, Settings, Crown, ShieldCheck } from 'lucide-react';
import israelLogo from '../assets/branding/israel.png';

interface HeaderProps {
    onOpenAbout: () => void;
    onOpenEnciclopedia: () => void;
    onOpenSettings: () => void;
    selectedRegion?: VulnerabilityData | null;
    compareWithId?: string;
    onCompareChange?: (id: string) => void;
    onLogout?: () => void;
    licenseName?: string;
    licenseRole?: string;
}

const Header: React.FC<HeaderProps> = ({ onOpenAbout, onOpenEnciclopedia, onOpenSettings, selectedRegion, compareWithId, onCompareChange, onLogout, licenseName, licenseRole }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <>
            <style>{`
                @keyframes dropdownEntry {
                    from { 
                        opacity: 0; 
                        transform: translateX(-50%) translateY(-10px) scale(0.95); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateX(-50%) translateY(0) scale(1); 
                    }
                }
                .dropdown-animate {
                    animation: dropdownEntry 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes userDropdownEntry {
                    from { 
                        opacity: 0; 
                        transform: translateY(-10px) scale(0.95); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0) scale(1); 
                    }
                }
                .user-dropdown-animate {
                    animation: userDropdownEntry 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    transform-origin: top right;
                }
                .compare-item {
                    transition: all 0.2s ease;
                    border-radius: 10px;
                }
                .compare-item:hover {
                    background: rgba(255, 255, 255, 0.08) !important;
                    padding-left: 16px !important;
                    color: #fff !important;
                }
                @media (max-width: 768px) {
                    .nav-text { display: none; }
                    .header-container { 
                        gap: 16px !important; 
                        padding: 8px 16px !important;
                        top: 16px !important;
                        width: calc(100% - 32px) !important;
                        justify-content: space-between !important;
                    }
                }
            `}</style>
            <header
                className="header-container"
                style={{
                    position: 'absolute',
                    top: '32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1001,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '32px',
                    padding: '8px 32px',
                    background: isMobile ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: isMobile ? 'none' : 'blur(16px)',
                    borderRadius: '100px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)',
                    whiteSpace: 'nowrap'
                }}
            >
                {/* Branding Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px', paddingRight: isMobile ? '0' : '24px', borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
                    <img src={israelLogo} alt="Israel" style={{ height: isMobile ? '24px' : '32px', filter: 'brightness(1.5)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 900, color: '#fff', letterSpacing: '1px', textTransform: 'uppercase' }}>
                            RED<span style={{ color: 'var(--vuln-critical)' }}>SIGO</span> {!isMobile && <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: '8px' }}>| המוסד</span>}
                        </span>
                    </div>
                </div>

                {/* Action Section: Status or Comparison */}
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                    {selectedRegion && onCompareChange ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '6px 20px',
                                    background: compareWithId ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '100px',
                                    border: `1px solid ${compareWithId ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                    color: compareWithId ? 'var(--accent-blue)' : '#fff',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    boxShadow: compareWithId ? '0 0 20px rgba(59, 130, 246, 0.2)' : 'none'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = compareWithId ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.borderColor = compareWithId ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255, 255, 255, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = compareWithId ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.borderColor = compareWithId ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)';
                                }}
                            >
                                {compareWithId ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <img src={`https://flagcdn.com/w20/${selectedRegion.id}.png`} alt="flag" style={{ width: '16px', borderRadius: '2px' }} />
                                        <span style={{ fontSize: '9px', opacity: 0.5 }}>VS</span>
                                        <img src={`https://flagcdn.com/w20/${compareWithId}.png`} alt="flag" style={{ width: '16px', borderRadius: '2px' }} />
                                    </div>
                                ) : (
                                    <>
                                        <Compass size={14} />
                                        <span>Comparar País</span>
                                    </>
                                )}
                                <ChevronDown size={14} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                            </button>

                            {isDropdownOpen && (
                                <div
                                    className="custom-scrollbar dropdown-animate"
                                    style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 16px)',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'rgba(15, 23, 42, 0.98)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '20px',
                                        boxShadow: '0 25px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)',
                                        zIndex: 1000,
                                        maxHeight: '320px',
                                        overflowY: 'auto',
                                        backdropFilter: 'blur(24px)',
                                        minWidth: '220px',
                                        padding: '10px'
                                    }}
                                >
                                    <div style={{ padding: '8px 16px', fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Objetivos Disponibles</div>
                                    <div
                                        style={{
                                            padding: '10px 16px',
                                            fontSize: '11px',
                                            color: 'rgba(255,255,255,0.4)',
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            borderRadius: '10px',
                                            fontWeight: 700,
                                            letterSpacing: '1px'
                                        }}
                                        onClick={() => { onCompareChange(''); setIsDropdownOpen(false); }}
                                        className="compare-item"
                                    >
                                        Limpiar Selección
                                    </div>
                                    {mockVulnerabilityData.filter(r => r.id !== selectedRegion.id).map(r => (
                                        <div
                                            key={r.id}
                                            style={{
                                                padding: '10px 16px',
                                                fontSize: '12px',
                                                color: r.id === compareWithId ? 'var(--accent-blue)' : '#fff',
                                                cursor: 'pointer',
                                                textTransform: 'uppercase',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                background: r.id === compareWithId ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                borderRadius: '10px',
                                                fontWeight: 800,
                                                letterSpacing: '0.5px'
                                            }}
                                            onClick={() => { onCompareChange(r.id); setIsDropdownOpen(false); }}
                                            className="compare-item"
                                        >
                                            <img src={`https://flagcdn.com/w20/${r.id}.png`} alt="flag" style={{ width: '18px', borderRadius: '3px' }} />
                                            {r.country}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 16px',
                            background: 'rgba(0, 255, 120, 0.05)',
                            borderRadius: '100px',
                            border: '1px solid rgba(0, 255, 120, 0.1)'
                        }}>
                            <Activity size={12} color="#00ff78" />
                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#00ff78', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Sistemas Online
                            </span>
                        </div>
                    )}
                </div>

                {/* Navigation Section */}
                <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div
                        onClick={onOpenEnciclopedia}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: '13px',
                            fontWeight: 600,
                            transition: 'all 0.2s ease'
                        }}
                        className="hover-glow"
                        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                    >
                        <Compass size={16} /> <span className="nav-text">Enciclopedia</span>
                    </div>
                    <div
                        onClick={onOpenAbout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: '13px',
                            fontWeight: 600,
                            transition: 'all 0.2s ease'
                        }}
                        className="hover-glow"
                        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                    >
                        <Info size={16} /> <span className="nav-text">Acerca de</span>
                    </div>
                </nav>

                {/* User Dropdown Section */}
                {licenseName && (
                    <div style={{ position: 'relative', display: 'flex' }} ref={userDropdownRef}>
                        <button
                            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '4px 16px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '100px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                marginLeft: '8px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                        >
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: (licenseRole || '').toLowerCase() === 'owner' ? 'rgba(251, 191, 36, 0.2)' :
                                    (licenseRole || '').toLowerCase() === 'staff' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {(licenseRole || '').toLowerCase() === 'owner' ? (
                                    <Crown size={12} color="#fbbf24" />
                                ) : (licenseRole || '').toLowerCase() === 'staff' ? (
                                    <ShieldCheck size={12} color="#3b82f6" />
                                ) : (
                                    <User size={12} color="#94a3b8" />
                                )}
                            </div>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: (licenseRole || '').toLowerCase() === 'owner' ? '#fbbf24' :
                                    (licenseRole || '').toLowerCase() === 'staff' ? '#3b82f6' : '#94a3b8',
                                textShadow: (licenseRole || '').toLowerCase() !== 'user' ? `0 0 10px ${(licenseRole || '').toLowerCase() === 'owner' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(59, 130, 246, 0.4)'}` : 'none'
                            }}>
                                {licenseName}
                            </span>
                            <ChevronDown size={12} color="rgba(255,255,255,0.4)" style={{ transform: isUserDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                        </button>

                        {isUserDropdownOpen && (
                            <div
                                className="user-dropdown-animate"
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 12px)',
                                    right: 0,
                                    background: 'rgba(15, 23, 42, 0.98)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '16px',
                                    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                                    zIndex: 1000,
                                    minWidth: '200px',
                                    padding: '8px',
                                    backdropFilter: 'blur(20px)'
                                }}
                            >
                                <div
                                    onClick={() => { onOpenSettings(); setIsUserDropdownOpen(false); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: '#fff',
                                        cursor: 'pointer',
                                        borderRadius: '10px',
                                        transition: 'all 0.2s'
                                    }}
                                    className="compare-item"
                                >
                                    <Settings size={16} opacity={0.7} />
                                    Perfil / Ajustes
                                </div>
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 8px' }}></div>
                                <div
                                    onClick={() => { if (onLogout) onLogout(); setIsUserDropdownOpen(false); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: 'rgba(255, 42, 95, 0.8)',
                                        cursor: 'pointer',
                                        borderRadius: '10px',
                                        transition: 'all 0.2s'
                                    }}
                                    className="compare-item"
                                >
                                    <LogOut size={16} />
                                    Cerrar Sesión
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </header>
        </>
    );
};

export default Header;
