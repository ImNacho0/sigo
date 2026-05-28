import React, { useEffect, useState, useRef } from 'react';

const NODES = [
    { x: 14, y: 38, cls: 'critical' }, { x: 18, y: 55, cls: 'high' },
    { x: 27, y: 62, cls: 'medium' },   { x: 23, y: 72, cls: 'high' },
    { x: 46, y: 30, cls: 'high' },     { x: 48, y: 35, cls: 'medium' },
    { x: 50, y: 32, cls: 'critical' }, { x: 54, y: 37, cls: 'medium' },
    { x: 58, y: 30, cls: 'safe' },     { x: 56, y: 42, cls: 'high' },
    { x: 63, y: 34, cls: 'critical' }, { x: 62, y: 45, cls: 'medium' },
    { x: 65, y: 52, cls: 'critical' }, { x: 68, y: 55, cls: 'high' },
    { x: 70, y: 65, cls: 'medium' },   { x: 75, y: 42, cls: 'medium' },
    { x: 85, y: 48, cls: 'safe' },     { x: 88, y: 38, cls: 'safe' },
    { x: 90, y: 55, cls: 'safe' },     { x: 91, y: 75, cls: 'safe' },
    { x: 49, y: 52, cls: 'high' },     { x: 55, y: 60, cls: 'critical' },
    { x: 49, y: 62, cls: 'high' },
];

const NODE_COLORS: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    safe: '#22c55e',
};

const NODE_SHADOWS: Record<string, string> = {
    critical: 'rgba(239,68,68,0.7)',
    high: 'rgba(249,115,22,0.6)',
    medium: 'rgba(234,179,8,0.6)',
    safe: 'rgba(34,197,94,0.6)',
};

const CONNECTIONS = [
    [0,1],[1,2],[2,3],[0,4],[4,5],[5,6],[6,7],[6,10],[10,11],[11,12],
    [12,13],[13,14],[14,15],[15,16],[16,17],[17,18],[18,19],[12,20],
    [20,21],[21,22],[8,9],[9,10],
];

const SEG_TOTAL = 14;

const LoadingScreen: React.FC<{ onLoaded: () => void }> = ({ onLoaded }) => {
    const [progress, setProgress] = useState(0);
    const [nodeCount, setNodeCount] = useState(0);
    const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
    const containerRef = useRef<HTMLDivElement>(null);

    // measure real container size
    useEffect(() => {
        const update = () => {
            if (containerRef.current) {
                setDims({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
            }
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    // progress bar — runs fast, done in ~1.2s
    useEffect(() => {
        let pct = 0;
        const iv = setInterval(() => {
            pct = Math.min(100, pct + Math.random() * 10 + 6);
            setProgress(pct);
            if (pct >= 100) {
                clearInterval(iv);
                setTimeout(() => onLoaded(), 1000);
            }
        }, 70);
        return () => clearInterval(iv);
    }, [onLoaded]);

    // node counter
    useEffect(() => {
        let n = 0;
        const iv = setInterval(() => {
            n = Math.min(NODES.length, n + 1);
            setNodeCount(n);
            if (n >= NODES.length) clearInterval(iv);
        }, 55);
        return () => clearInterval(iv);
    }, []);

    const litSegs = Math.round(progress / 100 * SEG_TOTAL);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed', inset: 0,
                background: '#060e1e',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                fontFamily: "'Courier New', Courier, monospace",
            }}
        >
            <style>{`
                @keyframes gridSlide {
                    from { background-position: 0 0; }
                    to   { background-position: 40px 40px; }
                }
                @keyframes ringExpand {
                    0%   { transform: scale(0.5); opacity: 0; }
                    15%  { opacity: 1; }
                    100% { transform: scale(1.4); opacity: 0; }
                }
                @keyframes scanBar {
                    from { top: 0%; opacity: 1; }
                    to   { top: 100%; opacity: 0; }
                }
                @keyframes nodeAppear {
                    from { transform: scale(0); opacity: 0; }
                    to   { transform: scale(1); opacity: 1; }
                }
                @keyframes nodePulse {
                    0%, 100% { transform: scale(1); }
                    50%      { transform: scale(1.9); }
                }
                @keyframes drawLine {
                    to { stroke-dashoffset: 0; }
                }
                @keyframes contentReveal {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes logoSlam {
                    from { opacity: 0; transform: scale(1.1) translateY(-8px); letter-spacing: 16px; }
                    to   { opacity: 1; transform: scale(1)   translateY(0);    letter-spacing: 10px; }
                }
                @keyframes fadeInEl {
                    to { opacity: 1; }
                }
                @keyframes dotPulse {
                    from { opacity: 0.5; }
                    to   { opacity: 1; box-shadow: 0 0 10px #22c55e; }
                }
                .ls-node {
                    position: absolute;
                    width: 4px; height: 4px;
                    border-radius: 50%;
                    animation: nodeAppear 0.25s ease-out forwards, nodePulse 2.2s ease-in-out infinite;
                    opacity: 0;
                }
                .ls-node::after {
                    content: '';
                    position: absolute; inset: -3px;
                    border-radius: 50%;
                    background: inherit;
                    opacity: 0.18;
                    animation: nodePulse 2.2s ease-in-out infinite;
                }
                .ls-conn {
                    stroke-dasharray: 150;
                    stroke-dashoffset: 150;
                    animation: drawLine 0.8s ease-out forwards;
                }
                .ls-classified {
                    display: inline-flex; align-items: center; gap: 8px;
                    color: #ef4444; font-size: 9px; letter-spacing: 4px; font-weight: 700;
                    margin-bottom: 14px;
                    opacity: 0;
                    animation: fadeInEl 0.4s ease-out 0.15s forwards;
                }
                .ls-classified::before, .ls-classified::after {
                    content: ''; width: 20px; height: 1px;
                    background: #ef4444; opacity: 0.5;
                }
                .ls-logo {
                    font-size: clamp(28px, 5vw, 38px);
                    font-weight: 900;
                    letter-spacing: 10px;
                    color: #fff;
                    text-shadow: 0 0 40px rgba(255,255,255,0.08);
                    margin-bottom: 8px;
                    opacity: 0;
                    animation: logoSlam 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
                }
                .ls-hebrew {
                    color: rgba(255,255,255,0.12);
                    font-size: 11px; letter-spacing: 4px;
                    margin-bottom: 26px;
                    opacity: 0;
                    animation: fadeInEl 0.4s ease-out 0.3s forwards;
                }
                .ls-progress {
                    width: 260px;
                    opacity: 0;
                    animation: fadeInEl 0.4s ease-out 0.2s forwards;
                }
                .ls-seg-row { display: flex; gap: 3px; margin-bottom: 8px; }
                .ls-seg {
                    flex: 1; height: 2px; border-radius: 1px;
                    background: rgba(255,255,255,0.06);
                }
                .ls-seg-lit { background: rgba(255,255,255,0.7); box-shadow: 0 0 3px rgba(255,255,255,0.4); }
                .ls-seg-tip { background: #ef4444 !important; box-shadow: 0 0 5px rgba(239,68,68,0.7) !important; }
                .ls-progress-labels {
                    display: flex; justify-content: space-between;
                    color: rgba(255,255,255,0.18); font-size: 8px; letter-spacing: 1px;
                }
                .ls-readout {
                    position: absolute; z-index: 12;
                    font-size: 8px; letter-spacing: 1px;
                    color: rgba(255,255,255,0.1); line-height: 1.8;
                    opacity: 0;
                    animation: fadeInEl 0.5s ease-out 0.5s forwards;
                }
                .ls-online-dot {
                    display: inline-block; width: 5px; height: 5px; border-radius: 50%;
                    background: #22c55e; box-shadow: 0 0 6px #22c55e;
                    margin-right: 5px; vertical-align: middle;
                    animation: dotPulse 1s ease-in-out infinite alternate;
                }
            `}</style>

            {/* ── Grid background ── */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `
                    linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
                animation: 'gridSlide 20s linear infinite',
            }} />

            {/* ── Vignette ── */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                background: 'radial-gradient(ellipse at 50% 50%, transparent 25%, #060e1e 80%)',
            }} />

            {/* ── Signal rings (z:2) ── */}
            {[0, 0.5, 1.0, 1.5, 2.0].map((delay, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    borderRadius: '50%',
                    border: `1px solid rgba(239,68,68,${i < 3 ? 0.18 : 0.07})`,
                    width:  [80, 170, 280, 410, 560][i],
                    height: [80, 170, 280, 410, 560][i],
                    animation: `ringExpand 3s ease-out ${delay}s infinite`,
                    zIndex: 2,
                }} />
            ))}

            {/* ── Country nodes (z:3 — behind content) ── */}
            {NODES.map((n, i) => (
                <div
                    key={i}
                    className="ls-node"
                    style={{
                        left: `calc(${n.x}% - 2px)`,
                        top:  `calc(${n.y}% - 2px)`,
                        background: NODE_COLORS[n.cls],
                        boxShadow: `0 0 6px ${NODE_SHADOWS[n.cls]}`,
                        animationDelay: `${i * 0.055}s, ${i * 0.055 + 0.25}s`,
                        opacity: i < nodeCount ? undefined : 0,
                        zIndex: 3,
                    }}
                />
            ))}

            {/* ── SVG connection lines (z:2) ── */}
            <svg
                style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
                viewBox={`0 0 ${dims.w} ${dims.h}`}
                preserveAspectRatio="xMidYMid slice"
            >
                {CONNECTIONS.map(([a, b], i) => {
                    const ax = NODES[a].x / 100 * dims.w;
                    const ay = NODES[a].y / 100 * dims.h;
                    const bx = NODES[b].x / 100 * dims.w;
                    const by = NODES[b].y / 100 * dims.h;
                    return (
                        <line
                            key={i}
                            className="ls-conn"
                            x1={ax} y1={ay} x2={bx} y2={by}
                            stroke="rgba(59,130,246,0.13)"
                            strokeWidth="0.5"
                            style={{ animationDelay: `${0.08 + i * 0.035}s` }}
                        />
                    );
                })}
            </svg>

            {/* ── Horizontal scan bar (z:4) ── */}
            <div style={{
                position: 'absolute', left: 0, right: 0, height: '1px', top: 0,
                background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.6), rgba(239,68,68,0.3), transparent)',
                boxShadow: '0 0 12px rgba(239,68,68,0.3)',
                animation: 'scanBar 1.2s cubic-bezier(0.4, 0, 0.6, 1) forwards',
                zIndex: 4,
            }} />

            {/* ── Corner brackets (z:10) ── */}
            {[
                { top: 16, left: 16, d: 'M0 14 L0 0 L14 0' },
                { top: 16, right: 16, d: 'M2 0 L16 0 L16 14' },
                { bottom: 16, left: 16, d: 'M0 2 L0 16 L14 16' },
                { bottom: 16, right: 16, d: 'M2 16 L16 16 L16 2' },
            ].map((c, i) => {
                const { d, ...pos } = c;
                return (
                    <div key={i} style={{ position: 'absolute', zIndex: 10, ...pos }}>
                        <svg width="16" height="16" fill="none">
                            <path d={d} stroke="rgba(239,68,68,0.25)" strokeWidth="1" />
                        </svg>
                    </div>
                );
            })}

            {/* ── Readouts (z:12) ── */}
            <div className="ls-readout" style={{ top: 36, left: 36 }}>
                NODE SCAN · ACTIVE<br />
                THREAT LEVEL · CRITICAL<br />
                OPERATOR · <span style={{ color: 'rgba(255,255,255,0.22)' }}>VERIFIED</span>
            </div>
            <div className="ls-readout" style={{ top: 36, right: 36, textAlign: 'right' }}>
                CLASSIFICATION · TS/SCI<br />
                SESSION · ENCRYPTED<br />
                NODES · <span style={{ color: 'rgba(255,255,255,0.22)' }}>{nodeCount}</span> ONLINE
            </div>
            <div className="ls-readout" style={{ bottom: 36, right: 36, textAlign: 'right' }}>
                <span className="ls-online-dot" />SISTEMAS ONLINE
            </div>

            {/* ── Center content (z:20 — sobre todo) ── */}
            <div style={{ position: 'relative', zIndex: 20, textAlign: 'center' }}>
                <div className="ls-classified">RESTRICTED ACCESS</div>

                <div className="ls-logo">
                    RED<span style={{ color: '#ef4444' }}>SIGO</span>
                </div>

                <div className="ls-hebrew">המוסד · מערכות פנימיות</div>

                <div className="ls-progress">
                    <div className="ls-seg-row">
                        {Array.from({ length: SEG_TOTAL }, (_, i) => (
                            <div
                                key={i}
                                className={
                                    'ls-seg' +
                                    (i < litSegs - 1 ? ' ls-seg-lit' : '') +
                                    (i === litSegs - 1 ? ' ls-seg-tip' : '')
                                }
                            />
                        ))}
                    </div>
                    <div className="ls-progress-labels">
                        <span>ACCESO SEGURO</span>
                        <span>SECURE_OS_V4.2</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
