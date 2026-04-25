import React, { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface CyberArcProps {
    from: [number, number];
    to: [number, number];
    color?: string;
    isMobile?: boolean;
}

const CyberArc: React.FC<CyberArcProps> = ({ from, to, color = '#ff2a5f', isMobile }) => {
    const map = useMap();
    const [, setUpdate] = useState(0);

    useEffect(() => {
        let frameId: number;
        const handleMove = () => {
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(() => setUpdate(prev => prev + 1));
        };
        map.on('move', handleMove);
        map.on('zoomend', handleMove);
        return () => {
            map.off('move', handleMove);
            map.off('zoomend', handleMove);
            cancelAnimationFrame(frameId);
        };
    }, [map]);

    const p1 = map.latLngToContainerPoint(L.latLng(from[0], from[1]));
    const p2 = map.latLngToContainerPoint(L.latLng(to[0], to[1]));

    // Calculate control point for quadratic Bezier (arc)
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    // Distance between points to determine arc height
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Offset perpendicular to the line to create an arc
    // We want the arc to always curve "upwards" on the screen (negative Y)
    // to give it that "front-facing" 3D bridge look.
    const offset = Math.min(distance * 0.5, 200); // Cap the height for very long distances

    // Calculate a control point that is always 'above' the midpoint
    // We use the midpoint and subtract from the Y coordinate
    const cx = midX;
    const cy = midY - offset;

    const pathData = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;

    return (
        <svg
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1000,
                overflow: 'visible'
            }}
        >
            <defs>
                <filter id="cyber-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Main background arc path (Static, no pulsing) */}
            <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeOpacity={isMobile ? "0.05" : "0.15"}
            />

            {/* Animated path ("the bomb/data package") */}
            <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth="3"
                filter="url(#cyber-glow)"
                className="arc-path-animated"
                strokeDasharray="12, 1000"
            />

            {/* Trailing glow/overlay (Static) */}
            <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth="1"
                strokeOpacity={isMobile ? "0.1" : "0.4"}
            />

            <style>{`
                @keyframes dash {
                    0% {
                        stroke-dashoffset: 0;
                        opacity: 0;
                    }
                    5% {
                        opacity: 1;
                    }
                    95% {
                        opacity: 1;
                    }
                    100% {
                        stroke-dashoffset: -1000;
                        opacity: 0;
                    }
                }

                .arc-path-animated {
                    animation: dash 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }

                svg {
                    animation: fadeIn 0.6s ease-out forwards;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </svg>
    );
};

export default CyberArc;
