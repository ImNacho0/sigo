import React, { useEffect, useState } from 'react';

interface MossadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MossadModal: React.FC<MossadModalProps> = ({ isOpen, onClose }) => {
    const [glitch, setGlitch] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setGlitch(true);
            const timer = setTimeout(() => setGlitch(false), 800);

            return () => {
                clearTimeout(timer);
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            animation: glitch ? 'glitch-bg 0.1s infinite' : 'none',
            overflow: 'hidden'
        }}>
            <style>{`
                @keyframes glitch-bg {
                    0% { background: #000; }
                    50% { background: #050505; }
                    100% { background: #000; }
                }

                @keyframes blink {
                    0% { opacity: 1; }
                    50% { opacity: 0; }
                    100% { opacity: 1; }
                }

                @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }

                @font-face {
                    font-family: 'GhostTerminal';
                    src: local('Courier New');
                }

                .document-body {
                    direction: rtl;
                    font-family: 'Courier New', Courier, monospace;
                    line-height: 1.5;
                    color: #d1d5db;
                }

                .stamped {
                    border: 4px solid #ef4444;
                    color: #ef4444;
                    padding: 8px 16px;
                    text-transform: uppercase;
                    font-weight: 900;
                    transform: rotate(-12deg);
                    opacity: 0.8;
                    display: inline-block;
                    margin-bottom: 20px;
                }
            `}</style>

            {/* Scanline Effect */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
                backgroundSize: '100% 4px, 3px 100%',
                pointerEvents: 'none',
                zIndex: 10
            }} />

            <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                boxShadow: '0 0 15px rgba(255, 255, 255, 0.1)',
                animation: 'scanline 6s linear infinite',
                pointerEvents: 'none',
                zIndex: 11
            }} />

            <div style={{
                width: '100%',
                maxWidth: '850px',
                height: '90vh',
                background: '#0a0a0a',
                border: '2px solid #1a1a1a',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                padding: '40px',
                boxShadow: '0 0 100px rgba(0,0,0,1)',
                overflowY: 'auto'
            }}>
                {/* Institutional Close Button (Top Left of Card) */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '40px',
                        left: '40px',
                        background: 'transparent',
                        border: '1px solid #333',
                        color: '#444',
                        padding: '5px 12px',
                        cursor: 'pointer',
                        fontSize: '9px',
                        letterSpacing: '1px',
                        zIndex: 100,
                        fontFamily: 'Courier New',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#ef4444';
                        e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#333';
                        e.currentTarget.style.color = '#444';
                    }}
                >
                    [ TERMINATE_SESS ]
                </button>

                {/* Header Info */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    borderBottom: '1px solid #333',
                    paddingBottom: '20px',
                    marginBottom: '30px',
                    fontFamily: 'Courier New',
                    fontSize: '12px',
                    color: '#666',
                    gap: '20px'
                }}>
                    <div>FILE ID: IL-MOSSAD-001/SEC</div>
                    <div>CLEARANCE: OMEGA</div>
                    <div>DATE: 01.03.2026</div>
                </div>

                <div className="document-body">
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div className="stamped">סודי ביותר // TOP SECRET</div>
                        <h1 style={{
                            fontSize: '42px',
                            color: '#fff',
                            fontWeight: 900,
                            letterSpacing: '5px',
                            margin: '20px 0 10px 0'
                        }}>
                            המוסד
                        </h1>
                        <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '14px', letterSpacing: '2px' }}>
                            למודיעין ולתפקידים מיוחדים
                        </p>
                    </div>

                    <div style={{ fontSize: '18px', display: 'flex', flexDirection: 'column', gap: '30px', textAlign: 'justify' }}>
                        <p>
                            <strong>הצהרת ריבונות ועוצמה:</strong> מדינת ישראל אינה מבקשת רשות להתקיים. אנו הכוח שמבטיח כי דמם של יהודים לעולם לא יהיה הפקר עוד. המוסד הוא היד הארוכה שאינה יודעת גבולות, הפועלת בכל מקום שבו נדרשת צדק, הגנה o הרתעה.
                        </p>

                        <p>
                            מעצמה טכנולוגית. עליונות מודיעינית. מכונת מלחמה משומנת וחוסן כלכלי שמכופף את המציאות לטובת ביטחוננו. אין סייבר שאיננו שולטים בו, אין מודיעין שאיננו משיגים, ואין אויב שיכול להסתתר מפנינו.
                        </p>

                        <div style={{ background: '#111', padding: '20px', borderLeft: '4px solid #ef4444', fontFamily: 'monospace' }}>
                            <p style={{ margin: 0 }}>
                                "באין תחבולות יפול עם ותשועה ברוב יועץ" (משלי י"א, י"ד).
                                <br />
                                אנחנו התחבולות. אנחנו הישועה. אנחנו הסוף של מי שיעז לקרוא עלינו תיגר.
                            </p>
                        </div>

                        <p>
                            זהו אינו מחווה למדינת ישראל. זוהי הכרה בעובדת קיומה כמעצמה בלתי מנוצחת. הכוח שלנו אינו נמדד בדיפלומטיה בלבד, אלא ביכולת להכות חזק, מהר ובשקט מוחלט.
                        </p>
                    </div>

                    <div style={{ marginTop: '60px', opacity: 0.7, fontSize: '12px' }}>
                        <p>PROTOCOL ACTIVE: SESSION SECURED</p>
                        <p>AUTHORIZED PERSONNEL ONLY. ALL ACTIONS LOGGED.</p>
                    </div>

                    <div style={{
                        marginTop: '40px',
                        textAlign: 'center',
                        fontSize: '32px',
                        fontWeight: '900',
                        color: '#fff',
                        letterSpacing: '10px'
                    }}>
                        עם ישראל חי
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MossadModal;
