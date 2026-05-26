import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Search, Database, ShieldAlert, Sparkles, Loader2, Terminal, Users, Calendar, Activity, ChevronLeft, ChevronRight, RotateCcw, User, Shield } from 'lucide-react';

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

// Kept for the legacy helpers below (no longer dispatched from this
// component — variant generation and identifier extraction now live on the
// server in advanced_helpers.go).
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

// Legacy: variant generation now runs on the server (advanced_helpers.go).
// Kept here for reference until the next cleanup pass.
const _generateVariants = (input: string) => {
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

// Legacy: identifier extraction runs on the server (advanced_helpers.go).
const _extractData = (data: any): ExtractionResult[] => {
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
void _generateVariants; void _extractData; // legacy refs, see advanced_helpers.go

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
    // When advanced-search is the trigger, the parent (SearchWidget) opens the
    // modal without firing the regular /gateway hit, so there are no initial
    // hits — the backend will stream the "original" tab via SSE.
    const isAdvancedInitial = !!(results && results._advanced);
    const [people, setPeople] = useState<SearchPerson[]>([{
        id: 'initial', name: query.toUpperCase(), query: query,
        tabs: isAdvancedInitial ? [] : [{ id: 'original', label: 'Original', type: 'original', results: [] }],
        activeTabId: 'original', assistantLogs: [], isProcessing: isAdvancedInitial, newTabsCount: 0,
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

    const [selectedAddressIdx, setSelectedAddressIdx] = useState(0);
    const [hoveredResidentId, setHoveredResidentId] = useState<string | null>(null);
    const [selectedResidentName, setSelectedResidentName] = useState<string | null>(null);
    const [copiedNuc, setCopiedNuc] = useState<string | null>(null);

    useEffect(() => {
        setSelectedAddressIdx(0);
        setSelectedResidentName(null);
        setCopiedNuc(null);
    }, [activeTabId, activePersonIndex]);

    useEffect(() => {
        setSelectedResidentName(null);
        setCopiedNuc(null);
    }, [selectedAddressIdx]);

    const handleCopyNuc = (nuc: string) => {
        const success = copyToClipboard(nuc);
        if (success) {
            setCopiedNuc(nuc);
            setTimeout(() => setCopiedNuc(null), 2000);
        }
    };

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

    useEffect(() => {
        if (!parsedData) return;
        // Advanced-search path: the original tab arrives via SSE, never from
        // this parser. Skip so the synthetic { _advanced: true } never becomes
        // a fake hit row.
        if (parsedData._advanced) return;

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

    // Manually adds a person to the side panel (e.g. clicking "Investigar"
    // on a padrón cohabitant). Triggers a single regular searchesp lookup to
    // populate the "original" tab — costs 1 quota unit, NOT linked to the
    // advanced-search session.
    const addPerson = async (name: string, searchQuery: string) => {
        const normalizedName = name.trim().toUpperCase().replace(/\s+/g, ' ');
        const id = normalizedName.replace(/\s+/g, '_');
        let newIdx = -1;
        setPeople(prev => {
            if (prev.find(p => p && p.name === normalizedName)) return prev;
            newIdx = prev.length;
            return [...prev, {
                id, name: normalizedName, query: searchQuery,
                tabs: [{ id: 'original', label: 'Original', type: 'original', results: [] }],
                activeTabId: 'original',
                assistantLogs: [{ time: new Date().toLocaleTimeString(), message: `Iniciando búsqueda para: ${normalizedName}`, type: 'info' }],
                isProcessing: true, newTabsCount: 0,
                visitedQueries: new Set(), seenResultsContent: new Set(),
                showNoResultsBadge: false, initialProcessDone: true,
            }];
        });
        if (newIdx < 0) return;
        try {
            const res = await fetch('/gateway', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: 'searchesp', data: { query: searchQuery } }),
            });
            if (res.ok) {
                const data = await res.json();
                let hits: any[] = [];
                if (Array.isArray(data)) hits = data;
                else if (data.hits?.hits) hits = data.hits.hits.map((h: any) => h._source || h);
                else if (data.results) hits = Array.isArray(data.results) ? data.results : [data.results];
                if (country === 'España') {
                    hits = hits.filter((h: any) => !shouldFilterSpainHit(h));
                }
                const flat = hits.map((h: any) => flattenObject(h));
                setPeople(prev => {
                    const next = [...prev];
                    if (next[newIdx]) {
                        next[newIdx].tabs = [{ id: 'original', label: 'Original', type: 'original', results: flat }];
                        next[newIdx].isProcessing = false;
                    }
                    return next;
                });
            } else {
                addLog(`❌ Búsqueda fallida (${res.status})`, 'warning', undefined, newIdx);
                setPeople(prev => prev.map((p, i) => i === newIdx && p ? ({ ...p, isProcessing: false }) : p));
            }
        } catch (e: any) {
            addLog(`❌ ${e.message}`, 'warning', undefined, newIdx);
            setPeople(prev => prev.map((p, i) => i === newIdx && p ? ({ ...p, isProcessing: false }) : p));
        }
    };

    // ============== ADVANCED SEARCH (SSE) ==============
    // The backend (/gateway target="advanced-search") streams progress events:
    //   quota | person | tab | log | phase | error | done
    // Mirrors the legacy runAssistant/processPerson flow, but the whole
    // investigation runs on the server in a single charged session.

    const handleSSEEvent = (event: string, data: any) => {
        switch (event) {
            case 'quota':
                window.dispatchEvent(new CustomEvent('quota-updated', { detail: data }));
                break;
            case 'person':
                setPeople(prev => {
                    if (prev[data.personIdx]) return prev;
                    const next = [...prev];
                    while (next.length < data.personIdx) {
                        next.push(null as any);
                    }
                    next[data.personIdx] = {
                        id: data.id, name: data.name, query: data.query,
                        tabs: [],
                        activeTabId: 'original', assistantLogs: [{ time: new Date().toLocaleTimeString(), message: `Iniciando investigación para: ${data.name}`, type: 'info' }],
                        isProcessing: true, newTabsCount: 0,
                        visitedQueries: new Set(), seenResultsContent: new Set(),
                        showNoResultsBadge: false, initialProcessDone: true,
                    };
                    return next;
                });
                break;
            case 'tab':
                setPeople(prev => {
                    const next = [...prev];
                    const p = next[data.personIdx];
                    if (!p) return prev;
                    const existingIdx = p.tabs.findIndex(t => t.id === data.tabId);
                    if (existingIdx >= 0) {
                        // Replace if empty (e.g. seed "original" tab), otherwise keep.
                        if (p.tabs[existingIdx].results.length === 0) {
                            p.tabs = [...p.tabs];
                            p.tabs[existingIdx] = { id: data.tabId, label: data.label, type: data.type, results: data.results || [] };
                        }
                        return next;
                    }
                    p.tabs = [...p.tabs, { id: data.tabId, label: data.label, type: data.type, results: data.results || [] }];
                    return next;
                });
                break;
            case 'log':
                addLog(data.message, data.type || 'info', data.payload, data.personIdx ?? 0);
                break;
            case 'phase':
                // Currently informational; the UI infers progress from logs/tabs.
                break;
            case 'error':
                addLog(`❌ ${data.message}`, 'warning', undefined, data.personIdx ?? 0);
                break;
            case 'done':
                setPeople(prev => prev.map(p => p ? ({ ...p, isProcessing: false }) : p));
                break;
        }
    };

    const runAdvancedSearchSSE = async () => {
        if (country !== 'España') return;
        if (localStorage.getItem('advanced_search_enabled') !== 'true') return;
        const target0 = peopleRef.current[0];
        if (!target0 || target0.initialProcessDone) return;

        setPeople(prev => {
            const next = [...prev];
            if (next[0]) {
                next[0].initialProcessDone = true;
                next[0].isProcessing = true;
            }
            return next;
        });

        try {
            const res = await fetch('/gateway', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
                body: JSON.stringify({ target: 'advanced-search', data: { query } }),
            });
            if (!res.ok || !res.body) {
                let msg = `GATEWAY_ERROR: ${res.status}`;
                try { msg = (await res.json()).error || msg; } catch (_) {}
                addLog(`❌ ${msg}`, 'warning', undefined, 0);
                setPeople(prev => prev.map(p => p ? ({ ...p, isProcessing: false }) : p));
                return;
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                let idx;
                while ((idx = buf.indexOf('\n\n')) >= 0) {
                    const frame = buf.slice(0, idx);
                    buf = buf.slice(idx + 2);
                    const eventLine = frame.match(/^event:\s*(.+)$/m)?.[1];
                    const dataLine = frame.match(/^data:\s*(.+)$/m)?.[1];
                    if (!eventLine || !dataLine) continue;
                    try {
                        const parsed = JSON.parse(dataLine);
                        handleSSEEvent(eventLine.trim(), parsed);
                    } catch (_) { /* malformed frame */ }
                }
            }
        } catch (e: any) {
            addLog(`❌ Error en el stream: ${e.message}`, 'warning', undefined, 0);
            setPeople(prev => prev.map(p => p ? ({ ...p, isProcessing: false }) : p));
        }
    };

    useEffect(() => {
        if (country !== 'España') return;
        if (localStorage.getItem('advanced_search_enabled') !== 'true') return;
        if (!people[0] || people[0].initialProcessDone) return;
        runAdvancedSearchSSE();
    }, [country, people]);

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
                    animation: laserScan 8s infinite linear;
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

                /* RADICAL SPAIN PADRON STYLES */
                .spain-address-card {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .spain-address-card:hover {
                    background: rgba(0, 240, 255, 0.03) !important;
                    border-color: rgba(0, 240, 255, 0.2) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px -10px rgba(0, 240, 255, 0.1);
                }
                .spain-address-card.active {
                    background: rgba(0, 240, 255, 0.06) !important;
                    border-color: rgba(0, 240, 255, 0.4) !important;
                    box-shadow: 0 10px 30px -10px rgba(0, 240, 255, 0.15), inset 0 0 15px rgba(0, 240, 255, 0.05);
                }
                
                .address-card-scanner {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 2px;
                    height: 100%;
                    background: linear-gradient(180deg, transparent, rgba(0, 240, 255, 0.2), transparent);
                    animation: scannerHorizontal 8s infinite linear;
                    pointer-events: none;
                }
                .spain-address-card.active.target-active .address-card-scanner {
                    background: linear-gradient(180deg, transparent, rgba(255, 42, 95, 0.2), transparent);
                }
                
                @keyframes scannerHorizontal {
                    0% { left: 0%; }
                    50% { left: 100%; }
                    100% { left: 0%; }
                }

                .isometric-house-svg {
                    overflow: visible;
                }
                .house-base-ellipse {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.05);
                    stroke-width: 1.5;
                    stroke-dasharray: 4, 3;
                    transition: all 0.3s ease;
                }
                .spain-address-card:hover .house-base-ellipse {
                    stroke: rgba(0, 240, 255, 0.15);
                }
                .spain-address-card.active .house-base-ellipse {
                    stroke: rgba(0, 240, 255, 0.25);
                }
                .house-inner-ellipse {
                    fill: rgba(255, 255, 255, 0.01);
                    stroke: rgba(255, 255, 255, 0.1);
                    stroke-width: 1;
                    transition: all 0.3s ease;
                }
                .spain-address-card:hover .house-inner-ellipse {
                    fill: rgba(0, 240, 255, 0.02);
                    stroke: rgba(0, 240, 255, 0.2);
                }
                .spain-address-card.active .house-inner-ellipse {
                    fill: rgba(0, 240, 255, 0.04);
                    stroke: rgba(0, 240, 255, 0.4);
                }
                .house-wall {
                    fill: rgba(11, 17, 32, 0.85);
                    stroke: rgba(255, 255, 255, 0.15);
                    stroke-width: 1.5;
                    transition: all 0.3s ease;
                }
                .house-wall.left {
                    fill: rgba(7, 12, 24, 0.9);
                }
                .spain-address-card:hover .house-wall {
                    stroke: rgba(0, 240, 255, 0.5);
                    fill: rgba(11, 24, 48, 0.9);
                }
                .spain-address-card.active .house-wall {
                    stroke: rgba(0, 240, 255, 0.8);
                    fill: rgba(0, 240, 255, 0.05);
                }
                .house-roof {
                    fill: rgba(255, 255, 255, 0.03);
                    stroke: rgba(255, 255, 255, 0.2);
                    stroke-width: 1.5;
                    transition: all 0.3s ease;
                }
                .spain-address-card:hover .house-roof {
                    fill: rgba(0, 240, 255, 0.08);
                    stroke: rgba(0, 240, 255, 0.6);
                }
                .spain-address-card.active .house-roof {
                    fill: rgba(0, 240, 255, 0.15);
                    stroke: #00f0ff;
                }
                .house-door {
                    fill: rgba(255, 255, 255, 0.05);
                    stroke: rgba(255, 255, 255, 0.25);
                    stroke-width: 1;
                    transition: all 0.3s ease;
                }
                .spain-address-card:hover .house-door {
                    fill: rgba(0, 240, 255, 0.1);
                    stroke: rgba(0, 240, 255, 0.5);
                }
                .spain-address-card.active .house-door {
                    fill: rgba(255, 42, 95, 0.15);
                    stroke: #ff2a5f;
                }
                .house-window {
                    fill: rgba(255, 255, 255, 0.02);
                    stroke: rgba(255, 255, 255, 0.2);
                    stroke-width: 1;
                    transition: all 0.3s ease;
                }
                .spain-address-card:hover .house-window {
                    fill: rgba(0, 240, 255, 0.3);
                    stroke: rgba(0, 240, 255, 0.8);
                }
                .spain-address-card.active .house-window {
                    fill: #00f0ff;
                    stroke: #fff;
                    filter: drop-shadow(0 0 4px #00f0ff);
                }
                .house-antenna {
                    stroke: rgba(255, 255, 255, 0.3);
                    stroke-width: 1.2;
                    transition: all 0.3s ease;
                }
                .spain-address-card:hover .house-antenna {
                    stroke: rgba(0, 240, 255, 0.6);
                }
                .spain-address-card.active .house-antenna {
                    stroke: #00f0ff;
                    stroke-width: 1.5;
                }
                .house-antenna-orb {
                    fill: rgba(255, 255, 255, 0.4);
                    transition: all 0.3s ease;
                }
                .spain-address-card:hover .house-antenna-orb {
                    fill: #00f0ff;
                }
                .spain-address-card.active .house-antenna-orb {
                    fill: #ff2a5f;
                }

                /* Network canvas graphics */
                .network-canvas-container {
                    position: relative;
                    height: 380px;
                    background: radial-gradient(circle at 50% 50%, rgba(10, 18, 42, 0.4) 0%, rgba(4, 6, 12, 0.95) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.04);
                    border-radius: 16px;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justifyContent: center;
                }
                
                .network-radar-grid {
                    position: absolute;
                    width: 320px;
                    height: 320px;
                    border: 1px dashed rgba(0, 240, 255, 0.04);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 0;
                }
                .network-radar-grid.inner {
                    width: 180px;
                    height: 180px;
                }
                .network-radar-grid.outer {
                    width: 250px;
                    height: 250px;
                }
                .network-radar-grid.sweep {
                    width: 350px;
                    height: 350px;
                    border: 1px solid rgba(0, 240, 255, 0.02);
                    background: conic-gradient(from 0deg, rgba(0, 240, 255, 0.012) 0deg, transparent 90deg, transparent 360deg);
                    animation: spinClockwise 25s infinite linear;
                }
                
                .network-connecting-line {
                    background: linear-gradient(90deg, rgba(0, 240, 255, 0.35) 0%, rgba(0, 240, 255, 0.03) 100%);
                    pointer-events: none;
                }
                .network-connecting-line.family {
                    background: linear-gradient(90deg, rgba(255, 196, 0, 0.35) 0%, rgba(255, 196, 0, 0.03) 100%);
                }
                .network-connecting-line.other {
                    background: linear-gradient(90deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.01) 100%);
                }

                .line-pulse-particle {
                    position: absolute;
                    top: -3px;
                    left: 0;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #00f0ff;
                    box-shadow: 0 0 4px #00f0ff;
                    animation: flowParticle 1.2s infinite linear;
                    will-change: transform;
                }
                .network-connecting-line.family .line-pulse-particle {
                    background: #ffc400;
                    box-shadow: 0 0 6px #ffc400;
                }
                .network-connecting-line.other .line-pulse-particle {
                    background: rgba(255, 255, 255, 0.5);
                    box-shadow: 0 0 6px rgba(255, 255, 255, 0.5);
                }

                @keyframes flowParticle {
                    0% { transform: translateX(0); opacity: 0; }
                    8% { opacity: 1; }
                    92% { opacity: 1; }
                    100% { transform: translateX(92px); opacity: 0; }
                }

                @keyframes waveMove {
                    0% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: -120; }
                }
                .telemetry-wave-anim {
                    stroke-dasharray: 40, 20;
                    animation: waveMove 4s infinite linear;
                }

                @keyframes spinClockwise {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes spinCounterClockwise {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }

                .center-node-target-ring {
                    position: absolute;
                    top: -8px;
                    left: -8px;
                    right: -8px;
                    bottom: -8px;
                    border: 1px dashed rgba(255, 42, 95, 0.4);
                    border-radius: 50%;
                    animation: spinClockwise 35s infinite linear;
                }
                .center-node-target-ring::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: -3px;
                    width: 6px;
                    height: 6px;
                    background: #ff2a5f;
                    border-radius: 50%;
                    box-shadow: 0 0 4px rgba(255, 42, 95, 0.4);
                }

                .resident-node-pulse {
                    position: absolute;
                    top: -6px;
                    left: -6px;
                    right: -6px;
                    bottom: -6px;
                    border: 1.5px solid;
                    border-radius: 50%;
                    opacity: 0;
                    animation: ringPulse 4.5s infinite cubic-bezier(0.215, 0.610, 0.355, 1);
                }

                @keyframes ringPulse {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    50% { opacity: 0.3; }
                    100% { transform: scale(1.3); opacity: 0; }
                }
                
                .network-resident-node:hover {
                    transform: scale(1.15);
                    box-shadow: 0 0 25px rgba(255, 255, 255, 0.3) !important;
                }

                /* Dossier fingerprint & scanner styles */
                .fingerprint-container {
                    position: relative;
                    overflow: hidden;
                    background: rgba(0, 0, 0, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 12px;
                    display: flex;
                    align-items: center;
                    justifyContent: center;
                    width: 104px;
                    height: 104px;
                }
                .fingerprint-laser {
                    position: absolute;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: #00f0ff;
                    box-shadow: 0 0 4px rgba(0, 240, 255, 0.4);
                    animation: laserScanVertical 8s infinite ease-in-out;
                    pointer-events: none;
                }
                .fingerprint-container.target .fingerprint-laser {
                    background: #ff2a5f;
                    box-shadow: 0 0 8px #ff2a5f;
                }
                .fingerprint-container.family .fingerprint-laser {
                    background: #ffc400;
                    box-shadow: 0 0 4px rgba(255, 196, 0, 0.4);
                }
                
                @keyframes laserScanVertical {
                    0% { top: 0%; }
                    50% { top: 100%; }
                    100% { top: 0%; }
                }
                
                .spain-dossier-terminal {
                    background: rgba(13, 20, 38, 0.45);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    box-shadow: inset 0 0 30px rgba(0, 240, 255, 0.01);
                    backdrop-filter: blur(12px);
                    border-radius: 16px;
                    display: flex;
                }
                
                /* TACTICAL HORIZONTAL LAYOUT STYLES */
                .spain-padron-layout-container {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-top: 5px;
                }
                
                .spain-padron-workspace {
                    display: flex;
                    flex-direction: column;
                    background: rgba(13, 20, 38, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.04);
                    border-radius: 16px;
                    padding: 16px;
                    position: relative;
                    box-shadow: inset 0 0 20px rgba(0, 240, 255, 0.01);
                }
                
                .spain-subject-dossier-card {
                    background: rgba(13, 20, 38, 0.45);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    box-shadow: inset 0 0 20px rgba(0, 240, 255, 0.015);
                    backdrop-filter: blur(12px);
                    border-radius: 16px;
                    padding: 20px;
                    position: relative;
                }
                
                .view-mode-toggle-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    flex-shrink: 0;
                }
                
                .view-mode-toggle-btn {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: rgba(255, 255, 255, 0.5);
                    padding: 6px 14px;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    font-family: "'JetBrains Mono', monospace";
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .view-mode-toggle-btn.active {
                    background: rgba(0, 240, 255, 0.1) !important;
                    border-color: rgba(0, 240, 255, 0.3) !important;
                    color: var(--accent-cyan) !important;
                    box-shadow: 0 0 10px rgba(0, 240, 255, 0.15);
                }
                .view-mode-toggle-btn:hover {
                    color: #fff;
                    background: rgba(255, 255, 255, 0.06);
                }
                
                /* ANALYTICS TABLE STYLES */
                .spain-analytics-table-container {
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 4px;
                }
                
                .spain-analytics-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                }
                
                .spain-analytics-table th {
                    font-size: 9px;
                    font-weight: 900;
                    color: rgba(255, 255, 255, 0.35);
                    letter-spacing: 1.5px;
                    font-family: "'JetBrains Mono', monospace";
                    text-transform: uppercase;
                    padding: 10px 14px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                }
                
                .spain-analytics-row {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                .spain-analytics-row:hover {
                    background: rgba(255, 255, 255, 0.02) !important;
                }
                .spain-analytics-row.active {
                    background: rgba(0, 240, 255, 0.03) !important;
                }
                .spain-analytics-row.target-row {
                    background: rgba(255, 42, 95, 0.01);
                }
                .spain-analytics-row.target-row:hover {
                    background: rgba(255, 42, 95, 0.03) !important;
                }
                .spain-analytics-row.target-row.active {
                    background: rgba(255, 42, 95, 0.05) !important;
                }
                
                .spain-analytics-cell {
                    padding: 12px 14px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #e2e8f0;
                    vertical-align: middle;
                    position: relative;
                }
                
                .row-relation-indicator {
                    position: absolute;
                    left: 0;
                    top: 15%;
                    width: 3px;
                    height: 70%;
                    border-radius: 0 4px 4px 0;
                }
                
                /* Mini compact progress bar */
                .mini-age-progress-bar {
                    width: 60px;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.06);
                    border-radius: 2px;
                    overflow: hidden;
                    margin-top: 4px;
                }
                
                .row-action-btn {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    color: rgba(255,255,255,0.5);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 9px;
                    font-weight: 800;
                    font-family: "'JetBrains Mono', monospace";
                    cursor: pointer;
                    transition: all 0.2s ease;
                    outline: none;
                }
                .row-action-btn:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.15);
                    color: #fff;
                }
                .row-action-btn.copy-btn.copied {
                    background: rgba(16, 185, 129, 0.1) !important;
                    border-color: rgba(16, 185, 129, 0.3) !important;
                    color: #10b981 !important;
                    box-shadow: 0 0 8px rgba(16, 185, 129, 0.2);
                }
                .row-action-btn.recurse-btn {
                    background: rgba(255, 42, 95, 0.03);
                    border-color: rgba(255, 42, 95, 0.15);
                    color: rgba(255, 42, 95, 0.7);
                }
                .row-action-btn.recurse-btn:hover {
                    background: rgba(255, 42, 95, 0.1) !important;
                    border-color: rgba(255, 42, 95, 0.3) !important;
                    color: #ff2a5f !important;
                    box-shadow: 0 0 8px rgba(255, 42, 95, 0.15);
                }
                
                .spain-analytics-row .row-actions-container {
                    opacity: 0;
                    transform: translateX(6px);
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                .spain-analytics-row:hover .row-actions-container {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                .hover-copy-btn {
                    opacity: 0;
                    transition: all 0.2s ease;
                }
                
                .spain-analytics-row:hover .hover-copy-btn {
                    opacity: 1;
                }
            `}</style>
            <div className={`glass-panel custom-scrollbar ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`} style={{ width: '95vw', maxWidth: '1380px', height: '85vh', display: 'flex', flexDirection: 'column', background: 'rgba(11, 17, 32, 0.98)', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 240, 255, 0.2)' }}><Search size={22} color="var(--accent-cyan)" /></div>
                        <div>
                            <h1 className="mono" style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 6px 0', letterSpacing: '4px', color: '#fff' }}>{country.toUpperCase()}</h1>
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
                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: country === 'España' ? '24px 40px 16px 40px' : '24px 32px' }}>
                            {country !== 'España' && (
                                <div style={{ background: 'rgba(255, 200, 0, 0.04)', border: '1px solid rgba(255, 200, 0, 0.2)', padding: '16px 24px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <ShieldAlert size={20} color="#ffc400" />
                                    <div style={{ fontSize: '13px', color: 'rgba(255, 200, 0, 0.8)', fontWeight: 600, letterSpacing: '0.3px' }}><strong>AVISO DE SEGURIDAD:</strong> Datos sensibles procedentes de filtraciones gubernamentales. Uso estrictamente profesional.</div>
                                </div>
                            )}
                            <div style={{ 
                                background: country === 'España' ? 'transparent' : 'rgba(255, 255, 255, 0.01)', 
                                border: country === 'España' ? 'none' : '1px solid rgba(255, 255, 255, 0.05)', 
                                borderRadius: '16px', 
                                padding: country === 'España' ? '0' : '32px' 
                            }}>
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
                                                const dir = padronData.direcciones[selectedAddressIdx] || padronData.direcciones[0];
                                                
                                                // Find objective and active resident
                                                const objetivo = dir?.personas.find((p: any) => p.relacion?.toLowerCase().includes('objetivo')) || dir?.personas[0];
                                                const activeResName = selectedResidentName || objetivo?.nombre;
                                                const activeResident = dir?.personas.find((p: any) => p.nombre === activeResName) || objetivo;
                                                
                                                const isObj = activeResident?.relacion?.toLowerCase().includes('objetivo');
                                                const isFamily = ['madre', 'padre', 'hijo', 'hija', 'hermano', 'hermana', 'conyuge', 'esposo', 'esposa'].some(r => activeResident?.relacion?.toLowerCase().includes(r));
                                                
                                                const ageNum = parseInt(activeResident?.edad || '0') || 0;
                                                const agePercent = Math.min(Math.max((ageNum / 100) * 100, 5), 100);

                                                // Connection strength calculation
                                                let relationPercentage = '40%';
                                                if (isObj) {
                                                    relationPercentage = '100%';
                                                } else if (isFamily) {
                                                    relationPercentage = '90%';
                                                }
                                                
                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '0', marginTop: '0' }}>
                                                        
                                                        <div className="spain-padron-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 240, 255, 0.1)', paddingBottom: '14px', marginBottom: '10px' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ width: '3px', height: '28px', background: 'linear-gradient(180deg, var(--accent-cyan), transparent)', borderRadius: '2px', flexShrink: 0 }} />
                                                                    <div>
                                                                        <div style={{ color: 'var(--accent-cyan)', fontSize: '9px', fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", marginBottom: '3px', opacity: 0.8 }}>CENTRO DE CONTROL TÁCTICO DE CENSO</div>
                                                                        <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.5px', lineHeight: 1.1 }}>Núcleos de Convivencia y Cohabitación</h2>
                                                                    </div>
                                                                </div>
                                                                <div style={{ marginLeft: '11px', paddingTop: '2px', borderTop: '1px dashed rgba(255,255,255,0.06)', marginTop: '2px' }}>
                                                                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0, letterSpacing: '0.3px' }}>Análisis geo-espacial unificado · Uso exclusivo para operaciones autorizadas</p>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                                                                <span style={{ fontSize: '10px', fontWeight: 900, color: '#ff2a5f', border: '1px solid rgba(255,42,95,0.3)', padding: '8px 16px', borderRadius: '8px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', background: 'rgba(255,42,95,0.04)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff2a5f', display: 'inline-block', boxShadow: '0 0 6px #ff2a5f' }} />
                                                                    ACCESO RESTRINGIDO N4
                                                                </span>
                                                                <div className="stat-badge" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '10px', fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.12)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block', boxShadow: '0 0 6px var(--accent-cyan)' }} />
                                                                    {padronData.total_personas} SUJETOS VINCULADOS
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="spain-padron-layout-container">
                                                            
                                                            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '12px' }}>
                                                                {padronData.direcciones.map((item: any, dIdx: number) => {
                                                                    const isActive = selectedAddressIdx === dIdx;
                                                                    const isTargetHere = item.personas.some((p: any) => p.nombre.trim().toUpperCase() === query.trim().toUpperCase());
                                                                    
                                                                    return (
                                                                        <div 
                                                                            key={dIdx} 
                                                                            onClick={() => setSelectedAddressIdx(dIdx)}
                                                                            className={`spain-address-card ${isActive ? 'active' : ''} ${isTargetHere ? 'target-active' : ''}`}
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '12px',
                                                                                cursor: 'pointer',
                                                                                padding: '12px 20px',
                                                                                borderRadius: '16px',
                                                                                position: 'relative',
                                                                                overflow: 'hidden',
                                                                                flex: '1 1 280px',
                                                                                maxWidth: '340px'
                                                                            }}
                                                                        >
                                                                            {isActive && <div className="address-card-scanner" />}
                                                                            
                                                                            <div style={{ flexShrink: 0, width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                <svg viewBox="0 0 100 100" className="isometric-house-svg" style={{ width: '38px', height: '38px' }}>
                                                                                    <ellipse cx="50" cy="75" rx="35" ry="12" className="house-base-ellipse" />
                                                                                    <ellipse cx="50" cy="75" rx="25" ry="8" className="house-inner-ellipse" />
                                                                                    <polygon points="50,45 20,57 20,75 50,63" className="house-wall left" />
                                                                                    <polygon points="50,45 80,57 80,75 50,63" className="house-wall right" />
                                                                                    <polygon points="50,25 20,37 20,57 50,45" className="house-roof left" />
                                                                                    <polygon points="50,25 80,37 80,57 50,45" className="house-roof right" />
                                                                                    <polygon points="60,63 70,67 70,55 60,51" className="house-door" />
                                                                                    <polygon points="30,61 40,57 40,65 30,69" className="house-window" />
                                                                                </svg>
                                                                            </div>
                                                                            
                                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                                <div style={{ fontSize: '13px', fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.3px' }}>
                                                                                    {item.direccion}
                                                                                </div>
                                                                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '9px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                                                                                    <span style={{ color: 'var(--accent-cyan)' }}>{item.personas.length} INDIVIDUOS</span>
                                                                                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                                                                                    <span style={{ color: '#ffc400' }}>CP {item.codigo_postal}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
                                                                
                                                                 <div className="spain-padron-workspace" style={{ flex: 1.2, height: '370px', display: 'flex', flexDirection: 'column', padding: '12px 20px', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                                                                    {dir && (
                                                                        <>
                                                                            {/* HUD: TOP ADDRESS LABEL */}
                                                                            <div style={{ position: 'absolute', top: '10px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(0, 240, 255, 0.15)', paddingBottom: '4px', pointerEvents: 'none', zIndex: 15 }}>
                                                                                <span style={{ fontSize: '8px', color: 'rgba(0, 240, 255, 0.6)', fontWeight: 900, letterSpacing: '1px', fontFamily: "'JetBrains Mono', monospace" }}>DIRECCIÓN FOCALIZADA:</span>
                                                                                <span style={{ fontSize: '9.5px', color: '#fff', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '75%' }}>{dir.direccion} <strong style={{ color: '#ffc400' }}>(CP {dir.codigo_postal})</strong></span>
                                                                            </div>

                                                                        </>
                                                                    )}
                                                                    {(() => {
                                                                        if (!dir) return (
                                                                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                                                                                Cargando radar...
                                                                            </div>
                                                                        );

                                                                        const convivientes = dir.personas.filter((p: any) => p !== objetivo);
                                                                        const totalConv = convivientes.length;

                                                                        return (
                                                                            <div className="network-canvas-container" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'transparent', border: 'none', height: '100%', width: '100%' }}>
                                                                                <div className="network-radar-grid inner" />
                                                                                <div className="network-radar-grid outer" />
                                                                                <div className="network-radar-grid sweep" />
                                                                                
                                                                                {convivientes.map((per: any, cIdx: number) => {
                                                                                    const isFamilyLine = ['madre', 'padre', 'hijo', 'hija', 'hermano', 'hermana', 'conyuge', 'esposo', 'esposa'].some(r => per.relacion?.toLowerCase().includes(r));
                                                                                    return (
                                                                                        <div 
                                                                                            key={`line-${cIdx}`}
                                                                                            className={`network-connecting-line ${isFamilyLine ? 'family' : 'other'}`}
                                                                                            style={{
                                                                                                position: 'absolute',
                                                                                                left: '50%',
                                                                                                top: '50%',
                                                                                                width: '92px',
                                                                                                height: '2px',
                                                                                                transform: `rotate(${(cIdx * 360) / totalConv}deg)`,
                                                                                                transformOrigin: 'left center',
                                                                                                zIndex: 1
                                                                                            }}
                                                                                        >
                                                                                            <div className="line-pulse-particle" />
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                                
                                                                                <div 
                                                                                    className="network-center-node"
                                                                                    onClick={() => setSelectedResidentName(objetivo.nombre)}
                                                                                    onMouseEnter={() => setHoveredResidentId(objetivo.nombre)}
                                                                                    onMouseLeave={() => setHoveredResidentId(null)}
                                                                                    style={{
                                                                                        position: 'absolute',
                                                                                        left: 'calc(50% - 27px)',
                                                                                        top: 'calc(50% - 27px)',
                                                                                        width: '54px',
                                                                                        height: '54px',
                                                                                        borderRadius: '50%',
                                                                                        background: 'rgba(11, 17, 32, 0.95)',
                                                                                        border: '3px solid #ff2a5f',
                                                                                        boxShadow: '0 0 20px rgba(255, 42, 95, 0.4), inset 0 0 10px rgba(255, 42, 95, 0.2)',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'center',
                                                                                        cursor: 'pointer',
                                                                                        zIndex: 12,
                                                                                        transition: 'all 0.3s ease'
                                                                                    }}
                                                                                >
                                                                                    <div className="center-node-target-ring" />
                                                                                    <User size={20} color="#fff" />
                                                                                    
                                                                                    <div 
                                                                                        className="resident-node-label"
                                                                                        style={{
                                                                                            position: 'absolute',
                                                                                            top: '58px',
                                                                                            whiteSpace: 'nowrap',
                                                                                            fontSize: '9px',
                                                                                            fontWeight: 900,
                                                                                            color: '#ff2a5f',
                                                                                            background: 'rgba(5, 8, 16, 0.95)',
                                                                                            padding: '2px 6px',
                                                                                            borderRadius: '4px',
                                                                                            border: '1px solid rgba(255, 42, 95, 0.3)',
                                                                                            pointerEvents: 'none',
                                                                                            fontFamily: "'JetBrains Mono', monospace"
                                                                                        }}
                                                                                    >
                                                                                        {objetivo.nombre.split(' ')[0]} {objetivo.nombre.split(' ')[1]?.[0] || ''}.
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                {convivientes.map((per: any, cIdx: number) => {
                                                                                    const angle = (cIdx * 2 * Math.PI) / totalConv;
                                                                                    const radius = 92;
                                                                                    const x = radius * Math.cos(angle);
                                                                                    const y = radius * Math.sin(angle);
                                                                                    const isSelected = activeResName === per.nombre;
                                                                                    const isHovered = hoveredResidentId === per.nombre;
                                                                                    
                                                                                    const perFamily = ['madre', 'padre', 'hijo', 'hija', 'hermano', 'hermana', 'conyuge', 'esposo', 'esposa'].some(r => per.relacion?.toLowerCase().includes(r));
                                                                                    
                                                                                    let nodeColor = 'var(--accent-cyan)';
                                                                                    let glowShadow = 'rgba(0, 240, 255, 0.2)';
                                                                                    if (perFamily) {
                                                                                        nodeColor = '#ffc400';
                                                                                        glowShadow = 'rgba(255, 196, 0, 0.2)';
                                                                                    }
                                                                                    
                                                                                    const names = per.nombre.split(' ');
                                                                                    const initials = (names[0]?.[0] || '') + (names[1]?.[0] || '');
                                                                                    
                                                                                    return (
                                                                                        <div 
                                                                                            key={cIdx}
                                                                                            className={`network-resident-node`}
                                                                                            onClick={() => setSelectedResidentName(per.nombre)}
                                                                                            onMouseEnter={() => setHoveredResidentId(per.nombre)}
                                                                                            onMouseLeave={() => setHoveredResidentId(null)}
                                                                                            style={{
                                                                                                position: 'absolute',
                                                                                                left: `calc(50% + ${x}px - 19px)`,
                                                                                                top: `calc(50% + ${y}px - 19px)`,
                                                                                                width: '38px',
                                                                                                height: '38px',
                                                                                                borderRadius: '50%',
                                                                                                background: 'rgba(11, 17, 32, 0.95)',
                                                                                                border: `2px solid ${isSelected ? '#fff' : nodeColor}`,
                                                                                                boxShadow: isSelected ? `0 0 15px ${nodeColor}, inset 0 0 8px ${nodeColor}` : `0 0 8px ${glowShadow}`,
                                                                                                display: 'flex',
                                                                                                alignItems: 'center',
                                                                                                justifyContent: 'center',
                                                                                                cursor: 'pointer',
                                                                                                zIndex: 10,
                                                                                                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                                                                            }}
                                                                                        >
                                                                                            {isHovered && <div className="resident-node-pulse" style={{ borderColor: nodeColor }} />}
                                                                                            
                                                                                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#fff', letterSpacing: '0.5px', fontFamily: "'JetBrains Mono', monospace" }}>
                                                                                                {initials}
                                                                                            </span>
                                                                                            
                                                                                            <div 
                                                                                                className="resident-node-label"
                                                                                                style={{
                                                                                                    position: 'absolute',
                                                                                                    top: '42px',
                                                                                                    whiteSpace: 'nowrap',
                                                                                                    fontSize: '8.5px',
                                                                                                    fontWeight: 800,
                                                                                                    color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                                                                                                    background: 'rgba(5, 8, 16, 0.9)',
                                                                                                    padding: '2px 5px',
                                                                                                    borderRadius: '4px',
                                                                                                    border: `1px solid ${isSelected ? nodeColor : 'rgba(255,255,255,0.05)'}`,
                                                                                                    pointerEvents: 'none',
                                                                                                    fontFamily: "'JetBrains Mono', monospace"
                                                                                                }}
                                                                                            >
                                                                                                {names[0]} {names[1]?.[0] || ''}.
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>

                                                                <div className="spain-subject-dossier-card" style={{ flex: 1, height: '370px', display: 'flex', flexDirection: 'column', padding: '16px 20px' }}>
                                                                    {activeResident ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
                                                                            
                                                                            {/* HEADER: nombre grande como protagonista */}
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                                                    <h3 style={{ margin: '0 0 5px 0', fontSize: '19px', fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                                        {activeResident.nombre}
                                                                                    </h3>
                                                                                    {/* Relación discreta bajo el nombre */}
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                        <span style={{ fontSize: '11px', fontWeight: 700, color: isObj ? 'rgba(255,42,95,0.8)' : (isFamily ? 'rgba(255,196,0,0.8)' : 'rgba(0,240,255,0.8)'), fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                                                                            {activeResident.relacion || (isObj ? 'SUJETO PRINCIPAL' : 'COHABITANTE')}
                                                                                        </span>
                                                                                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'inline-block' }} />
                                                                                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono', monospace" }}>{relationPercentage} vinculación</span>
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                <div className={`fingerprint-container ${isObj ? 'target' : (isFamily ? 'family' : '')}`} style={{ flexShrink: 0, width: '50px', height: '50px', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.3)', border: `1px solid ${isObj ? 'rgba(255,42,95,0.2)' : (isFamily ? 'rgba(255,196,0,0.2)' : 'rgba(255,255,255,0.07)')}`, borderRadius: '10px', position: 'relative', overflow: 'hidden' }}>
                                                                                    <div className="fingerprint-laser" />
                                                                                    <svg viewBox="0 0 100 100" style={{ width: '40px', height: '40px', stroke: isObj ? '#ff2a5f' : (isFamily ? '#ffc400' : 'var(--accent-cyan)'), fill: 'none' }}>
                                                                                        <path d="M 12 2 L 2 2 L 2 12" strokeWidth="2.5" />
                                                                                        <path d="M 88 2 L 98 2 L 98 12" strokeWidth="2.5" />
                                                                                        <path d="M 12 98 L 2 98 L 2 88" strokeWidth="2.5" />
                                                                                        <path d="M 88 98 L 98 98 L 98 88" strokeWidth="2.5" />
                                                                                        <path d="M 30 70 A 20 20 0 0 1 70 70" strokeWidth="1.8" strokeDasharray="2, 2" />
                                                                                        <path d="M 25 70 A 25 25 0 0 1 75 70" strokeWidth="1.8" />
                                                                                        <path d="M 20 70 A 30 30 0 0 1 80 70" strokeWidth="1.8" strokeDasharray="6, 3" />
                                                                                        <path d="M 35 60 A 15 15 0 0 1 65 60" strokeWidth="2.2" />
                                                                                        <path d="M 40 50 A 10 10 0 0 1 60 50" strokeWidth="2.2" />
                                                                                        <path d="M 45 45 A 5 5 0 0 1 55 45" strokeWidth="2.8" />
                                                                                        <path d="M 50 40 L 50 70" strokeWidth="2.2" />
                                                                                    </svg>
                                                                                </div>
                                                                            </div>

                                                                            {/* DIVISOR */}
                                                                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                                                                            
                                                                            {/* GRID 2x2: NUC | NACIMIENTO / EDAD | RELACION */}
                                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
                                                                                
                                                                                {/* NUC Widget */}
                                                                                <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '4px' }}><Shield size={10} color="var(--accent-cyan)" /> NUC</div>
                                                                                    <div style={{ fontSize: '14px', color: activeResident.nuc ? '#fff' : 'rgba(255,255,255,0.25)', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeResident.nuc || '—'}</span>
                                                                                        {activeResident.nuc && (
                                                                                            <button 
                                                                                                onClick={() => handleCopyNuc(activeResident.nuc)}
                                                                                                style={{
                                                                                                    flexShrink: 0,
                                                                                                    background: copiedNuc === activeResident.nuc ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                                                                                                    border: `1px solid ${copiedNuc === activeResident.nuc ? '#10b981' : 'rgba(255,255,255,0.12)'}`,
                                                                                                    color: copiedNuc === activeResident.nuc ? '#10b981' : 'rgba(255,255,255,0.5)',
                                                                                                    padding: '2px 6px',
                                                                                                    borderRadius: '4px',
                                                                                                    fontSize: '8px',
                                                                                                    fontWeight: 800,
                                                                                                    cursor: 'pointer',
                                                                                                    fontFamily: "'JetBrains Mono', monospace"
                                                                                                }}
                                                                                            >
                                                                                                {copiedNuc === activeResident.nuc ? '✓' : 'COPY'}
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                {/* DOB Widget */}
                                                                                <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={10} color="var(--accent-cyan)" /> NACIMIENTO</div>
                                                                                    <div style={{ fontSize: '14px', color: '#fff', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                                                                                        {activeResident.fecha_nacimiento || '—'}
                                                                                    </div>
                                                                                </div>

                                                                                {/* AGE Widget */}
                                                                                <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '4px' }}><Activity size={10} color="var(--accent-cyan)" /> EDAD</div>
                                                                                    <div style={{ fontSize: '22px', fontWeight: 900, color: ageNum < 18 ? '#00f0ff' : (ageNum < 65 ? '#10b981' : '#ffc400'), lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                                                                                        {activeResident.edad}<span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: '4px', fontWeight: 600 }}>años</span>
                                                                                    </div>
                                                                                    <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '100px', overflow: 'hidden' }}>
                                                                                        <div style={{ width: `${agePercent}%`, height: '100%', background: ageNum < 18 ? '#00f0ff' : (ageNum < 65 ? '#10b981' : '#ffc400'), borderRadius: '100px', transition: 'width 0.8s ease' }} />
                                                                                    </div>
                                                                                </div>

                                                                                {/* RELACION Widget */}
                                                                                <div style={{ background: isObj ? 'rgba(255,42,95,0.05)' : (isFamily ? 'rgba(255,196,0,0.05)' : 'rgba(0, 0, 0, 0.25)'), border: `1px solid ${isObj ? 'rgba(255,42,95,0.15)' : (isFamily ? 'rgba(255,196,0,0.15)' : 'rgba(255,255,255,0.06)')}`, borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={10} color={isObj ? '#ff2a5f' : (isFamily ? '#ffc400' : 'var(--accent-cyan)')} /> RELACIÓN</div>
                                                                                    <div style={{ fontSize: '13px', color: isObj ? '#ff2a5f' : (isFamily ? '#ffc400' : '#fff'), fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                                        {activeResident.relacion || 'COHABITANTE'}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* CENSOS */}
                                                                            <div style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '6px' }}><Database size={11} color="var(--accent-cyan)" /> CENSOS REGISTRADOS</span>
                                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                                    {dir.years.map((yr: string, yIdx: number) => (
                                                                                        <span 
                                                                                            key={yIdx} 
                                                                                            style={{ 
                                                                                                fontSize: '11px', 
                                                                                                fontWeight: 800, 
                                                                                                background: 'rgba(0, 240, 255, 0.08)', 
                                                                                                border: '1px solid rgba(0, 240, 255, 0.2)', 
                                                                                                color: 'var(--accent-cyan)', 
                                                                                                padding: '2px 10px', 
                                                                                                borderRadius: '4px',
                                                                                                fontFamily: "'JetBrains Mono', monospace"
                                                                                            }}
                                                                                        >
                                                                                            {yr}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            {/* ACTION BLOCK */}
                                                                            <div style={{ marginTop: '8px' }}>
                                                                                {!isObj ? (
                                                                                    <button 
                                                                                        onClick={() => addPerson(activeResident.nombre, activeResident.nombre)}
                                                                                        style={{
                                                                                            width: '100%',
                                                                                            background: 'rgba(255, 42, 95, 0.05)',
                                                                                            border: '1px solid rgba(255, 42, 95, 0.3)',
                                                                                            color: '#ff2a5f',
                                                                                            padding: '8px 12px',
                                                                                            borderRadius: '8px',
                                                                                            fontSize: '10px',
                                                                                            fontWeight: 800,
                                                                                            letterSpacing: '1.5px',
                                                                                            cursor: 'pointer',
                                                                                            transition: 'all 0.3s ease',
                                                                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            gap: '6px',
                                                                                            fontFamily: "'JetBrains Mono', monospace"
                                                                                        }}
                                                                                        onMouseEnter={(e) => {
                                                                                            e.currentTarget.style.background = 'rgba(255, 42, 95, 0.15)';
                                                                                            e.currentTarget.style.borderColor = 'rgba(255, 42, 95, 0.5)';
                                                                                            e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 42, 95, 0.3)';
                                                                                        }}
                                                                                        onMouseLeave={(e) => {
                                                                                            e.currentTarget.style.background = 'rgba(255, 42, 95, 0.05)';
                                                                                            e.currentTarget.style.borderColor = 'rgba(255, 42, 95, 0.3)';
                                                                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                                                                                        }}
                                                                                    >
                                                                                        <Activity size={12} /> INVESTIGAR EN RED
                                                                                    </button>
                                                                                ) : (
                                                                                    <div style={{ 
                                                                                        border: '1px dashed rgba(255,255,255,0.1)', 
                                                                                        borderRadius: '8px', 
                                                                                        padding: '8px 12px', 
                                                                                        textAlign: 'center',
                                                                                        fontSize: '10px',
                                                                                        color: 'rgba(255,255,255,0.4)',
                                                                                        fontFamily: "'JetBrains Mono', monospace",
                                                                                        letterSpacing: '0.8px',
                                                                                        textTransform: 'uppercase'
                                                                                    }}>
                                                                                        SUJETO CENTRAL FOCALIZADO EN SISTEMA
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontStyle: 'italic', textAlign: 'center' }}>
                                                                            Seleccione un residente del radar para cargar su expediente.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        }                                        return (
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
