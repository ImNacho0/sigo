import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, AlertCircle, Database } from 'lucide-react';
import SearchResultsModal from './SearchResultsModal';

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
    const [isClosingModal, setIsClosingModal] = useState(false);
    const [isPadronMode, setIsPadronMode] = useState(false);
    const [isDniTool, setIsDniTool] = useState(false);
    const [dniResult, setDniResult] = useState<string | null>(null);
    const [isAdvancedEnabled, setIsAdvancedEnabled] = useState(localStorage.getItem('advanced_search_enabled') === 'true');

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
        setDniResult(null);
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
        }
    };

    const toggleDniTool = () => {
        const newState = !isDniTool;
        setIsDniTool(newState);
        if (newState) {
            setIsAdvancedEnabled(false);
            localStorage.setItem('advanced_search_enabled', 'false');
            setIsPadronMode(false);
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

        if (!target) return;

        setLoading(true);
        setError(null);
        setResults(null);
        setDniResult(null);

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
                {isDniTool ? 'Herramienta: Completar identificador' : `Buscador de Inteligencia en ${region.country}`}
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
                        placeholder={isDniTool ? "Introduce DNI/NIE sin letra..." : isPadronMode ? "Ingresa nombres y apellidos..." : "Ingresa un DNI, Nombre o Email..."}
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
                    {loading ? <Loader2 size={16} className="animate-spin" /> : isDniTool ? 'CALCULAR' : 'BUSCAR'}
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

            {showModal && results && createPortal(
                <SearchResultsModal
                    results={results}
                    query={query}
                    country={region.country}
                    onClose={handleCloseModal}
                    isClosing={isClosingModal}
                />,
                document.body
            )}

            </div>
        </div>
    );
};

export default SearchWidget;
