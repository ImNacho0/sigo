import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, MapPin, Building2 } from 'lucide-react';

interface CpLookupPanelProps {
    cp: string;
    prov: string;
    pob: string;
    rows: string[];
    onClose: () => void;
}

const CpLookupPanel: React.FC<CpLookupPanelProps> = ({ cp, prov, pob, rows, onClose }) => {
    const [filter, setFilter] = useState('');
    const [visible, setVisible] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
        setTimeout(() => inputRef.current?.focus(), 300);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 250);
    };

    const filtered = useMemo(() => {
        if (!filter.trim()) return rows;
        const q = filter.toLowerCase();
        return rows.filter(r => r.toLowerCase().includes(q));
    }, [filter, rows]);

    // Separate rows: those with street (contain |) vs those without
    const hasStreets = rows.some(r => r.includes('|'));

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(4, 8, 20, 0.85)',
                backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.25s ease',
            }}
        >
            <div style={{
                width: '100%', maxWidth: '680px',
                background: 'linear-gradient(160deg, rgba(11,17,32,0.98) 0%, rgba(8,12,21,0.99) 100%)',
                border: '1px solid rgba(0,240,255,0.15)',
                borderRadius: '18px',
                boxShadow: '0 0 60px rgba(0,240,255,0.08), 0 24px 80px rgba(0,0,0,0.8)',
                display: 'flex', flexDirection: 'column',
                maxHeight: '85vh',
                overflow: 'hidden',
                transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
                transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease',
                position: 'relative',
            }}>
                {/* Top accent line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent 0%, rgba(0,240,255,0.7) 30%, rgba(59,130,246,0.7) 70%, transparent 100%)', borderRadius: '18px 18px 0 0' }} />

                {/* HEADER */}
                <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {/* CP Badge */}
                            <div style={{
                                width: '64px', height: '64px', flexShrink: 0,
                                background: 'radial-gradient(circle at 30% 30%, rgba(0,240,255,0.12), rgba(0,240,255,0.03))',
                                border: '1px solid rgba(0,240,255,0.25)',
                                borderRadius: '16px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 20px rgba(0,240,255,0.08)',
                            }}>
                                <MapPin size={18} color="var(--accent-cyan, #00f0ff)" style={{ marginBottom: '2px' }} />
                                <span style={{ fontSize: '9px', color: 'rgba(0,240,255,0.6)', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px' }}>C.P.</span>
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Código Postal</div>
                                <div style={{ fontSize: '36px', fontWeight: 900, color: '#fff', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '6px', lineHeight: 1, textShadow: '0 0 30px rgba(0,240,255,0.4)' }}>{cp}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--accent-cyan, #00f0ff)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        <Building2 size={11} />
                                        {pob}
                                    </span>
                                    <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                        {prov}
                                    </span>
                                    <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono, monospace' }}>
                                        {rows.length} {rows.length === 1 ? 'registro' : 'registros'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleClose} style={{ flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,42,95,0.15)'; (e.currentTarget as HTMLButtonElement).style.color = '#ff2a5f'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)'; }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Search bar */}
                    <div style={{ marginTop: '18px', position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            placeholder="Filtrar por calle, barrio o localidad..."
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px',
                                color: '#fff',
                                padding: '10px 12px 10px 36px',
                                fontSize: '13px',
                                fontFamily: 'JetBrains Mono, monospace',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(0,240,255,0.4)'}
                            onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                        {filter && (
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'rgba(0,240,255,0.6)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                                {filtered.length}
                            </span>
                        )}
                    </div>
                </div>

                {/* RESULTS LIST */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                            Sin resultados para "{filter}"
                        </div>
                    ) : filtered.map((row, i) => {
                        const parts = row.split('|');
                        const street = parts.length === 2 ? parts[0] : null;
                        const locality = parts.length === 2 ? parts[1] : parts[0];
                        return (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '14px',
                                padding: '10px 28px',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                transition: 'background 0.15s',
                                cursor: 'default',
                            }}
                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,240,255,0.03)'}
                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                            >
                                {/* Index */}
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.15)', fontFamily: 'JetBrains Mono, monospace', width: '22px', flexShrink: 0, textAlign: 'right' }}>
                                    {String(i + 1).padStart(2, '0')}
                                </span>

                                {/* Dot */}
                                <div style={{ width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0, background: street ? 'rgba(0,240,255,0.5)' : 'rgba(255,255,255,0.15)' }} />

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {street ? (
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
                                                {street}
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'rgba(0,240,255,0.7)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
                                                {locality}
                                            </span>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                            {locality}
                                        </span>
                                    )}
                                </div>

                                {/* Street/locality tag */}
                                {hasStreets && (
                                    <span style={{
                                        fontSize: '8px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                                        letterSpacing: '0.8px', textTransform: 'uppercase', flexShrink: 0,
                                        padding: '2px 7px', borderRadius: '4px',
                                        background: street ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${street ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.08)'}`,
                                        color: street ? 'rgba(147,197,253,0.8)' : 'rgba(255,255,255,0.25)',
                                    }}>
                                        {street ? 'CALLE' : 'LOCALIDAD'}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* FOOTER */}
                <div style={{ padding: '10px 28px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)', fontFamily: 'JetBrains Mono, monospace' }}>ESC para cerrar</span>
                </div>
            </div>
        </div>
    );
};

export default CpLookupPanel;
