import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, AlertCircle, Database } from 'lucide-react';
import type { VulnerabilityData } from '../data/mockData';
import SearchResultsModal from './SearchResultsModal';

interface SearchWidgetProps {
    region: VulnerabilityData;
}

const targetMapping: Record<string, string> = {
    'es': 'searchesp',
    'ar': 'searcharg',
    'sv': 'searchslv',
    'ni': 'searchnic',
    'pe': 'searchper',
    'cl': 'searchchi',
    'bo': 'searchbol',
    'ec': 'searchecu',
    've': 'searchven',
    'py': 'searchpar'
};

const SearchWidget: React.FC<SearchWidgetProps> = ({ region }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isClosingModal, setIsClosingModal] = useState(false);
    const [isPadronMode, setIsPadronMode] = useState(false);

    React.useEffect(() => {
        setQuery('');
        setResults(null);
        setError(null);
        setShowModal(false);
    }, [region.id]);

    let target = targetMapping[region.id];
    if (region.id === 'es' && isPadronMode) {
        target = 'padronesp';
    }

    const handleCloseModal = () => {
        setIsClosingModal(true);
        setTimeout(() => {
            setShowModal(false);
            setIsClosingModal(false);
        }, 250);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || !target) return;

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            // Mapping exactly to the curl parameters
            const payload = isPadronMode ? { nombre: query } : { query: query };

            console.log(`[SEARCH] Sending request to gateway:`, { target, payload });

            const response = await fetch(`/gateway`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Enviar cookies de sesión
                body: JSON.stringify({
                    target: target,
                    data: payload
                })
            });

            // Check if we got HTML instead of JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                throw new Error('ERROR: el servidor no responde.');
            }

            if (!response.ok) {
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

    if (!target) return null; // Si el país no tiene un target asociado, no mostramos el widget

    return (
        <div style={{
            marginTop: '24px',
            background: 'rgba(21, 30, 50, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
        }}>
            <h4 style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <Database size={16} color="var(--accent-cyan)" />
                Buscador de Inteligencia en {region.country}
            </h4>

            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={isPadronMode ? "Ingresa nombres y apellidos..." : "Ingresa un DNI, Nombre o Email..."}
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
                            transition: 'border-color 0.2s'
                        }}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="hover-glow"
                    style={{
                        background: 'var(--accent-blue)',
                        border: 'none',
                        color: '#fff',
                        padding: '0 20px',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 600,
                        cursor: (loading || !query.trim()) ? 'not-allowed' : 'pointer',
                        opacity: (loading || !query.trim()) ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
                </button>
            </form>

            {region.id === 'es' && (
                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                        onClick={() => setIsPadronMode(!isPadronMode)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12px', color: isPadronMode ? 'var(--accent-cyan)' : 'var(--text-secondary)', transition: 'color 0.3s' }}
                    >
                        <div style={{
                            width: '32px',
                            height: '18px',
                            background: isPadronMode ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            border: `1px solid ${isPadronMode ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.2)'}`,
                            borderRadius: '20px',
                            position: 'relative',
                            transition: 'all 0.3s',
                            boxShadow: isPadronMode ? '0 0 10px rgba(0, 240, 255, 0.2)' : 'none'
                        }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                background: isPadronMode ? 'var(--accent-cyan)' : '#888',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: isPadronMode ? '16px' : '2px',
                                transition: 'all 0.3s ease-in-out',
                                boxShadow: isPadronMode ? '0 0 5px var(--accent-cyan)' : 'none'
                            }}></div>
                        </div>
                        <span style={{ fontWeight: isPadronMode ? 600 : 500, letterSpacing: '0.5px' }}>
                            {isPadronMode ? 'MODO PADRÓN: ACTIVADO' : 'Búsqueda por Padrón (Múltiples Resultados)'}
                        </span>
                    </div>
                </div>
            )}

            {error && (
                <div style={{ padding: '12px', background: 'rgba(255, 42, 95, 0.1)', borderLeft: '3px solid var(--vuln-critical)', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '4px' }}>
                    <AlertCircle size={16} color="var(--vuln-critical)" />
                    {error}
                </div>
            )}

            {!results && !error && !loading && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', padding: '12px' }}>
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
    );
};

export default SearchWidget;
