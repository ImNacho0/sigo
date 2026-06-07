import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, AlertCircle, Database } from 'lucide-react';

type CpData = Record<string, { prov: string; pob: string; rows: string[] }>;
const _cpCache: Record<string, Promise<CpData>> = {};
const getCpData = (prefix: string): Promise<CpData> => {
    if (!_cpCache[prefix]) {
        _cpCache[prefix] = import(`../data/cp/cp${prefix}.ts`).then(m => m.default);
    }
    return _cpCache[prefix];
};
import SearchResultsModal from './SearchResultsModal';
import CpLookupPanel from './CpLookupPanel';
import FichaCensado from './FichaCensado';
import Modelo030 from './Modelo030';
import FichaSelector from './FichaSelector';
import type { FichaTipo } from './FichaSelector';

interface SearchWidgetProps {
    region: {
        id: string;
        country: string;
    };
}

const targetMapping: Record<string, string> = {
    'es': 'searchesp',
    'ar': 'searcharg',
    'mx': 'searchmex',
    'co': 'searchcol',
    'cl': 'searchchi',
    'pe': 'searchper',
    'ec': 'searchecu',
    've': 'searchven',
    'uy': 'searchuru',
    'py': 'searchpar',
    'sv': 'searchslv',
    'ni': 'searchnic',
    'bo': 'searchbol'
};

const SearchWidget: React.FC<SearchWidgetProps> = ({ region }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [isClosingModal, setIsClosingModal] = useState(false);
    const [isPadronMode, setIsPadronMode] = useState(false);
    const [isDniTool, setIsDniTool] = useState(false);
    const [dniResult, setDniResult] = useState<string | null>(null);
    const [isCpTool, setIsCpTool] = useState(false);
    const [cpResult, setCpResult] = useState<{ cp: string; prov: string; pob: string; rows: string[] } | null>(null);
    const [isAdvancedEnabled, setIsAdvancedEnabled] = useState(localStorage.getItem('advanced_search_enabled') === 'true');
    const [showFichaSelector, setShowFichaSelector] = useState(false);
    const [activeFicha, setActiveFicha] = useState<FichaTipo | null>(null);

    // Monitor advanced search setting
    React.useEffect(() => {
        const checkSetting = () => {
            const enabled = localStorage.getItem('advanced_search_enabled') === 'true';
            setIsAdvancedEnabled(enabled);
        };
        const interval = setInterval(checkSetting, 1000);
        window.addEventListener('storage', checkSetting);
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', checkSetting);
        };
    }, []);

    React.useEffect(() => {
        setQuery('');
        setResults(null);
        setError(null);
        setShowModal(false);
        setModalVisible(false);
        setDniResult(null);
        setCpResult(null);
    }, [region.id]);

    // Mutual exclusion logic
    React.useEffect(() => {
        if (isAdvancedEnabled) {
            setIsPadronMode(false);
            setIsDniTool(false);
        }
    }, [isAdvancedEnabled]);


    const togglePadron = () => {
        const newState = !isPadronMode;
        setIsPadronMode(newState);
        if (newState) {
            setIsAdvancedEnabled(false);
            localStorage.setItem('advanced_search_enabled', 'false');
            setIsDniTool(false);
            setIsCpTool(false);
        }
    };

    const toggleDniTool = () => {
        const newState = !isDniTool;
        setIsDniTool(newState);
        if (newState) {
            setIsAdvancedEnabled(false);
            localStorage.setItem('advanced_search_enabled', 'false');
            setIsPadronMode(false);
            setIsCpTool(false);
        }
    };

    const toggleCpTool = () => {
        const newState = !isCpTool;
        setIsCpTool(newState);
        if (newState) {
            setIsAdvancedEnabled(false);
            localStorage.setItem('advanced_search_enabled', 'false');
            setIsPadronMode(false);
            setIsDniTool(false);
        }
    };

    let target = targetMapping[region.id];
    if (region.id === 'es' && isPadronMode) {
        target = 'padronesp';
    }

    const calculateDni = (input: string) => {
        const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        let cleanInput = input.trim().toUpperCase();
        let numberPart = cleanInput;
        if (['X', 'Y', 'Z'].includes(cleanInput[0])) {
            const prefix = cleanInput[0] === 'X' ? '0' : (cleanInput[0] === 'Y' ? '1' : '2');
            numberPart = prefix + cleanInput.slice(1);
        }
        const num = parseInt(numberPart.replace(/\D/g, ''), 10);
        return isNaN(num) ? null : `${cleanInput}${letters[num % 23]}`;
    };

    const handleCloseModal = () => {
        setIsClosingModal(true);
        setTimeout(() => {
            setShowModal(false);
            setModalVisible(false);
            setIsClosingModal(false);
        }, 250);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        if (isDniTool && region.id === 'es') {
            const res = calculateDni(query);
            if (res) {
                setDniResult(res);
                setError(null);
            } else {
                setError('Formato inválido');
                setDniResult(null);
            }
            return;
        }

        if (isCpTool && region.id === 'es') {
            const cp = query.trim().replace(/\D/g, '').padStart(5, '0').slice(0, 5);
            setLoading(true);
            setError(null);
            setCpResult(null);
            try {
                const data = await getCpData(cp.slice(0, 2));
                const entry = data[cp];
                if (entry) {
                    setCpResult({ cp, prov: entry.prov, pob: entry.pob, rows: entry.rows });
                } else {
                    setError(`CP ${cp} no encontrado en la base de datos.`);
                }
            } catch {
                setError('Error al cargar datos de códigos postales.');
            } finally {
                setLoading(false);
            }
            return;
        }

        if (!target) return;

        setLoading(true);
        setError(null);
        setResults(null);
        setDniResult(null);

        // Advanced search (Spain only) skips the initial /gateway hit so the
        // session costs exactly AdvancedSearchCost units, not +1. The modal
        // opens empty and the backend streams everything via SSE.
        if (region.id === 'es' && isAdvancedEnabled && !isPadronMode && !isDniTool) {
            setResults({ _advanced: true });
            setShowModal(true);
            setModalVisible(false);
            // loading stays true until onReady fires from modal SSE
            return;
        }

        try {
            const payload = isPadronMode ? { nombre: query } : { query: query };
            const response = await fetch(`/gateway`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: target, data: payload })
            });

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                throw new Error('ERROR: el servidor no responde.');
            }

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('CUOTA_AGOTADA: Has alcanzado el límite diario de consultas para tu licencia.');
                }
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || `GATEWAY_ERROR: ${response.status}`);
                } catch (e) {
                    throw new Error(`GATEWAY_ERROR: ${response.status}`);
                }
            }

            const data = await response.json();
            setResults(data);
            setShowModal(true);
            setModalVisible(true);
        } catch (err: any) {
            console.error('Search operation failed:', err);
            setError(err.message || 'LINK_ERROR: Proceso de inteligencia fallido');
        } finally {
            setLoading(false);
        }
    };

    if (!target && region.id !== 'es') return null;

    return (
        <div 
            className={(isAdvancedEnabled && region.id === 'es') ? 'advanced-energy-border' : ''}
            style={{
                marginTop: '24px',
                background: (isAdvancedEnabled && region.id === 'es') ? 'transparent' : 'rgba(21, 30, 50, 0.6)',
                border: (isAdvancedEnabled && region.id === 'es') ? 'none' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                boxShadow: (isAdvancedEnabled && region.id === 'es') ? '0 0 30px rgba(0, 240, 255, 0.1)' : 'inset 0 0 20px rgba(0,0,0,0.5)',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden'
            }}
        >
            <style>{`
                @keyframes energyRotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .advanced-energy-border {
                    position: relative;
                    overflow: hidden;
                    border: none !important;
                }
                .advanced-energy-border::before {
                    content: "";
                    position: absolute;
                    inset: -150%;
                    background: conic-gradient(
                        from 0deg,
                        transparent 0deg,
                        transparent 150deg,
                        rgba(0, 240, 255, 0.8) 180deg,
                        transparent 210deg,
                        transparent 360deg
                    );
                    animation: energyRotate 3s linear infinite;
                    z-index: 0;
                    pointer-events: none;
                }
                .advanced-energy-border::after {
                    content: "";
                    position: absolute;
                    inset: 1px;
                    background: rgb(15, 23, 42);
                    border-radius: inherit;
                    z-index: 0;
                    pointer-events: none;
                }
                .advanced-energy-content {
                    position: relative;
                    z-index: 1;
                }
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-dni-tool {
                    animation: fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
            <div className="advanced-energy-content">

            <h4 style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <Database size={16} color="var(--accent-cyan)" />
                {isDniTool ? 'Herramienta: Completar identificador' : isCpTool ? 'Consulta de Código Postal' : `Buscador de Inteligencia en ${region.country}`}
            </h4>

            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setDniResult(null); }}
                        placeholder={isDniTool ? "Introduce DNI/NIE sin letra..." : isPadronMode ? "Ingresa nombres y apellidos..." : isCpTool ? "Introduce código postal (5 dígitos)..." : "Ingresa un DNI, Nombre o Email..."}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        style={{
                            width: '100%',
                            background: 'rgba(0,0,0,0.5)',
                            border: '1px solid var(--border-highlight)',
                            color: '#fff',
                            padding: '10px 10px 10px 36px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'all 0.3s'
                        }}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="hover-glow"
                    style={{
                        background: isDniTool ? 'var(--accent-cyan)' : 'var(--accent-blue)',
                        border: 'none',
                        color: isDniTool ? '#000' : '#fff',
                        padding: '0 20px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        cursor: (loading || !query.trim()) ? 'not-allowed' : 'pointer',
                        opacity: (loading || !query.trim()) ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        transform: loading ? 'scale(0.98)' : 'none'
                    }}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : isDniTool ? 'CALCULAR' : isCpTool ? 'CONSULTAR' : 'BUSCAR'}
                </button>
            </form>

            {dniResult && (
                <div className="animate-dni-tool" style={{ 
                    padding: '16px', 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    border: '1px solid rgba(255, 255, 255, 0.05)', 
                    borderRadius: '12px', 
                    marginBottom: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent, var(--accent-cyan), transparent)'
                    }} />
                    <span style={{ 
                        fontSize: '10px', 
                        color: 'rgba(255,255,255,0.4)', 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        letterSpacing: '2px' 
                    }}>
                        Documento Identificado
                    </span>
                    <strong style={{ 
                        fontSize: '24px', 
                        color: '#fff', 
                        fontFamily: 'JetBrains Mono, monospace', 
                        letterSpacing: '3px',
                        textShadow: '0 0 20px rgba(0, 240, 255, 0.4)'
                    }}>
                        {dniResult}
                    </strong>
                    <div style={{
                        fontSize: '10px',
                        color: 'var(--accent-cyan)',
                        opacity: 0.8,
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <div style={{ width: '6px', height: '6px', background: 'var(--accent-cyan)', borderRadius: '50%' }} />
                        Cálculo verificado por algoritmo oficial
                    </div>
                </div>
            )}

            {cpResult && createPortal(
                <CpLookupPanel
                    cp={cpResult.cp}
                    prov={cpResult.prov}
                    pob={cpResult.pob}
                    rows={cpResult.rows}
                    onClose={() => setCpResult(null)}
                />,
                document.body
            )}

            {region.id === 'es' && (
                <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                        onClick={togglePadron}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12px', color: isPadronMode ? 'var(--accent-cyan)' : 'var(--text-secondary)', transition: 'all 0.3s' }}
                    >
                        <div style={{
                            width: '32px', height: '18px', background: isPadronMode ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            border: `1px solid ${isPadronMode ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.2)'}`, borderRadius: '20px', position: 'relative', transition: 'all 0.3s'
                        }}>
                            <div style={{ width: '12px', height: '12px', background: isPadronMode ? 'var(--accent-cyan)' : '#888', borderRadius: '50%', position: 'absolute', top: '2px', left: isPadronMode ? '16px' : '2px', transition: 'all 0.3s ease-in-out' }} />
                        </div>
                        <span style={{ fontWeight: isPadronMode ? 700 : 500, letterSpacing: '0.5px' }}>MODO PADRÓN</span>
                    </div>

                    <div
                        onClick={toggleDniTool}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12px', color: isDniTool ? 'var(--accent-cyan)' : 'var(--text-secondary)', transition: 'all 0.3s' }}
                    >
                        <div style={{
                            width: '32px', height: '18px', background: isDniTool ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            border: `1px solid ${isDniTool ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.2)'}`, borderRadius: '20px', position: 'relative', transition: 'all 0.3s'
                        }}>
                            <div style={{ width: '12px', height: '12px', background: isDniTool ? 'var(--accent-cyan)' : '#888', borderRadius: '50%', position: 'absolute', top: '2px', left: isDniTool ? '16px' : '2px', transition: 'all 0.3s ease-in-out' }} />
                        </div>
                        <span style={{ fontWeight: isDniTool ? 700 : 500, letterSpacing: '0.5px' }}>COMPLETAR IDENTIFICADOR</span>
                    </div>

                    <div
                        onClick={toggleCpTool}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12px', color: isCpTool ? 'var(--accent-cyan)' : 'var(--text-secondary)', transition: 'all 0.3s' }}
                    >
                        <div style={{
                            width: '32px', height: '18px', background: isCpTool ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            border: `1px solid ${isCpTool ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.2)'}`, borderRadius: '20px', position: 'relative', transition: 'all 0.3s'
                        }}>
                            <div style={{ width: '12px', height: '12px', background: isCpTool ? 'var(--accent-cyan)' : '#888', borderRadius: '50%', position: 'absolute', top: '2px', left: isCpTool ? '16px' : '2px', transition: 'all 0.3s ease-in-out' }} />
                        </div>
                        <span style={{ fontWeight: isCpTool ? 700 : 500, letterSpacing: '0.5px' }}>CONSULTA DE CÓDIGO POSTAL</span>
                    </div>

                    <button
                        onClick={() => setShowFichaSelector(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'rgba(26, 58, 107, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            color: 'rgba(147, 197, 253, 0.9)',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            letterSpacing: '0.5px',
                            transition: 'all 0.2s',
                            width: '100%',
                            justifyContent: 'center',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26, 58, 107, 0.4)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59, 130, 246, 0.7)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26, 58, 107, 0.2)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59, 130, 246, 0.4)'; }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                        </svg>
                        FICHA ADMINISTRATIVA
                    </button>
                </div>
            )}

            {error && (
                <div className="animate-dni-tool" style={{ padding: '12px', background: 'rgba(255, 42, 95, 0.1)', borderLeft: '3px solid var(--vuln-critical)', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '4px', marginTop: '12px' }}>
                    <AlertCircle size={16} color="var(--vuln-critical)" />
                    {error}
                </div>
            )}

            {!results && !error && !loading && !dniResult && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', padding: '12px', letterSpacing: '0.3px' }}>
                    Ejecutando consultas seguras hacia la base de datos de inteligencia.
                </div>
            )}

            {showFichaSelector && createPortal(
                <FichaSelector
                    onPick={(tipo) => { setShowFichaSelector(false); setActiveFicha(tipo); }}
                    onClose={() => setShowFichaSelector(false)}
                />,
                document.body
            )}

            {activeFicha === 'ta1' && createPortal(
                <FichaCensado onClose={() => setActiveFicha(null)} />,
                document.body
            )}

            {activeFicha === 'm030' && createPortal(
                <Modelo030 onClose={() => setActiveFicha(null)} />,
                document.body
            )}

            {showModal && results && createPortal(
                <SearchResultsModal
                    results={results}
                    query={query}
                    country={region.country}
                    onClose={handleCloseModal}
                    isClosing={isClosingModal}
                    isHidden={!modalVisible}
                    onReady={results?._advanced ? () => { setLoading(false); setModalVisible(true); } : undefined}
                />,
                document.body
            )}

            </div>
        </div>
    );
};

export default SearchWidget;
