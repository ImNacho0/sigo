import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export type FichaTipo = 'ta1' | 'm030';

interface Props {
    onPick: (tipo: FichaTipo) => void;
    onClose: () => void;
}

const FileIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);

const OPCIONES: { tipo: FichaTipo; titulo: string; org: string; desc: string }[] = [
    { tipo: 'ta1', titulo: 'Modelo TA.1', org: 'Tesorería General de la Seguridad Social', desc: 'Solicitud de afiliación, asignación de número de la Seguridad Social y variación de datos.' },
    { tipo: 'm030', titulo: 'Modelo 030', org: 'Agencia Tributaria', desc: 'Declaración censal de alta, cambio de domicilio y/o variación de datos personales.' },
];

const FichaSelector: React.FC<Props> = ({ onPick, onClose }) => {
    const [visible, setVisible] = useState(false);
    const [hover, setHover] = useState<FichaTipo | null>(null);

    useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

    const handleClose = () => { setVisible(false); setTimeout(onClose, 200); };
    const handlePick = (t: FichaTipo) => { setVisible(false); setTimeout(() => onPick(t), 200); };

    return (
        <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
            opacity: visible ? 1 : 0, transition: 'opacity 200ms ease' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#0b1322', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', width: '100%', maxWidth: '560px', boxShadow: '0 32px 100px rgba(0,0,0,0.9)', overflow: 'hidden',
                transform: visible ? 'scale(1)' : 'scale(0.96)', transition: 'transform 200ms ease' }}>

                {/* Header */}
                <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#07101c' }}>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '1px' }}>SELECCIONA EL TIPO DE FICHA</div>
                        <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px', letterSpacing: '0.5px' }}>Elige el modelo oficial que deseas cumplimentar</div>
                    </div>
                    <button onClick={handleClose} style={{ background: 'rgba(255,42,95,0.07)', border: '1px solid rgba(255,42,95,0.18)', color: '#ff2a5f', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <X size={13} />
                    </button>
                </div>

                {/* Opciones */}
                <div style={{ padding: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {OPCIONES.map(o => {
                        const active = hover === o.tipo;
                        return (
                            <button key={o.tipo}
                                onClick={() => handlePick(o.tipo)}
                                onMouseEnter={() => setHover(o.tipo)}
                                onMouseLeave={() => setHover(null)}
                                style={{
                                    textAlign: 'left', cursor: 'pointer',
                                    background: active ? 'rgba(0,240,255,0.07)' : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${active ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.07)'}`,
                                    borderRadius: '10px', padding: '18px 16px', transition: 'all 0.18s',
                                    display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '170px',
                                    boxShadow: active ? '0 8px 30px rgba(0,240,255,0.08)' : 'none',
                                    transform: active ? 'translateY(-2px)' : 'none',
                                }}>
                                <div style={{ color: active ? '#00f0ff' : '#64748b', transition: 'color 0.18s' }}><FileIcon /></div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>{o.titulo}</div>
                                    <div style={{ fontSize: '9px', color: active ? '#00f0ff' : '#475569', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>{o.org}</div>
                                </div>
                                <div style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.6 }}>{o.desc}</div>
                                <div style={{ marginTop: 'auto', fontSize: '10px', fontWeight: 700, color: active ? '#00f0ff' : '#334155', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    ABRIR →
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FichaSelector;
