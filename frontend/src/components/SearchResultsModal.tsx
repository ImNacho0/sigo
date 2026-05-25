import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Search, Database, ShieldAlert, Sparkles, Loader2, Terminal, Users, Calendar, Activity, ChevronLeft, ChevronRight, RotateCcw, Home, MapPin, User } from 'lucide-react';

const copyToClipboard = (text: string): boolean => {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
            return true;
        }
    } catch (err) {
        console.warn("navigator.clipboard.writeText failed, trying fallback", err);
    }
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
    } catch (err) {
        console.error("Fallback copy failed", err);
        return false;
    }
};

interface SearchResultsModalProps {
    results: any;
    query: string;
    country: string;
    onClose: () => void;
    isClosing?: boolean;
}

interface ExtractionResult {
    type: 'DNI' | 'NIE' | 'Phone' | 'Email' | 'IBAN' | 'Plate' | 'Name' | 'Address';
    value: string;
    isStrong: boolean;
}

interface LogEntry {
    time: string;
    message: string;
    type: 'info' | 'success' | 'warning';
    details?: string[];
}

interface Tab {
    id: string;
    label: string;
    type: string;
    results: any[];
}

interface SearchPerson {
    id: string;
    name: string;
    query: string;
    tabs: Tab[];
    activeTabId: string;
    assistantLogs: LogEntry[];
    isProcessing: boolean;
    newTabsCount: number;
    visitedQueries: Set<string>;
    seenResultsContent: Set<string>;
    showNoResultsBadge: boolean;
    initialProcessDone: boolean;
}

const parsePadronHtml = (htmlString: string) => {
    if (!htmlString) return null;
    const direcciones = [];
    const bloques = htmlString.split(/<b class="separator">─────<\/b>/i).filter(b => b.trim());
    for (const bloque of bloques) {
        if (!bloque.trim()) continue;
        const matchDir = bloque.match(/<b>· Dirección:<\/b>\s*<pre>(.*?)<\/pre>/i);
        const matchCP = bloque.match(/<b>· Código Postal:<\/b>\s*<pre>(.*?)<\/pre>/i);
        const matchLoc = bloque.match(/<b>· Localización:<\/b>\s*<pre>(.*?)<\/pre>/i);
        const matchYears = bloque.match(/<b>· Años registrados:<\/b>\s*<pre>(.*?)<\/pre>/i);
        const matchCount = bloque.match(/<b>· Personas empadronadas:<\/b>\s*<pre>(.*?)<\/pre>/i);
        if (!matchDir) continue;
        const dirObj = {
            direccion: matchDir[1].trim(),
            codigo_postal: matchCP ? matchCP[1].trim() : '',
            localizacion: matchLoc ? matchLoc[1].trim() : '',
            years: matchYears ? matchYears[1].split(',').map(y => y.trim()) : [],
            personas_count: matchCount ? parseInt(matchCount[1]) : 0,
            personas: [] as any[]
        };
        const regexPersona = /<div class="ai-person">([\s\S]*?)<\/div>/gi;
        let matchPerson;
        while ((matchPerson = regexPersona.exec(bloque)) !== null) {
            const personaHtml = matchPerson[1];
            const matchNombre = personaHtml.match(/•\s*<b>(.*?)<\/b>/i);
            const matchNac = personaHtml.match(/Nacimiento:\s*<code>(.*?)<\/code>/i);
            const matchEdad = personaHtml.match(/Edad:\s*<code>(.*?)<\/code>/i);
            const matchRelacion = personaHtml.match(/Relación con objetivo:\s*<code>(.*?)<\/code>/i);
            const matchNuc = personaHtml.match(/NUC:\s*<code>(.*?)<\/code>/i);
            if (matchNombre) {
                dirObj.personas.push({
                    nombre: matchNombre[1].trim(),
                    fecha_nacimiento: matchNac ? matchNac[1].trim() : '',
                    edad: matchEdad ? matchEdad[1].trim() : '',
                    relacion: matchRelacion ? matchRelacion[1].trim() : '',
                    nuc: matchNuc ? matchNuc[1].trim() : ''
                });
            }
        }
        direcciones.push(dirObj);
    }
    return direcciones.length > 0 ? {
        direcciones: direcciones,
        total_personas: direcciones.reduce((acc, curr) => acc + curr.personas.length, 0)
    } : null;
};

const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const generateVariants = (input: string) => {
    const variants = new Set<string>();
    const trimmed = input.trim();
    const normalized = normalizeText(trimmed);
    if (normalized.toLowerCase() !== trimmed.toLowerCase()) variants.add(normalized);
    
    // Add accented variants dynamically matching Spanish accents
    const commonAccents: Record<string, string> = {
        'sanchez': 'Sánchez', 'perez': 'Pérez', 'rodriguez': 'Rodríguez',
        'martinez': 'Martínez', 'lopez': 'López', 'gonzalez': 'González',
        'hernandez': 'Hernández', 'jimenez': 'Jiménez', 'alvarez': 'Álvarez',
        'fernandez': 'Fernández', 'gomez': 'Gómez', 'diaz': 'Díaz',
        'vazquez': 'Vázquez', 'munoz': 'Muñoz', 'nunez': 'Núñez',
        'marin': 'Marín', 'beltran': 'Beltrán', 'millan': 'Millán',
        'galan': 'Galán', 'roman': 'Román', 'roldan': 'Roldán',
        'solis': 'Solís',
        'jose': 'José', 'maria': 'María', 'jesus': 'Jesús',
        'angel': 'Ángel', 'adrian': 'Adrián', 'agustin': 'Agustín',
        'andres': 'Andrés', 'cesar': 'César', 'cristobal': 'Cristóbal',
        'damian': 'Damián', 'efrain': 'Efraín', 'eloisa': 'Eloísa',
        'estefania': 'Estefanía', 'fabian': 'Fabián', 'german': 'Germán',
        'hernan': 'Hernán', 'ines': 'Inés', 'ivan': 'Iván',
        'joaquin': 'Joaquín', 'julian': 'Julián', 'martin': 'Martín',
        'nestor': 'Néstor', 'oscar': 'Óscar', 'ramon': 'Ramón',
        'raul': 'Raúl', 'ruben': 'Rubén', 'sebastian': 'Sebastián',
        'tomas': 'Tomás', 'victor': 'Víctor'
    };

    const words = trimmed.split(/\s+/);
    const processedWordsMixed = words.map(word => {
        const cleanWord = word.toLowerCase().replace(/[^a-zñ]/g, '');
        const replacement = commonAccents[cleanWord];
        if (replacement) {
            if (word === word.toUpperCase()) return replacement.toUpperCase();
            return replacement;
        }
        return word;
    });

    const processedWordsUpper = words.map(word => {
        const cleanWord = word.toLowerCase().replace(/[^a-zñ]/g, '');
        const replacement = commonAccents[cleanWord];
        if (replacement) return replacement.toUpperCase();
        return word.toUpperCase();
    });

    const variantMixed = processedWordsMixed.join(' ');
    const variantUpper = processedWordsUpper.join(' ');

    if (variantMixed !== trimmed) variants.add(variantMixed);
    if (variantUpper !== trimmed) variants.add(variantUpper);
    if (variantMixed.toLowerCase() !== trimmed.toLowerCase()) variants.add(variantMixed.toLowerCase());

    const digits = trimmed.replace(/\D/g, '');
    if (digits.length >= 9) {
        const last9 = digits.slice(-9);
        variants.add(last9);
        variants.add(`+34${last9}`);
        variants.add(`0034${last9}`);
        variants.add(`34${last9}`);
    }
    if (/^\d{8}$/.test(trimmed)) {
        const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        const num = parseInt(trimmed, 10);
        variants.add(`${trimmed}${letters[num % 23]}`);
    }
    if (/^\d{8}[A-Z]$/i.test(trimmed)) variants.add(trimmed.slice(0, 8));
    variants.delete(trimmed);
    variants.delete(trimmed.toLowerCase());
    variants.delete(trimmed.toUpperCase());
    return Array.from(variants);
};

const extractData = (data: any): ExtractionResult[] => {
    const text = JSON.stringify(data);
    const resultsMap = new Map<string, ExtractionResult>();
    const patterns = {
        DNI: /\b\d{8}[TRWAGMYFPDXBNJZSQVHLCKE]\b/gi,
        NIE: /\b[XYZ]\d{7}[TRWAGMYFPDXBNJZSQVHLCKE]\b/gi,
        Phone: /(?:\+34|0034|34)?[6789]\d{8}\b/g,
        Email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        IBAN: /\bES\d{22}\b/g,
        Plate: /\b\d{4}[B-DF-HJ-NP-TV-Z]{3}\b/gi
    };
    Object.entries(patterns).forEach(([type, regex]) => {
        const matches = text.match(regex);
        if (matches) {
            matches.forEach(match => {
                const val = match.toUpperCase().replace(/\s+/g, '');
                if (val === 'A@A.COM') return; // BLOQUEO DE EMAIL DE PRUEBA
                const key = `${type}:${val}`;
                if (!resultsMap.has(key)) resultsMap.set(key, { type: type as any, value: val, isStrong: true });
            });
        }
    });
    const nameMatches = text.match(/[A-ZÁÉÍÓÚÑ]{2,}(?:\s[A-ZÁÉÍÓÚÑ]{2,}){1,3}/gi);
    if (nameMatches) {
        nameMatches.forEach(name => {
            const cleaned = name.trim();
            if (!/\d/.test(cleaned) && cleaned.split(/\s+/).length >= 2 && cleaned.split(/\s+/).length <= 4) {
                const keywords = ['calle', 'avenida', 'plaza', 'edificio', 'piso', 'portal', 'nacional', 'provincia', 'municipio', 'comunidad'];
                if (!keywords.some(kw => cleaned.toLowerCase().includes(kw))) {
                    const key = `Name:${cleaned.toUpperCase()}`;
                    if (!resultsMap.has(key)) {
                        resultsMap.set(key, { type: 'Name', value: cleaned, isStrong: false });
                    }
                }
            }
        });
    }
    const addressKeywords = ['calle', 'c/', '/c', 'av', 'avenida', 'avda', 'nº', 'paseo', 'plaza', 'pza', 'edificio', 'urbanizacion', 'urb'];
    const chunks = text.match(/[^"{}[\],:]{10,150}/g);
    if (chunks) {
        chunks.forEach(chunk => {
            const lower = chunk.toLowerCase();
            const hasKeyword = addressKeywords.some(kw => lower.includes(kw));
            const hasNumber = /\d+/.test(chunk);
            if ((hasKeyword && hasNumber) || (hasKeyword && chunk.length > 20)) {
                const key = `Address:${chunk.trim().toUpperCase()}`;
                if (!resultsMap.has(key)) {
                    resultsMap.set(key, { type: 'Address', value: chunk.trim(), isStrong: false });
                }
            }
        });
    }
    return Array.from(resultsMap.values());
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
            } catch (e) { acc[pre + k] = value; }
        } else { acc[pre + k] = value; }
        return acc;
    }, {});
};

const isBadSpainCensoFile = (fileName: string): boolean => {
    if (!fileName || typeof fileName !== 'string') return false;
    const name = fileName.trim().toUpperCase();
    const startsWithBadPrefix = name.startsWith('C11') || name.startsWith('C18') || name.startsWith('C21');
    const endsWithTxt = name.endsWith('.TXT');
    return startsWithBadPrefix && endsWithTxt;
};

const shouldFilterSpainHit = (hit: any): boolean => {
    if (!hit) return false;
    const checkFields = ['_source_file', 'source_file', 'file', '_file', 'filename', '_source_content_file'];
    for (const field of checkFields) {
        if (hit[field] && isBadSpainCensoFile(hit[field])) return true;
    }
    if (hit._source) {
        for (const field of checkFields) {
            if (hit._source[field] && isBadSpainCensoFile(hit._source[field])) return true;
        }
    }
    const values = Object.values(hit);
    for (const val of values) {
        if (typeof val === 'string' && isBadSpainCensoFile(val)) return true;
    }
    return false;
};

const SearchResultsModal: React.FC<SearchResultsModalProps> = ({ results, query, country, onClose, isClosing }) => {
    const [people, setPeople] = useState<SearchPerson[]>([{
        id: 'initial', name: query.toUpperCase(), query: query,
        tabs: [{ id: 'original', label: 'Original', type: 'original', results: [] }],
        activeTabId: 'original', assistantLogs: [], isProcessing: false, newTabsCount: 0,
        visitedQueries: new Set(), seenResultsContent: new Set(), showNoResultsBadge: false, initialProcessDone: false
    }]);
    const [activePersonIndex, setActivePersonIndex] = useState(0);
    const activePerson = people[activePersonIndex] || people[0];
    const [showLogs, setShowLogs] = useState(false);
    const [isLogsVisible, setIsLogsVisible] = useState(false);
    
    const [simplifiedResults, setSimplifiedResults] = useState<Record<string, string>>({});
    const [simplifyingStatus, setSimplifyingStatus] = useState<Record<string, boolean>>({});
    const [simplifyError, setSimplifyError] = useState<string | null>(null);
    
    const tabs = activePerson.tabs;
    const activeTabId = activePerson.activeTabId;
    const assistantLogs = activePerson.assistantLogs;
    const isProcessing = activePerson.isProcessing;

    const currentKey = `${activePerson.id}_${activeTabId}`;
    const currentSimplifiedHtml = simplifiedResults[currentKey];
    const isCurrentSimplifying = simplifyingStatus[currentKey] || false;

    const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

    const [copiedLogs, setCopiedLogs] = useState(false);

    const activeTab = tabs.find(t => t.id === activeTabId);
    const resultsToRender = activeTab?.results || [];
    const isPadronEspaña = country === 'España' && !!resultsToRender.find((r: any) => r.direcciones);

    const tabScrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = () => {
        if (tabScrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabScrollRef.current;
            setCanScrollLeft(scrollLeft > 10);
            setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [tabs]);

    const scrollTabs = (direction: 'left' | 'right') => {
        if (tabScrollRef.current) {
            const amount = direction === 'left' ? -250 : 250;
            tabScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    const showSimplifyButton = useMemo(() => {
        if (!results || currentSimplifiedHtml) return false;
        const activeTab = tabs.find(t => t.id === activeTabId);
        const resultsToRender = activeTab?.results || [];
        const isPadronEspaña = country === 'España' && !!resultsToRender.find((r: any) => r.direcciones);
        const isBolivia = country === 'Bolivia';
        const isArgentina = country === 'Argentina';
        if (isPadronEspaña || isBolivia || isArgentina) return false;
        return true;
    }, [results, currentSimplifiedHtml, country, tabs, activeTabId]);

    const setActiveTabId = (id: string) => {
        setPeople(prev => {
            const newPeople = [...prev];
            const p = newPeople[activePersonIndex];
            if (p) p.activeTabId = id;
            return newPeople;
        });
    };

    const getResultKey = (h: any) => {
        const flat = flattenObject(h);
        const cleaned: any = {};
        const techKeys = ['_id', '_score', '_index', 'id', 'score', 'index', '_type'];
        Object.keys(flat).forEach(k => {
            const lowKey = k.toLowerCase();
            if (!techKeys.includes(lowKey) && !lowKey.includes('file')) cleaned[k] = String(flat[k]).trim().toUpperCase();
        });
        return JSON.stringify(cleaned);
    };

    let parsedData = useMemo(() => {
        let data = results;
        if (results && typeof results.text === 'string' && results.text.includes('· Dirección:')) {
            const extracted = parsePadronHtml(results.text);
            if (extracted) data = { ...results, ...extracted };
        }
        return data;
    }, [results]);

    const addLog = (message: string, type: 'info' | 'success' | 'warning' = 'info', details?: string[], personIdx = activePersonIndex) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setPeople(prev => {
            const newPeople = [...prev];
            const p = newPeople[personIdx];
            if (p) p.assistantLogs = [...p.assistantLogs, { time, message, type, details }];
            return newPeople;
        });
    };

    const addPerson = (name: string, searchQuery: string) => {
        setPeople(prev => {
            const normalizedName = name.trim().toUpperCase().replace(/\s+/g, ' ');
            const id = normalizedName.replace(/\s+/g, '_');
            if (prev.find(p => p.name === normalizedName)) return prev;
            return [...prev, {
                id, name: normalizedName, query: searchQuery,
                tabs: [{ id: 'original', label: 'Original', type: 'original', results: [] }],
                activeTabId: 'original', assistantLogs: [{ time: new Date().toLocaleTimeString(), message: `Iniciando investigación para: ${normalizedName}`, type: 'info' }],
                isProcessing: false, newTabsCount: 0, visitedQueries: new Set(), seenResultsContent: new Set(),
                showNoResultsBadge: false, initialProcessDone: false
            }];
        });
    };

    useEffect(() => {
        if (parsedData) {
            let initialHitsRaw = [];
            if (parsedData.direcciones) initialHitsRaw = [parsedData];
            else if (Array.isArray(parsedData)) initialHitsRaw = parsedData;
            else if (parsedData.results) initialHitsRaw = parsedData.results;
            else if (parsedData.hits?.hits) initialHitsRaw = parsedData.hits.hits.map((h: any) => h._source || h);
            else initialHitsRaw = [parsedData];

            if (country === 'España') {
                initialHitsRaw = initialHitsRaw.filter((h: any) => !shouldFilterSpainHit(h));
            }

            const originalResults = initialHitsRaw.map((h: any) => flattenObject(h));
            setPeople([{
                id: 'initial', name: query.toUpperCase(), query: query,
                tabs: [{ id: 'original', label: 'Original', type: 'original', results: originalResults }],
                activeTabId: 'original', assistantLogs: [], isProcessing: false, newTabsCount: 0,
                visitedQueries: new Set(), seenResultsContent: new Set(initialHitsRaw.map((h: any) => getResultKey(h))),
                showNoResultsBadge: false, initialProcessDone: false
            }]);
            setActivePersonIndex(0);
        }
    }, [results, query, parsedData]);

    const peopleRef = useRef(people);
    useEffect(() => { peopleRef.current = people; }, [people]);

    const calculateAge = (birthDateStr: string) => {
        if (!birthDateStr) return null;
        try {
            const birthDate = new Date(birthDateStr);
            if (isNaN(birthDate.getTime())) return null;
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            return age > 0 && age < 120 ? age : null;
        } catch (e) { return null; }
    };

    const parseBoliviaSql = (sql: string) => {
        if (!sql) return null;
        try {
            const valuesMatch = sql.match(/VALUES\s+(.*)$/i);
            if (!valuesMatch) return null;
            const rawValues = valuesMatch[1].split(/\s{2,}/).map(v => v.trim());
            const headers = ['id', 'nombres', 'primerApellido', 'segundoApellido', 'nroDocumento', 'complemento', 'fechaNacimiento', 'sexo', 'estadoCivil', 'nacionalidad', 'direccion', 'telefono', 'correo', 'lugarNacimiento', 'departamento', 'municipio'];
            const result: any = {};
            headers.forEach((h, i) => { if (rawValues[i]) result[h] = rawValues[i]; });
            result.nombre_completo = `${result.nombres || ''} ${result.primerApellido || ''} ${result.segundoApellido || ''}`.trim();
            if (!result.nombre_completo) result.nombre_completo = 'REGISTRO BOLIVIA';
            return result;
        } catch (e) { return null; }
    };

    const performSearch = async (q: string, personIdx: number): Promise<any[]> => {
        const normalizedQ = q.trim().toUpperCase();
        if (normalizedQ === 'A@A.COM') return []; // BLOQUEO DE EMAIL DE PRUEBA
        if (peopleRef.current[personIdx]?.visitedQueries.has(normalizedQ)) return [];
        setPeople(prev => {
            const next = [...prev];
            if (next[personIdx]) {
                next[personIdx].visitedQueries = new Set(next[personIdx].visitedQueries);
                next[personIdx].visitedQueries.add(normalizedQ);
            }
            return next;
        });
        const targets = ['searchesp', 'padronesp'];
        let allHits: any[] = [];
        for (const target of targets) {
            try {
                addLog(`Consultando motor [${target}] para: ${q}...`, 'info', undefined, personIdx);
                const payload = target === 'padronesp' ? { nombre: q } : { query: q };
                const response = await fetch('/gateway', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, data: payload }) });
                if (!response.ok) continue;
                const data = await response.json();
                let hits = [];
                if (Array.isArray(data)) hits = data;
                else if (data.hits?.hits) hits = data.hits.hits.map((h: any) => h._source || h);
                else if (data.data) hits = Array.isArray(data.data) ? data.data : [data.data];
                else if (data.results) hits = Array.isArray(data.results) ? data.results : [data.results];
                if (hits.length > 0) {
                    addLog(`Motor [${target}] devolvió ${hits.length} resultados.`, 'success', undefined, personIdx);
                    allHits = [...allHits, ...hits];
                }
            } catch (e) { addLog(`Fallo en motor [${target}]: ${e}`, 'warning', undefined, personIdx); }
        }
        if (country === 'España') {
            allHits = allHits.filter((h: any) => !shouldFilterSpainHit(h));
        }
        const filtered = allHits.filter(h => {
            const key = getResultKey(h);
            const currentP = peopleRef.current[personIdx];
            return currentP && !currentP.seenResultsContent.has(key);
        });
        if (filtered.length > 0) {
            setPeople(prev => {
                const next = [...prev];
                if (next[personIdx]) {
                    next[personIdx].seenResultsContent = new Set(next[personIdx].seenResultsContent);
                    filtered.forEach(h => next[personIdx].seenResultsContent.add(getResultKey(h)));
                }
                return next;
            });
        }
        return filtered.map(h => flattenObject(h));
    };

    const processPerson = async (personIdx: number) => {
        setPeople(prev => {
            const next = [...prev];
            if (next[personIdx]) next[personIdx].isProcessing = true;
            return next;
        });
        try {
            const p = peopleRef.current[personIdx];
            if (!p) return;
            addLog(`🔍 Iniciando rastreo avanzado para: ${p.name}`, 'info', undefined, personIdx);
            if (p.tabs[0].results.length === 0) {
                addLog(`📡 Realizando búsqueda inicial para: ${p.name}...`, 'info', undefined, personIdx);
                const initialResults = await performSearch(p.query, personIdx);
                if (initialResults.length > 0) {
                    setPeople(prev => {
                        const next = [...prev];
                        if (next[personIdx]) {
                            const newTabs = [...next[personIdx].tabs];
                            newTabs[0] = { ...newTabs[0], results: initialResults };
                            next[personIdx].tabs = newTabs;
                        }
                        return next;
                    });
                }
            }
            const variants = generateVariants(p.query);
            if (variants.length > 0) {
                const variantResults = await Promise.all(variants.map(v => performSearch(v, personIdx)));
                const flattenedVariants = variantResults.flat();
                if (flattenedVariants.length > 0) {
                    setPeople(prev => {
                        const next = [...prev];
                        if (next[personIdx]) next[personIdx].tabs = [...next[personIdx].tabs, { id: 'variants', label: 'Variantes', type: 'variants', results: flattenedVariants }];
                        return next;
                    });
                }
            }
            const latestP = peopleRef.current[personIdx];
            const allInitialResults = latestP.tabs.flatMap((t: any) => t.results);
            let discovered = extractData(allInitialResults);
            for (let i = 1; i <= 2; i++) {
                const currentPState = peopleRef.current[personIdx];
                const strongIdentifiers = discovered.filter(d => d.isStrong && !currentPState.visitedQueries.has(d.value.toUpperCase())).slice(0, 7).map(d => d.value);
                if (strongIdentifiers.length === 0) break;
                addLog(`🔥 Iteración ${i}: Investigando ${strongIdentifiers.length} vectores críticos...`, 'info', strongIdentifiers, personIdx);
                await Promise.all(strongIdentifiers.map(async (id) => {
                    const idVariants = strongIdentifiers.length <= 5 ? generateVariants(id) : [];
                    const allQueries = [id, ...idVariants];
                    const queryHits = await Promise.all(allQueries.map(q => performSearch(q, personIdx)));
                    const hits = queryHits.flat();
                    if (hits.length > 0) {
                        setPeople(prev => {
                            const next = [...prev];
                            const currP = next[personIdx];
                            if (currP && !currP.tabs.find(t => t.id === id) && currP.tabs.length < 15) currP.tabs = [...currP.tabs, { id: id, label: id, type: 'strong', results: hits }];
                            return next;
                        });
                        discovered = [...discovered, ...extractData(hits)];
                    }
                }));
            }
            addLog("🏁 Investigación finalizada correctamente.", "success", undefined, personIdx);
        } catch (e: any) { addLog(`❌ Error en el proceso: ${e.message}`, 'warning', undefined, personIdx); }
        finally {
            setPeople(prev => {
                const next = [...prev];
                if (next[personIdx]) next[personIdx].isProcessing = false;
                return next;
            });
        }
    };

    const runAssistant = async () => {
        if (country !== 'España' || peopleRef.current[0].initialProcessDone) return;
        if (localStorage.getItem('advanced_search_enabled') !== 'true') return;
        setPeople(prev => {
            const next = [...prev];
            if (next[0]) next[0].initialProcessDone = true;
            return next;
        });
        let initialUsed = 0;
        try { const res = await fetch('/auth/status'); if (res.ok) initialUsed = (await res.json()).used_search || 0; } catch (e) {}
        await processPerson(0);
        try {
            const res = await fetch('/gateway', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'padronesp', data: { nombre: query } }) });
            if (res.ok) {
                const padronData = await res.json();
                const padronDirecciones = parsePadronHtml(padronData.text || '')?.direcciones || [];
                const discoveredNames = new Set<string>();
                padronDirecciones.forEach(dir => dir.personas.forEach((p: any) => { if (p.nombre.trim().toUpperCase() !== query.trim().toUpperCase()) discoveredNames.add(p.nombre.trim()); }));
                Array.from(discoveredNames).slice(0, 5).forEach(name => addPerson(name, name));
            }
        } catch (e) {}
        try { await fetch('/auth/quota-fix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ originalUsed: initialUsed }) }); } catch (e) {}
    };

    useEffect(() => {
        if (country !== 'España') return;
        people.forEach((p, idx) => {
            if (!p.initialProcessDone) {
                setPeople(prev => {
                    const next = [...prev];
                    if (next[idx]) next[idx].initialProcessDone = true;
                    return next;
                });
                if (idx === 0) runAssistant();
                else processPerson(idx);
            }
        });
    }, [people, country]);

    const handleSimplify = async () => {
        setSimplifyingStatus(prev => ({ ...prev, [currentKey]: true }));
        try {
            const activeTab = tabs.find(t => t.id === activeTabId);
            const res = await fetch('/gateway', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'simplify', data: activeTab?.results || results }) });
            const data = await res.json();
            if (res.ok) setSimplifiedResults(prev => ({ ...prev, [currentKey]: data.text }));
            else setSimplifyError(data.error);
        } catch (e: any) { setSimplifyError(e.message); }
        finally { setSimplifyingStatus(prev => ({ ...prev, [currentKey]: false })); }
    };

    const closeSimplifiedView = () => {
        setSimplifiedResults(prev => {
            const next = { ...prev };
            delete next[currentKey];
            return next;
        });
    };

    const renderHighlightedText = (text: string, highlight: string) => {
        if (!highlight || highlight.length < 3) return text;
        const variants = new Set<string>();
        variants.add(highlight.toUpperCase());
        variants.add(highlight.toLowerCase());
        if (/^\d{8}[A-Z]$/i.test(highlight)) variants.add(highlight.slice(0, 8));
        const digits = highlight.replace(/\D/g, '');
        if (digits.length === 9) {
            variants.add(digits);
            variants.add(`34${digits}`);
            variants.add(`+34${digits}`);
            variants.add(`0034${digits}`);
        } else if (digits.length > 9 && digits.endsWith(digits.slice(-9))) {
            const base = digits.slice(-9);
            variants.add(base);
            variants.add(`34${base}`);
            variants.add(`+34${base}`);
            variants.add(`0034${base}`);
        }
        const sortedVariants = Array.from(variants).sort((a, b) => b.length - a.length);
        const pattern = sortedVariants.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        const regex = new RegExp(`(${pattern})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) => {
            const isMatch = sortedVariants.some(v => v.toLowerCase() === part.toLowerCase());
            return isMatch 
                ? <strong key={i} style={{ background: 'rgba(0, 240, 255, 0.2)', color: 'var(--accent-cyan)', padding: '0 2px', borderRadius: '2px' }}>{part}</strong> 
                : part;
        });
    };

    const toggleLogs = () => {
        if (!showLogs) {
            setShowLogs(true);
            setTimeout(() => setIsLogsVisible(true), 10);
        } else {
            setIsLogsVisible(false);
            setTimeout(() => setShowLogs(false), 300);
        }
    };

    const formatAiText = (html: string) => {
        if (!html) return '';
        const cleanHtml = html.replace(/\n/g, '<br/>');
        const lines = cleanHtml.split('<br/>');
        
        const personGroups: { originalName: string, details: Set<string> }[] = [];
        let currentGroup: { originalName: string, details: Set<string> } | null = null;
        const miscLines: string[] = [];

        lines.forEach(line => {
            const cleanLine = line.replace(/<b>|<\/b>|<i>|<\/i>|<u>|<\/u>|<code>|<\/code>/g, '').trim();
            if (!cleanLine) return;

            // Detect new person - STATEFUL
            if (line.includes('👤')) {
                const name = cleanLine.replace(/👤/g, '').trim();
                const normalizedName = name.toUpperCase().replace(/\s+/g, ' ');
                
                // Check if this person already exists in current list to deduplicate subjects
                const existing = personGroups.find(g => g.originalName.toUpperCase().replace(/\s+/g, ' ') === normalizedName);
                if (existing) {
                    currentGroup = existing;
                } else {
                    currentGroup = { originalName: name, details: new Set() };
                    personGroups.push(currentGroup);
                }

                // If name line also has details (after :)
                if (cleanLine.includes(':')) {
                    const detail = cleanLine.substring(cleanLine.indexOf(':') + 1).trim();
                    if (detail) currentGroup.details.add(detail);
                }
            } 
            // Detect detail for current person
            else if (currentGroup && (line.includes(':') || line.trim().startsWith('-'))) {
                const detail = cleanLine.replace(/^- /g, '').trim();
                if (detail && detail.length > 2) {
                    currentGroup.details.add(detail);
                }
            } 
            // Misc line
            else if (cleanLine) {
                miscLines.push(cleanLine);
            }
        });

        let formatted = '';
        personGroups.forEach((group) => {
            if (group.details.size === 0) return; // Don't show empty subjects

            const detailsHtml = Array.from(group.details).map(d => {
                const parts = d.split(':');
                if (parts.length > 1) {
                    return `<div class="ai-summary-detail"><b>- ${parts[0].trim()}:</b> <code>${parts.slice(1).join(':').trim()}</code></div>`;
                }
                return `<div class="ai-summary-detail">- ${d}</div>`;
            }).join('');

            formatted += `
                <div class="ai-summary-card">
                    <div class="ai-summary-header">👤 ${group.originalName}</div>
                    <div class="ai-summary-body">${detailsHtml}</div>
                </div>
            `;
        });

        miscLines.forEach(line => {
            formatted += `<div class="ai-summary-misc">${line}</div>`;
        });

        return formatted;
    };

    return (
        <div className={isClosing ? 'animate-fade-out' : 'animate-fade-in'} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 8, 16, 0.4)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px', opacity: 0 }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-5px); } }
                @keyframes sidebarSlideIn { from { transform: translateX(-20px); opacity: 0; width: 0; } to { transform: translateX(0); opacity: 1; width: 280px; } }
                .animate-fade-in { animation: fadeIn 0.3s ease forwards; }
                .animate-fade-out { animation: fadeOut 0.3s ease forwards; }
                .sidebar-animate-in { animation: sidebarSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .logs-btn { transition: all 0.3s ease; animation: fadeIn 0.4s ease-out; }
                .terminal-log-row {
                    padding: 12px 16px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.01);
                    border: 1px solid rgba(255, 255, 255, 0.03);
                    margin-bottom: 12px;
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .terminal-log-row:hover {
                    background: rgba(0, 240, 255, 0.02) !important;
                    border-color: rgba(0, 240, 255, 0.15) !important;
                    transform: translateX(4px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }
                .terminal-scanlines {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
                    background-size: 100% 4px;
                    z-index: 1;
                    pointer-events: none;
                    opacity: 0.12;
                }
                .premium-card {
                    background: linear-gradient(135deg, rgba(20, 26, 42, 0.95) 0%, rgba(13, 17, 30, 0.98) 100%);
                    border: 1px solid rgba(0, 240, 255, 0.12);
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(0, 240, 255, 0.01);
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    overflow: hidden;
                    max-width: 100%;
                }
                .premium-card:hover {
                    border-color: rgba(0, 240, 255, 0.3);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4), inset 0 0 15px rgba(0, 240, 255, 0.03);
                }
                .stat-badge {
                    background: rgba(0, 240, 255, 0.08);
                    border: 1px solid rgba(0, 240, 255, 0.2);
                    color: var(--accent-cyan);
                    text-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
                }
                .census-tag {
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 9px;
                    font-weight: 800;
                    letter-spacing: 1px;
                }
                .person-objective {
                    border-left: 3px solid var(--accent-cyan);
                    background: linear-gradient(90deg, rgba(0, 240, 255, 0.05) 0%, transparent 100%);
                }
                .logs-panel {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    opacity: 0;
                    transform: translateY(10px);
                }
                .logs-panel.visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                .tab-scroll-container::-webkit-scrollbar { display: none; }
                .tab-scroll-container { scrollbar-width: none; -ms-overflow-style: none; }
                
                /* AI Summary Cards - Grouped & Fixed */
                .ai-summary-card {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    margin-bottom: 24px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                    border-left: 4px solid var(--accent-cyan);
                }
                .ai-summary-header {
                    padding: 12px 20px;
                    font-weight: 900;
                    color: #fff;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    background: rgba(255, 255, 255, 0.03);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                }
                .ai-summary-body {
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .ai-summary-detail {
                    color: rgba(255, 255, 255, 0.95);
                    font-size: 13px;
                    line-height: 1.5;
                }
                .ai-summary-detail b { color: rgba(255, 255, 255, 0.4); font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 8px; }
                .ai-summary-detail code { 
                    background: rgba(0, 240, 255, 0.05); 
                    padding: 2px 8px; 
                    border-radius: 6px; 
                    color: #fff;
                    font-family: 'JetBrains Mono', monospace;
                    border: 1px solid rgba(0, 240, 255, 0.1);
                    font-size: 12px;
                }
                .ai-summary-misc {
                    padding: 12px 20px;
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 13px;
                    font-style: italic;
                }
                .tab-nav-btn {
                    background: rgba(15, 23, 42, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: rgba(255, 255, 255, 0.7);
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 10;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 10px;
                    margin: 0 8px;
                    backdrop-filter: blur(8px);
                }
                .tab-nav-btn:hover { background: rgba(0, 240, 255, 0.1); border-color: var(--accent-cyan); color: var(--accent-cyan); transform: scale(1.05); }
                .tab-nav-btn:active { transform: scale(0.95); }
                .tab-nav-btn:disabled { opacity: 0; pointer-events: none; transform: scale(0.9); }
                .ai-back-btn {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: var(--text-secondary);
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                }
                .ai-back-btn:hover { background: rgba(255, 255, 255, 0.1); color: #fff; border-color: rgba(255, 255, 255, 0.3); }
                
                .sidebar-person-btn {
                    width: 100%;
                    padding: 12px 16px;
                    background: transparent;
                    border: 1px solid transparent;
                    border-radius: 12px;
                    color: var(--text-secondary);
                    font-size: 12px;
                    font-weight: 700;
                    text-align: left;
                    cursor: pointer;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .sidebar-person-btn:hover {
                    background: rgba(255, 255, 255, 0.03);
                    border-color: rgba(255, 255, 255, 0.08);
                    color: #fff;
                    transform: translateX(4px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }
                .sidebar-person-btn.active {
                    background: rgba(0, 240, 255, 0.08);
                    border-color: rgba(0, 240, 255, 0.3);
                    color: var(--accent-cyan);
                }
                .sidebar-person-btn.active:hover {
                    background: rgba(0, 240, 255, 0.12);
                    border-color: rgba(0, 240, 255, 0.4);
                    color: var(--accent-cyan);
                    transform: translateX(4px);
                }
                
                /* SPAIN PADRON STYLES */
                .spain-padron-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    border-bottom: 2px solid rgba(0, 240, 255, 0.15);
                    padding-bottom: 24px;
                    margin-bottom: 40px;
                    position: relative;
                }
                .spain-padron-header::after {
                    content: "";
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    width: 120px;
                    height: 2px;
                    background: var(--accent-cyan);
                    box-shadow: 0 0 10px var(--accent-cyan);
                }
                .spain-address-card {
                    background: rgba(13, 20, 38, 0.6) !important;
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05) !important;
                    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 240, 255, 0.01) !important;
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    border-radius: 24px !important;
                    padding: 32px !important;
                    margin-bottom: 32px !important;
                    overflow: hidden;
                    position: relative;
                }
                .spain-address-card:hover {
                    border-color: rgba(0, 240, 255, 0.25) !important;
                    box-shadow: 0 30px 60px -20px rgba(0, 240, 255, 0.08), inset 0 0 30px rgba(0, 240, 255, 0.03) !important;
                    transform: translateY(-2px);
                }
                .spain-house-badge {
                    width: 60px;
                    height: 60px;
                    border-radius: 18px;
                    background: linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(0, 240, 255, 0.02));
                    border: 1px solid rgba(0, 240, 255, 0.25);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 15px rgba(0, 240, 255, 0.1);
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .spain-address-card:hover .spain-house-badge {
                    transform: scale(1.1) rotate(-8deg);
                    box-shadow: 0 0 25px rgba(0, 240, 255, 0.3);
                    border-color: rgba(0, 240, 255, 0.5);
                    background: linear-gradient(135deg, rgba(0, 240, 255, 0.25), rgba(0, 240, 255, 0.05));
                }
                .spain-resident-card {
                    position: relative;
                    background: rgba(255, 255, 255, 0.02) !important;
                    border: 1px solid rgba(255, 255, 255, 0.05) !important;
                    border-radius: 20px !important;
                    padding: 24px !important;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    background-image: radial-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px) !important;
                    background-size: 16px 16px !important;
                }
                .spain-resident-card:hover {
                    background: rgba(255, 255, 255, 0.03) !important;
                    border-color: rgba(0, 240, 255, 0.25) !important;
                    transform: translateY(-4px) scale(1.02);
                    box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 240, 255, 0.05) !important;
                }
                .spain-resident-card::after {
                    content: "";
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.5), transparent);
                    opacity: 0;
                    transition: opacity 0.3s;
                    pointer-events: none;
                    z-index: 10;
                }
                .spain-resident-card:hover::after {
                    opacity: 1;
                    animation: laserScan 2s infinite linear;
                }
                @keyframes laserScan {
                    0% { top: 0%; }
                    50% { top: 100%; }
                    100% { top: 0%; }
                }
                .spain-resident-card.objective {
                    border-left: 4px solid var(--accent-cyan) !important;
                    background: linear-gradient(135deg, rgba(0, 240, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%) !important;
                }
                .spain-resident-card.objective:hover {
                    border-color: var(--accent-cyan) !important;
                    box-shadow: 0 15px 30px -10px rgba(0, 240, 255, 0.15), inset 0 0 15px rgba(0, 240, 255, 0.05) !important;
                }
                .spain-avatar-badge {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255, 255, 255, 0.4);
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .spain-resident-card:hover .spain-avatar-badge {
                    background: rgba(0, 240, 255, 0.08);
                    border-color: rgba(0, 240, 255, 0.3);
                    color: var(--accent-cyan);
                    box-shadow: 0 0 10px rgba(0, 240, 255, 0.1);
                }
                .spain-resident-card.objective .spain-avatar-badge {
                    background: rgba(0, 240, 255, 0.08);
                    border-color: rgba(0, 240, 255, 0.3);
                    color: var(--accent-cyan);
                }
            `}</style>
            <div className={`glass-panel custom-scrollbar ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`} style={{ width: '100%', maxWidth: '1200px', height: '85vh', display: 'flex', flexDirection: 'column', background: 'rgba(11, 17, 32, 0.98)', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 240, 255, 0.2)' }}><Search size={22} color="var(--accent-cyan)" /></div>
                        <div>
                            <h1 className="mono" style={{ fontSize: '22px', fontWeight: 900, margin: 0, letterSpacing: '4px', color: '#fff' }}>{country.toUpperCase()}</h1>
                            <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}><Database size={10} /> ENTIDAD ACTUAL: <strong style={{ color: 'var(--accent-cyan)' }}>"{activePerson.name}"</strong></div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {country === 'España' && localStorage.getItem('advanced_search_enabled') === 'true' && (
                            <button onClick={toggleLogs} className="logs-btn" style={{ background: showLogs ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255,255,255,0.03)', border: showLogs ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.1)', color: showLogs ? 'var(--accent-cyan)' : 'var(--text-secondary)', padding: '8px 16px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', gap: '10px' }}><Terminal size={14} /> {isProcessing ? 'RASTREANDO...' : 'LOGS ASISTENTE'}</button>
                        )}
                        {!isPadronEspaña && (
                            <div style={{ background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.15)', color: 'var(--accent-cyan)', padding: '8px 16px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '6px', textShadow: '0 0 8px rgba(0, 240, 255, 0.3)' }}>
                                <Database size={12} />
                                {resultsToRender.length}/50 RESULTADOS
                            </div>
                        )}
                        {showSimplifyButton && <button onClick={handleSimplify} disabled={isCurrentSimplifying} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', gap: '10px' }}>{isCurrentSimplifying ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} SIMPLIFICAR</button>}
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
                    </div>
                </div>
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {people.length > 1 && (
                        <div className="custom-scrollbar sidebar-animate-in" style={{ width: '280px', background: 'rgba(5, 10, 20, 0.4)', borderRight: '1px solid rgba(255, 255, 255, 0.05)', padding: '32px 16px', overflowY: 'auto', flexShrink: 0 }}>
                            <h3 style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', fontWeight: 800, marginBottom: '16px' }}>INVESTIGACIÓN RECURSIVA</h3>
                            {people.map((p, idx) => (
                                <button
                                    key={p.id}
                                    onClick={() => setActivePersonIndex(idx)}
                                    className={`sidebar-person-btn ${activePersonIndex === idx ? 'active' : ''}`}
                                >
                                    {p.isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        {((people.length > 1 || tabs.length > 1) || localStorage.getItem('advanced_search_enabled') === 'true') && (
                            <div style={{ position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', height: '60px' }}>
                                <button className="tab-nav-btn" disabled={!canScrollLeft} onClick={() => scrollTabs('left')}><ChevronLeft size={18} /></button>
                                <div ref={tabScrollRef} onScroll={checkScroll} className="tab-scroll-container" style={{ flex: 1, display: 'flex', overflowX: 'auto', padding: '0 5px', height: '100%', alignItems: 'center' }}>
                                    {tabs.map(tab => (
                                        <button key={tab.id} onClick={() => setActiveTabId(tab.id)} style={{ padding: '0 24px', height: '100%', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTabId === tab.id ? 'var(--accent-blue)' : 'transparent'}`, color: activeTabId === tab.id ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: activeTabId === tab.id ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease', whiteSpace: 'nowrap', position: 'relative' }}>{tab.type === 'original' ? <Database size={14} /> : (tab.type === 'variants' ? <Sparkles size={14} /> : <Search size={14} />)}{tab.label}{tab.results.length > 0 && <span style={{ fontSize: '10px', background: activeTabId === tab.id ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)', color: '#fff', padding: '2px 6px', borderRadius: '100px', marginLeft: '6px' }}>{tab.results.length}</span>}</button>
                                    ))}
                                </div>
                                <button className="tab-nav-btn" disabled={!canScrollRight} onClick={() => scrollTabs('right')}><ChevronRight size={18} /></button>
                            </div>
                        )}
                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                            <div style={{ background: 'rgba(255, 200, 0, 0.04)', border: '1px solid rgba(255, 200, 0, 0.2)', padding: '16px 24px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <ShieldAlert size={20} color="#ffc400" />
                                <div style={{ fontSize: '13px', color: 'rgba(255, 200, 0, 0.8)', fontWeight: 600, letterSpacing: '0.3px' }}><strong>AVISO DE SEGURIDAD:</strong> Datos sensibles procedentes de filtraciones gubernamentales. Uso estrictamente profesional.</div>
                            </div>
                            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '32px' }}>
                                {currentSimplifiedHtml && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                                        <button onClick={closeSimplifiedView} className="ai-back-btn"><RotateCcw size={14} /> VOLVER A DATOS ORIGINALES</button>
                                    </div>
                                )}
                                {simplifyError && <div style={{ padding: '16px', background: 'rgba(255, 42, 95, 0.1)', borderLeft: '3px solid #ff2a5f', color: '#e2e8f0', fontSize: '14px', marginBottom: '20px' }}>Error: {simplifyError}</div>}
                                {currentSimplifiedHtml ? <div dangerouslySetInnerHTML={{ __html: formatAiText(currentSimplifiedHtml) }} className="mono" style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '2', paddingBottom: '24px' }} /> : (
                                    (() => {
                                        const activeTab = tabs.find(t => t.id === activeTabId);
                                        const resultsToRender = activeTab?.results || [];
                                        const highlightVal = activeTab?.type === 'strong' ? activeTab.label : '';
                                        if (resultsToRender.length === 0) {
                                            return (
                                                <div style={{ 
                                                    display: 'flex', 
                                                    flexDirection: 'column', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center', 
                                                    padding: '60px 20px', 
                                                    textAlign: 'center',
                                                    background: 'rgba(255, 255, 255, 0.01)',
                                                    border: '1px dashed rgba(255, 255, 255, 0.08)',
                                                    borderRadius: '16px',
                                                    margin: '20px 0'
                                                }}>
                                                    <div style={{ 
                                                        width: '64px', 
                                                        height: '64px', 
                                                        background: 'rgba(255, 42, 95, 0.05)', 
                                                        border: '1px solid rgba(255, 42, 95, 0.2)', 
                                                        borderRadius: '16px', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        marginBottom: '20px',
                                                        boxShadow: '0 0 15px rgba(255, 42, 95, 0.1)'
                                                    }}>
                                                        <ShieldAlert size={28} color="#ff2a5f" />
                                                    </div>
                                                    <h3 style={{ 
                                                        margin: '0 0 8px 0', 
                                                        color: '#fff', 
                                                        fontSize: '16px', 
                                                        fontWeight: 700, 
                                                        letterSpacing: '1px',
                                                        textTransform: 'uppercase',
                                                        fontFamily: "'JetBrains Mono', monospace"
                                                    }}>
                                                        Sin registros encontrados
                                                    </h3>
                                                    <p style={{ 
                                                        margin: 0, 
                                                        color: 'rgba(255, 255, 255, 0.4)', 
                                                        fontSize: '13px', 
                                                        maxWidth: '400px',
                                                        lineHeight: '1.6'
                                                    }}>
                                                        No se han detectado coincidencias para <strong style={{ color: 'var(--accent-cyan)' }}>"{activePerson.name}"</strong> en las bases de datos de {country}.
                                                    </p>
                                                </div>
                                            );
                                        }
                                        if (country === 'España') {
                                            const padronData = resultsToRender.find((r: any) => r.direcciones);
                                            if (padronData) {
                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '24px' }}>
                                                        <div className="spain-padron-header">
                                                            <div>
                                                                <div style={{ color: 'var(--accent-cyan)', fontSize: '11px', fontWeight: 900, letterSpacing: '3px', marginBottom: '8px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>REGISTRO ELECTORAL CIVIL</div>
                                                                <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>Núcleos de Convivencia y Censo</h2>
                                                                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '8px 0 0 0' }}>Análisis geo-espacial de vinculación de sujetos empadronados.</p>
                                                            </div>
                                                            <div className="stat-badge" style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '11px', fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>
                                                                {padronData.total_personas} CONVIVIENTES VINCULADOS
                                                            </div>
                                                        </div>
                                                        {padronData.direcciones.map((dir: any, dIdx: number) => (
                                                            <div key={dIdx} className="spain-address-card">
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                                        <div className="spain-house-badge">
                                                                            <Home size={26} color="var(--accent-cyan)" />
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', fontFamily: "'JetBrains Mono', monospace", marginBottom: '4px' }}>
                                                                                <MapPin size={12} /> {renderHighlightedText(dir.codigo_postal, highlightVal)} • {renderHighlightedText(dir.localizacion, highlightVal)}
                                                                            </div>
                                                                            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#fff', letterSpacing: '0.5px', lineHeight: 1.2 }}>{renderHighlightedText(dir.direccion, highlightVal)}</h3>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                                        {dir.years.map((y: string, i: number) => (
                                                                            <div key={i} className="census-tag" style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '9px', fontFamily: "'JetBrains Mono', monospace" }}>
                                                                                CENSO {y}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                                                                    {dir.personas.map((per: any, pIdx: number) => {
                                                                        const isObjective = per.relacion?.toLowerCase().includes('objetivo');
                                                                        return (
                                                                            <div key={pIdx} className={`spain-resident-card ${isObjective ? 'objective' : ''}`}>
                                                                                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                                                                    <div className="spain-avatar-badge">
                                                                                        <User size={18} />
                                                                                    </div>
                                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                                        <div style={{ fontSize: '16px', fontWeight: 900, color: isObjective ? 'var(--accent-cyan)' : '#fff', textTransform: 'uppercase', letterSpacing: '0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                            {renderHighlightedText(per.nombre, highlightVal)}
                                                                                        </div>
                                                                                        {isObjective && (
                                                                                            <span style={{ fontSize: '9px', color: 'var(--accent-cyan)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', background: 'rgba(0, 240, 255, 0.08)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px', fontFamily: "'JetBrains Mono', monospace" }}>
                                                                                                Objetivo
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    {per.nuc && (
                                                                                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>
                                                                                            NUC: {renderHighlightedText(per.nuc, highlightVal)}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                                                                                            <Calendar size={13} />
                                                                                            <span style={{ color: '#fff', fontWeight: 600 }}>{renderHighlightedText(per.fecha_nacimiento, highlightVal)}</span>
                                                                                        </div>
                                                                                        <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--accent-cyan)', background: 'rgba(0, 240, 255, 0.05)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(0, 240, 255, 0.1)', fontFamily: "'JetBrains Mono', monospace" }}>
                                                                                            {per.edad} AÑOS
                                                                                        </div>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isObjective ? 'rgba(0, 240, 255, 0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isObjective ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255,255,255,0.05)'}`, padding: '8px 12px', borderRadius: '8px' }}>
                                                                                        <Activity size={12} color={isObjective ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.3)'} />
                                                                                        <span style={{ fontSize: '10px', color: isObjective ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', fontFamily: "'JetBrains Mono', monospace" }}>
                                                                                            {renderHighlightedText(per.relacion, highlightVal)}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                        }
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '24px' }}>
                                                {resultsToRender.map((source: any, idx: number) => {
                                                    const isBoliviaSql = country === 'Bolivia' && (source.content?.includes('INSERT') || source._source_content?.includes('INSERT'));
                                                    const isArgentina = country === 'Argentina';
                                                    if (isBoliviaSql || isArgentina) {
                                                        let data = isBoliviaSql ? (parseBoliviaSql(source.content || source._source_content) || source) : source;
                                                        if (!data.edad) data.edad = calculateAge(data.fecha_nacimiento || data.nacimiento);
                                                        const name = data.nombre_completo || data.nombre || data.nombres || 'REGISTRO';
                                                        const dni = data.nroDocumento || data.dni || data.documento || 'N/A';
                                                        return (
                                                            <div key={idx} className="premium-card" style={{ padding: '32px', borderRadius: '16px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'flex-start' }}>
                                                                    <div><h3 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#fff', textTransform: 'uppercase' }}>{renderHighlightedText(name, highlightVal)}</h3><div style={{ color: 'var(--accent-cyan)', fontSize: '14px', fontWeight: 700, marginTop: '4px' }}>DNI: {renderHighlightedText(dni, highlightVal)}</div></div>
                                                                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>ID SISTEMA</div><div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{renderHighlightedText(data.id || source._id, highlightVal)}</div></div>
                                                                </div>
                                                                <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.2), transparent)', marginBottom: '24px' }} />
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                                                    {Object.entries(data).filter(([k, v]) => !['id','nombre','nombres','nombre_completo','dni','documento','nroDocumento','content','_index','_score','_id'].includes(k.toLowerCase()) && v && v !== 'NULL').map(([k, v], i) => (<div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</span><span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 500 }}>{renderHighlightedText(String(v), highlightVal)}</span></div>))}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return <div key={idx} className="premium-card" style={{ padding: '24px', borderRadius: '12px', marginBottom: '16px' }}><pre style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'break-word', fontFamily: "'JetBrains Mono', monospace" }}>{renderHighlightedText(JSON.stringify(source, null, 2), highlightVal)}</pre></div>;
                                                })}
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                        {showLogs && (
                            <div className={`logs-panel ${isLogsVisible ? 'visible' : ''}`} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(4, 6, 12, 0.98)', backdropFilter: 'blur(12px)', zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div className="terminal-scanlines" />
                                <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(0, 240, 255, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(10, 15, 30, 0.8)', zIndex: 2 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '8px', height: '8px', background: isProcessing ? 'var(--accent-blue)' : 'var(--accent-cyan)', borderRadius: '50%', boxShadow: isProcessing ? '0 0 10px var(--accent-blue)' : '0 0 10px var(--accent-cyan)' }} className={isProcessing ? 'animate-pulse' : ''} />
                                        <span style={{ color: 'var(--accent-cyan)', fontSize: '11px', fontWeight: 900, letterSpacing: '2px', fontFamily: "'JetBrains Mono', monospace" }}>CONSOLA DE INVESTIGACIÓN ACTIVA</span>
                                    </div>
                                    <button onClick={toggleLogs} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}><X size={16} /></button>
                                </div>
                                <div style={{ padding: '12px 32px', background: 'rgba(5, 8, 16, 0.95)', borderBottom: '1px solid rgba(0, 240, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>ESTADÍSTICAS TERMINAL:</div>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
                                            REGISTROS: <strong style={{ color: 'var(--accent-cyan)' }}>{assistantLogs.length}</strong>
                                        </div>
                                        <div style={{ background: 'rgba(0, 240, 255, 0.03)', border: '1px solid rgba(0, 240, 255, 0.12)', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
                                            ÉXITOS: <strong style={{ color: '#00f0ff' }}>{assistantLogs.filter(l => l.type === 'success').length}</strong>
                                        </div>
                                        <div style={{ background: 'rgba(255, 42, 95, 0.03)', border: '1px solid rgba(255, 42, 95, 0.12)', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
                                            ALERTAS: <strong style={{ color: '#ff2a5f' }}>{assistantLogs.filter(l => l.type === 'warning').length}</strong>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => {
                                            const text = assistantLogs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.message} ${l.details ? '\n  ' + l.details.join('\n  ') : ''}`).join('\n');
                                            const success = copyToClipboard(text);
                                            if (success) {
                                                setCopiedLogs(true);
                                                addLog('Historial de investigación copiado al portapapeles.', 'success');
                                                setTimeout(() => setCopiedLogs(false), 2000);
                                            } else {
                                                addLog('Fallo al copiar el historial de investigación.', 'warning');
                                            }
                                        }} style={{ 
                                            background: copiedLogs ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 240, 255, 0.05)', 
                                            border: copiedLogs ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(0, 240, 255, 0.2)', 
                                            color: copiedLogs ? '#10b981' : 'var(--accent-cyan)', 
                                            padding: '6px 12px', 
                                            borderRadius: '6px', 
                                            fontSize: '10px', 
                                            fontWeight: 700, 
                                            fontFamily: "'JetBrains Mono', monospace", 
                                            cursor: 'pointer', 
                                            transition: 'all 0.2s',
                                            boxShadow: copiedLogs ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none'
                                        }}>{copiedLogs ? '¡COPIADO!' : 'COPIAR CONSOLA'}</button>
                                        <button onClick={() => {
                                            setPeople(prev => {
                                                const next = [...prev];
                                                if (next[activePersonIndex]) {
                                                    next[activePersonIndex].assistantLogs = [{ time: new Date().toLocaleTimeString(), message: 'Investigación reiniciada. Consola despejada.', type: 'info' }];
                                                }
                                                return next;
                                            });
                                            setExpandedLogs({});
                                        }} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255,255,255,0.6)', padding: '6px 12px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer', transition: 'all 0.2s' }}>LIMPIAR LOGS</button>
                                    </div>
                                </div>
                                <div className="custom-scrollbar" style={{ flex: 1, padding: '32px', overflowY: 'auto', zIndex: 2, background: 'linear-gradient(180deg, rgba(5,10,20,0.5) 0%, rgba(3,5,10,0.8) 100%)' }}>
                                    {assistantLogs.map((log, i) => {
                                        const isLastLog = i === assistantLogs.length - 1;
                                        const isCurrentlyRunning = isProcessing && isLastLog;
                                        const isProc = isCurrentlyRunning && (log.message.includes('Consultando') || log.message.includes('Realizando') || log.message.includes('Investigando'));
                                        
                                        const logColor = log.type === 'success' ? 'var(--accent-cyan)' : (log.type === 'warning' ? '#ff2a5f' : '#e2e8f0');
                                        const hasDetails = log.details && log.details.length > 0;
                                        
                                        const isQueryLog = log.message.includes('Consultando') || log.message.includes('Realizando') || log.message.includes('Investigando');
                                        
                                        return (
                                            <div key={i} className="terminal-log-row" style={{ cursor: hasDetails ? 'pointer' : 'default', userSelect: 'none' }} onClick={() => hasDetails && setExpandedLogs(prev => ({ ...prev, [i]: !prev[i] }))}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ color: 'rgba(0, 240, 255, 0.35)', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", paddingTop: '2px' }}>[{log.time}]</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: logColor, fontSize: '12.5px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                                                            {isProc ? (
                                                                <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
                                                            ) : isQueryLog ? (
                                                                <Search size={13} style={{ color: 'rgba(0, 240, 255, 0.6)' }} />
                                                            ) : log.type === 'success' ? (
                                                                <Sparkles size={13} style={{ color: 'var(--accent-cyan)' }} />
                                                            ) : log.type === 'warning' ? (
                                                                <ShieldAlert size={13} style={{ color: '#ff2a5f' }} />
                                                            ) : (
                                                                <Terminal size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                                                            )}
                                                            <span>{log.message}</span>
                                                        </div>
                                                    </div>
                                                    {hasDetails && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'rgba(0, 240, 255, 0.5)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                                                            {expandedLogs[i] ? 'OCULTAR' : 'VER DETALLES'}
                                                            <ChevronRight size={12} style={{ transform: expandedLogs[i] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease', color: 'var(--accent-cyan)' }} />
                                                        </div>
                                                    )}
                                                </div>
                                                {hasDetails && expandedLogs[i] && (
                                                    <div style={{
                                                        marginTop: '10px',
                                                        marginLeft: '82px',
                                                        padding: '12px 16px',
                                                        background: 'rgba(0, 0, 0, 0.25)',
                                                        borderLeft: '2px solid var(--accent-cyan)',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        color: 'rgba(255, 255, 255, 0.55)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '6px',
                                                        border: '1px solid rgba(0, 240, 255, 0.05)',
                                                        borderLeftWidth: '2px'
                                                    }}>
                                                        {log.details?.map((detail: string, dIdx: number) => (
                                                            <div key={dIdx} style={{ fontFamily: "'JetBrains Mono', monospace", display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                <span style={{ color: 'var(--accent-cyan)', opacity: 0.6 }}>↳</span>
                                                                <span>{detail}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchResultsModal;
