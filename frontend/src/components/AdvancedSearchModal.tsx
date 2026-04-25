import React, { useState, useRef } from 'react';
import { X, Search, Loader2, Shield, Fingerprint, Mail, Phone, CreditCard, Car, User, MapPin, Activity, AlertCircle, Info } from 'lucide-react';

interface AdvancedSearchModalProps {
    onClose: () => void;
}

interface ExtractionResult {
    type: 'DNI' | 'NIE' | 'Phone' | 'Email' | 'IBAN' | 'Plate' | 'Name' | 'Address';
    value: string;
    isStrong: boolean;
}

interface SearchStep {
    iteration: number;
    query: string;
    resultsCount: number;
    timestamp: string;
}

const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({ onClose }) => {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [steps, setSteps] = useState<SearchStep[]>([]);
    const [allResults, setAllResults] = useState<any[]>([]);
    const [extractedData, setExtractedData] = useState<ExtractionResult[]>([]);
    const [, setCurrentIteration] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const visitedQueries = useRef<Set<string>>(new Set());

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    // --- Helper Functions ---

    const normalizeText = (text: string) => {
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const generateVariants = (input: string) => {
        const variants = new Set<string>();
        const trimmed = input.trim();
        
        // 1. EXACT input (Required by prompt)
        variants.add(trimmed);

        // 2. Name variants (accents/no accents)
        const normalized = normalizeText(trimmed);
        if (normalized.toLowerCase() !== trimmed.toLowerCase()) {
            variants.add(normalized);
        }

        // 3. Phone variants (Spain: +34, 0034, 34)
        const digits = trimmed.replace(/\D/g, '');
        if (digits.length >= 9) {
            const last9 = digits.slice(-9);
            variants.add(last9);
            variants.add(`+34${last9}`);
            variants.add(`0034${last9}`);
            variants.add(`34${last9}`);
        }

        // 4. DNI/NIE variants (Spain)
        // If it looks like a DNI number (8 digits)
        if (/^\d{8}$/.test(trimmed)) {
            const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
            const num = parseInt(trimmed, 10);
            variants.add(`${trimmed}${letters[num % 23]}`); // Add with letter
        }
        // If it has a letter, also try without
        if (/^\d{8}[A-Z]$/i.test(trimmed)) {
            variants.add(trimmed.slice(0, 8));
        }

        return Array.from(variants);
    };

    const extractData = (data: any): ExtractionResult[] => {
        const text = JSON.stringify(data);
        const results: ExtractionResult[] = [];

        // Regex Patterns (Spain specific)
        const patterns = {
            DNI: /\b\d{8}[TRWAGMYFPDXBNJZSQVHLCKE]\b/gi,
            NIE: /\b[XYZ]\d{7}[TRWAGMYFPDXBNJZSQVHLCKE]\b/gi,
            Phone: /(?:\+34|0034|34)?[6789]\d{8}\b/g,
            Email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            IBAN: /\bES\d{22}\b/g,
            Plate: /\b\d{4}[B-DF-HJ-NP-TV-Z]{3}\b/gi
        };

        // Extract using Regex
        Object.entries(patterns).forEach(([type, regex]) => {
            const matches = text.match(regex);
            if (matches) {
                matches.forEach(match => {
                    results.push({ type: type as any, value: match.toUpperCase().replace(/\s+/g, ''), isStrong: true });
                });
            }
        });

        // Heuristics (Spain)
        // Names: 2-4 words, letters only (including tildes and Ñ)
        const nameMatches = text.match(/[A-ZÁÉÍÓÚÑ]{2,}(?:\s[A-ZÁÉÍÓÚÑ]{2,}){1,3}/gi);
        if (nameMatches) {
            nameMatches.forEach(name => {
                const cleaned = name.trim();
                if (!/\d/.test(cleaned) && cleaned.split(/\s+/).length >= 2 && cleaned.split(/\s+/).length <= 4) {
                    // Avoid matching keywords as names
                    const keywords = ['calle', 'avenida', 'plaza', 'edificio', 'piso', 'portal'];
                    if (!keywords.some(kw => cleaned.toLowerCase().includes(kw))) {
                        results.push({ type: 'Name', value: cleaned, isStrong: false });
                    }
                }
            });
        }

        // Addresses: keywords + numbers
        const addressKeywords = ['calle', 'c/', '/c', 'av', 'avenida', 'avda', 'nº', 'paseo', 'plaza', 'pza', 'edificio', 'urbanizacion', 'urb'];
        const chunks = text.match(/[^"{}[\],:]{10,150}/g);
        if (chunks) {
            chunks.forEach(chunk => {
                const lower = chunk.toLowerCase();
                const hasKeyword = addressKeywords.some(kw => lower.includes(kw));
                const hasNumber = /\d+/.test(chunk);
                if ((hasKeyword && hasNumber) || (hasKeyword && chunk.length > 20)) {
                    results.push({ type: 'Address', value: chunk.trim(), isStrong: false });
                }
            });
        }

        return results;
    };

    const performSearch = async (q: string): Promise<any[]> => {
        const normalizedQ = q.trim().toUpperCase();
        if (visitedQueries.current.has(normalizedQ)) return [];
        visitedQueries.current.add(normalizedQ);

        const targets = ['searchesp', 'padronesp']; // Try both for Spain if initial fails
        let allHits: any[] = [];

        for (const target of targets) {
            try {
                const payload = target === 'padronesp' ? { nombre: q } : { query: q };
                const response = await fetch('/gateway', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ target, data: payload })
                });

                if (!response.ok) continue;
                const data = await response.json();
                
                let hits = [];
                if (Array.isArray(data)) {
                    hits = data;
                } else if (data.hits?.hits) {
                    hits = data.hits.hits.map((h: any) => h._source || h);
                } else if (data.data) {
                    hits = Array.isArray(data.data) ? data.data : [data.data];
                } else if (data.results) {
                    hits = Array.isArray(data.results) ? data.results : [data.results];
                }

                if (hits.length > 0) {
                    allHits = [...allHits, ...hits];
                }
            } catch (e) {
                console.error(`Search failed for ${target} with ${q}`, e);
            }
        }

        // Deduplicate hits by content
        return Array.from(new Set(allHits.map(h => JSON.stringify(h)))).map(s => JSON.parse(s));
    };

    const flattenObject = (obj: any, prefix = ''): any => {
        if (!obj || typeof obj !== 'object') return { [prefix]: obj };
        return Object.keys(obj).reduce((acc: any, k: any) => {
            const pre = prefix.length ? prefix + '_' : '';
            const value = obj[k];
            
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                Object.assign(acc, flattenObject(value, pre + k));
            } else if (typeof value === 'string' && value.trim().startsWith('{') && value.trim().endsWith('}')) {
                try {
                    const parsed = JSON.parse(value);
                    Object.assign(acc, flattenObject(parsed, pre + k));
                } catch (e) {
                    acc[pre + k] = value;
                }
            } else {
                acc[pre + k] = value;
            }
            return acc;
        }, {});
    };

    const cleanupRecord = (item: any) => {
        const cleaned: any = {};
        Object.entries(item).forEach(([k, v]) => {
            const kl = k.toLowerCase();
            // Skip noisy metadata
            if (['id', '_id', '_score', 'score', '_type', '_index', 'source_content', 'source_file', 'raw_data'].some(noise => kl.includes(noise))) return;
            if (v === null || v === undefined || v === '') return;
            
            cleaned[k] = v; // Keep original key for now to avoid collisions, but use clean for display
        });
        return cleaned;
    };

    const startAdvancedSearch = async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);
        setSteps([]);
        setAllResults([]);
        setExtractedData([]);
        visitedQueries.current.clear();
        setCurrentIteration(1);

        try {
            const variants = generateVariants(query);
            
            setSteps([{ 
                iteration: 1, 
                query: `Análisis inicial: "${query}"`, 
                resultsCount: 0, 
                timestamp: new Date().toLocaleTimeString() 
            }]);

            const resultsArrays = await Promise.all(variants.map(v => performSearch(v)));
            let currentResults = resultsArrays.flat().map(r => flattenObject(r));
            
            currentResults = Array.from(new Set(currentResults.map(r => JSON.stringify(r)))).map(s => JSON.parse(s));
            
            setAllResults(currentResults);
            setSteps(prev => {
                const updated = [...prev];
                updated[0].resultsCount = currentResults.length;
                return updated;
            });

            let discovered = extractData(currentResults);
            setExtractedData(unifyExtractedData(discovered));

            for (let i = 2; i <= 3; i++) {
                const strongIdentifiers = discovered
                    .filter(d => d.isStrong && !visitedQueries.current.has(d.value.toUpperCase()))
                    .map(d => d.value);

                if (strongIdentifiers.length === 0) break;

                setCurrentIteration(i);
                setSteps(prev => [...prev, { 
                    iteration: i, 
                    query: `Expansión con ${strongIdentifiers.length} identificadores`, 
                    resultsCount: 0, 
                    timestamp: new Date().toLocaleTimeString() 
                }]);

                const expansionArrays = await Promise.all(strongIdentifiers.map(id => performSearch(id)));
                const newResults = expansionArrays.flat().map(r => flattenObject(r));

                if (newResults.length === 0) break;

                setAllResults(prev => {
                    const combined = [...prev, ...newResults];
                    return Array.from(new Set(combined.map(r => JSON.stringify(r)))).map(s => JSON.parse(s));
                });

                setSteps(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1].resultsCount = newResults.length;
                    return updated;
                });

                discovered = extractData(newResults);
                setExtractedData(prev => unifyExtractedData([...prev, ...discovered]));
            }

        } catch (err) {
            setError("Error en el motor de búsqueda iterativa.");
            console.error(err);
        } finally {
            setIsSearching(false);
            setCurrentIteration(0);
        }
    };

    const unifyExtractedData = (data: ExtractionResult[]) => {
        const seen = new Set<string>();
        return data.filter(item => {
            const key = `${item.type}:${item.value.toUpperCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    // Advanced Grouping Logic
    const groupedResults = allResults.reduce((acc: any, curr: any) => {
        const text = JSON.stringify(curr).toUpperCase();
        
        // Find best identifier for grouping (Priority: DNI/NIE > Phone > Email > IBAN > Plate)
        let groupKey = 'OTROS';
        
        const dniMatch = text.match(/\b\d{8}[TRWAGMYFPDXBNJZSQVHLCKE]\b|\b[XYZ]\d{7}[TRWAGMYFPDXBNJZSQVHLCKE]\b/i);
        const phoneMatch = text.match(/(?:\+34|0034|34)?[6789]\d{8}\b/i);
        const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
        const ibanMatch = text.match(/\bES\d{22}\b/i);
        const plateMatch = text.match(/\b\d{4}[B-DF-HJ-NP-TV-Z]{3}\b/i);

        if (dniMatch) groupKey = dniMatch[0];
        else if (phoneMatch) groupKey = phoneMatch[0];
        else if (emailMatch) groupKey = emailMatch[0];
        else if (ibanMatch) groupKey = ibanMatch[0];
        else if (plateMatch) groupKey = plateMatch[0];

        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(curr);
        return acc;
    }, {});

    return (
        <div 
            className={`fixed-overlay ${isClosing ? 'closing' : ''}`}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                background: 'rgba(2, 6, 23, 0.85)',
                backdropFilter: 'blur(12px)',
                transition: 'opacity 0.3s ease',
                opacity: isClosing ? 0 : 1
            }}
        >
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(40px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                
                .glass-card { 
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%); 
                    border: 1px solid rgba(255,255,255,0.08); 
                    box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5);
                    position: relative;
                }
                .glass-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    padding: 1px;
                    background: linear-gradient(to bottom, rgba(255,255,255,0.1), transparent);
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    pointer-events: none;
                }

                .result-group {
                    background: rgba(255,255,255,0.02);
                    border-radius: 24px;
                    border: 1px solid rgba(255,255,255,0.05);
                    overflow: hidden;
                }

                .data-chip {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.1);
                    transition: all 0.2s ease;
                }
                .data-chip:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.2);
                }
                .data-chip.strong {
                    background: rgba(59, 130, 246, 0.1);
                    border-color: rgba(59, 130, 246, 0.2);
                    color: #60a5fa;
                }

                .search-btn {
                    background: #2563eb;
                    box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.39);
                    transition: all 0.2s ease;
                }
                .search-btn:hover:not(:disabled) {
                    background: #3b82f6;
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
                }
            `}</style>
            
            <div className="glass-card animate-slide-up" style={{
                width: '100%',
                maxWidth: '1400px',
                height: '85vh',
                borderRadius: '28px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                color: '#fff'
            }}>
                {/* Top Nav */}
                <div style={{ padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <Fingerprint size={20} color="#3b82f6" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>Búsqueda Avanzada Iterativa</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>España • Elasticsearch Node Active</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleClose} style={{ padding: '8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', transition: 'all 0.2s' }}>
                        <X size={20} />
                    </button>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Top Bar: Search and Process Info */}
                    <div style={{ padding: '24px 32px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '32px' }}>
                        <div style={{ flex: 1, display: 'flex', gap: '12px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input 
                                    autoFocus
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && startAdvancedSearch()}
                                    placeholder="DNI, Teléfono, Email o Nombre..."
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 14px 14px 48px', fontSize: '15px', color: '#fff', outline: 'none' }}
                                />
                                <Search style={{ position: 'absolute', left: '16px', top: '16px', color: 'rgba(255,255,255,0.3)' }} size={20} />
                            </div>
                            <button 
                                onClick={startAdvancedSearch}
                                disabled={isSearching || !query.trim()}
                                className="search-btn"
                                style={{ padding: '0 32px', borderRadius: '16px', border: 'none', color: '#fff', fontWeight: 800, cursor: isSearching ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                            >
                                {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Activity size={20} />}
                                <span>{isSearching ? 'Rastreando...' : 'Analizar'}</span>
                            </button>
                        </div>

                        {/* Process Log / Status */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {steps.map((step, i) => (
                                <div key={i} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></div>
                                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>L{step.iteration}</span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{step.resultsCount}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats and Results */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 32px', display: 'flex', gap: '48px', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>Identidades</span>
                                <div style={{ fontSize: '20px', fontWeight: 800 }}>{Object.keys(groupedResults).filter(k => k !== 'OTROS').length}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>Registros</span>
                                <div style={{ fontSize: '20px', fontWeight: 800 }}>{allResults.length}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>Extracciones Fuertes</span>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6' }}>{extractedData.filter(d => d.isStrong).length}</div>
                            </div>
                        </div>

                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px 32px' }}>
                            {error && (
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                    <AlertCircle color="#ef4444" size={20} />
                                    <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600 }}>{error}</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                {Object.entries(groupedResults).sort(([a], [b]) => a === 'OTROS' ? 1 : b === 'OTROS' ? -1 : 0).map(([groupKey, items]: [string, any]) => (
                                    <div key={groupKey} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
                                            <div style={{ width: '4px', height: '16px', background: groupKey === 'OTROS' ? 'rgba(255,255,255,0.1)' : '#3b82f6', borderRadius: '4px' }}></div>
                                            <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1px', color: groupKey === 'OTROS' ? 'rgba(255,255,255,0.3)' : '#fff' }}>
                                                {groupKey === 'OTROS' ? 'REGISTROS SIN IDENTIFICADOR ÚNICO' : groupKey}
                                            </span>
                                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '24px' }}>
                                            {items.map((item: any, idx: number) => {
                                                const record = cleanupRecord(item);
                                                
                                                const findTitle = (obj: any) => {
                                                    const keys = Object.keys(obj);
                                                    const priorityKeys = ['nombre', 'full_name', 'apellidos', 'fullname', 'name', 'razon_social', 'tomador', 'titular'];
                                                    for (const pk of priorityKeys) {
                                                        const match = keys.find(k => k.toLowerCase().includes(pk));
                                                        if (match && obj[match]) return String(obj[match]);
                                                    }
                                                    const strongKeys = ['dni', 'nie', 'nif', 'cif', 'phone', 'tel', 'email', 'iban', 'plate'];
                                                    for (const sk of strongKeys) {
                                                        const match = keys.find(k => k.toLowerCase().includes(sk));
                                                        if (match && obj[match]) return String(obj[match]);
                                                    }
                                                    return 'Registro Encontrado';
                                                };

                                                const title = findTitle(record);
                                                const entries = Object.entries(record);
                                                
                                                // Group entries by category
                                                const categories: any = {
                                                    identidad: [],
                                                    contacto: [],
                                                    ubicacion: [],
                                                    otros: []
                                                };

                                                entries.forEach(([k, v]) => {
                                                    const kl = k.toLowerCase();
                                                    if (kl.includes('dni') || kl.includes('nie') || kl.includes('nif') || kl.includes('nombre') || kl.includes('apell') || kl.includes('sexo') || kl.includes('fecha') || kl.includes('naci')) {
                                                        categories.identidad.push([k, v]);
                                                    } else if (kl.includes('tel') || kl.includes('phone') || kl.includes('mail') || kl.includes('movil')) {
                                                        categories.contacto.push([k, v]);
                                                    } else if (kl.includes('dir') || kl.includes('calle') || kl.includes('domicilio') || kl.includes('poblacion') || kl.includes('provincia') || kl.includes('cp') || kl.includes('postal')) {
                                                        categories.ubicacion.push([k, v]);
                                                    } else {
                                                        categories.otros.push([k, v]);
                                                    }
                                                });

                                                return (
                                                    <div key={idx} style={{ padding: '0', borderRadius: '28px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s' }} className="hover-glow">
                                                        {/* Hero Section of the Card */}
                                                        <div style={{ padding: '24px', background: 'linear-gradient(to right, rgba(59, 130, 246, 0.08), transparent)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)' }}>
                                                                <User size={24} color="#fff" />
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h4>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase' }}>{item._index || 'ES-NODE-DATA'}</span>
                                                                    <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}></div>
                                                                    <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 800 }}>RESULTADO #{idx + 1}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Structured Data Content */}
                                                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                            {/* Category: Identity */}
                                                            {categories.identidad.length > 0 && (
                                                                <div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                                        <Shield size={12} color="rgba(255,255,255,0.2)" />
                                                                        <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>Identificación Personal</span>
                                                                    </div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                                        {categories.identidad.map(([k, v]: [string, any]) => (
                                                                            <DataField key={k} label={k} value={v} extractedData={extractedData} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Category: Contact */}
                                                            {categories.contacto.length > 0 && (
                                                                <div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                                        <Phone size={12} color="rgba(255,255,255,0.2)" />
                                                                        <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>Información de Contacto</span>
                                                                    </div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                                        {categories.contacto.map(([k, v]: [string, any]) => (
                                                                            <DataField key={k} label={k} value={v} extractedData={extractedData} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Category: Location */}
                                                            {categories.ubicacion.length > 0 && (
                                                                <div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                                        <MapPin size={12} color="rgba(255,255,255,0.2)" />
                                                                        <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>Localización y Domicilio</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                        {categories.ubicacion.map(([k, v]: [string, any]) => (
                                                                            <DataField key={k} label={k} value={v} extractedData={extractedData} isFullWidth />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Category: Others */}
                                                            {categories.otros.length > 0 && (
                                                                <div style={{ marginTop: '4px', padding: '16px', background: 'rgba(0,0,0,0.15)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                                        <Info size={12} color="rgba(255,255,255,0.1)" />
                                                                        <span style={{ fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.1)', textTransform: 'uppercase', letterSpacing: '1px' }}>Datos Adicionales</span>
                                                                    </div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                                        {categories.otros.slice(0, 10).map(([k, v]: [string, any]) => (
                                                                            <DataField key={k} label={k} value={v} extractedData={extractedData} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Extraction Strip */}
                    <div style={{ padding: '16px 32px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>Extracción:</span>
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', flex: 1 }} className="custom-scrollbar">
                            {extractedData.map((data, i) => (
                                <div key={i} className={`data-chip ${data.isStrong ? 'strong' : ''}`} style={{ padding: '6px 12px', borderRadius: '100px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                    {data.type === 'DNI' || data.type === 'NIE' ? <Shield size={10} /> : 
                                     data.type === 'Phone' ? <Phone size={10} /> :
                                     data.type === 'Email' ? <Mail size={10} /> :
                                     data.type === 'Plate' ? <Car size={10} /> :
                                     data.type === 'IBAN' ? <CreditCard size={10} /> : <User size={10} />}
                                    {data.value}
                                </div>
                            ))}
                            {extractedData.length === 0 && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.1)', fontStyle: 'italic' }}>Sin datos extraídos</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DataField: React.FC<{ label: string, value: any, extractedData: ExtractionResult[], isFullWidth?: boolean }> = ({ label, value, extractedData, isFullWidth }) => {
    let Icon = Info;
    const kl = label.toLowerCase();
    if (kl.includes('dni') || kl.includes('nie') || kl.includes('nif')) Icon = Shield;
    else if (kl.includes('tel') || kl.includes('phone') || kl.includes('movil')) Icon = Phone;
    else if (kl.includes('email') || kl.includes('mail')) Icon = Mail;
    else if (kl.includes('iban') || kl.includes('cuenta')) Icon = CreditCard;
    else if (kl.includes('matri')) Icon = Car;
    else if (kl.includes('dir') || kl.includes('calle') || kl.includes('domicilio')) Icon = MapPin;

    const isMatch = extractedData.some(d => d.value.toUpperCase() === String(value).toUpperCase());

    return (
        <div style={{ minWidth: 0, gridColumn: isFullWidth ? '1 / -1' : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                <Icon size={10} /> {label.split('_').pop()?.replace(/_/g, ' ')}
            </div>
            <div style={{ 
                fontSize: '13px', 
                fontWeight: 600, 
                color: isMatch ? '#60a5fa' : 'rgba(255,255,255,0.8)',
                background: isMatch ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                padding: isMatch ? '2px 8px' : '0',
                borderRadius: '6px',
                display: 'inline-block',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }}>
                {String(value)}
            </div>
        </div>
    );
};

export default AdvancedSearchModal;
