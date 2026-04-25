import React, { useEffect, useState } from 'react';

const LoadingScreen: React.FC<{ onLoaded: () => void }> = ({ onLoaded }) => {
    const [progress, setProgress] = useState(0);
    const [statusIndex, setStatusIndex] = useState(0);

    const statuses = [
        "ESTABLISHING SECURE GATEWAY",
        "SYNCING WITH GLOBAL NODES",
        "INTEGRITY CHECK: MOSSAD CORE",
        "VERIFYING BIOMETRIC HASH",
        "ACCESSING CLASSIFIED DATABASE",
        "DECRYPTING THREAT MAP",
        "CONNECTION SECURED"
    ];

    useEffect(() => {
        let currentProgress = 0;
        const interval = setInterval(() => {
            const increment = Math.pow(Math.random(), 2) * 8 + 0.5; // Irregular speed for "real" feel
            currentProgress = Math.min(100, currentProgress + increment);
            setProgress(currentProgress);

            const newIndex = Math.min(statuses.length - 1, Math.floor((currentProgress / 100) * statuses.length));
            setStatusIndex(newIndex);

            if (currentProgress >= 100) {
                clearInterval(interval);
                setTimeout(() => onLoaded(), 800);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [onLoaded]);

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: '#000',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            fontFamily: "'Courier New', Courier, monospace"
        }}>
            <style>{`
                @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }

                @keyframes flicker {
                    0% { opacity: 0.8; }
                    5% { opacity: 0.9; }
                    10% { opacity: 0.8; }
                    15% { opacity: 1; }
                    100% { opacity: 0.9; }
                }

                .scanner {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.02), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.02));
                    backgroundSize: 100% 2px, 3px 100%;
                    pointer-events: none;
                    z-index: 10;
                }

                .loading-text {
                    color: #fff;
                    letter-spacing: 4px;
                    font-size: 14px;
                    text-transform: uppercase;
                    margin-bottom: 20px;
                    text-shadow: 0 0 5px rgba(255,255,255,0.5);
                    animation: flicker 0.1s infinite;
                }
            `}</style>

            <div className="scanner" />

            <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '30px',
                background: 'rgba(255, 255, 255, 0.02)',
                animation: 'scanline 8s linear infinite',
                zIndex: 11
            }} />

            <div style={{ width: '350px', position: 'relative', zIndex: 20 }}>
                {/* Institutional Header */}
                <div style={{
                    borderBottom: '1px solid #333',
                    paddingBottom: '15px',
                    marginBottom: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{ color: '#ef4444', fontSize: '10px', fontWeight: 900, letterSpacing: '2px', marginBottom: '5px' }}>
                        RESTRICTED ACCESS
                    </div>
                    <div style={{ color: '#fff', fontSize: '24px', fontWeight: 900, letterSpacing: '10px' }}>
                        RED-SIGO
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontWeight: 400, marginTop: '8px', letterSpacing: '2px' }}>
                        המוסד - מערכות פנימיות
                    </div>
                </div>

                {/* Progress Tracking */}
                <div className="loading-text">
                    {statuses[statusIndex]}
                </div>

                <div style={{
                    width: '100%',
                    height: '2px',
                    background: '#111',
                    position: 'relative',
                    marginBottom: '10px'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, bottom: 0,
                        width: `${progress}%`,
                        background: '#fff',
                        boxShadow: '0 0 10px #fff',
                        transition: 'width 0.2s ease-out'
                    }} />
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#444',
                    fontSize: '10px',
                    fontWeight: 700
                }}>
                    <div>{Math.round(progress)}% COMPLETE</div>
                    <div>SECURE_OS_V4.2</div>
                </div>

                {/* Warning message */}
                <div style={{
                    marginTop: '60px',
                    color: '#333',
                    fontSize: '9px',
                    textAlign: 'center',
                    lineHeight: '1.5',
                    letterSpacing: '1px'
                }}>
                    WARNING: UNAUTHORIZED ATTEMPTS TO ACCESS THIS TERMINAL ARE AUTOMATICALLY TRACED AND REPORTED TO LOCAL AUTHORITIES.
                </div>
            </div>

            {/* Bottom identifier */}
            <div style={{
                position: 'absolute',
                bottom: '40px',
                fontSize: '10px',
                color: '#222',
                letterSpacing: '5px',
                fontWeight: 900
            }}>
                PROPERTY OF THE STATE OF ISRAEL
            </div>
        </div>
    );
};

export default LoadingScreen;
