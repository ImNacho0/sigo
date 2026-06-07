import React, { useState, useRef, useEffect } from 'react';
import { X, Printer, RotateCcw } from 'lucide-react';

interface FormData {
    primerApellido: string;
    segundoApellido: string;
    nombre: string;
    sexo: string;
    tipoDoc: 'DNI' | 'TARJETA' | 'PASAPORTE';
    numDoc: string;
    numSegSocial: string;
    diaNac: string;
    mesNac: string;
    anoNac: string;
    nombrePadre: string;
    nombreMadre: string;
    lugarNacimiento: string;
    provinciaNacimiento: string;
    paisNacimiento: string;
    gradoDiscapacidad: string;
    nacionalidad: string;
    apellidoSoltera: string;
    tipoVia: string;
    nombreVia: string;
    bloque: string;
    numero: string;
    bis: string;
    escalera: string;
    piso: string;
    puerta: string;
    codigoPostal: string;
    municipio: string;
    provincia: string;
    telefono: string;
}

const EMPTY: FormData = {
    primerApellido: '', segundoApellido: '', nombre: '', sexo: '',
    tipoDoc: 'DNI', numDoc: '', numSegSocial: '',
    diaNac: '', mesNac: '', anoNac: '',
    nombrePadre: '', nombreMadre: '',
    lugarNacimiento: '', provinciaNacimiento: '', paisNacimiento: '',
    gradoDiscapacidad: '', nacionalidad: '', apellidoSoltera: '',
    tipoVia: '', nombreVia: '', bloque: '', numero: '', bis: '',
    escalera: '', piso: '', puerta: '', codigoPostal: '',
    municipio: '', provincia: '', telefono: '',
};

const TIPOS_VIA = ['', 'CALLE', 'AVENIDA', 'PASEO', 'PLAZA', 'RONDA', 'CAMINO', 'CARRETERA', 'TRAVESÍA', 'CALLEJÓN', 'URBANIZACIÓN'];
const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// ── Datos para generación aleatoria ──────────────────────────────────────────
const R_NOMBRES_H = ['ANTONIO','MANUEL','FRANCISCO','JOSE','DAVID','JUAN','JAVIER','CARLOS','DANIEL','MIGUEL','PEDRO','ALEJANDRO','LUIS','JORGE','SERGIO','PABLO','FERNANDO','ALBERTO','ANGEL','RAFAEL','IVAN','RUBEN','OSCAR','ADRIAN','VICTOR'];
const R_NOMBRES_M = ['MARIA','CARMEN','JOSEFA','ISABEL','ANA','LAURA','CRISTINA','MARTA','DOLORES','PILAR','ROSA','ELENA','PATRICIA','SARA','LUCIA','RAQUEL','SILVIA','BEATRIZ','PAULA','NURIA','SANDRA','MONICA','IRENE','ANDREA','ALBA'];
const R_APELLIDOS = ['GARCIA','MARTINEZ','GONZALEZ','RODRIGUEZ','LOPEZ','HERNANDEZ','SANCHEZ','PEREZ','MARTIN','GOMEZ','RUIZ','DIAZ','JIMENEZ','ALONSO','MORENO','MUNOZ','ALVAREZ','ROMERO','GUTIERREZ','NAVARRO','TORRES','DOMINGUEZ','RAMOS','GIL','MOLINA','SERRANO','BLANCO','MORALES','SUAREZ','ORTEGA','DELGADO','CASTRO','RUBIO','MARIN','SANZ','IGLESIAS','MEDINA','GARRIDO','CASTILLO','VARGAS'];
const R_CALLES = ['ALCALA','GRAN VIA','SERRANO','VELAZQUEZ','GOYA','FUENCARRAL','HORTALEZA','BRAVO MURILLO','ATOCHA','MAYOR','ARENAL','TOLEDO','SIERPES','DIAGONAL','BALMES','COLON','CONSTITUCION','CERVANTES','LEPANTO','LIBERTAD','PAZ','ROSARIO','SAN JOSE','SAN PEDRO','SANTA MARIA','VIRGEN','SAN JUAN','REAL','NUEVA','PRINCIPAL'];
const R_MUNICIPIOS = [
    { m: 'MADRID', p: 'MADRID', cp: '28' }, { m: 'BARCELONA', p: 'BARCELONA', cp: '08' },
    { m: 'VALENCIA', p: 'VALENCIA', cp: '46' }, { m: 'SEVILLA', p: 'SEVILLA', cp: '41' },
    { m: 'ZARAGOZA', p: 'ZARAGOZA', cp: '50' }, { m: 'MALAGA', p: 'MALAGA', cp: '29' },
    { m: 'MURCIA', p: 'MURCIA', cp: '30' }, { m: 'PALMA', p: 'BALEARES', cp: '07' },
    { m: 'BILBAO', p: 'VIZCAYA', cp: '48' }, { m: 'ALICANTE', p: 'ALICANTE', cp: '03' },
    { m: 'CORDOBA', p: 'CORDOBA', cp: '14' }, { m: 'VALLADOLID', p: 'VALLADOLID', cp: '47' },
    { m: 'GRANADA', p: 'GRANADA', cp: '18' }, { m: 'OVIEDO', p: 'ASTURIAS', cp: '33' },
    { m: 'SANTA CRUZ DE TENERIFE', p: 'TENERIFE', cp: '38' }, { m: 'PAMPLONA', p: 'NAVARRA', cp: '31' },
    { m: 'ALMERIA', p: 'ALMERIA', cp: '04' }, { m: 'SAN SEBASTIAN', p: 'GUIPUZCOA', cp: '20' },
    { m: 'BURGOS', p: 'BURGOS', cp: '09' }, { m: 'SANTANDER', p: 'CANTABRIA', cp: '39' },
    { m: 'SALAMANCA', p: 'SALAMANCA', cp: '37' }, { m: 'HUELVA', p: 'HUELVA', cp: '21' },
    { m: 'BADAJOZ', p: 'BADAJOZ', cp: '06' }, { m: 'TOLEDO', p: 'TOLEDO', cp: '45' },
    { m: 'LEON', p: 'LEON', cp: '24' }, { m: 'CADIZ', p: 'CADIZ', cp: '11' },
    { m: 'TARRAGONA', p: 'TARRAGONA', cp: '43' }, { m: 'GIJON', p: 'ASTURIAS', cp: '33' },
    { m: 'MOSTOLES', p: 'MADRID', cp: '28' }, { m: 'ALCALA DE HENARES', p: 'MADRID', cp: '28' },
];
const r = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const genNSS = () => {
    const provincias = ['01','02','03','04','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49','50'];
    const pp = r(provincias);
    const n = rnd(1000000, 99999999).toString().padStart(8, '0');
    const ctrl = ((parseInt(pp) * 100000000 + parseInt(n)) % 97).toString().padStart(2, '0');
    return `${pp} ${n} ${ctrl}`;
};
const genDNI = () => {
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const num = rnd(10000000, 89999999);
    return `${num}${letters[num % 23]}`;
};
const genTel = () => `${Math.random() > 0.5 ? '6' : '7'}${rnd(10000000, 99999999)}`;
const genFecha = () => ({ d: rnd(1,28).toString().padStart(2,'0'), m: rnd(1,12).toString().padStart(2,'0'), a: rnd(1950,2000).toString() });
const genIdentidad = (sexo: 'H'|'M') => {
    const nombres = sexo === 'H' ? R_NOMBRES_H : R_NOMBRES_M;
    return { nombre: r(nombres), ap1: r(R_APELLIDOS), ap2: r(R_APELLIDOS) };
};
const genDireccion = () => {
    const loc = r(R_MUNICIPIOS);
    const cp = loc.cp + rnd(0,999).toString().padStart(3,'0');
    return { tipoVia: r(TIPOS_VIA.filter(t => t)), nombreVia: r(R_CALLES), numero: rnd(1,150).toString(), piso: rnd(1,8).toString(), puerta: r(['A','B','C','D','1','2','3']), municipio: loc.m, provincia: loc.p, cp };
};
const genAll = (): FormData => {
    const sexo = Math.random() > 0.5 ? 'H' : 'M';
    const id = genIdentidad(sexo);
    const fn = genFecha();
    const dir = genDireccion();
    const padreId = genIdentidad('H');
    const madreId = genIdentidad('M');
    return {
        primerApellido: id.ap1, segundoApellido: id.ap2, nombre: id.nombre, sexo,
        tipoDoc: 'DNI', numDoc: genDNI(), numSegSocial: genNSS(),
        diaNac: fn.d, mesNac: fn.m, anoNac: fn.a,
        nombrePadre: `${padreId.nombre} ${padreId.ap1}`, nombreMadre: `${madreId.nombre} ${madreId.ap1}`,
        lugarNacimiento: dir.municipio, provinciaNacimiento: dir.provincia, paisNacimiento: 'ESPAÑA',
        gradoDiscapacidad: '', nacionalidad: 'ESPAÑOLA', apellidoSoltera: '',
        tipoVia: dir.tipoVia, nombreVia: dir.nombreVia, bloque: '', numero: dir.numero,
        bis: '', escalera: '', piso: dir.piso, puerta: dir.puerta,
        codigoPostal: dir.cp, municipio: dir.municipio, provincia: dir.provincia,
        telefono: genTel(),
    };
};

interface Props { onClose: () => void; }

const FichaCensado: React.FC<Props> = ({ onClose }) => {
    const [form, setForm] = useState<FormData>(EMPTY);
    const [visible, setVisible] = useState(false);
    const fichaRef = useRef<HTMLDivElement>(null);
    const set = (f: keyof FormData, v: string) => setForm(p => ({ ...p, [f]: v }));

    useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 220);
    };

    const handlePrint = () => {
        const content = fichaRef.current?.innerHTML;
        if (!content) return;
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>TA.1</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, Helvetica, sans-serif; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
@page { size: A4 portrait; margin: 10mm; }
</style></head><body>${content}</body></html>`);
        w.document.close();
        setTimeout(() => { w.print(); w.close(); }, 400);
    };

    const inp: React.CSSProperties = {
        width: '100%', background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff', padding: '7px 9px', borderRadius: '5px', fontSize: '12px', outline: 'none',
        transition: 'border-color 0.15s',
    };
    const lbl: React.CSSProperties = {
        fontSize: '9.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.4px', display: 'block', marginBottom: '4px',
    };
    const grp = (t: string, onRand?: () => void) => (
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#00f0ff', letterSpacing: '1.5px',
            textTransform: 'uppercase', borderBottom: '1px solid rgba(0,240,255,0.12)',
            paddingBottom: '5px', marginBottom: '10px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {t}
            {onRand && <button onClick={onRand} title="Aleatorizar sección" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', borderRadius: '4px', cursor: 'pointer', padding: '2px 7px', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px', letterSpacing: 0 }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
                rand
            </button>}
        </div>
    );
    const Dado = ({ onClick }: { onClick: () => void }) => (
        <button onClick={onClick} title="Valor aleatorio" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: '3px', cursor: 'pointer', padding: '2px 4px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
        </button>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px',
            opacity: visible ? 1 : 0, transition: 'opacity 220ms ease' }}>
            <div style={{ background: '#0b1322', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px', width: '100%', maxWidth: '1240px', height: '93vh',
                display: 'flex', flexDirection: 'column', boxShadow: '0 32px 100px rgba(0,0,0,0.9)', overflow: 'hidden',
                transform: visible ? 'scale(1)' : 'scale(0.97)', transition: 'transform 220ms ease' }}>

                {/* Barra top */}
                <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#07101c' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '1px' }}>FICHA ADMINISTRATIVA</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setForm(genAll())} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', padding: '4px 10px', borderRadius: '5px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
                            Aleatorizar
                        </button>
                        <button onClick={() => setForm(EMPTY)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: '#475569', padding: '4px 10px', borderRadius: '5px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <RotateCcw size={9} /> Limpiar
                        </button>
                        <button onClick={handlePrint} style={{ background: 'rgba(0,240,255,0.07)', border: '1px solid rgba(0,240,255,0.18)', color: '#00f0ff', padding: '4px 12px', borderRadius: '5px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                            <Printer size={9} /> Imprimir
                        </button>
                        <button onClick={handleClose} style={{ background: 'rgba(255,42,95,0.07)', border: '1px solid rgba(255,42,95,0.18)', color: '#ff2a5f', width: '27px', height: '27px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={12} />
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Panel formulario */}
                    <div style={{ width: '320px', flexShrink: 0, overflowY: 'auto', padding: '16px 18px',
                        borderRight: '1px solid rgba(255,255,255,0.05)', background: '#080e1b' }}>

                        {grp('Identificación', () => {
                            const sexo = Math.random() > 0.5 ? 'H' : 'M';
                            const id = genIdentidad(sexo);
                            setForm(p => ({ ...p, nombre: id.nombre, primerApellido: id.ap1, segundoApellido: id.ap2, sexo, numDoc: genDNI(), numSegSocial: genNSS() }));
                        })}
                        <div style={{ display: 'grid', gap: '8px' }}>
                            <div><label style={lbl}>1.1 Primer Apellido</label><input style={inp} value={form.primerApellido} onChange={e => set('primerApellido', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>Segundo Apellido</label><input style={inp} value={form.segundoApellido} onChange={e => set('segundoApellido', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>Nombre</label><input style={inp} value={form.nombre} onChange={e => set('nombre', e.target.value.toUpperCase())} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 55px', gap: '5px' }}>
                                <div>
                                    <label style={lbl}>1.3 Tipo Documento</label>
                                    <select style={{ ...inp, cursor: 'pointer' }} value={form.tipoDoc} onChange={e => set('tipoDoc', e.target.value)}>
                                        <option value="DNI">D.N.I.</option>
                                        <option value="TARJETA">T. Extranjero</option>
                                        <option value="PASAPORTE">Pasaporte</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={lbl}>1.2 Sexo</label>
                                    <input style={inp} value={form.sexo} onChange={e => set('sexo', e.target.value.toUpperCase())} placeholder="H/M" maxLength={1} />
                                </div>
                            </div>
                            <div>
                                <label style={lbl}>1.4 Nº Documento Identificativo</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <input style={{ ...inp, flex: 1 }} value={form.numDoc} onChange={e => set('numDoc', e.target.value.toUpperCase())} placeholder="12345678Z" />
                                    <Dado onClick={() => set('numDoc', genDNI())} />
                                </div>
                            </div>
                            <div>
                                <label style={lbl}>1.5 Número de Seguridad Social</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <input style={{ ...inp, flex: 1 }} value={form.numSegSocial} onChange={e => set('numSegSocial', e.target.value)} placeholder="28 12345678 00" />
                                    <Dado onClick={() => set('numSegSocial', genNSS())} />
                                </div>
                            </div>
                        </div>

                        {grp('Nacimiento', () => {
                            const fn = genFecha();
                            const loc = r(R_MUNICIPIOS);
                            const padreId = genIdentidad('H');
                            const madreId = genIdentidad('M');
                            setForm(p => ({ ...p, diaNac: fn.d, mesNac: fn.m, anoNac: fn.a, nombrePadre: `${padreId.nombre} ${padreId.ap1}`, nombreMadre: `${madreId.nombre} ${madreId.ap1}`, lugarNacimiento: loc.m, provinciaNacimiento: loc.p, paisNacimiento: 'ESPAÑA', nacionalidad: 'ESPAÑOLA' }));
                        })}
                        <div style={{ display: 'grid', gap: '8px' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <label style={{ ...lbl, marginBottom: 0 }}>Fecha de Nacimiento</label>
                                    <Dado onClick={() => { const fn = genFecha(); setForm(p => ({ ...p, diaNac: fn.d, mesNac: fn.m, anoNac: fn.a })); }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 62px', gap: '4px' }}>
                                    <input style={inp} value={form.diaNac} onChange={e => set('diaNac', e.target.value)} placeholder="Día" maxLength={2} />
                                    <select style={{ ...inp, cursor: 'pointer' }} value={form.mesNac} onChange={e => set('mesNac', e.target.value)}>
                                        {MESES.map((m, i) => <option key={i} value={i === 0 ? '' : String(i).padStart(2,'0')}>{m || 'Mes'}</option>)}
                                    </select>
                                    <input style={inp} value={form.anoNac} onChange={e => set('anoNac', e.target.value)} placeholder="Año" maxLength={4} />
                                </div>
                            </div>
                            <div><label style={lbl}>Nombre del Padre</label><input style={inp} value={form.nombrePadre} onChange={e => set('nombrePadre', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>Nombre de la Madre</label><input style={inp} value={form.nombreMadre} onChange={e => set('nombreMadre', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>Lugar o Municipio de Nacimiento</label><input style={inp} value={form.lugarNacimiento} onChange={e => set('lugarNacimiento', e.target.value.toUpperCase())} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                <div><label style={lbl}>Provincia Nac.</label><input style={inp} value={form.provinciaNacimiento} onChange={e => set('provinciaNacimiento', e.target.value.toUpperCase())} /></div>
                                <div><label style={lbl}>País Nac.</label><input style={inp} value={form.paisNacimiento} onChange={e => set('paisNacimiento', e.target.value.toUpperCase())} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '65px 1fr', gap: '4px' }}>
                                <div><label style={lbl}>1.6 Discap. %</label><input style={inp} value={form.gradoDiscapacidad} onChange={e => set('gradoDiscapacidad', e.target.value)} /></div>
                                <div><label style={lbl}>Nacionalidad</label><input style={inp} value={form.nacionalidad} onChange={e => set('nacionalidad', e.target.value.toUpperCase())} /></div>
                            </div>
                            <div><label style={lbl}>1.7 Apellido de Soltera (UE excl. España)</label><input style={inp} value={form.apellidoSoltera} onChange={e => set('apellidoSoltera', e.target.value.toUpperCase())} /></div>
                        </div>

                        {grp('1.8 Domicilio', () => {
                            const dir = genDireccion();
                            setForm(p => ({ ...p, tipoVia: dir.tipoVia, nombreVia: dir.nombreVia, numero: dir.numero, piso: dir.piso, puerta: dir.puerta, codigoPostal: dir.cp, municipio: dir.municipio, provincia: dir.provincia }));
                        })}
                        <div style={{ display: 'grid', gap: '8px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px' }}>
                                <div><label style={lbl}>Tipo Vía</label>
                                    <select style={{ ...inp, cursor: 'pointer', fontSize: '10px' }} value={form.tipoVia} onChange={e => set('tipoVia', e.target.value)}>
                                        {TIPOS_VIA.map(t => <option key={t} value={t}>{t || '—'}</option>)}
                                    </select>
                                </div>
                                <div><label style={lbl}>Nombre de la Vía Pública</label><input style={inp} value={form.nombreVia} onChange={e => set('nombreVia', e.target.value.toUpperCase())} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '3px' }}>
                                {[['Bloque','bloque'],['Núm.','numero'],['Bis','bis'],['Escal.','escalera'],['Piso','piso'],['Puerta','puerta']].map(([l,k]) => (
                                    <div key={k}><label style={{ ...lbl, fontSize: '7px' }}>{l}</label><input style={{ ...inp, textAlign: 'center', padding: '5px 2px' }} value={(form as any)[k]} onChange={e => set(k as keyof FormData, e.target.value.toUpperCase())} /></div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '58px 1fr', gap: '4px' }}>
                                <div><label style={lbl}>C. Postal</label><input style={inp} value={form.codigoPostal} onChange={e => set('codigoPostal', e.target.value)} maxLength={5} /></div>
                                <div><label style={lbl}>Municipio</label><input style={inp} value={form.municipio} onChange={e => set('municipio', e.target.value.toUpperCase())} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                <div><label style={lbl}>Provincia</label><input style={inp} value={form.provincia} onChange={e => set('provincia', e.target.value.toUpperCase())} /></div>
                                <div>
                                    <label style={lbl}>Teléfono</label>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <input style={{ ...inp, flex: 1 }} value={form.telefono} onChange={e => set('telefono', e.target.value)} />
                                        <Dado onClick={() => set('telefono', genTel())} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '28px 24px', background: '#0d1520',
                        display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                        <div ref={fichaRef} style={{ zoom: 1.3, flexShrink: 0 }}>
                            <TA1Doc form={form} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   TA.1 — Calco fiel del modelo oficial de la Seguridad Social
   ═══════════════════════════════════════════════════════════ */
const VIOLET = '#33336e';
const LAVENDER = '#e8e7f1';
const BOX_BORDER = '#9292ac';

const TA1Doc: React.FC<{ form: FormData }> = ({ form }) => {

    const mesDisplay = form.mesNac ? String(parseInt(form.mesNac)).padStart(2, '0') : '';

    /* Campo: etiqueta violeta arriba + caja blanca debajo (sobre lavanda) */
    const F = ({
        label, value, w, flex: flexVal, mono = false, small = false, children,
    }: {
        label: string; value?: string; w?: string; flex?: number; mono?: boolean; small?: boolean; children?: React.ReactNode;
    }) => (
        <div style={{ width: w, flex: flexVal ?? (w ? '0 0 auto' : 1), padding: '0 2px', boxSizing: 'border-box', minWidth: 0 }}>
            <div style={{ fontSize: '5.8px', color: VIOLET, fontWeight: 700, textTransform: 'uppercase',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.5, letterSpacing: '0.05px' }}>
                {label}
            </div>
            <div style={{ background: '#fff', border: `0.5px solid ${BOX_BORDER}`, height: '15px',
                display: 'flex', alignItems: 'center', padding: '0 3px', overflow: 'hidden' }}>
                {children || (
                    <span style={{ fontSize: small ? '7.5px' : (mono ? '9px' : '10px'), color: '#111',
                        fontFamily: mono ? '"Courier New", monospace' : 'Arial, sans-serif', whiteSpace: 'nowrap', letterSpacing: mono ? '0.5px' : 0 }}>
                        {value || ''}
                    </span>
                )}
            </div>
        </div>
    );

    const Row = ({ children }: { children: React.ReactNode }) => (
        <div style={{ display: 'flex', marginBottom: '3px' }}>{children}</div>
    );


    /* Caja Día/Mes/Año con triángulo ► */
    const DateBox = ({ label, value, w }: { label: string; value: string; w: string }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '7px', color: '#333' }}>{label}</span>
            <span style={{ fontSize: '6px', color: '#111', marginRight: '-1px' }}>►</span>
            <span style={{ display: 'inline-block', border: `0.5px solid ${BOX_BORDER}`, width: w, height: '11px',
                fontSize: '9px', textAlign: 'center', lineHeight: '11px', background: '#fff' }}>
                {value}
            </span>
        </span>
    );

    return (
        <div style={{ background: '#fff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111',
            boxShadow: '0 2px 24px rgba(0,0,0,0.5)', border: '0.5px solid #aaa' }}>

            {/* ══════════ CABECERA ══════════ */}
            <div style={{ padding: '12px 16px 8px', position: 'relative' }}>

                {/* Fila A: Ministerio · barra gris + logo SS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <img src="/escudo-espana.png" alt="Escudo" style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
                        <div style={{ fontSize: '9.5px', fontWeight: 700, color: VIOLET, textTransform: 'uppercase', lineHeight: 1.3, letterSpacing: '0.2px' }}>
                            MINISTERIO<br />DE TRABAJO<br />E INMIGRACIÓN
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        {/* Barra gris bicolor */}
                        <div style={{ display: 'flex', width: '210px', height: '7px', marginBottom: '5px' }}>
                            <div style={{ flex: 1, background: '#c9c9c9' }} />
                            <div style={{ flex: 1, background: '#dedede' }} />
                        </div>
                        <img src="/ss.png" alt="Tesorería General de la Seguridad Social"
                            style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
                    </div>
                </div>

                {/* Línea horizontal divisoria */}
                <div style={{ borderTop: '0.5px solid #b8b8b8', margin: '6px 0 0' }} />

            </div>

            {/* ══════════ TÍTULO SOLICITUD ══════════ */}
            <div style={{ padding: '6px 16px 10px', display: 'flex', alignItems: 'stretch', gap: '8px' }}>
                <div style={{ borderLeft: '1px solid #555', borderTop: '1px solid #555', borderBottom: '1px solid #555', width: '7px', flexShrink: 0 }} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#555', fontWeight: 400, whiteSpace: 'nowrap' }}>SOLICITUD DE:</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.1px', lineHeight: 1.35 }}>
                        AFILIACIÓN A LA SEGURIDAD SOCIAL, ASIGNACIÓN DE NÚMERO DE<br />
                        SEGURIDAD SOCIAL Y VARIACIÓN DE DATOS
                    </span>
                </div>
            </div>

            {/* ══════════ SECCIÓN 1 (fondo lavanda) ══════════ */}
            <div style={{ background: LAVENDER, borderLeft: '1px solid #777', margin: '0 16px 14px', padding: '5px 8px 8px' }}>

                <div style={{ fontSize: '8px', fontWeight: 700, color: VIOLET, letterSpacing: '0.2px', marginBottom: '5px' }}>
                    1. DATOS DEL SOLICITANTE
                </div>

                {/* Fila 1 */}
                <Row>
                    <F label="1.1  PRIMER APELLIDO" value={form.primerApellido} flex={1.15} />
                    <F label="SEGUNDO APELLIDO" value={form.segundoApellido} flex={1.15} />
                    <F label="NOMBRE" value={form.nombre} flex={1} />
                    <F label="1.2 SEXO" value={form.sexo} w="34px" />
                </Row>

                {/* Fila 2 */}
                <Row>
                    <F label={'1.3  TIPO DE DOCUMENTO IDENTIFICATIVO (Marque con una «X»)'} flex={1.55}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%' }}>
                            {([['DNI', 'D.N.I.:'], ['TARJETA', 'TARJETA DE EXTRANJERO:'], ['PASAPORTE', 'PASAPORTE:']] as const).map(([v, txt]) => (
                                <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                    <span style={{ fontSize: '7px', color: '#111', whiteSpace: 'nowrap' }}>{txt}</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: '9px', height: '9px', border: `0.5px solid ${BOX_BORDER}`,
                                        fontSize: '7px', fontWeight: 900, color: '#111', background: '#fff', lineHeight: 1 }}>
                                        {form.tipoDoc === v ? '✕' : ''}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </F>
                    <F label="1.4  Nº DE DOCUMENTO IDENTIFICATIVO" value={form.numDoc} flex={1.1} mono />
                    <F label="1.5  NÚMERO DE SEGURIDAD SOCIAL" value={form.numSegSocial} flex={1} mono />
                </Row>

                {/* Fila 3 */}
                <Row>
                    <F label="FECHA DE NACIMIENTO" flex={1.1}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <DateBox label="Día" value={form.diaNac ? form.diaNac.padStart(2, '0') : ''} w="18px" />
                            <DateBox label="Mes" value={mesDisplay} w="18px" />
                            <DateBox label="Año" value={form.anoNac} w="28px" />
                        </div>
                    </F>
                    <F label="NOMBRE DEL PADRE" value={form.nombrePadre} flex={1.2} />
                    <F label="NOMBRE DE LA MADRE" value={form.nombreMadre} flex={1.2} />
                </Row>

                {/* Fila 4 */}
                <Row>
                    <F label="LUGAR O MUNICIPIO DE NACIMIENTO" value={form.lugarNacimiento} />
                    <F label="PROVINCIA DE NACIMIENTO" value={form.provinciaNacimiento} />
                    <F label="PAÍS DE NACIMIENTO" value={form.paisNacimiento} />
                </Row>

                {/* Fila 5 */}
                <Row>
                    <F label="1.6  GRADO DE DISCAPACIDAD" value={form.gradoDiscapacidad} flex={1} />
                    <F label="NACIONALIDAD" value={form.nacionalidad} flex={1} />
                    <F label="1.7  APELLIDO DE SOLTERA (Sólo nacionales Unión Europea excepto España)" value={form.apellidoSoltera} flex={1.5} small />
                </Row>

                {/* ── 1.8 DOMICILIO (etiqueta vertical) ── */}
                <div style={{ display: 'flex', marginTop: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingRight: '3px', marginRight: '2px', borderRight: '0.5px solid #aaa' }}>
                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '6px',
                            color: VIOLET, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                            1.8 DOMICILIO
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <Row>
                            <F label="TIPO DE VÍA" value={form.tipoVia} w="66px" />
                            <F label="NOMBRE DE LA VÍA PÚBLICA" value={form.nombreVia} flex={1} />
                            <F label="BLOQUE" value={form.bloque} w="42px" />
                            <F label="NÚM." value={form.numero} w="36px" />
                            <F label="BIS" value={form.bis} w="28px" />
                            <F label="ESCAL." value={form.escalera} w="38px" />
                            <F label="PISO" value={form.piso} w="32px" />
                            <F label="PUERTA" value={form.puerta} w="40px" />
                            <F label="C.POSTAL" value={form.codigoPostal} w="52px" mono />
                        </Row>
                        <Row>
                            <F label="MUNICIPIO / ENTIDAD DE ÁMBITO TERRITORIAL INFERIOR AL MUNICIPIO" value={form.municipio} flex={1.6} />
                            <F label="PROVINCIA" value={form.provincia} flex={1} />
                            <F label="TELÉFONO" value={form.telefono} w="100px" mono />
                        </Row>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FichaCensado;
