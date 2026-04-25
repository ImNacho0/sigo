import React, { useState, useMemo, useRef, useEffect } from 'react';
import { getSeverityColor, mockVulnerabilityData } from '../data/mockData';
import type { VulnerabilityData } from '../data/mockData';
import { Users, HardDrive, AlertTriangle, Search, X, Clock, Fingerprint, FileSearch, Shield, Database, Activity } from 'lucide-react';
import { chileProvinces } from '../data/chileData';
import SearchWidget from './SearchWidget';

interface StatisticsPanelProps {
    region: VulnerabilityData | null;
    onClose: () => void;
    isClosing?: boolean;
    compareWithId?: string;
}

const formatNumber = (num: number) => new Intl.NumberFormat('es-ES').format(num);

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ region, onClose, isClosing, compareWithId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isExpanded, setIsExpanded] = useState(false);

    // Drag State
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const rafId = useRef<number | null>(null);

    const PEEK_HEIGHT = 60; // Initial "hidden" state
    const EXPANDED_HEIGHT = window.innerHeight * 0.8;
    const DRAG_THRESHOLD = 80;

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (rafId.current) cancelAnimationFrame(rafId.current);
        };
    }, []);

    // Locking background scroll when dragging - restricted to handle interaction
    useEffect(() => {
        if (isMobile && isDragging) {
            document.body.style.overflow = 'hidden';
            const preventDefault = (e: TouchEvent) => e.preventDefault();
            document.addEventListener('touchmove', preventDefault, { passive: false });
            return () => {
                document.body.style.overflow = '';
                document.removeEventListener('touchmove', preventDefault);
            };
        }
    }, [isMobile, isDragging]);

    const onHandleTouchStart = (e: React.TouchEvent) => {
        if (!isMobile) return;
        startY.current = e.targetTouches[0].clientY;
        setIsDragging(true);
        setDragY(0);
    };

    const onHandleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || !isMobile) return;

        const currentY = e.targetTouches[0].clientY;
        const deltaY = currentY - startY.current;

        if (rafId.current) cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(() => {
            setDragY(deltaY);
        });
    };

    const onHandleTouchEnd = () => {
        if (!isDragging || !isMobile) return;
        setIsDragging(false);

        const absoluteDrag = dragY;
        setDragY(0);

        if (isExpanded) {
            if (absoluteDrag > DRAG_THRESHOLD) setIsExpanded(false);
        } else {
            if (absoluteDrag < -DRAG_THRESHOLD) setIsExpanded(true);
        }
    };

    const filteredProvinces = useMemo(() => {
        if (!region || region.id !== 'cl') return [];
        return chileProvinces
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => b.lines - a.lines);
    }, [region, searchTerm]);

    if (!region) return null;

    getSeverityColor(region.status);
    const compareRegion = compareWithId ? mockVulnerabilityData.find(r => r.id === compareWithId) : null;
    const isComparing = !!compareRegion;

    const renderRegionData = (regionData: VulnerabilityData) => {
        const dColor = getSeverityColor(regionData.status);
        const dIsChile = regionData.id === 'cl';
        const dCalculatedPercentage = regionData.filteredDataPercentage;
        const dPopulationPercent = Math.min(100, Math.max(0, dCalculatedPercentage));
        return (
            <div style={{ padding: isMobile ? '0' : '0 12px' }}>
                {/* Nation Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                    <img
                        src={`https://flagcdn.com/w80/${regionData.id}.png`}
                        alt={`Bandera de ${regionData.country}`}
                        style={{ width: isMobile ? '40px' : '64px', height: 'auto', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                    />
                    <div>
                        <h2 style={{ fontSize: isMobile ? '24px' : '32px', margin: '0 0 4px 0', color: '#fff', fontWeight: 800 }}>{regionData.country}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: dColor, fontWeight: 700, textTransform: 'uppercase' }}>
                                <Shield size={14} /> Riesgo {regionData.status}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                <Clock size={12} />
                                <span>{regionData.lastScan}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Alert */}
                <div style={{ background: 'rgba(255, 42, 95, 0.05)', border: '1px solid rgba(255, 42, 95, 0.2)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <AlertTriangle size={20} color="var(--vuln-critical)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: '#fff' }}>ALERTA DE SEGURIDAD:</strong> {regionData.leakDetails}. PII crítica comprometida en múltiples vectores.
                    </div>
                </div>

                {/* Search Widget - Only shown in individual view */}
                {!isComparing && (
                    <div style={{ marginBottom: '24px' }}>
                        <SearchWidget region={regionData} />
                    </div>
                )}

                {/* Main Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'var(--bg-glass-hover)', borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border-subtle)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '120px', height: '120px', background: dColor, filter: 'blur(60px)', opacity: 0.1 }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
                                <Users size={20} color={dColor} />
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Registros Filtrados</span>
                            </div>
                            <div style={{ fontSize: isMobile ? '28px' : '34px', fontWeight: 800, color: dColor, letterSpacing: '-1px' }}>
                                {formatNumber(regionData.docs)}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                            <span>Población Total: {formatNumber(regionData.totalPopulation)}</span>
                            <span style={{ fontWeight: 700, color: '#fff' }}>{dCalculatedPercentage}%</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${dPopulationPercent}%`, background: `linear-gradient(90deg, var(--accent-blue), ${dColor})` }} />
                        </div>
                    </div>
                </div>

                {/* Secondary Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                            <HardDrive size={16} />
                            <span style={{ fontSize: '12px', fontWeight: 500 }}>Volumen de Filtración</span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{regionData.leakSize}</div>
                    </div>
                    <div style={{ background: 'rgba(255, 42, 95, 0.05)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid rgba(255,42,95,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                            <Fingerprint size={16} />
                            <span style={{ fontSize: '12px', fontWeight: 500 }}>Cibercrimen</span>
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--vuln-critical)' }}>{regionData.cybercrimePercentage}</div>
                    </div>
                </div>

                {/* Financial/Market Section */}
                <div style={{
                    marginBottom: '24px',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : (regionData.extraDataDesc ? '1fr 1fr' : '1fr'),
                    gap: '12px'
                }}>
                    {/* Primary Censo Card */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(255, 42, 95, 0.03) 0%, rgba(15, 23, 42, 0.4) 100%)',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid rgba(255, 42, 95, 0.15)',
                        position: 'relative',
                        overflow: 'hidden',
                        textAlign: !isMobile && !regionData.extraDataDesc ? 'center' : 'left'
                    }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                            Censo {regionData.censusType}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                            [{regionData.censusDate}]
                        </div>
                        <div style={{
                            fontSize: '24px',
                            fontWeight: 800,
                            color: 'var(--vuln-critical)',
                            textShadow: '0 0 15px rgba(255, 42, 95, 0.2)',
                            letterSpacing: '-1px'
                        }}>
                            {regionData.censusPrice}
                        </div>
                    </div>

                    {/* Extra Data Card (if exists) */}
                    {regionData.extraDataDesc && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(15, 23, 42, 0.4) 100%)',
                            borderRadius: '16px',
                            padding: '20px',
                            border: '1px solid rgba(59, 130, 246, 0.15)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                color: 'var(--accent-blue)',
                                marginBottom: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '1.2px'
                            }}>
                                {regionData.extraDataDesc}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                                Recopilación Extra
                            </div>
                            <div style={{
                                fontSize: '24px',
                                fontWeight: 800,
                                color: '#fff',
                                textShadow: '0 0 15px rgba(59, 130, 246, 0.2)',
                                letterSpacing: '-1px'
                            }}>
                                {regionData.extraDataValue}
                            </div>
                        </div>
                    )}
                </div>

                {/* COMPROMISED DATA HEADERS - Only shown in individual view */}
                {!isComparing && (
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <Database size={16} /> Vectores Comprometidos
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {regionData.sensitiveDataHeaders.map((header, idx) => (
                                <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', color: '#fff', fontFamily: 'monospace' }}>
                                    {header}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* INTELLIGENCE SECTION - Only shown in individual view */}
                {!isComparing && (
                    <div style={{
                        marginBottom: '40px',
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: '32px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '24px'
                        }}>
                            <h3 style={{
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                fontWeight: 700
                            }}>
                                <Shield size={14} /> Inteligencia Nacional
                            </h3>
                            <div style={{
                                height: '1px',
                                flex: 1,
                                background: 'linear-gradient(90deg, var(--border-subtle), transparent)',
                                marginLeft: '16px'
                            }}></div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* President */}
                            <div className="intelligence-card" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                background: 'rgba(255,255,255,0.02)',
                                padding: '14px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-subtle)',
                                transition: 'all 0.3s ease'
                            }}>
                                <img
                                    src={regionData.presidentPhoto}
                                    alt={regionData.president}
                                    style={{
                                        width: '52px',
                                        height: '52px',
                                        borderRadius: '8px',
                                        objectFit: 'cover',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                />
                                <div>
                                    <div style={{
                                        fontSize: '9px',
                                        color: 'var(--accent-blue)',
                                        textTransform: 'uppercase',
                                        fontWeight: 900,
                                        letterSpacing: '1.5px',
                                        marginBottom: '1px',
                                        fontFamily: 'JetBrains Mono, monospace'
                                    }}>
                                        PRESIDENTE
                                    </div>
                                    <div style={{
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '16px'
                                    }}>
                                        {regionData.president}
                                    </div>
                                </div>
                            </div>

                            {/* King (if exists) */}
                            {regionData.king && (
                                <div className="intelligence-card" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    background: 'rgba(255,255,255,0.02)',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-subtle)',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <img
                                        src={regionData.kingPhoto || '/placeholder.jpg'}
                                        alt={regionData.king}
                                        style={{
                                            width: '52px',
                                            height: '52px',
                                            borderRadius: '8px',
                                            objectFit: 'cover',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    />
                                    <div>
                                        <div style={{
                                            fontSize: '9px',
                                            color: 'var(--accent-blue)',
                                            textTransform: 'uppercase',
                                            fontWeight: 900,
                                            letterSpacing: '1.5px',
                                            marginBottom: '1px',
                                            fontFamily: 'JetBrains Mono, monospace'
                                        }}>
                                            REY / JEFE DE ESTADO
                                        </div>
                                        <div style={{
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '16px'
                                        }}>
                                            {regionData.king}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Secret Service */}
                            <div className="intelligence-card" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                background: 'rgba(59, 130, 246, 0.03)',
                                padding: '14px',
                                borderRadius: '12px',
                                border: '1px solid rgba(59, 130, 246, 0.15)',
                                transition: 'all 0.3s ease'
                            }}>
                                <div style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '8px',
                                    background: 'rgba(59, 130, 246, 0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(59, 130, 246, 0.2)'
                                }}>
                                    <Shield size={20} color="#3b82f6" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '9px',
                                        color: 'rgba(59, 130, 246, 0.8)',
                                        textTransform: 'uppercase',
                                        fontWeight: 900,
                                        letterSpacing: '1.5px',
                                        marginBottom: '1px',
                                        fontFamily: 'JetBrains Mono, monospace'
                                    }}>
                                        SERVICIO DE INTELIGENCIA
                                    </div>
                                    <div style={{
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        lineHeight: '1.2'
                                    }}>
                                        {regionData.secretService}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {dIsChile && !isComparing && (
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <FileSearch size={16} /> Desglose Provincial
                        </h3>
                        <div style={{ position: 'relative', marginBottom: '12px' }}>
                            <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Buscar provincia..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 12px 8px 36px', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                            />
                        </div>
                        <div className="custom-scrollbar" style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                            {filteredProvinces.map(prov => (
                                <div key={prov.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                                    <span style={{ color: '#fff', fontWeight: 500 }}>{prov.name}</span>
                                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{formatNumber(prov.lines)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div >
        );
    };

    const calculateMobileTransform = () => {
        if (!isMobile) return 'none';
        const baseOffset = isExpanded ? 0 : EXPANDED_HEIGHT - PEEK_HEIGHT;
        const currentTransform = baseOffset + dragY;
        const cappedTransform = Math.max(-20, Math.min(EXPANDED_HEIGHT, currentTransform));
        return `translateY(${cappedTransform}px)`;
    };

    return (
        <div
            key={`stats-panel-${isComparing ? 'comp' : 'single'}`}
            ref={containerRef}
            className={`glass-panel content-transition ${isClosing ? (isMobile ? 'animate-slide-out-bottom' : 'animate-slide-out-right') : (isMobile ? '' : 'animate-slide-in-right')} custom-scrollbar`}
            style={{
                width: isMobile ? '100%' : (isComparing ? '540px' : '460px'),
                transition: isDragging ? 'none' : 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
                height: isMobile ? `${EXPANDED_HEIGHT}px` : (isComparing ? 'fit-content' : 'auto'),
                maxHeight: isMobile ? `${EXPANDED_HEIGHT}px` : (isComparing ? 'calc(100vh - 150px)' : 'calc(100vh - 120px)'),
                position: 'fixed',
                right: isMobile ? '0' : '24px',
                bottom: '0',
                top: isMobile ? 'auto' : (isComparing ? '0' : '96px'),
                left: isMobile ? '0' : 'auto',
                zIndex: 999,
                display: 'flex',
                flexDirection: 'column',
                padding: isMobile ? '0' : '24px',
                marginTop: isComparing && !isMobile ? 'auto' : '0',
                marginBottom: isComparing && !isMobile ? 'auto' : '0',
                overflowY: isExpanded || !isMobile ? 'auto' : 'hidden',
                overflowX: 'hidden',
                borderRadius: isMobile ? '28px 28px 0 0' : 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                boxShadow: isMobile ? '0 -15px 50px rgba(0,0,0,0.8)' : 'var(--shadow-glass)',
                transform: calculateMobileTransform(),
                willChange: 'transform, top, bottom, margin',
                touchAction: 'none',
                background: isMobile ? 'rgba(15, 23, 42, 0.99)' : 'rgba(15, 23, 42, 0.75)',
                backdropFilter: isMobile ? 'none' : 'blur(20px)'
            }}
        >
            {/* Mobile Handle */}
            {isMobile && (
                <div
                    onTouchStart={onHandleTouchStart}
                    onTouchMove={onHandleTouchMove}
                    onTouchEnd={onHandleTouchEnd}
                    style={{
                        width: '100%',
                        height: '60px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'grab',
                        flexShrink: 0,
                        background: 'rgba(255,255,255,0.03)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}
                >
                    <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', marginBottom: '6px' }} />
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>
                        {isExpanded ? 'Desliza para ocultar' : 'Desliza para analizar'}
                    </span>
                </div>
            )}

            <div
                className="custom-scrollbar"
                style={{
                    padding: isMobile ? '24px' : '0',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: isComparing && !isMobile ? '0 1 auto' : 1,
                    overflowY: isExpanded || !isMobile ? 'auto' : 'hidden',
                    opacity: isMobile && !isExpanded && !isDragging ? 0.3 : 1,
                    transition: 'opacity 0.3s ease'
                }}
            >
                {/* Header Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isComparing ? '20px' : '32px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: isMobile ? '18px' : '20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {isComparing ? 'Análisis Comparativo' : 'Análisis Nacional'}
                        </h3>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', transition: 'all 0.2s', marginRight: '24px' }}>
                        <X size={20} />
                    </button>
                </div>

                {isComparing && compareRegion ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', flex: '0 1 auto', justifyContent: 'flex-start' }}>
                        {/* Final Comparison Summary Card */}
                        <div style={{
                            background: 'rgba(59, 130, 246, 0.05)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            borderRadius: '24px',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <img src={`https://flagcdn.com/w160/${region.id}.png`} alt={region.country} style={{ width: '64px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginBottom: '8px' }} />
                                    <h2 style={{ fontSize: '15px', margin: 0, color: '#fff', fontWeight: 800 }}>{region.country}</h2>
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 900, color: 'rgba(255,255,255,0.2)' }}>VS</div>
                                <div style={{ textAlign: 'center' }}>
                                    <img src={`https://flagcdn.com/w160/${compareRegion.id}.png`} alt={compareRegion.country} style={{ width: '64px', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginBottom: '8px' }} />
                                    <h2 style={{ fontSize: '15px', margin: 0, color: '#fff', fontWeight: 800 }}>{compareRegion.country}</h2>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {[
                                    { label: 'Volumen Datos', val1: region.leakSize, val2: compareRegion.leakSize, icon: <HardDrive size={14} /> },
                                    { label: 'Registros', val1: formatNumber(region.filteredPopulation), val2: formatNumber(compareRegion.filteredPopulation), icon: <Users size={14} /> },
                                    { label: 'Población Total', val1: formatNumber(region.totalPopulation), val2: formatNumber(compareRegion.totalPopulation), icon: <Users size={14} /> },
                                    { label: '% Afectado', val1: `${region.filteredDataPercentage}%`, val2: `${compareRegion.filteredDataPercentage}%`, icon: <Activity size={14} /> },
                                    { label: 'Cotización Base', val1: region.censusPrice, val2: compareRegion.censusPrice, icon: <Shield size={14} /> },
                                    { label: 'Cibercrimen', val1: region.cybercrimePercentage, val2: compareRegion.cybercrimePercentage, icon: <Fingerprint size={14} /> }
                                ].map((item, i) => (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ textAlign: 'right', fontWeight: 800, color: '#fff', fontSize: '13px' }}>{item.val1}</div>
                                        <div style={{ textAlign: 'center', fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                                            {item.icon} <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                                        </div>
                                        <div style={{ textAlign: 'left', fontWeight: 800, color: '#fff', fontSize: '13px' }}>{item.val2}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ flex: 1 }}>
                        {renderRegionData(region)}
                    </div>
                )}
            </div>
        </div >
    );
};

export default StatisticsPanel;
