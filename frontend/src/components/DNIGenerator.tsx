import React, { useState, useMemo, useRef } from 'react';
import { X, Printer, RotateCcw, User, ChevronDown } from 'lucide-react';

/* ──────────────────────────────────────────────────────────
   MRZ HELPERS (ICAO TD1 — 3 lines × 30 chars)
   ────────────────────────────────────────────────────────── */
const MRZ_WEIGHTS = [7, 3, 1];
const MRZ_CHARS: Record<string, number> = { '<': 0 };
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((c, i) => { MRZ_CHARS[c] = i + 10; });
'0123456789'.split('').forEach(c => { MRZ_CHARS[c] = parseInt(c); });

function mrzCheck(str: string): string {
    let sum = 0;
    for (let i = 0; i < str.length; i++) sum += (MRZ_CHARS[str[i].toUpperCase()] ?? 0) * MRZ_WEIGHTS[i % 3];
    return String(sum % 10);
}
function pad(s: string, len: number, ch = '<'): string {
    const x = (s || '').toUpperCase().replace(/[^A-Z0-9<]/g, '<').slice(0, len);
    return x.padEnd(len, ch);
}
function dniLetter(num: string): string {
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const n = parseInt(num.replace(/\D/g, ''), 10);
    return isNaN(n) ? '' : letters[n % 23];
}
function mrzDate(s: string): string {
    try {
        let d = '', m = '', y = '';
        if (s.includes('/')) [d, m, y] = s.split('/');
        else if (s.includes('-')) [y, m, d] = s.split('-');
        else return '000000';
        return `${(y || '0000').slice(-2)}${(m || '00').padStart(2, '0')}${(d || '00').padStart(2, '0')}`;
    } catch { return '000000'; }
}
function dispDate(s: string): string {
    if (!s) return '';
    try {
        let d = '', m = '', y = '';
        if (s.includes('/')) [d, m, y] = s.split('/');
        else if (s.includes('-')) [y, m, d] = s.split('-');
        else return s;
        return `${(d || '').padStart(2, '0')} ${(m || '').padStart(2, '0')} ${y || ''}`;
    } catch { return s; }
}
function buildMRZ(f: FormData): [string, string, string] {
    const dniDigits = (f.dni || '').replace(/\D/g, '');
    const letter = f.letraDni || dniLetter(dniDigits) || '<';
    const soporte = pad(f.numSoporte || 'CAA000000', 9);
    const soporteCheck = mrzCheck(soporte);
    const docCore = pad(pad(dniDigits, 8) + letter, 9);
    const line1 = pad(`ID${pad('ESP', 3)}${soporte}${soporteCheck}${docCore}`, 30);

    const dob = mrzDate(f.fechaNacimiento);
    const dobCk = mrzCheck(dob);
    const exp = mrzDate(f.fechaValidez);
    const expCk = mrzCheck(exp);
    const nat = pad(f.nacionalidad || 'ESP', 3);
    const sex = (f.sexo === 'F' ? 'F' : 'M');
    const beforeCC = `${dob}${dobCk}${sex}${exp}${expCk}${nat}`;
    const filler = ''.padEnd(30 - beforeCC.length - 1, '<');
    const ccStr = `${soporte}${soporteCheck}${docCore}${dob}${dobCk}${exp}${expCk}`;
    const cc = mrzCheck(ccStr);
    const line2 = `${beforeCC}${filler}${cc}`;

    const ap1 = (f.primerApellido || '').toUpperCase().replace(/Ñ/g, 'N').replace(/[^A-Z]/g, '<');
    const ap2 = (f.segundoApellido || '').toUpperCase().replace(/Ñ/g, 'N').replace(/[^A-Z]/g, '<');
    const nom = (f.nombre || '').toUpperCase().replace(/Ñ/g, 'N').replace(/[^A-Z]/g, '<');
    const line3 = pad(`${ap1}<${ap2}<<${nom}`, 30);

    return [line1, line2, line3];
}

/* ──────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────── */
interface FormData {
    dni: string; letraDni: string;
    nombre: string; primerApellido: string; segundoApellido: string;
    sexo: string; nacionalidad: string;
    fechaNacimiento: string; lugarNacimiento: string; municipioNacimiento: string;
    domicilio: string; municipio: string; provincia: string;
    progenitor1: string; progenitor2: string;
    fechaExpedicion: string; fechaValidez: string;
    numSoporte: string; equipoExpedicion: string;
    photo: string | null;
}
const EMPTY: FormData = {
    dni: '', letraDni: '', nombre: '', primerApellido: '', segundoApellido: '',
    sexo: 'F', nacionalidad: 'ESP', fechaNacimiento: '', lugarNacimiento: '',
    municipioNacimiento: '', domicilio: '', municipio: '', provincia: '',
    progenitor1: '', progenitor2: '', fechaExpedicion: '', fechaValidez: '',
    numSoporte: '', equipoExpedicion: '', photo: null,
};

/* ──────────────────────────────────────────────────────────
   FLAGS
   ────────────────────────────────────────────────────────── */
function star5(cx: number, cy: number, r: number): string {
    const p: string[] = [];
    for (let i = 0; i < 10; i++) {
        const a = (i * 36 - 90) * Math.PI / 180;
        const ri = i % 2 === 0 ? r : r * 0.4;
        p.push(`${cx + ri * Math.cos(a)},${cy + ri * Math.sin(a)}`);
    }
    return p.join(' ');
}

const EUFlag: React.FC<{ w?: number; h?: number }> = ({ w = 60, h = 44 }) => {
    const cx = w / 2, cy = h / 2, cr = Math.min(w, h) * 0.32;
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
            <rect width={w} height={h} fill="#003399" />
            {Array.from({ length: 12 }, (_, i) => {
                const a = (i * 30 - 90) * Math.PI / 180;
                const sx = cx + cr * Math.cos(a);
                const sy = cy + cr * Math.sin(a);
                return <polygon key={i} points={star5(sx, sy, w * 0.055)} fill="#FFCC00" />;
            })}
            {/* "ES" centered */}
            <text x={cx} y={cy + 4}
                textAnchor="middle"
                fontSize={Math.min(w, h) * 0.34}
                fontWeight="800"
                fill="#fff"
                fontFamily="Arial Black, Arial, sans-serif">ES</text>
        </svg>
    );
};

const SpainFlag: React.FC<{ w?: number; h?: number }> = ({ w = 60, h = 44 }) => (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        <rect width={w} height={h * 0.25} fill="#C60B1E" />
        <rect y={h * 0.25} width={w} height={h * 0.5} fill="#FFC400" />
        <rect y={h * 0.75} width={w} height={h * 0.25} fill="#C60B1E" />
    </svg>
);

const MiniSpainFlag: React.FC = () => (
    <svg width="11" height="15" viewBox="0 0 11 15" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <rect width="11" height="4" fill="#C60B1E" />
        <rect y="4" width="11" height="6" fill="#FFC400" />
        <rect y="10" width="11" height="3" fill="#C60B1E" />
        <path d="M 0,13 L 5.5,15 L 11,13 L 11,13 L 0,13 Z" fill="#C60B1E" />
    </svg>
);

/* Biometric (contactless) icon top-right of front */
const BiometricIcon: React.FC = () => (
    <svg width="36" height="22" viewBox="0 0 36 22">
        <rect x="0.5" y="0.5" width="35" height="21" rx="3" fill="none" stroke="#1a2a5c" strokeWidth="1.2" />
        {/* Document with portrait silhouette */}
        <rect x="4" y="4" width="11" height="14" rx="1" fill="none" stroke="#1a2a5c" strokeWidth="1" />
        <circle cx="9.5" cy="8.5" r="1.6" fill="#1a2a5c" />
        <path d="M 6,15 C 6,12 13,12 13,15" stroke="#1a2a5c" strokeWidth="1" fill="none" strokeLinecap="round" />
        {/* NFC waves */}
        <path d="M 19,5 Q 21.5,8 19,11 Q 21.5,14 19,17" fill="none" stroke="#1a2a5c" strokeWidth="1" strokeLinecap="round" />
        <path d="M 23,4 Q 26.5,8 23,11 Q 26.5,14 23,18" fill="none" stroke="#1a2a5c" strokeWidth="1" strokeLinecap="round" />
        <path d="M 27,3 Q 31.5,8 27,11 Q 31.5,14 27,19" fill="none" stroke="#1a2a5c" strokeWidth="1" strokeLinecap="round" />
    </svg>
);

/* ──────────────────────────────────────────────────────────
   COAT OF ARMS (Spanish royal arms watermark)
   Center of front, behind data area
   ────────────────────────────────────────────────────────── */
const RoyalCoatOfArms: React.FC<{ size?: number }> = ({ size = 240 }) => (
    <svg width={size} height={size * 1.18} viewBox="0 0 240 282" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="goldL" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e0b040" />
                <stop offset="100%" stopColor="#b88020" />
            </linearGradient>
            <linearGradient id="redL" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#b83020" />
                <stop offset="100%" stopColor="#8a1810" />
            </linearGradient>
        </defs>

        <g opacity="0.42">
            {/* CROWN */}
            <g>
                <rect x="68" y="50" width="104" height="12" fill="url(#goldL)" />
                <rect x="68" y="44" width="104" height="6" fill="url(#redL)" />
                {/* Spikes with jewels */}
                <path d="M 75,44 L 80,18 L 85,44 Z" fill="url(#goldL)" />
                <path d="M 96,44 L 102,10 L 108,44 Z" fill="url(#goldL)" />
                <path d="M 117,44 L 124,4 L 131,44 Z" fill="url(#goldL)" />
                <path d="M 140,44 L 146,10 L 152,44 Z" fill="url(#goldL)" />
                <path d="M 161,44 L 166,18 L 171,44 Z" fill="url(#goldL)" />
                {/* Arches */}
                <path d="M 82,44 Q 124,28 166,44" fill="none" stroke="#a07020" strokeWidth="1.2" />
                <path d="M 102,44 Q 124,32 146,44" fill="none" stroke="#a07020" strokeWidth="1" />
                {/* Cross orb */}
                <circle cx="124" cy="14" r="3.5" fill="url(#goldL)" />
                <rect x="122" y="2" width="4" height="14" fill="url(#goldL)" />
                <rect x="116" y="6" width="16" height="3" fill="url(#goldL)" />
                {/* Jewels */}
                <circle cx="80" cy="53" r="2" fill="#3060a0" />
                <circle cx="102" cy="53" r="2" fill="#c83030" />
                <circle cx="124" cy="53" r="2.4" fill="#3060a0" />
                <circle cx="146" cy="53" r="2" fill="#c83030" />
                <circle cx="166" cy="53" r="2" fill="#3060a0" />
            </g>

            {/* SHIELD body */}
            <path d="M 50,68 L 198,68 L 198,178 C 198,224 124,266 124,266 C 124,266 50,224 50,178 Z"
                fill="rgba(245,235,200,0.45)" stroke="#8a6010" strokeWidth="2" />

            {/* Quadrant lines */}
            <line x1="124" y1="68" x2="124" y2="252" stroke="#8a6010" strokeWidth="1" />
            <line x1="50" y1="160" x2="198" y2="160" stroke="#8a6010" strokeWidth="1" />

            {/* Q1 - top-left: Castle of Castile */}
            <rect x="51" y="69" width="72" height="90" fill="rgba(180,40,30,0.3)" />
            <g>
                {/* Central tower */}
                <rect x="78" y="100" width="22" height="42" fill="url(#goldL)" />
                <rect x="78" y="94" width="6" height="8" fill="url(#goldL)" />
                <rect x="86" y="94" width="6" height="8" fill="url(#goldL)" />
                <rect x="94" y="94" width="6" height="8" fill="url(#goldL)" />
                {/* Side towers */}
                <rect x="60" y="118" width="14" height="24" fill="url(#goldL)" />
                <rect x="60" y="114" width="4" height="6" fill="url(#goldL)" />
                <rect x="66" y="114" width="4" height="6" fill="url(#goldL)" />
                <rect x="70" y="114" width="4" height="6" fill="url(#goldL)" />
                <rect x="104" y="118" width="14" height="24" fill="url(#goldL)" />
                <rect x="104" y="114" width="4" height="6" fill="url(#goldL)" />
                <rect x="110" y="114" width="4" height="6" fill="url(#goldL)" />
                <rect x="114" y="114" width="4" height="6" fill="url(#goldL)" />
                {/* Door */}
                <path d="M 84,142 L 84,124 Q 89,118 94,124 L 94,142 Z" fill="#8a1810" />
                {/* Windows */}
                <rect x="63" y="124" width="4" height="6" fill="#8a1810" />
                <rect x="111" y="124" width="4" height="6" fill="#8a1810" />
            </g>

            {/* Q2 - top-right: Lion of León (on silver) */}
            <rect x="124" y="69" width="74" height="90" fill="rgba(245,235,200,0.5)" />
            <g>
                {/* Stylized lion rampant */}
                <path d="M 155,82 C 158,80 162,80 164,83 C 166,86 165,89 163,90
                         C 166,92 168,95 167,99 C 166,103 162,103 160,101
                         C 162,104 162,108 159,110 C 156,112 152,110 151,107
                         C 149,109 145,109 143,106 C 141,103 143,99 145,98
                         C 142,96 141,92 143,89 C 145,85 150,85 152,87
                         C 150,84 152,79 155,82 Z" fill="url(#redL)" />
                {/* Legs and body */}
                <rect x="150" y="105" width="3" height="20" fill="url(#redL)" />
                <rect x="160" y="105" width="3" height="20" fill="url(#redL)" />
                <rect x="146" y="120" width="3" height="22" fill="url(#redL)" />
                <rect x="164" y="120" width="3" height="22" fill="url(#redL)" />
                {/* Tail */}
                <path d="M 167,90 Q 175,94 172,108 Q 174,118 178,120" fill="none" stroke="url(#redL)" strokeWidth="2.5" strokeLinecap="round" />
                {/* Tongue */}
                <path d="M 154,87 L 152,90 L 154,90 Z" fill="#c83030" />
                {/* Crown on lion */}
                <rect x="152" y="74" width="14" height="3" fill="url(#goldL)" />
                <path d="M 153,74 L 154,70 L 155,74 M 156,74 L 157,68 L 158,74 M 159,74 L 160,68 L 161,74 M 162,74 L 163,70 L 164,74" stroke="url(#goldL)" strokeWidth="1.4" fill="none" />
            </g>

            {/* Q3 - bottom-left: Aragón (vertical red bars on gold) */}
            <rect x="51" y="160" width="72" height="92" fill="rgba(245,235,200,0.5)" />
            <g>
                <rect x="60" y="170" width="6" height="76" fill="url(#redL)" />
                <rect x="72" y="170" width="6" height="76" fill="url(#redL)" />
                <rect x="84" y="170" width="6" height="76" fill="url(#redL)" />
                <rect x="96" y="170" width="6" height="76" fill="url(#redL)" />
                <rect x="108" y="170" width="6" height="76" fill="url(#redL)" />
            </g>

            {/* Q4 - bottom-right: Chains of Navarra (gold on red) */}
            <rect x="124" y="160" width="74" height="92" fill="rgba(180,40,30,0.3)" />
            <g>
                {/* Chain pattern: cross + diagonals */}
                <line x1="161" y1="170" x2="161" y2="246" stroke="url(#goldL)" strokeWidth="2.4" />
                <line x1="128" y1="208" x2="194" y2="208" stroke="url(#goldL)" strokeWidth="2.4" />
                <line x1="135" y1="180" x2="187" y2="236" stroke="url(#goldL)" strokeWidth="1.6" />
                <line x1="187" y1="180" x2="135" y2="236" stroke="url(#goldL)" strokeWidth="1.6" />
                {/* Chain links */}
                {[180, 190, 200, 218, 228, 238].map(y => (
                    <circle key={y} cx="161" cy={y} r="2.2" fill="none" stroke="url(#goldL)" strokeWidth="1" />
                ))}
                {[136, 146, 156, 166, 176, 186].map(x => (
                    <circle key={`h${x}`} cx={x} cy="208" r="2.2" fill="none" stroke="url(#goldL)" strokeWidth="1" />
                ))}
                {/* Center emerald */}
                <circle cx="161" cy="208" r="4" fill="#20a050" />
            </g>

            {/* CENTER escutcheon (Bourbon — fleurs-de-lis on blue) */}
            <ellipse cx="124" cy="206" rx="17" ry="24" fill="rgba(40,70,160,0.55)" stroke="#8a6010" strokeWidth="1.4" />
            <g fill="url(#goldL)">
                {/* 3 stylized fleurs */}
                <g transform="translate(118,192)">
                    <path d="M 0,0 C -2,-2 -2,-4 0,-6 C 2,-4 2,-2 0,0 M -3,1 L 3,1 M 0,0 L 0,5" stroke="url(#goldL)" strokeWidth="1.4" fill="none" />
                </g>
                <g transform="translate(130,192)">
                    <path d="M 0,0 C -2,-2 -2,-4 0,-6 C 2,-4 2,-2 0,0 M -3,1 L 3,1 M 0,0 L 0,5" stroke="url(#goldL)" strokeWidth="1.4" fill="none" />
                </g>
                <g transform="translate(124,210)">
                    <path d="M 0,0 C -2,-2 -2,-4 0,-6 C 2,-4 2,-2 0,0 M -3,1 L 3,1 M 0,0 L 0,5" stroke="url(#goldL)" strokeWidth="1.4" fill="none" />
                </g>
            </g>

            {/* Pomegranate of Granada (base) */}
            <g>
                <path d="M 108,250 Q 124,238 140,250 Q 140,264 124,270 Q 108,264 108,250 Z" fill="url(#redL)" />
                <path d="M 122,242 L 124,236 L 126,242" stroke="#406030" strokeWidth="1.2" fill="none" />
                <circle cx="124" cy="240" r="2" fill="#406030" />
            </g>

            {/* Pillars of Hercules with PLUS ULTRA ribbons */}
            <g>
                <rect x="22" y="170" width="14" height="68" rx="2" fill="url(#goldL)" />
                <rect x="20" y="162" width="18" height="10" rx="2" fill="url(#goldL)" />
                <rect x="20" y="236" width="18" height="8" rx="2" fill="url(#goldL)" />
                <circle cx="29" cy="156" r="6" fill="url(#goldL)" />
                <rect x="27" y="148" width="4" height="6" fill="url(#goldL)" />

                <rect x="204" y="170" width="14" height="68" rx="2" fill="url(#goldL)" />
                <rect x="202" y="162" width="18" height="10" rx="2" fill="url(#goldL)" />
                <rect x="202" y="236" width="18" height="8" rx="2" fill="url(#goldL)" />
                <circle cx="211" cy="156" r="6" fill="url(#goldL)" />
                <rect x="209" y="148" width="4" height="6" fill="url(#goldL)" />

                {/* Ribbons */}
                <path d="M 12,196 Q 32,190 38,200 Q 32,210 12,202 Z" fill="url(#redL)" />
                <path d="M 202,200 Q 208,190 228,196 Q 228,202 202,210 Z" fill="url(#redL)" />
                <text x="26" y="201" fontSize="3.5" fill="#fff" textAnchor="middle" fontWeight="700">PLUS</text>
                <text x="216" y="201" fontSize="3.5" fill="#fff" textAnchor="middle" fontWeight="700">ULTRA</text>
            </g>
        </g>
    </svg>
);

/* ──────────────────────────────────────────────────────────
   GUILLOCHÉ BACKGROUNDS
   ────────────────────────────────────────────────────────── */
const FrontPattern: React.FC = () => (
    <svg width="856" height="540" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'multiply' }}>
        <defs>
            <pattern id="microWaves" patternUnits="userSpaceOnUse" width="90" height="14">
                <path d="M 0,7 Q 22,0 45,7 T 90,7" fill="none" stroke="#5a7a92" strokeWidth="0.45" />
            </pattern>
            <pattern id="microWaves2" patternUnits="userSpaceOnUse" width="70" height="16" patternTransform="rotate(8)">
                <path d="M 0,8 Q 17,1 35,8 T 70,8" fill="none" stroke="#7088a0" strokeWidth="0.4" />
            </pattern>
        </defs>
        <rect width="856" height="540" fill="url(#microWaves)" opacity="0.5" />
        <rect width="856" height="540" fill="url(#microWaves2)" opacity="0.32" />
        {/* Color washes - blue, gold and red */}
        {Array.from({ length: 18 }, (_, i) => {
            const y = 20 + i * 28;
            const colors = ['#3060a0', '#a08020', '#a04030'];
            return (
                <path key={i}
                    d={`M 0,${y} Q 150,${y - 11} 300,${y} T 600,${y} T 856,${y}`}
                    fill="none" stroke={colors[i % 3]} strokeWidth="0.6" opacity="0.16" />
            );
        })}
    </svg>
);

const BackPattern: React.FC = () => (
    <svg width="856" height="540" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <defs>
            <radialGradient id="spot1" cx="22%" cy="50%" r="48%">
                <stop offset="0%" stopColor="#e8c890" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#f5e8c8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="spot2" cx="75%" cy="35%" r="50%">
                <stop offset="0%" stopColor="#f0bc70" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#f5e8c8" stopOpacity="0" />
            </radialGradient>
            <pattern id="backMicro" patternUnits="userSpaceOnUse" width="100" height="14">
                <path d="M 0,7 Q 25,0 50,7 T 100,7" fill="none" stroke="#7a8090" strokeWidth="0.3" />
            </pattern>
        </defs>
        <rect width="856" height="540" fill="url(#backMicro)" opacity="0.28" />
        <rect width="856" height="540" fill="url(#spot1)" />
        <rect width="856" height="540" fill="url(#spot2)" />
        {/* Big swirl behind chip */}
        {[80, 130, 180, 230, 280].map(r => (
            <circle key={r} cx="180" cy="220" r={r} fill="none" stroke="#6a8090" strokeWidth="0.35" opacity="0.18" />
        ))}
    </svg>
);

/* ──────────────────────────────────────────────────────────
   SPAIN MAP (back, right)
   ────────────────────────────────────────────────────────── */
const SpainMapBack: React.FC = () => (
    <svg width="340" height="280" viewBox="0 0 340 280" style={{ position: 'absolute', right: 0, top: 6, pointerEvents: 'none' }}>
        <defs>
            <linearGradient id="mapG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f0c878" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#e0801c" stopOpacity="0.78" />
                <stop offset="100%" stopColor="#a8500c" stopOpacity="0.5" />
            </linearGradient>
        </defs>
        {/* Mainland Iberian peninsula (more detailed shape) */}
        <path d="
            M 36,68 C 24,52 28,28 56,18 C 88,8 130,5 175,12
            C 215,18 248,16 275,28 C 295,38 305,55 298,72
            C 295,86 280,92 280,108 C 282,124 295,132 290,150
            C 282,172 268,188 245,206 C 218,225 184,232 152,225
            C 122,218 96,202 76,180 C 56,158 42,128 38,98
            C 36,82 36,72 36,68 Z"
            fill="url(#mapG)" stroke="#9c5018" strokeWidth="0.9" opacity="0.85" />
        {/* Portugal dotted border */}
        <path d="M 36,68 C 32,90 30,118 36,148 C 42,176 52,194 70,212"
            fill="none" stroke="#9c5018" strokeWidth="0.7" strokeDasharray="2.5,1.5" opacity="0.55" />
        {/* Balearic Islands */}
        <ellipse cx="282" cy="118" rx="13" ry="7" fill="url(#mapG)" stroke="#9c5018" strokeWidth="0.5" />
        <ellipse cx="302" cy="128" rx="7" ry="4" fill="url(#mapG)" stroke="#9c5018" strokeWidth="0.5" />
        <ellipse cx="293" cy="138" rx="3" ry="2" fill="url(#mapG)" stroke="#9c5018" strokeWidth="0.4" />
        {/* Canary Islands inset */}
        <ellipse cx="34" cy="248" rx="6" ry="4" fill="url(#mapG)" opacity="0.7" />
        <ellipse cx="48" cy="244" rx="5" ry="3" fill="url(#mapG)" opacity="0.7" />
        <ellipse cx="62" cy="247" rx="5" ry="3.2" fill="url(#mapG)" opacity="0.7" />
        <ellipse cx="76" cy="252" rx="4" ry="2.5" fill="url(#mapG)" opacity="0.7" />
        <ellipse cx="88" cy="256" rx="3" ry="2" fill="url(#mapG)" opacity="0.7" />
    </svg>
);

const MinisterioEmblem: React.FC = () => (
    <svg width="80" height="44" viewBox="0 0 80 44" style={{ position: 'absolute', right: 26, top: 175 }}>
        <g opacity="0.85">
            {/* Mini shield */}
            <path d="M 6,4 L 30,4 L 30,22 C 30,32 18,38 18,38 C 18,38 6,32 6,22 Z"
                fill="rgba(220,180,90,0.3)" stroke="#8a5810" strokeWidth="0.8" />
            <line x1="18" y1="4" x2="18" y2="36" stroke="#8a5810" strokeWidth="0.5" />
            <line x1="6" y1="18" x2="30" y2="18" stroke="#8a5810" strokeWidth="0.5" />
            <path d="M 8,4 L 10,1 L 12,4 M 14,4 L 16,0 L 18,4 M 20,4 L 22,0 L 24,4 M 26,4 L 28,1 L 30,4" stroke="#8a5810" strokeWidth="0.6" fill="none" />
        </g>
        <text x="36" y="14" fontSize="4.5" fill="#666" fontWeight="700">MINISTERIO</text>
        <text x="36" y="22" fontSize="4.5" fill="#666" fontWeight="700">DEL INTERIOR</text>
    </svg>
);

/* ──────────────────────────────────────────────────────────
   GOLD CHIP (back)
   ────────────────────────────────────────────────────────── */
const ChipBack: React.FC = () => (
    <svg width="90" height="72" viewBox="0 0 90 72">
        <defs>
            <linearGradient id="chipGr" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#cc9818" />
                <stop offset="35%" stopColor="#f0c838" />
                <stop offset="68%" stopColor="#b88018" />
                <stop offset="100%" stopColor="#e0ac20" />
            </linearGradient>
        </defs>
        <rect width="90" height="72" rx="7" fill="url(#chipGr)" stroke="#8a6010" strokeWidth="0.6" />
        {/* 8 contact pads */}
        <rect x="6" y="7" width="22" height="16" rx="2" fill="rgba(0,0,0,0.22)" />
        <rect x="34" y="7" width="22" height="16" rx="2" fill="rgba(0,0,0,0.22)" />
        <rect x="62" y="7" width="22" height="16" rx="2" fill="rgba(0,0,0,0.22)" />
        <rect x="6" y="28" width="22" height="16" rx="2" fill="rgba(0,0,0,0.22)" />
        <rect x="62" y="28" width="22" height="16" rx="2" fill="rgba(0,0,0,0.22)" />
        <rect x="6" y="49" width="22" height="16" rx="2" fill="rgba(0,0,0,0.22)" />
        <rect x="34" y="49" width="22" height="16" rx="2" fill="rgba(0,0,0,0.22)" />
        <rect x="62" y="49" width="22" height="16" rx="2" fill="rgba(0,0,0,0.22)" />
        {/* Central module */}
        <rect x="32" y="26" width="26" height="20" rx="2" fill="rgba(0,0,0,0.12)" />
        <rect x="36" y="30" width="18" height="12" rx="1" fill="rgba(255,255,255,0.18)" />
        {/* Shine */}
        <rect x="3" y="2" width="84" height="3" rx="1" fill="rgba(255,255,255,0.35)" />
    </svg>
);

/* ──────────────────────────────────────────────────────────
   SIGNATURE SCRIBBLE
   ────────────────────────────────────────────────────────── */
const SignatureScribble: React.FC = () => (
    <svg width="240" height="44" viewBox="0 0 240 44" style={{ opacity: 0.92 }}>
        {/* Cursive flowing signature */}
        <path d="M 8,34 C 14,18 24,12 32,22 C 38,30 36,34 42,32 C 50,30 52,18 60,18
                 C 68,18 70,28 78,28 C 86,28 90,18 96,20 C 102,22 100,32 108,32
                 C 114,32 118,26 124,26 C 130,26 132,32 138,30
                 C 146,28 150,18 158,18 C 166,18 168,28 176,28
                 C 184,28 188,22 196,22 C 204,22 208,28 216,26
                 C 224,24 230,32 236,28"
            fill="none" stroke="#0a1822" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {/* Underline flourish */}
        <path d="M 80,38 C 110,42 150,40 200,36"
            fill="none" stroke="#0a1822" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
);

/* ──────────────────────────────────────────────────────────
   FRONT CARD - PRECISE LAYOUT
   ────────────────────────────────────────────────────────── */
const DNIFront: React.FC<{ f: FormData }> = ({ f }) => {
    const dniDigits = (f.dni || '').replace(/\D/g, '');
    const letra = f.letraDni || dniLetter(dniDigits) || '';
    const dniFull = dniDigits ? `${dniDigits}${letra}` : '99999999R';
    const ap1 = (f.primerApellido || '').toUpperCase();
    const ap2 = (f.segundoApellido || '').toUpperCase();
    const nombre = (f.nombre || '').toUpperCase();

    return (
        <div style={{
            width: '856px', height: '540px', position: 'relative', borderRadius: '20px',
            overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            background: 'linear-gradient(110deg, #f5f0db 0%, #f4ecd0 35%, #f0e6c0 60%, #f6efd6 100%)',
            fontFamily: "Arial, Helvetica, sans-serif", userSelect: 'none',
        }}>
            {/* Security wave pattern */}
            <FrontPattern />

            {/* Coat of arms watermark — center, behind data */}
            <div style={{ position: 'absolute', left: '300px', top: '94px', pointerEvents: 'none' }}>
                <RoyalCoatOfArms size={270} />
            </div>

            {/* ──── HEADER ──── */}

            {/* EU Flag */}
            <div style={{ position: 'absolute', left: '22px', top: '17px', borderRadius: '2px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                <EUFlag w={64} h={44} />
            </div>

            {/* Spanish Flag */}
            <div style={{ position: 'absolute', left: '96px', top: '17px', borderRadius: '2px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                <SpainFlag w={64} h={44} />
            </div>

            {/* Title */}
            <div style={{ position: 'absolute', left: '178px', top: '13px' }}>
                <div style={{
                    fontSize: '34px', fontWeight: 900, color: '#1a3a8c',
                    letterSpacing: '0.3px', lineHeight: 1,
                    fontFamily: 'Arial, Helvetica, sans-serif',
                }}>REINO DE ESPAÑA</div>
                <div style={{
                    fontSize: '12.5px', fontWeight: 800, color: '#c8112d',
                    letterSpacing: '1.5px', marginTop: '4px',
                    borderTop: '1.4px solid #c8112d', paddingTop: '3px',
                    width: 'fit-content',
                }}>DOCUMENTO NACIONAL DE IDENTIDAD</div>
            </div>

            {/* Biometric icon */}
            <div style={{ position: 'absolute', right: '24px', top: '20px' }}>
                <BiometricIcon />
            </div>

            {/* CAN oval (under biometric) */}
            <div style={{
                position: 'absolute', right: '24px', top: '54px',
                background: 'linear-gradient(180deg, #d8cca8, #c0b48c)',
                border: '1px solid #8a7848',
                borderRadius: '50%/55%',
                padding: '3px 14px',
                fontSize: '11.5px', fontWeight: 700, color: '#2a2010',
                fontFamily: "'Courier New', monospace", letterSpacing: '1.2px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.18), 0 1px 1px rgba(0,0,0,0.08)',
            }}>
                {(f.numSoporte || 'CAA000000').toUpperCase()}
            </div>

            {/* ──── LEFT EDGE: vertical DNI security text ──── */}
            <div style={{
                position: 'absolute', left: '11px', top: '108px',
                writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                fontSize: '12.5px', fontWeight: 700, color: '#1a3a8c',
                letterSpacing: '3.5px', opacity: 0.78,
                fontFamily: "'Arial Narrow', Arial, sans-serif",
            }}>{dniFull}</div>

            {/* ──── PHOTO ──── */}
            <div style={{
                position: 'absolute', left: '38px', top: '78px',
                width: '216px', height: '374px',
                overflow: 'hidden',
                WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 75%, rgba(0,0,0,0.85) 100%)',
                maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 75%, rgba(0,0,0,0.85) 100%)',
            }}>
                {f.photo ? (
                    <img src={f.photo} alt="" style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        filter: 'grayscale(0.9) contrast(1.05)',
                        mixBlendMode: 'multiply',
                    }} />
                ) : (
                    <div style={{
                        width: '100%', height: '100%',
                        background: 'linear-gradient(180deg, rgba(170,160,140,0.12), rgba(130,120,100,0.22))',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '12px', color: '#88796a',
                    }}>
                        <User size={68} strokeWidth={0.7} />
                        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px' }}>FOTO</span>
                    </div>
                )}
            </div>

            {/* ──── RIGHT-SIDE DATA FIELDS ──── */}

            {/* DNI row: mini-flag + DNI + number */}
            <div style={{ position: 'absolute', left: '282px', top: '86px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ display: 'inline-block', position: 'relative', top: '1px' }}><MiniSpainFlag /></span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a3a8c', letterSpacing: '0.5px' }}>DNI</span>
                <span style={{
                    fontSize: '32px', fontWeight: 900, color: '#181818',
                    letterSpacing: '2px', lineHeight: 1, marginLeft: '4px',
                    fontFamily: "Arial, sans-serif",
                }}>{dniFull}</span>
            </div>

            {/* APELLIDOS */}
            <div style={{ position: 'absolute', left: '292px', top: '136px' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#c8112d', letterSpacing: '1.3px', textTransform: 'uppercase' }}>Apellidos</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#181818', letterSpacing: '0.5px', lineHeight: '1.05', marginTop: '3px' }}>
                    {ap1 || <span style={{ color: '#bbb', fontWeight: 500, fontSize: '15px' }}>ESPAÑOLA</span>}
                </div>
                {(ap2 || (!ap1 && !ap2)) && (
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#181818', letterSpacing: '0.5px', lineHeight: '1.05', marginTop: '2px' }}>
                        {ap2 || <span style={{ color: '#bbb', fontWeight: 500, fontSize: '15px' }}>ESPAÑOLA</span>}
                    </div>
                )}
            </div>

            {/* NOMBRE */}
            <div style={{ position: 'absolute', left: '292px', top: '215px' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#c8112d', letterSpacing: '1.3px', textTransform: 'uppercase' }}>Nombre</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#181818', letterSpacing: '0.5px', lineHeight: '1.05', marginTop: '3px' }}>
                    {nombre || <span style={{ color: '#bbb', fontWeight: 500, fontSize: '15px' }}>CARMEN</span>}
                </div>
            </div>

            {/* SEXO / NACIONALIDAD / NACIMIENTO row */}
            <div style={{ position: 'absolute', left: '292px', top: '262px', display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ minWidth: '44px' }}>
                    <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#c8112d', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Sexo</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#181818', marginTop: '3px' }}>{f.sexo || 'F'}</div>
                </div>
                <div style={{ minWidth: '120px', marginLeft: '14px' }}>
                    <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#c8112d', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Nacionalidad</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#181818', marginTop: '3px' }}>{(f.nacionalidad || 'ESP').toUpperCase()}</div>
                </div>
                <div>
                    <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#c8112d', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Nacimiento</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#181818', marginTop: '3px', letterSpacing: '1.2px' }}>
                        {dispDate(f.fechaNacimiento) || '01 01 1980'}
                    </div>
                </div>
            </div>

            {/* EMISIÓN / VALIDEZ row */}
            <div style={{ position: 'absolute', left: '292px', top: '316px', display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ minWidth: '120px' }}>
                    <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#c8112d', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Emisión</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#181818', marginTop: '3px', letterSpacing: '1.2px' }}>
                        {dispDate(f.fechaExpedicion) || '02 06 2021'}
                    </div>
                </div>
                <div style={{ marginLeft: '36px' }}>
                    <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#c8112d', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Validez</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#181818', marginTop: '3px', letterSpacing: '1.2px' }}>
                        {dispDate(f.fechaValidez) || '02 06 2031'}
                    </div>
                </div>
            </div>

            {/* NUM SOPORTE */}
            <div style={{ position: 'absolute', left: '292px', top: '370px' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 800, color: '#c8112d', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Núm. Soporte</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#181818', marginTop: '3px', letterSpacing: '1.5px', fontFamily: "Arial, sans-serif" }}>
                    {(f.numSoporte || 'CAA000000').toUpperCase()}
                </div>
            </div>

            {/* Far-right small number (e.g. 020631) */}
            <div style={{
                position: 'absolute', right: '32px', top: '328px',
                fontSize: '13.5px', fontWeight: 800, color: '#181818',
                letterSpacing: '1.5px', fontFamily: 'Arial, sans-serif',
            }}>
                {f.equipoExpedicion ? f.equipoExpedicion.replace(/[^0-9]/g, '').slice(-6).padStart(6, '0') : '020631'}
            </div>

            {/* Signature */}
            <div style={{ position: 'absolute', right: '58px', bottom: '70px' }}>
                <SignatureScribble />
            </div>

            {/* 987654 below signature */}
            <div style={{
                position: 'absolute', right: '34px', bottom: '46px',
                fontSize: '15px', fontWeight: 800, color: '#181818',
                letterSpacing: '1.8px', fontFamily: 'Arial, sans-serif',
            }}>987654</div>

            {/* ESPECIMEN diagonal watermark */}
            <div style={{
                position: 'absolute', right: '78px', top: '50%',
                transform: 'translateY(-50%) rotate(-72deg)',
                transformOrigin: 'center',
                fontSize: '44px', fontWeight: 900,
                color: 'rgba(160,32,32,0.42)',
                letterSpacing: '13px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                pointerEvents: 'none', whiteSpace: 'nowrap',
                textShadow: '1px 1px 0 rgba(120,20,20,0.08)',
            }}>
                ESPECIMEN
            </div>

            {/* Bottom strip */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: '28px',
                borderTop: '0.5px solid rgba(0,0,0,0.18)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                background: 'linear-gradient(180deg, transparent 0%, rgba(220,210,175,0.35) 100%)',
            }}>
                <span style={{
                    fontSize: '9.5px', fontWeight: 700, color: '#3a3a3a',
                    letterSpacing: '1.5px', textTransform: 'uppercase',
                }}>
                    Documento Nacional de Identidad / National Identity Card
                </span>
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────
   BACK CARD - PRECISE LAYOUT
   ────────────────────────────────────────────────────────── */
const DNIBack: React.FC<{ f: FormData; mrz: [string, string, string] }> = ({ f, mrz }) => {
    const canNum = (f.numSoporte || 'CAA000000').toUpperCase();
    const equipo = (f.equipoExpedicion || '28391A6DK').toUpperCase();

    return (
        <div style={{
            width: '856px', height: '540px', position: 'relative', borderRadius: '20px',
            overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            background: 'linear-gradient(110deg, #f6ecd2 0%, #f4e6c0 35%, #f0dca8 60%, #f5e8c8 100%)',
            fontFamily: "Arial, Helvetica, sans-serif", userSelect: 'none',
        }}>
            {/* Background pattern */}
            <BackPattern />

            {/* Spain map */}
            <SpainMapBack />

            {/* Ministerio emblem */}
            <MinisterioEmblem />

            {/* Large "DNI" central watermark */}
            <div style={{
                position: 'absolute', left: '236px', top: '120px',
                fontSize: '92px', fontWeight: 900,
                color: 'rgba(120,108,72,0.22)',
                fontFamily: "Arial, Helvetica, sans-serif",
                letterSpacing: '4px', lineHeight: 1,
                pointerEvents: 'none',
            }}>DNI</div>

            {/* EQUIPO vertical text on far left */}
            <div style={{
                position: 'absolute', left: '12px', top: '76px',
                writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                display: 'flex', alignItems: 'center', gap: '14px',
            }}>
                <span style={{
                    fontSize: '10px', fontWeight: 800, color: '#222',
                    letterSpacing: '1.5px', textTransform: 'uppercase',
                }}>EQUIPO</span>
                <span style={{
                    fontSize: '15px', fontWeight: 800, color: '#181818',
                    letterSpacing: '2.5px',
                }}>{equipo}</span>
            </div>

            {/* CAN oval */}
            <div style={{
                position: 'absolute', left: '54px', top: '42px',
                background: 'linear-gradient(180deg, #ddd0a8, #c5b888)',
                border: '1.3px solid #8a7848',
                borderRadius: '50%/65%',
                padding: '5px 22px',
                boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.08)',
            }}>
                <span style={{
                    fontSize: '13px', fontWeight: 700, color: '#2a2010',
                    fontFamily: "'Courier New', monospace", letterSpacing: '1.5px',
                }}>{canNum}</span>
            </div>

            {/* Gold chip */}
            <div style={{ position: 'absolute', left: '60px', top: '100px' }}>
                <ChipBack />
            </div>

            {/* ──── DATA FIELDS ──── */}

            {/* DOMICILIO */}
            <div style={{ position: 'absolute', left: '232px', top: '34px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#161616', letterSpacing: '1.4px', textTransform: 'uppercase' }}>Domicilio</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#181818', letterSpacing: '1px', lineHeight: '1.32', marginTop: '4px' }}>
                    {(f.domicilio || '').toUpperCase() || <span style={{ color: '#aaa', fontSize: '15px', fontWeight: 500 }}>AVDA DE MADRID S-N</span>}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#181818', letterSpacing: '1px', lineHeight: '1.32' }}>
                    {(f.municipio || '').toUpperCase() || <span style={{ color: '#aaa', fontSize: '15px', fontWeight: 500 }}>MADRID</span>}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#181818', letterSpacing: '1px', lineHeight: '1.32' }}>
                    {(f.provincia || '').toUpperCase() || <span style={{ color: '#aaa', fontSize: '15px', fontWeight: 500 }}>MADRID</span>}
                </div>
            </div>

            {/* LUGAR DE NACIMIENTO */}
            <div style={{ position: 'absolute', left: '232px', top: '180px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#161616', letterSpacing: '1.4px', textTransform: 'uppercase' }}>Lugar de Nacimiento</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#181818', letterSpacing: '1px', lineHeight: '1.32', marginTop: '4px' }}>
                    {(f.lugarNacimiento || '').toUpperCase() || <span style={{ color: '#aaa', fontSize: '15px', fontWeight: 500 }}>MADRID</span>}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#181818', letterSpacing: '1px', lineHeight: '1.32' }}>
                    {(f.municipioNacimiento || '').toUpperCase() || <span style={{ color: '#aaa', fontSize: '15px', fontWeight: 500 }}>MADRID</span>}
                </div>
            </div>

            {/* HIJO/A DE */}
            <div style={{ position: 'absolute', left: '232px', top: '272px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#161616', letterSpacing: '1.4px', textTransform: 'uppercase' }}>Hijo/a de</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#181818', letterSpacing: '1px', lineHeight: '1.32', marginTop: '4px' }}>
                    {[f.progenitor1, f.progenitor2].filter(Boolean).map(p => p!.toUpperCase()).join(' / ')
                        || <span style={{ color: '#aaa', fontSize: '15px', fontWeight: 500 }}>JUAN / CARMEN</span>}
                </div>
            </div>

            {/* ──── MRZ ZONE (bottom 1/3) ──── */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '152px',
                background: 'linear-gradient(180deg, rgba(248,240,218,0.4) 0%, rgba(252,247,232,0.92) 22%, rgba(252,247,232,0.95) 100%)',
                borderTop: '0.5px solid rgba(0,0,0,0.08)',
                padding: '24px 32px 18px',
            }}>
                {mrz.map((line, i) => (
                    <div key={i} style={{
                        fontFamily: "'Courier New', Courier, monospace",
                        fontSize: '23px', letterSpacing: '4.6px',
                        color: '#0a0a0a', lineHeight: '1.32', fontWeight: 700,
                    }}>{line || ''.padEnd(30, '<')}</div>
                ))}
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────
   FORM CONTROLS
   ────────────────────────────────────────────────────────── */
const Input: React.FC<{
    label: string; name: keyof FormData; value: string;
    onChange: (k: keyof FormData, v: string) => void;
    placeholder?: string; half?: boolean; options?: string[];
}> = ({ label, name, value, onChange, placeholder, half, options }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: half ? '0 0 calc(50% - 5px)' : '0 0 100%' }}>
        <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{label}</label>
        {options ? (
            <div style={{ position: 'relative' }}>
                <select value={value} onChange={e => onChange(name, e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '7px 28px 7px 10px', borderRadius: '6px', fontSize: '13px', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                    {options.map(o => <option key={o} value={o} style={{ background: '#0f172a' }}>{o}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
            </div>
        ) : (
            <input type="text" value={value} onChange={e => onChange(name, e.target.value)}
                placeholder={placeholder} autoComplete="off"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '7px 10px', borderRadius: '6px', fontSize: '13px', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(0,240,255,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
        )}
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '8px', color: 'rgba(0,240,255,0.55)', fontWeight: 900, letterSpacing: '2px', marginBottom: '8px', paddingBottom: '5px', borderBottom: '1px solid rgba(0,240,255,0.1)' }}>{title}</div>
        {children}
    </div>
);

/* ──────────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────────── */
interface DNIGeneratorProps { onClose: () => void; isClosing?: boolean; }

const DNIGenerator: React.FC<DNIGeneratorProps> = ({ onClose, isClosing }) => {
    const [form, setForm] = useState<FormData>({ ...EMPTY });
    const [side, setSide] = useState<'front' | 'back'>('front');
    const printRef = useRef<HTMLDivElement>(null);

    const set = (k: keyof FormData, v: string) => {
        setForm(prev => {
            const next = { ...prev, [k]: v };
            if (k === 'dni') {
                const digits = v.replace(/\D/g, '');
                next.dni = digits;
                next.letraDni = dniLetter(digits);
            }
            return next;
        });
    };

    const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setForm(prev => ({ ...prev, photo: ev.target?.result as string }));
        reader.readAsDataURL(file);
    };

    const mrz = useMemo(() => buildMRZ(form), [form]);

    const handlePrint = () => {
        const c = printRef.current;
        if (!c) return;
        const w = window.open('', '_blank', 'width=1100,height=900');
        if (!w) return;
        w.document.write(`<html><head><title>DNI – ${form.nombre} ${form.primerApellido}</title>
            <style>body{margin:0;padding:30px;background:#fff;display:flex;flex-direction:column;gap:30px;align-items:center;}
            @media print{body{padding:10px;gap:10px;}}</style></head>
            <body>${c.innerHTML}</body></html>`);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 600);
    };

    return (
        <div className={isClosing ? 'animate-fade-out' : 'animate-fade-in'} style={{
            position: 'fixed', inset: 0, background: 'rgba(5,8,16,0.75)',
            backdropFilter: 'blur(6px)', zIndex: 99999,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px', opacity: 0,
        }}>
            <style>{`
                @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
                @keyframes fadeOut { from { opacity:1; } to { opacity:0; } }
                .animate-fade-in { animation: fadeIn 0.3s ease forwards; }
                .animate-fade-out { animation: fadeOut 0.25s ease forwards; }
                .dni-scroll::-webkit-scrollbar { width: 4px; }
                .dni-scroll::-webkit-scrollbar-track { background: transparent; }
                .dni-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
                .dni-tab { padding: 7px 22px; border-radius: 7px; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; cursor: pointer; transition: all 0.2s; border: 1px solid; }
                .dni-tab-on { background: rgba(0,240,255,0.08); border-color: rgba(0,240,255,0.5); color: #00f0ff; }
                .dni-tab-off { background: transparent; border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.35); }
                .dni-tab-off:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.7); }
            `}</style>

            <div style={{
                width: '100%', maxWidth: '1420px', height: '90vh',
                background: 'rgba(10,16,30,0.98)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
            }}>
                {/* Header */}
                <div style={{ padding: '18px 26px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', background: 'rgba(220,50,50,0.1)', border: '1px solid rgba(220,50,50,0.3)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🪪</div>
                        <div>
                            <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>Generador de DNI</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.5px' }}>Documento Nacional de Identidad — España</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,240,255,0.07)', border: '1px solid rgba(0,240,255,0.3)', color: '#00f0ff', padding: '7px 14px', borderRadius: '7px', fontSize: '10px', fontWeight: 800, cursor: 'pointer', letterSpacing: '1px' }}>
                            <Printer size={13} /> IMPRIMIR
                        </button>
                        <button onClick={() => setForm({ ...EMPTY })} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)', padding: '7px 12px', borderRadius: '7px', fontSize: '10px', fontWeight: 800, cursor: 'pointer', letterSpacing: '1px' }}>
                            <RotateCcw size={12} /> LIMPIAR
                        </button>
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}><X size={20} /></button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Form panel */}
                    <div className="dni-scroll" style={{ width: '330px', flexShrink: 0, overflowY: 'auto', borderRight: '1px solid rgba(255,255,255,0.04)', padding: '18px 14px' }}>
                        <Section title="IDENTIFICACIÓN">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <Input label="Número DNI (sin letra)" name="dni" value={form.dni} onChange={set} placeholder="99999999" half />
                                <Input label="Letra (auto)" name="letraDni" value={form.letraDni} onChange={set} placeholder="R" half />
                                <Input label="Núm. Soporte (ej: CAA000000)" name="numSoporte" value={form.numSoporte} onChange={set} placeholder="CAA000000" />
                            </div>
                        </Section>

                        <Section title="DATOS PERSONALES">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <Input label="Nombre" name="nombre" value={form.nombre} onChange={set} placeholder="CARMEN" />
                                <Input label="Primer Apellido" name="primerApellido" value={form.primerApellido} onChange={set} placeholder="ESPAÑOLA" />
                                <Input label="Segundo Apellido" name="segundoApellido" value={form.segundoApellido} onChange={set} placeholder="ESPAÑOLA" />
                                <Input label="Sexo" name="sexo" value={form.sexo} onChange={set} options={['F', 'M']} half />
                                <Input label="Nacionalidad" name="nacionalidad" value={form.nacionalidad} onChange={set} placeholder="ESP" half />
                                <Input label="Fecha Nacimiento (DD/MM/AAAA)" name="fechaNacimiento" value={form.fechaNacimiento} onChange={set} placeholder="01/01/1980" />
                            </div>
                        </Section>

                        <Section title="FILIACIÓN">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <Input label="Progenitor 1" name="progenitor1" value={form.progenitor1} onChange={set} placeholder="JUAN" />
                                <Input label="Progenitor 2" name="progenitor2" value={form.progenitor2} onChange={set} placeholder="CARMEN" />
                            </div>
                        </Section>

                        <Section title="DOMICILIO">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <Input label="Dirección" name="domicilio" value={form.domicilio} onChange={set} placeholder="AVDA DE MADRID S-N" />
                                <Input label="Municipio" name="municipio" value={form.municipio} onChange={set} placeholder="MADRID" half />
                                <Input label="Provincia" name="provincia" value={form.provincia} onChange={set} placeholder="MADRID" half />
                            </div>
                        </Section>

                        <Section title="LUGAR DE NACIMIENTO">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <Input label="Municipio" name="lugarNacimiento" value={form.lugarNacimiento} onChange={set} placeholder="MADRID" half />
                                <Input label="Provincia" name="municipioNacimiento" value={form.municipioNacimiento} onChange={set} placeholder="MADRID" half />
                            </div>
                        </Section>

                        <Section title="EXPEDICIÓN">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <Input label="Fecha Expedición (DD/MM/AAAA)" name="fechaExpedicion" value={form.fechaExpedicion} onChange={set} placeholder="02/06/2021" half />
                                <Input label="Fecha Validez (DD/MM/AAAA)" name="fechaValidez" value={form.fechaValidez} onChange={set} placeholder="02/06/2031" half />
                                <Input label="Equipo Expedición" name="equipoExpedicion" value={form.equipoExpedicion} onChange={set} placeholder="28391A6DK" />
                            </div>
                        </Section>

                        <Section title="FOTOGRAFÍA">
                            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', padding: '14px', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,240,255,0.35)')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}>
                                <User size={22} color="rgba(255,255,255,0.25)" />
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>CARGAR FOTO</span>
                                <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
                            </label>
                            {form.photo && (
                                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                                    <img src={form.photo} style={{ width: '72px', height: '92px', objectFit: 'cover', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.15)' }} />
                                </div>
                            )}
                        </Section>
                    </div>

                    {/* Preview panel */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(4,7,14,0.5)' }}>
                        <div style={{ padding: '12px 22px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <button className={`dni-tab ${side === 'front' ? 'dni-tab-on' : 'dni-tab-off'}`} onClick={() => setSide('front')}>CARA DELANTERA</button>
                            <button className={`dni-tab ${side === 'back' ? 'dni-tab-on' : 'dni-tab-off'}`} onClick={() => setSide('back')}>CARA TRASERA</button>
                        </div>

                        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                            <div style={{ transform: 'scale(0.72)', transformOrigin: 'center center' }}>
                                {side === 'front' ? <DNIFront f={form} /> : <DNIBack f={form} mrz={mrz} />}
                            </div>
                        </div>

                        <div style={{ padding: '10px 22px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
                            <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.25)', letterSpacing: '2px', marginBottom: '3px' }}>MRZ GENERADO</div>
                            {mrz.map((line, i) => (
                                <div key={i} style={{ fontFamily: "'Courier New', monospace", fontSize: '11px', letterSpacing: '2.5px', color: 'rgba(0,240,255,0.7)' }}>{line}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden print area */}
            <div ref={printRef} style={{ display: 'none' }}>
                <div style={{ transform: 'scale(0.78)', transformOrigin: 'top left', marginBottom: '16px' }}>
                    <DNIFront f={form} />
                </div>
                <div style={{ transform: 'scale(0.78)', transformOrigin: 'top left' }}>
                    <DNIBack f={form} mrz={mrz} />
                </div>
            </div>
        </div>
    );
};

export default DNIGenerator;
