import React from 'react';
import { X, Search, Database, ShieldAlert, MapPin, Users, AlertTriangle, Calendar, Phone, CreditCard, Key, Sparkles, Loader2 } from 'lucide-react';

interface SearchResultsModalProps {
    results: any;
    query: string;
    country: string;
    onClose: () => void;
    isClosing?: boolean;
}

// Función auxiliar para parsear el HTML crudo que devuelve el servidor Python en results.text
const parsePadronHtml = (htmlString: string) => {
    if (!htmlString) return null;

    const direcciones = [];
    // Dividimos por el separador visual que usa el backend
    const bloques = htmlString.split(/<b class="separator">─────<\/b>/i).filter(b => b.trim());

    for (const bloque of bloques) {
        if (!bloque.trim()) continue;

        // Extraer campos principales de la dirección
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

        // Extraer personas dentro de este bloque de dirección
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

const SearchResultsModal: React.FC<SearchResultsModalProps> = ({ results, query, country, onClose, isClosing }) => {
    // Intentamos parsear internamente si el target es la ruta espanola que devuelve HTML crudo en 'text'
    let parsedData = results;
    if (results && typeof results.text === 'string' && results.text.includes('· Dirección:')) {
        const extracted = parsePadronHtml(results.text);
        if (extracted) {
            parsedData = { ...results, ...extracted };
        }
    }

    const [isSimplifying, setIsSimplifying] = React.useState(false);
    const [simplifiedHtml, setSimplifiedHtml] = React.useState<string | null>(null);
    const [simplifyError, setSimplifyError] = React.useState<string | null>(null);

    // Reset simplification state when results change (new search) or country changes
    React.useEffect(() => {
        setSimplifiedHtml(null);
        setSimplifyError(null);
        setIsSimplifying(false);
    }, [results, country]);

    const isArgentina = country === 'Argentina';
    const isEspanaPadron = country === 'España' && parsedData?.direcciones;
    const showSimplifyButton = !isArgentina && !isEspanaPadron;

    const handleSimplify = async () => {
        setIsSimplifying(true);
        setSimplifyError(null);

        try {
            const response = await fetch('/gateway', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target: 'simplify',
                    data: results
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error en la simplificación');

            // El backend devuelve { "text": "...", "success": true }
            setSimplifiedHtml(data.text);
        } catch (error: any) {
            setSimplifyError(error.message);
        } finally {
            setIsSimplifying(false);
        }
    };

    return (
        <div className={isClosing ? 'animate-fade-out' : 'animate-fade-in'} style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(5, 8, 16, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px',
            opacity: 0
        }}>
            <div className={`glass-panel custom-scrollbar ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`} style={{
                width: '100%',
                maxWidth: '900px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(11, 17, 32, 0.98)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6), inset 0 0 20px rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                overflow: 'hidden'
            }}>
                {/* Header Modal */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '28px 40px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            width: '52px',
                            height: '52px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                        }}>
                            <Search size={24} color="var(--accent-cyan)" />
                        </div>
                        <div>
                            <h1 className="mono" style={{
                                fontSize: '18px',
                                fontWeight: 700,
                                margin: '0 0 4px 0',
                                letterSpacing: '2px',
                                textTransform: 'uppercase',
                                color: '#fff'
                            }}>
                                Intel Intelligence Report <span style={{ color: 'var(--text-muted)', fontWeight: 400, opacity: 0.5 }}>// {country}</span>
                            </h1>
                            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
                                <Database size={12} /> QUERY_TARGET: <strong style={{ color: 'var(--accent-cyan)' }}>"{query.toUpperCase()}"</strong>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {showSimplifyButton && (
                            <button
                                onClick={handleSimplify}
                                disabled={isSimplifying || !!simplifiedHtml}
                                className="hover-glow"
                                style={{
                                    background: simplifiedHtml ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    border: simplifiedHtml ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                                    color: simplifiedHtml ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: (isSimplifying || simplifiedHtml) ? 'default' : 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1.5px'
                                }}
                            >
                                {isSimplifying ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {simplifiedHtml ? 'ANALYSIS_COMPLETE' : 'ANALYZE_WITH_AI'}
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="hover-glow"
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '32px', overflow: 'hidden' }}>

                    <div style={{
                        background: 'rgba(255, 200, 0, 0.05)',
                        border: '1px solid rgba(255, 200, 0, 0.2)',
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '24px',
                        display: 'flex',
                        gap: '12px',
                        flexShrink: 0
                    }}>
                        <ShieldAlert size={20} color="#ffc400" style={{ flexShrink: 0 }} />
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            <strong style={{ color: '#fff' }}>Aviso de Confidencialidad:</strong> Los datos mostrados a continuación provienen directamente de extracciones no autorizadas (leaks) indexadas en la red Tor. Esta información es puramente de carácter analítico y de concienciación sobre vulnerabilidades.
                        </div>
                    </div>

                    {/* Resultados Delimitados */}
                    <div style={{
                        flex: 1,
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
                            <div style={{ padding: '24px' }}>
                                {simplifyError && (
                                    <div style={{ padding: '16px', background: 'rgba(255, 42, 95, 0.1)', borderLeft: '3px solid var(--vuln-critical)', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '4px', marginBottom: '20px' }}>
                                        <AlertTriangle size={18} color="var(--vuln-critical)" />
                                        Error de Inteligencia Artificial: {simplifyError}
                                    </div>
                                )}

                                {simplifiedHtml ? (
                                    <>
                                        <style>{`
                                            .ai-simplified-content .ai-person {
                                                background: rgba(255,255,255,0.01);
                                                border: 1px solid rgba(255,255,255,0.04);
                                                border-radius: 12px;
                                                padding: 32px;
                                                margin-bottom: 24px;
                                                white-space: pre-wrap;
                                                line-height: 2;
                                                box-shadow: inset 0 0 40px rgba(0,0,0,0.3);
                                                position: relative;
                                            }
                                            .ai-simplified-content .ai-person::before {
                                                content: '';
                                                position: absolute;
                                                top: 0; left: 0; width: 2px; height: 100%;
                                                background: var(--accent-blue);
                                                opacity: 0.5;
                                            }
                                            .ai-simplified-content .ai-person > b:first-child {
                                                display: block;
                                                font-size: 14px;
                                                font-family: 'JetBrains Mono', monospace;
                                                color: #fff;
                                                margin-bottom: 20px;
                                                letter-spacing: 3px;
                                                text-transform: uppercase;
                                                opacity: 0.8;
                                            }
                                            .ai-simplified-content .ai-person b {
                                                color: var(--text-secondary);
                                                font-weight: 500;
                                            }
                                            .ai-simplified-content .ai-person code {
                                                font-family: 'JetBrains Mono', monospace;
                                                background: rgba(59, 130, 246, 0.1);
                                                padding: 2px 8px;
                                                border-radius: 4px;
                                                font-size: 12px;
                                                color: var(--accent-blue);
                                                border: 1px solid rgba(59, 130, 246, 0.2);
                                            }
                                            .mono {
                                                font-family: 'JetBrains Mono', monospace !important;
                                            }
                                        `}</style>
                                        <div
                                            dangerouslySetInnerHTML={{ __html: simplifiedHtml }}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                color: '#e2e8f0',
                                                lineHeight: '2.4',
                                                fontSize: '13px'
                                            }}
                                            className="ai-simplified-content mono"
                                        />
                                    </>
                                ) : parsedData && parsedData.direcciones ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {parsedData.advertencia && (
                                            <div style={{ background: 'rgba(255, 115, 0, 0.1)', border: '1px solid var(--vuln-high)', padding: '16px', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <AlertTriangle size={20} color="var(--vuln-high)" />
                                                {parsedData.advertencia}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                                            <div>
                                                <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Análisis de Convivencia e Historial Familiar</div>
                                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Múltiples apariciones agrupadas por domicilios electorales compartidos</div>
                                            </div>
                                            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '8px 20px', borderRadius: '30px', color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>
                                                {parsedData.total_personas} Personas Detectadas
                                            </div>
                                        </div>

                                        {parsedData.direcciones.map((dir: any, i: number) => (
                                            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '24px' }}>
                                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                                                            <MapPin size={14} color="var(--text-secondary)" /> C.P. {dir.codigo_postal} - {dir.localizacion}
                                                        </div>
                                                        <div style={{ fontSize: '18px', color: '#fff', fontWeight: 500, letterSpacing: '0.5px' }}>{dir.direccion}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '40%' }}>
                                                        {dir.years && dir.years.map((year: string) => (
                                                            <span key={year} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Censo {year}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div style={{ padding: '24px', background: 'transparent' }}>
                                                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                                                        <Users size={18} /> Convivientes Registrados: <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>{dir.personas_count}</span>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                                                        {dir.personas && dir.personas.map((p: any, j: number) => (
                                                            <div key={j} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                    <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '16px', marginBottom: '14px', letterSpacing: '0.3px' }}>{p.nombre}</div>
                                                                    {p.nuc && <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>NUC:{p.nuc}</div>}
                                                                </div>
                                                                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginBottom: '12px' }}>
                                                                    <span>Nacimiento: <span style={{ color: '#e2e8f0' }}>{p.fecha_nacimiento || 'Desconocida'}</span></span>
                                                                    {p.edad && <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{p.edad} años</span>}
                                                                </div>
                                                                {p.relacion && (
                                                                    <div style={{ fontSize: '13px', color: p.relacion === 'Persona objetivo' ? '#ff2a5f' : '#8b9bb4', background: p.relacion === 'Persona objetivo' ? 'rgba(255,42,95,0.1)' : 'transparent', padding: '6px 12px', borderRadius: '4px', display: 'inline-block', fontWeight: 600, border: p.relacion === 'Persona objetivo' ? '1px solid rgba(255,42,95,0.2)' : '1px solid rgba(139, 155, 180, 0.3)' }}>
                                                                        {p.relacion}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (Array.isArray(results) || (results && results.hits && Array.isArray(results.hits.hits))) ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {(() => {
                                            const items = Array.isArray(results) ? results : results.hits.hits;

                                            // Agrupación por DNI, luego Nombre, luego ID aleatorio si no hay nada
                                            const mapData = new Map<string, any>();

                                            items.forEach((item: any) => {
                                                const source = item._source || item;
                                                const name = source.nombre_completo || source.nombre || source.name;
                                                const dni = source.dni || source.documento || source.nuc;
                                                const id = item._id || item.id || source.id;

                                                const key = dni ? String(dni) : name ? String(name) : id ? String(id) : Math.random().toString();

                                                if (!mapData.has(key)) {
                                                    mapData.set(key, {
                                                        key_id: key,
                                                        name: name,
                                                        dni: dni,
                                                        ids: new Set(id ? [id] : []),
                                                        phones: new Set(source.telefono || source.phone || source.movil ? [source.telefono || source.phone || source.movil] : []),
                                                        addresses: new Set(source.domicilio || source.direccion || source.address || source.location ? [source.domicilio || source.direccion || source.address || source.location] : []),
                                                        ages: new Set(source.edad || source.age ? [source.edad || source.age] : []),
                                                        births: new Set(source.fecha_nacimiento || source.birthdate ? [source.fecha_nacimiento || source.birthdate] : []),
                                                        contents: new Set(source.content ? [source.content] : []),
                                                        others: []
                                                    });
                                                } else {
                                                    const existing = mapData.get(key);
                                                    if (!existing.name && name) existing.name = name;
                                                    if (!existing.dni && dni) existing.dni = dni;
                                                    if (id) existing.ids.add(id);
                                                    if (source.telefono || source.phone || source.movil) existing.phones.add(source.telefono || source.phone || source.movil);
                                                    if (source.domicilio || source.direccion || source.address || source.location) existing.addresses.add(source.domicilio || source.direccion || source.address || source.location);
                                                    if (source.edad || source.age) existing.ages.add(source.edad || source.age);
                                                    if (source.fecha_nacimiento || source.birthdate) existing.births.add(source.fecha_nacimiento || source.birthdate);
                                                    if (source.content) existing.contents.add(source.content);
                                                }

                                                // Collect others
                                                const existing = mapData.get(key);
                                                Object.entries(source).forEach(([k, v]) => {
                                                    const skipKeys = ['nombre_completo', 'nombre', 'name', 'dni', 'nuc', 'documento', 'id', '_id', 'edad', 'age', 'fecha_nacimiento', 'birthdate', 'domicilio', 'direccion', 'address', 'location', 'telefono', 'phone', 'movil', 'content', 'file'];
                                                    if (!skipKeys.includes(k.toLowerCase()) && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
                                                        const exists = existing.others.find((o: any) => o.k === k && String(o.v) === String(v));
                                                        if (!exists) existing.others.push({ k, v });
                                                    }
                                                });
                                            });

                                            return Array.from(mapData.values()).map((data: any, idx: number) => {
                                                const name = data.name;
                                                const dni = data.dni;
                                                const idArray = Array.from(data.ids);
                                                const ageArray = Array.from(data.ages);
                                                const birthArray = Array.from(data.births);
                                                const addressArray = Array.from(data.addresses);
                                                const phoneArray = Array.from(data.phones);
                                                const contentArray = Array.from(data.contents);

                                                return (
                                                    <div key={idx} style={{
                                                        background: 'rgba(255,255,255,0.02)',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                        borderRadius: 'var(--radius-md)',
                                                        overflow: 'hidden',
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    }}>
                                                        {/* Header Section */}
                                                        {name || dni || idArray.length > 0 ? (
                                                            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--vuln-critical)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                                                        {name || 'OBJETIVO DESCONOCIDO'}
                                                                    </div>
                                                                    {dni && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                                            <CreditCard size={14} color="var(--text-muted)" />
                                                                            <span style={{ fontWeight: 600 }}>DNI / UID:</span> {String(dni)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {idArray.length > 0 && Boolean(idArray[0]) && (
                                                                    <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <Key size={12} /> ID: {String(idArray[0])}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : null}

                                                        {/* Details Section */}
                                                        <div style={{ padding: '20px', background: 'transparent', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                                            {(ageArray.length > 0 || birthArray.length > 0) && (
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '16px' }}>
                                                                    <Calendar size={16} color="var(--text-secondary)" />
                                                                    {ageArray.length > 0 ? (
                                                                        ageArray.map((age: any, i) => (
                                                                            <span key={i} style={{ fontWeight: 500 }}>{age} años{i < ageArray.length - 1 ? ',' : ''}</span>
                                                                        ))
                                                                    ) : (
                                                                        <span style={{ fontWeight: 500 }}>Edad no especificada</span>
                                                                    )}
                                                                    {ageArray.length > 0 && birthArray.length > 0 && <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>}
                                                                    {birthArray.map((birth: any, i) => (
                                                                        <span key={i} style={{ color: 'var(--text-muted)' }}>{birth}{i < birthArray.length - 1 ? ',' : ''}</span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {addressArray.length > 0 && (
                                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '16px' }}>
                                                                    <MapPin size={16} color="var(--text-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                        {addressArray.map((address: any, i) => (
                                                                            <span key={i} style={{ lineHeight: '1.5' }}>{address}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {phoneArray.length > 0 && (
                                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '16px' }}>
                                                                    <Phone size={16} color="var(--text-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                                                        {phoneArray.map((phone: any, i) => (
                                                                            <span key={i} style={{ fontWeight: 500, letterSpacing: '0.5px' }}>{phone}{i < phoneArray.length - 1 ? ',' : ''}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Text block for unstructured files (like Spain data) */}
                                                            {contentArray.length > 0 && contentArray.map((content: any, i) => (
                                                                <div key={i} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '6px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                                                    {String(content)}
                                                                </div>
                                                            ))}

                                                            {/* Display all remaining metadata dynamically */}
                                                            {data.others.length > 0 && (
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
                                                                    {data.others.map((o: any, i: number) => (
                                                                        <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>{o.k}</span>
                                                                            <span style={{ fontSize: '13px', color: '#fff' }}>{String(o.v)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                ) : (
                                    <div style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '24px',
                                        position: 'relative',
                                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)'
                                    }}>
                                        <pre className="custom-scrollbar" style={{
                                            margin: 0,
                                            fontSize: '14px',
                                            color: '#e2e8f0',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            fontFamily: "'JetBrains Mono', monospace",
                                            lineHeight: '1.6',
                                            overflowX: 'auto'
                                        }}>
                                            {JSON.stringify(results, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchResultsModal;
