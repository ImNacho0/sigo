import React, { useState, useRef, useEffect } from 'react';
import { X, Printer, RotateCcw } from 'lucide-react';
import {
    pick, genNIF, genTelMovil, genTelFijo, genFecha, genIdentidad, genEmail, genDireccion,
    TIPOS_VIA, MUNICIPIOS,
} from '../data/randomData';

/* ════════════════════════════════════════════════════════════════
   MODELO 030 — Declaración censal de alta / cambio de domicilio
   Calco del modelo oficial de la Agencia Tributaria
   ════════════════════════════════════════════════════════════════ */

interface M030 {
    nif: string; apellidos: string; nombre: string;
    causas: Record<string, boolean>;
    // 2. interesado
    i_residente: '' | '201' | '202';
    i_nifOtros: string; i_pasaporte: string; i_nacionalidad: string; i_sexo: string;
    i_nif: string; i_ap1: string; i_ap2: string; i_nombre: string;
    i_nacD: string; i_nacM: string; i_nacA: string; i_nacMun: string; i_nacProv: string; i_nacPais: string;
    // 3. cónyuge
    c_residente: '' | '301' | '302';
    c_nifOtros: string; c_pasaporte: string; c_nacionalidad: string; c_sexo: string;
    c_nif: string; c_ap1: string; c_ap2: string; c_nombre: string;
    c_nacD: string; c_nacM: string; c_nacA: string; c_nacMun: string; c_nacProv: string; c_nacPais: string;
    // 4. contacto
    telFijoNac: string; telMovilNac: string; telFijoExt: string; telMovilExt: string; email: string;
    // 5. domicilio fiscal España
    df_tipoVia: string; df_nombreVia: string; df_tipoNum: string; df_numCasa: string; df_calif: string;
    df_bloque: string; df_portal: string; df_escal: string; df_planta: string; df_puerta: string;
    df_complemento: string; df_localidad: string; df_cp: string; df_municipio: string; df_provincia: string; df_refCatastral: string;
    // 6. extranjero
    ex_domFiscal: boolean; ex_otros: boolean; ex_domicilio: string; ex_complemento: string;
    ex_poblacion: string; ex_cp: string; ex_provincia: string; ex_pais: string; ex_codPais: string;
    // 7. notificaciones
    n_baja: boolean;
    n_tipoVia: string; n_nombreVia: string; n_tipoNum: string; n_numCasa: string; n_calif: string;
    n_bloque: string; n_portal: string; n_escal: string; n_planta: string; n_puerta: string;
    n_complemento: string; n_localidad: string; n_cp: string; n_municipio: string; n_provincia: string;
    n_destinatario: string; n_calidad: string;
    ap_correos: string; ap_poblacion: string; ap_cp: string; ap_provincia: string; ap_destinatario: string; ap_calidad: string;
    // 8. representante
    r_nif: string; r_nombre: string; r_residente: '' | 'SI' | 'NO';
    r_legal: boolean; r_claveLegal: string; r_voluntaria: boolean; r_tipoClave: string; r_tituloClave: string;
    // 9. estado civil
    ec: '' | '801' | '802' | '803' | '804'; ec_fecha: string;
    // 10. firma
    f_en: string; f_dia: string; f_mes: string; f_ano: string;
}

const EMPTY: M030 = {
    nif: '', apellidos: '', nombre: '',
    causas: {},
    i_residente: '', i_nifOtros: '', i_pasaporte: '', i_nacionalidad: '', i_sexo: '',
    i_nif: '', i_ap1: '', i_ap2: '', i_nombre: '', i_nacD: '', i_nacM: '', i_nacA: '', i_nacMun: '', i_nacProv: '', i_nacPais: '',
    c_residente: '', c_nifOtros: '', c_pasaporte: '', c_nacionalidad: '', c_sexo: '',
    c_nif: '', c_ap1: '', c_ap2: '', c_nombre: '', c_nacD: '', c_nacM: '', c_nacA: '', c_nacMun: '', c_nacProv: '', c_nacPais: '',
    telFijoNac: '', telMovilNac: '', telFijoExt: '', telMovilExt: '', email: '',
    df_tipoVia: '', df_nombreVia: '', df_tipoNum: '', df_numCasa: '', df_calif: '', df_bloque: '', df_portal: '', df_escal: '', df_planta: '', df_puerta: '',
    df_complemento: '', df_localidad: '', df_cp: '', df_municipio: '', df_provincia: '', df_refCatastral: '',
    ex_domFiscal: false, ex_otros: false, ex_domicilio: '', ex_complemento: '', ex_poblacion: '', ex_cp: '', ex_provincia: '', ex_pais: '', ex_codPais: '',
    n_baja: false,
    n_tipoVia: '', n_nombreVia: '', n_tipoNum: '', n_numCasa: '', n_calif: '', n_bloque: '', n_portal: '', n_escal: '', n_planta: '', n_puerta: '',
    n_complemento: '', n_localidad: '', n_cp: '', n_municipio: '', n_provincia: '', n_destinatario: '', n_calidad: '',
    ap_correos: '', ap_poblacion: '', ap_cp: '', ap_provincia: '', ap_destinatario: '', ap_calidad: '',
    r_nif: '', r_nombre: '', r_residente: '', r_legal: false, r_claveLegal: '', r_voluntaria: false, r_tipoClave: '', r_tituloClave: '',
    ec: '', ec_fecha: '',
    f_en: '', f_dia: '', f_mes: '', f_ano: '',
};

const MESES_NUM = ['', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

const genAll030 = (): M030 => {
    const sexo = Math.random() > 0.5 ? 'H' : 'M';
    const id = genIdentidad(sexo);
    const fn = genFecha();
    const dir = genDireccion();
    const casado = Math.random() > 0.5;
    const hoy = new Date();
    const f: M030 = {
        ...EMPTY,
        nif: genNIF(), apellidos: `${id.ap1} ${id.ap2}`, nombre: id.nombre,
        causas: { '101': true },
        i_residente: '201',
        i_nacionalidad: 'ESPAÑOLA', i_sexo: sexo,
        i_nif: '', i_ap1: id.ap1, i_ap2: id.ap2, i_nombre: id.nombre,
        i_nacD: fn.d, i_nacM: fn.m, i_nacA: fn.a, i_nacMun: dir.municipio, i_nacProv: dir.provincia, i_nacPais: 'ESPAÑA',
        telFijoNac: genTelFijo(), telMovilNac: genTelMovil(), email: genEmail(id.nombre, id.ap1),
        df_tipoVia: dir.tipoVia, df_nombreVia: dir.nombreVia, df_numCasa: dir.numero, df_planta: dir.piso, df_puerta: dir.puerta,
        df_cp: dir.cp, df_municipio: dir.municipio, df_provincia: dir.provincia,
        ec: casado ? '802' : '801',
        f_en: dir.municipio, f_dia: String(hoy.getDate()).padStart(2, '0'), f_mes: MESES_NUM[hoy.getMonth() + 1], f_ano: String(hoy.getFullYear()),
    };
    f.nif = genNIF(); f.i_nif = f.nif;
    if (casado) {
        const cs = sexo === 'H' ? 'M' : 'H';
        const cid = genIdentidad(cs);
        const cfn = genFecha();
        f.c_residente = '301'; f.c_nif = genNIF(); f.c_ap1 = cid.ap1; f.c_ap2 = cid.ap2; f.c_nombre = cid.nombre;
        f.c_sexo = cs; f.c_nacionalidad = 'ESPAÑOLA';
        f.c_nacD = cfn.d; f.c_nacM = cfn.m; f.c_nacA = cfn.a; f.c_nacMun = pick(MUNICIPIOS).m; f.c_nacProv = pick(MUNICIPIOS).p; f.c_nacPais = 'ESPAÑA';
        f.causas['102'] = true;
    }
    return f;
};

interface Props { onClose: () => void; }

const Modelo030: React.FC<Props> = ({ onClose }) => {
    const [form, setForm] = useState<M030>(EMPTY);
    const [visible, setVisible] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);
    const set = (k: keyof M030, v: any) => setForm(p => ({ ...p, [k]: v }));

    useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

    const handleClose = () => { setVisible(false); setTimeout(onClose, 220); };

    const handlePrint = () => {
        const content = docRef.current?.innerHTML;
        if (!content) return;
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Modelo 030</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, Helvetica, sans-serif; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
@page { size: A4 portrait; margin: 8mm; }
.m030-page { page-break-after: always; }
.m030-page:last-child { page-break-after: auto; }
</style></head><body>${content}</body></html>`);
        w.document.close();
        setTimeout(() => { w.print(); w.close(); }, 400);
    };

    // ── Editor input styles ──
    const inp: React.CSSProperties = {
        width: '100%', background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff', padding: '5px 7px', borderRadius: '4px', fontSize: '11px', outline: 'none',
    };
    const lbl: React.CSSProperties = {
        fontSize: '8px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.5px', display: 'block', marginBottom: '2px',
    };
    const grp = (t: string, onRand?: () => void) => (
        <div style={{ fontSize: '8px', fontWeight: 700, color: '#00f0ff', letterSpacing: '1.5px',
            textTransform: 'uppercase', borderBottom: '1px solid rgba(0,240,255,0.1)',
            paddingBottom: '3px', marginBottom: '6px', marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {t}
            {onRand && <button onClick={onRand} title="Aleatorizar sección" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', borderRadius: '3px', cursor: 'pointer', padding: '1px 5px', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '3px', letterSpacing: 0 }}>
                <Dice /> rand
            </button>}
        </div>
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '1px' }}>MODELO 030 · AGENCIA TRIBUTARIA</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setForm(genAll030())} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', padding: '4px 10px', borderRadius: '5px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                            <Dice /> Aleatorizar
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
                    {/* ── Panel editor ── */}
                    <div style={{ width: '288px', flexShrink: 0, overflowY: 'auto', padding: '11px 13px',
                        borderRight: '1px solid rgba(255,255,255,0.05)', background: '#080e1b' }}>

                        {grp('Identificación', () => {
                            const sx = Math.random() > 0.5 ? 'H' : 'M'; const id = genIdentidad(sx); const nif = genNIF();
                            setForm(p => ({ ...p, nif, i_nif: nif, apellidos: `${id.ap1} ${id.ap2}`, nombre: id.nombre, i_ap1: id.ap1, i_ap2: id.ap2, i_nombre: id.nombre, i_sexo: sx, i_residente: '201', i_nacionalidad: 'ESPAÑOLA', causas: { ...p.causas, '101': true } }));
                        })}
                        <div style={{ display: 'grid', gap: '5px' }}>
                            <div><label style={lbl}>01 · NIF</label><Row><input style={inp} value={form.nif} onChange={e => { set('nif', e.target.value.toUpperCase()); set('i_nif', e.target.value.toUpperCase()); }} placeholder="12345678Z" /><Dado onClick={() => { const n = genNIF(); set('nif', n); set('i_nif', n); }} /></Row></div>
                            <div><label style={lbl}>208 · Primer Apellido</label><input style={inp} value={form.i_ap1} onChange={e => { set('i_ap1', e.target.value.toUpperCase()); set('apellidos', `${e.target.value.toUpperCase()} ${form.i_ap2}`); }} /></div>
                            <div><label style={lbl}>209 · Segundo Apellido</label><input style={inp} value={form.i_ap2} onChange={e => { set('i_ap2', e.target.value.toUpperCase()); set('apellidos', `${form.i_ap1} ${e.target.value.toUpperCase()}`); }} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px', gap: '5px' }}>
                                <div><label style={lbl}>210 · Nombre</label><input style={inp} value={form.i_nombre} onChange={e => { set('i_nombre', e.target.value.toUpperCase()); set('nombre', e.target.value.toUpperCase()); }} /></div>
                                <div><label style={lbl}>206 · Sexo</label><input style={inp} value={form.i_sexo} onChange={e => set('i_sexo', e.target.value.toUpperCase())} placeholder="H/M" maxLength={1} /></div>
                            </div>
                            <div><label style={lbl}>205 · Nacionalidad</label><input style={inp} value={form.i_nacionalidad} onChange={e => set('i_nacionalidad', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>Residencia fiscal</label>
                                <select style={{ ...inp, cursor: 'pointer' }} value={form.i_residente} onChange={e => set('i_residente', e.target.value)}>
                                    <option value="">—</option>
                                    <option value="201">201 · Residente fiscal en España</option>
                                    <option value="202">202 · NO residente fiscal</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                <div><label style={lbl}>203 · NIF otros países</label><input style={inp} value={form.i_nifOtros} onChange={e => set('i_nifOtros', e.target.value.toUpperCase())} /></div>
                                <div><label style={lbl}>204 · Nº Pasaporte</label><input style={inp} value={form.i_pasaporte} onChange={e => set('i_pasaporte', e.target.value.toUpperCase())} /></div>
                            </div>
                        </div>

                        {grp('Nacimiento', () => {
                            const fn = genFecha(); const loc = pick(MUNICIPIOS);
                            setForm(p => ({ ...p, i_nacD: fn.d, i_nacM: fn.m, i_nacA: fn.a, i_nacMun: loc.m, i_nacProv: loc.p, i_nacPais: 'ESPAÑA' }));
                        })}
                        <div style={{ display: 'grid', gap: '5px' }}>
                            <div>
                                <label style={lbl}>211-213 · Fecha de Nacimiento</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '46px 46px 1fr', gap: '4px' }}>
                                    <input style={inp} value={form.i_nacD} onChange={e => set('i_nacD', e.target.value)} placeholder="Día" maxLength={2} />
                                    <input style={inp} value={form.i_nacM} onChange={e => set('i_nacM', e.target.value)} placeholder="Mes" maxLength={2} />
                                    <input style={inp} value={form.i_nacA} onChange={e => set('i_nacA', e.target.value)} placeholder="Año" maxLength={4} />
                                </div>
                            </div>
                            <div><label style={lbl}>214 · Municipio Nacimiento</label><input style={inp} value={form.i_nacMun} onChange={e => set('i_nacMun', e.target.value.toUpperCase())} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                <div><label style={lbl}>215 · Provincia</label><input style={inp} value={form.i_nacProv} onChange={e => set('i_nacProv', e.target.value.toUpperCase())} /></div>
                                <div><label style={lbl}>216 · País</label><input style={inp} value={form.i_nacPais} onChange={e => set('i_nacPais', e.target.value.toUpperCase())} /></div>
                            </div>
                        </div>

                        {grp('Contacto', () => {
                            setForm(p => ({ ...p, telFijoNac: genTelFijo(), telMovilNac: genTelMovil(), email: genEmail(p.i_nombre || 'usuario', p.i_ap1 || 'es') }));
                        })}
                        <div style={{ display: 'grid', gap: '5px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                <div><label style={lbl}>426 · Tel. Fijo</label><input style={inp} value={form.telFijoNac} onChange={e => set('telFijoNac', e.target.value)} /></div>
                                <div><label style={lbl}>427 · Tel. Móvil</label><input style={inp} value={form.telMovilNac} onChange={e => set('telMovilNac', e.target.value)} /></div>
                            </div>
                            <div><label style={lbl}>405 · Correo Electrónico</label><Row><input style={inp} value={form.email} onChange={e => set('email', e.target.value)} /><Dado onClick={() => set('email', genEmail(form.i_nombre || 'usuario', form.i_ap1 || 'es'))} /></Row></div>
                        </div>

                        {grp('Domicilio fiscal', () => {
                            const d = genDireccion();
                            setForm(p => ({ ...p, df_tipoVia: d.tipoVia, df_nombreVia: d.nombreVia, df_numCasa: d.numero, df_planta: d.piso, df_puerta: d.puerta, df_cp: d.cp, df_municipio: d.municipio, df_provincia: d.provincia }));
                        })}
                        <div style={{ display: 'grid', gap: '5px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '4px' }}>
                                <div><label style={lbl}>411 · Tipo Vía</label>
                                    <select style={{ ...inp, cursor: 'pointer', fontSize: '10px' }} value={form.df_tipoVia} onChange={e => set('df_tipoVia', e.target.value)}>
                                        <option value="">—</option>
                                        {TIPOS_VIA.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div><label style={lbl}>412 · Nombre Vía</label><input style={inp} value={form.df_nombreVia} onChange={e => set('df_nombreVia', e.target.value.toUpperCase())} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '3px' }}>
                                <div><label style={{ ...lbl, fontSize: '7px' }}>413 T.Núm</label><input style={{ ...inp, textAlign: 'center', padding: '5px 2px' }} value={form.df_tipoNum} onChange={e => set('df_tipoNum', e.target.value.toUpperCase())} /></div>
                                <div><label style={{ ...lbl, fontSize: '7px' }}>414 Núm</label><input style={{ ...inp, textAlign: 'center', padding: '5px 2px' }} value={form.df_numCasa} onChange={e => set('df_numCasa', e.target.value)} /></div>
                                <div><label style={{ ...lbl, fontSize: '7px' }}>415 Cal</label><input style={{ ...inp, textAlign: 'center', padding: '5px 2px' }} value={form.df_calif} onChange={e => set('df_calif', e.target.value.toUpperCase())} /></div>
                                <div><label style={{ ...lbl, fontSize: '7px' }}>416 Blq</label><input style={{ ...inp, textAlign: 'center', padding: '5px 2px' }} value={form.df_bloque} onChange={e => set('df_bloque', e.target.value.toUpperCase())} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '3px' }}>
                                <div><label style={{ ...lbl, fontSize: '7px' }}>417 Por</label><input style={{ ...inp, textAlign: 'center', padding: '5px 2px' }} value={form.df_portal} onChange={e => set('df_portal', e.target.value.toUpperCase())} /></div>
                                <div><label style={{ ...lbl, fontSize: '7px' }}>418 Esc</label><input style={{ ...inp, textAlign: 'center', padding: '5px 2px' }} value={form.df_escal} onChange={e => set('df_escal', e.target.value.toUpperCase())} /></div>
                                <div><label style={{ ...lbl, fontSize: '7px' }}>419 Pl.</label><input style={{ ...inp, textAlign: 'center', padding: '5px 2px' }} value={form.df_planta} onChange={e => set('df_planta', e.target.value)} /></div>
                                <div><label style={{ ...lbl, fontSize: '7px' }}>420 Pta</label><input style={{ ...inp, textAlign: 'center', padding: '5px 2px' }} value={form.df_puerta} onChange={e => set('df_puerta', e.target.value.toUpperCase())} /></div>
                            </div>
                            <div><label style={lbl}>421 · Complemento domicilio</label><input style={inp} value={form.df_complemento} onChange={e => set('df_complemento', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>422 · Localidad/Población</label><input style={inp} value={form.df_localidad} onChange={e => set('df_localidad', e.target.value.toUpperCase())} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '58px 1fr', gap: '4px' }}>
                                <div><label style={lbl}>423 · C.P.</label><input style={inp} value={form.df_cp} onChange={e => set('df_cp', e.target.value)} maxLength={5} /></div>
                                <div><label style={lbl}>424 · Municipio</label><input style={inp} value={form.df_municipio} onChange={e => set('df_municipio', e.target.value.toUpperCase())} /></div>
                            </div>
                            <div><label style={lbl}>425 · Provincia</label><input style={inp} value={form.df_provincia} onChange={e => set('df_provincia', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>429 · Referencia catastral</label><input style={inp} value={form.df_refCatastral} onChange={e => set('df_refCatastral', e.target.value.toUpperCase())} /></div>
                        </div>

                        {grp('Domicilio extranjero')}
                        <div style={{ display: 'grid', gap: '5px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: 0 }}><input type="checkbox" checked={form.ex_domFiscal} onChange={e => set('ex_domFiscal', e.target.checked)} /> 501 Dom. fiscal</label>
                                <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: 0 }}><input type="checkbox" checked={form.ex_otros} onChange={e => set('ex_otros', e.target.checked)} /> 502 Otros</label>
                            </div>
                            <div><label style={lbl}>503 · Domicilio (Address)</label><input style={inp} value={form.ex_domicilio} onChange={e => set('ex_domicilio', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>504 · Complemento</label><input style={inp} value={form.ex_complemento} onChange={e => set('ex_complemento', e.target.value.toUpperCase())} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: '4px' }}>
                                <div><label style={lbl}>505 · Población/Ciudad</label><input style={inp} value={form.ex_poblacion} onChange={e => set('ex_poblacion', e.target.value.toUpperCase())} /></div>
                                <div><label style={lbl}>507 · C.P.</label><input style={inp} value={form.ex_cp} onChange={e => set('ex_cp', e.target.value)} /></div>
                            </div>
                            <div><label style={lbl}>508 · Provincia/Región/Estado</label><input style={inp} value={form.ex_provincia} onChange={e => set('ex_provincia', e.target.value.toUpperCase())} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px', gap: '4px' }}>
                                <div><label style={lbl}>509 · País</label><input style={inp} value={form.ex_pais} onChange={e => set('ex_pais', e.target.value.toUpperCase())} /></div>
                                <div><label style={lbl}>510 · Cód</label><input style={inp} value={form.ex_codPais} onChange={e => set('ex_codPais', e.target.value.toUpperCase())} /></div>
                            </div>
                        </div>

                        {grp('Notificaciones', () => {
                            const d = genDireccion();
                            setForm(p => ({ ...p, n_tipoVia: d.tipoVia, n_nombreVia: d.nombreVia, n_numCasa: d.numero, n_planta: d.piso, n_puerta: d.puerta, n_cp: d.cp, n_municipio: d.municipio, n_provincia: d.provincia }));
                        })}
                        <div style={{ display: 'grid', gap: '5px' }}>
                            <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: 0 }}><input type="checkbox" checked={form.n_baja} onChange={e => set('n_baja', e.target.checked)} /> 600 Baja</label>
                            <div style={{ fontSize: '7px', color: '#475569', fontWeight: 700 }}>1) DOMICILIO</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '4px' }}>
                                <div><label style={lbl}>601 Tipo Vía</label>
                                    <select style={{ ...inp, cursor: 'pointer', fontSize: '10px' }} value={form.n_tipoVia} onChange={e => set('n_tipoVia', e.target.value)}>
                                        <option value="">—</option>
                                        {TIPOS_VIA.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div><label style={lbl}>602 Nombre Vía</label><input style={inp} value={form.n_nombreVia} onChange={e => set('n_nombreVia', e.target.value.toUpperCase())} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '3px' }}>
                                <div><label style={{ ...lbl, fontSize: '7px' }}>604 Núm</label><input style={{ ...inp, textAlign: 'center', padding: '5px 2px' }} value={form.n_numCasa} onChange={e => set('n_numCasa', e.target.value)} /></div>
                                <div><label style={{ ...lbl, fontSize: '7px' }}>606 Blq</label><input style={{ ...inp, textAlign: 'center', padding: '5px 2px' }} value={form.n_bloque} onChange={e => set('n_bloque', e.target.value.toUpperCase())} /></div>
                                <div><label style={{ ...lbl, fontSize: '7px' }}>609 Pl.</label><input style={{ ...inp, textAlign: 'center', padding: '5px 2px' }} value={form.n_planta} onChange={e => set('n_planta', e.target.value)} /></div>
                                <div><label style={{ ...lbl, fontSize: '7px' }}>610 Pta</label><input style={{ ...inp, textAlign: 'center', padding: '5px 2px' }} value={form.n_puerta} onChange={e => set('n_puerta', e.target.value.toUpperCase())} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '58px 1fr', gap: '4px' }}>
                                <div><label style={lbl}>614 · C.P.</label><input style={inp} value={form.n_cp} onChange={e => set('n_cp', e.target.value)} maxLength={5} /></div>
                                <div><label style={lbl}>615 · Municipio</label><input style={inp} value={form.n_municipio} onChange={e => set('n_municipio', e.target.value.toUpperCase())} /></div>
                            </div>
                            <div><label style={lbl}>616 · Provincia</label><input style={inp} value={form.n_provincia} onChange={e => set('n_provincia', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>620 · Destinatario</label><input style={inp} value={form.n_destinatario} onChange={e => set('n_destinatario', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>621 · En calidad de</label><input style={inp} value={form.n_calidad} onChange={e => set('n_calidad', e.target.value.toUpperCase())} /></div>
                            <div style={{ fontSize: '7px', color: '#475569', fontWeight: 700, marginTop: '2px' }}>2) APARTADO DE CORREOS</div>
                            <div><label style={lbl}>622 · Apartado nº</label><input style={inp} value={form.ap_correos} onChange={e => set('ap_correos', e.target.value)} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 58px', gap: '4px' }}>
                                <div><label style={lbl}>623 · Población</label><input style={inp} value={form.ap_poblacion} onChange={e => set('ap_poblacion', e.target.value.toUpperCase())} /></div>
                                <div><label style={lbl}>624 · C.P.</label><input style={inp} value={form.ap_cp} onChange={e => set('ap_cp', e.target.value)} /></div>
                            </div>
                            <div><label style={lbl}>625 · Provincia</label><input style={inp} value={form.ap_provincia} onChange={e => set('ap_provincia', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>629 · Destinatario</label><input style={inp} value={form.ap_destinatario} onChange={e => set('ap_destinatario', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>630 · En calidad de</label><input style={inp} value={form.ap_calidad} onChange={e => set('ap_calidad', e.target.value.toUpperCase())} /></div>
                        </div>

                        {grp('Representante')}
                        <div style={{ display: 'grid', gap: '5px' }}>
                            <div><label style={lbl}>701 · NIF</label><input style={inp} value={form.r_nif} onChange={e => set('r_nif', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>702 · Apellidos y nombre o razón social</label><input style={inp} value={form.r_nombre} onChange={e => set('r_nombre', e.target.value.toUpperCase())} /></div>
                            <div><label style={lbl}>703 · Residente</label>
                                <select style={{ ...inp, cursor: 'pointer' }} value={form.r_residente} onChange={e => set('r_residente', e.target.value)}>
                                    <option value="">—</option><option value="SI">SÍ</option><option value="NO">NO</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: 0 }}><input type="checkbox" checked={form.r_legal} onChange={e => set('r_legal', e.target.checked)} /> 704 Legal</label>
                                <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: 0 }}><input type="checkbox" checked={form.r_voluntaria} onChange={e => set('r_voluntaria', e.target.checked)} /> 706 Voluntaria</label>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                                <div><label style={lbl}>705 Clave</label><input style={inp} value={form.r_claveLegal} onChange={e => set('r_claveLegal', e.target.value.toUpperCase())} /></div>
                                <div><label style={lbl}>707 Tipo</label><input style={inp} value={form.r_tipoClave} onChange={e => set('r_tipoClave', e.target.value.toUpperCase())} /></div>
                                <div><label style={lbl}>708 Título</label><input style={inp} value={form.r_tituloClave} onChange={e => set('r_tituloClave', e.target.value.toUpperCase())} /></div>
                            </div>
                        </div>

                        {grp('Estado civil')}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                            <select style={{ ...inp, cursor: 'pointer' }} value={form.ec} onChange={e => set('ec', e.target.value)}>
                                <option value="">— Estado civil —</option>
                                <option value="801">Soltero/a</option>
                                <option value="802">Casado/a</option>
                                <option value="803">Viudo/a</option>
                                <option value="804">Divorciado/a o separado/a</option>
                            </select>
                            <input style={inp} value={form.ec_fecha} onChange={e => set('ec_fecha', e.target.value)} placeholder="805 Fecha (si cambio)" />
                        </div>

                        {grp('Cónyuge', () => {
                            const cs = form.i_sexo === 'H' ? 'M' : 'H'; const cid = genIdentidad(cs); const cfn = genFecha(); const loc = pick(MUNICIPIOS);
                            setForm(p => ({ ...p, c_residente: '301', c_nif: genNIF(), c_ap1: cid.ap1, c_ap2: cid.ap2, c_nombre: cid.nombre, c_sexo: cs, c_nacionalidad: 'ESPAÑOLA', c_nacD: cfn.d, c_nacM: cfn.m, c_nacA: cfn.a, c_nacMun: loc.m, c_nacProv: loc.p, c_nacPais: 'ESPAÑA', ec: '802', causas: { ...p.causas, '102': true } }));
                        })}
                        <div style={{ display: 'grid', gap: '5px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px', gap: '4px' }}>
                                <div><label style={lbl}>307 · NIF Cónyuge</label><input style={inp} value={form.c_nif} onChange={e => set('c_nif', e.target.value.toUpperCase())} /></div>
                                <div><label style={lbl}>306 · Sexo</label><input style={inp} value={form.c_sexo} onChange={e => set('c_sexo', e.target.value.toUpperCase())} maxLength={1} placeholder="H/M" /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                <div><label style={lbl}>308 · 1º Apellido</label><input style={inp} value={form.c_ap1} onChange={e => set('c_ap1', e.target.value.toUpperCase())} /></div>
                                <div><label style={lbl}>309 · 2º Apellido</label><input style={inp} value={form.c_ap2} onChange={e => set('c_ap2', e.target.value.toUpperCase())} /></div>
                            </div>
                            <div><label style={lbl}>310 · Nombre Cónyuge</label><input style={inp} value={form.c_nombre} onChange={e => set('c_nombre', e.target.value.toUpperCase())} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                <div><label style={lbl}>305 · Nacionalidad</label><input style={inp} value={form.c_nacionalidad} onChange={e => set('c_nacionalidad', e.target.value.toUpperCase())} /></div>
                                <div><label style={lbl}>304 · Pasaporte</label><input style={inp} value={form.c_pasaporte} onChange={e => set('c_pasaporte', e.target.value.toUpperCase())} /></div>
                            </div>
                            <div>
                                <label style={lbl}>311-313 · Fecha Nacimiento</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '46px 46px 1fr', gap: '4px' }}>
                                    <input style={inp} value={form.c_nacD} onChange={e => set('c_nacD', e.target.value)} placeholder="Día" maxLength={2} />
                                    <input style={inp} value={form.c_nacM} onChange={e => set('c_nacM', e.target.value)} placeholder="Mes" maxLength={2} />
                                    <input style={inp} value={form.c_nacA} onChange={e => set('c_nacA', e.target.value)} placeholder="Año" maxLength={4} />
                                </div>
                            </div>
                            <div><label style={lbl}>314 · Municipio Nacimiento</label><input style={inp} value={form.c_nacMun} onChange={e => set('c_nacMun', e.target.value.toUpperCase())} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                <div><label style={lbl}>315 · Provincia</label><input style={inp} value={form.c_nacProv} onChange={e => set('c_nacProv', e.target.value.toUpperCase())} /></div>
                                <div><label style={lbl}>316 · País</label><input style={inp} value={form.c_nacPais} onChange={e => set('c_nacPais', e.target.value.toUpperCase())} /></div>
                            </div>
                            <button onClick={() => setForm(p => ({ ...p, c_residente: '', c_nif: '', c_nifOtros: '', c_pasaporte: '', c_ap1: '', c_ap2: '', c_nombre: '', c_sexo: '', c_nacionalidad: '', c_nacD: '', c_nacM: '', c_nacA: '', c_nacMun: '', c_nacProv: '', c_nacPais: '' }))} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: '#475569', padding: '4px', borderRadius: '4px', fontSize: '9px', cursor: 'pointer' }}>Vaciar cónyuge</button>
                        </div>

                        {grp('Causas de presentación')}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
                            {([
                                ['101', 'Alta censo'], ['102', 'Alta (cónyuge)'],
                                ['103', 'Cambio dom. fiscal'], ['104', 'Cambio dom. (cónyuge)'],
                                ['105', 'Dom. notificaciones'], ['106', 'Dom. notif. (cónyuge)'],
                                ['107', 'Modif. datos identif.'], ['108', 'Modif. datos (cónyuge)'],
                                ['111', 'Cambio estado civil'], ['112', 'Estado civil (cónyuge)'],
                                ['113', 'Petición etiquetas'], ['114', 'Etiquetas (cónyuge)'],
                                ['115', 'Nueva tarjeta NIF'], ['116', 'Tarjeta NIF (cónyuge)'],
                                ['117', 'Datos tel/email'], ['118', 'Tel/email (cónyuge)'],
                            ] as [string, string][]).map(([code, label]) => (
                                <label key={code} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '8px', color: '#94a3b8' }}>
                                    <input type="checkbox" checked={!!form.causas[code]} onChange={e => setForm(p => ({ ...p, causas: { ...p.causas, [code]: e.target.checked } }))} />
                                    <span style={{ fontWeight: 700, color: '#64748b' }}>{code}</span> {label}
                                </label>
                            ))}
                        </div>

                        {grp('Fecha y firma')}
                        <div style={{ display: 'grid', gap: '5px' }}>
                            <div><label style={lbl}>En (lugar)</label><input style={inp} value={form.f_en} onChange={e => set('f_en', e.target.value.toUpperCase())} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '46px 1fr 60px', gap: '4px' }}>
                                <div><label style={lbl}>Día</label><input style={inp} value={form.f_dia} onChange={e => set('f_dia', e.target.value)} maxLength={2} /></div>
                                <div><label style={lbl}>Mes</label><input style={inp} value={form.f_mes} onChange={e => set('f_mes', e.target.value)} /></div>
                                <div><label style={lbl}>Año</label><input style={inp} value={form.f_ano} onChange={e => set('f_ano', e.target.value)} maxLength={4} /></div>
                            </div>
                        </div>

                        <div style={{ height: '20px' }} />
                    </div>

                    {/* ── Preview documento ── */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#0d1520',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <div ref={docRef} style={{ width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <M030Doc form={form} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* Helpers UI editor */
const Dice = () => (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="2" width="20" height="20" rx="3" /><circle cx="8" cy="8" r="1.5" fill="currentColor" /><circle cx="16" cy="8" r="1.5" fill="currentColor" /><circle cx="8" cy="16" r="1.5" fill="currentColor" /><circle cx="16" cy="16" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>
);
const Dado = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} title="Valor aleatorio" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: '3px', cursor: 'pointer', padding: '2px 4px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <Dice />
    </button>
);
const Row = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'flex', gap: '4px' }}>{children}</div>
);

/* ════════════════════════════════════════════════════════════════
   DOCUMENTO — calco del Modelo 030
   ════════════════════════════════════════════════════════════════ */
const BORDER = '#9a9a9a';
const SECBG = '#ededed';
const SECBORDER = '#b8b8b8';

export const EXAMPLE_FULL: M030 = {
    ...EMPTY,
    nif: '12345678Z', apellidos: 'GARCIA MARTINEZ', nombre: 'ANTONIO',
    causas: { '101': true, '103': true, '107': true, '111': true, '117': true, '102': true },
    i_residente: '201', i_nifOtros: '', i_pasaporte: 'AB123456', i_nacionalidad: 'ESPAÑOLA', i_sexo: 'H',
    i_nif: '12345678Z', i_ap1: 'GARCIA', i_ap2: 'MARTINEZ', i_nombre: 'ANTONIO',
    i_nacD: '14', i_nacM: '05', i_nacA: '1985', i_nacMun: 'MADRID', i_nacProv: 'MADRID', i_nacPais: 'ESPAÑA',
    c_residente: '301', c_nifOtros: '', c_pasaporte: '', c_nacionalidad: 'ESPAÑOLA', c_sexo: 'M',
    c_nif: '87654321X', c_ap1: 'LOPEZ', c_ap2: 'SANCHEZ', c_nombre: 'MARIA',
    c_nacD: '22', c_nacM: '11', c_nacA: '1987', c_nacMun: 'SEVILLA', c_nacProv: 'SEVILLA', c_nacPais: 'ESPAÑA',
    telFijoNac: '915551234', telMovilNac: '655443322', telFijoExt: '', telMovilExt: '', email: 'antonio.garcia@gmail.com',
    df_tipoVia: 'CALLE', df_nombreVia: 'GRAN VIA', df_tipoNum: 'N', df_numCasa: '42', df_calif: 'BIS',
    df_bloque: '3', df_portal: '2', df_escal: 'A', df_planta: '5', df_puerta: 'B',
    df_complemento: 'URBANIZACION LOS ROSALES', df_localidad: '', df_cp: '28013', df_municipio: 'MADRID', df_provincia: 'MADRID', df_refCatastral: '9872023VH5797S0001WX',
    ex_domFiscal: false, ex_otros: false, ex_domicilio: '', ex_complemento: '', ex_poblacion: '', ex_cp: '', ex_provincia: '', ex_pais: '', ex_codPais: '',
    n_baja: false,
    n_tipoVia: 'AVENIDA', n_nombreVia: 'DE LA CONSTITUCION', n_tipoNum: 'N', n_numCasa: '10', n_calif: '',
    n_bloque: '', n_portal: '', n_escal: '', n_planta: '2', n_puerta: 'C',
    n_complemento: '', n_localidad: '', n_cp: '28850', n_municipio: 'TORREJON DE ARDOZ', n_provincia: 'MADRID',
    n_destinatario: '', n_calidad: '',
    ap_correos: '', ap_poblacion: '', ap_cp: '', ap_provincia: '', ap_destinatario: '', ap_calidad: '',
    r_nif: '', r_nombre: '', r_residente: '', r_legal: false, r_claveLegal: '', r_voluntaria: false, r_tipoClave: '', r_tituloClave: '',
    ec: '802', ec_fecha: '15062015',
    f_en: 'MADRID', f_dia: '31', f_mes: '05', f_ano: '2026',
};

export const M030Doc: React.FC<{ form: M030 }> = ({ form }) => {
    const f = form;

    /* Campo: etiqueta (código + texto) arriba, caja blanca debajo */
    const F = ({ code, label, value, w, flex: fx, mono }: { code?: string; label: string; value?: string; w?: string; flex?: number; mono?: boolean }) => (
        <div style={{ width: w, flex: fx ?? (w ? '0 0 auto' : 1), padding: '0 2px', boxSizing: 'border-box', minWidth: 0 }}>
            <div style={{ fontSize: '5.6px', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
                {code && <span style={{ fontWeight: 700 }}>{code} </span>}{label}
            </div>
            <div style={{ background: '#fff', border: `0.5px solid ${BORDER}`, height: '14px', display: 'flex', alignItems: 'center', padding: '0 3px', overflow: 'hidden' }}>
                <span style={{ fontSize: '8px', color: '#111', fontFamily: mono ? '"Courier New",monospace' : 'Arial', whiteSpace: 'nowrap', letterSpacing: mono ? '0.3px' : 0 }}>{value || ''}</span>
            </div>
        </div>
    );
    const Rw = ({ children, mb = 3 }: { children: React.ReactNode; mb?: number }) => (
        <div style={{ display: 'flex', marginBottom: `${mb}px`, alignItems: 'flex-end' }}>{children}</div>
    );
    /* Casilla con código + label */
    const Chk = ({ code, label, on, after }: { code: string; label: string; on?: boolean; after?: boolean }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '6.5px', color: '#000' }}>{label}</span>
            <span style={{ fontSize: '6.5px', fontWeight: 700, color: '#000' }}>{code}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '9px', height: '9px', border: `0.5px solid ${BORDER}`, background: '#fff', fontSize: '7px', fontWeight: 900, lineHeight: 1 }}>{on ? '✕' : ''}</span>
            {after && <span style={{ fontSize: '6.5px', color: '#000' }}>{after}</span>}
        </span>
    );
    /* Barra de título de sección */
    const Sec = ({ n, title }: { n: string; title: string }) => (
        <div style={{ display: 'inline-block', border: '1px solid #333', padding: '1.5px 8px', background: '#fff', fontSize: '8.5px', fontWeight: 700, color: '#000', marginBottom: '5px' }}>
            {n}. {title}
        </div>
    );
    const Sub = ({ title }: { title: string }) => (
        <div style={{ display: 'inline-block', border: '0.5px solid #555', padding: '1px 6px', background: '#fff', fontSize: '7.5px', fontWeight: 700, color: '#000', marginBottom: '4px' }}>
            {title}
        </div>
    );
    const secBox: React.CSSProperties = { background: SECBG, border: `1px solid ${SECBORDER}`, padding: '5px 7px 7px' };

    // Página A4 de altura fija: cada sección se ancla a su Y exacta del original
    const PAGE_H = 1018;
    const MX = '15px';
    const Y = (pct: number) => `${Math.round(pct / 100 * PAGE_H)}px`;
    const sAbs = (top: number): React.CSSProperties => ({ position: 'absolute', top: Y(top), left: MX, right: MX });
    const page: React.CSSProperties = { position: 'relative', background: '#fff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111', boxShadow: '0 2px 24px rgba(0,0,0,0.5)', border: '0.5px solid #aaa', width: '100%', height: `${PAGE_H}px`, overflow: 'hidden' };

    /* Domicilio (5 campos por fila tipo via) reutilizable para 5 y 7 */
    const DomicilioRow = (p: { tipoVia: string; nombreVia: string; numCasa: string; bloque: string; planta: string; puerta: string; codes: string[] }) => (
        <Rw>
            <F code={p.codes[0]} label="Tipo de vía" value={p.tipoVia} w="58px" />
            <F code={p.codes[1]} label="Nombre de la vía pública" value={p.nombreVia} flex={1.4} />
            <F code={p.codes[2]} label="Tipo Num." value="" w="42px" />
            <F code={p.codes[3]} label="Núm. casa" value={p.numCasa} w="42px" />
            <F code={p.codes[4]} label="Calif. nº" value="" w="38px" />
            <F code={p.codes[5]} label="Bloque" value={p.bloque} w="34px" />
            <F code={p.codes[6]} label="Portal" value="" w="34px" />
            <F code={p.codes[7]} label="Escal." value="" w="32px" />
            <F code={p.codes[8]} label="Planta" value={p.planta} w="32px" />
            <F code={p.codes[9]} label="Puerta" value={p.puerta} w="34px" />
        </Rw>
    );

    return (
        <>
        {/* ═══════════════ PÁGINA 1 ═══════════════ */}
        <div className="m030-page" style={page}>
            {/* Cabecera */}
            <div style={{ ...sAbs(1.5), display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', border: '1px solid #000' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderRight: '1px solid #000' }}>
                    <img src="/m030_cabecera.png" alt="Agencia Tributaria" style={{ height: '44px', objectFit: 'contain' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '4px 10px', borderRight: '1px solid #000' }}>
                    <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#111', lineHeight: 1.35 }}>
                        Declaración censal de alta en el Censo de obligados tributarios, cambio de domicilio y/o de variación de datos personales.
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3px 8px', minWidth: '54px' }}>
                    <div style={{ fontSize: '8.5px', fontWeight: 700, marginBottom: '2px' }}>Pág. 1</div>
                    <div style={{ fontSize: '7px', fontWeight: 700 }}>Modelo</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, lineHeight: 1 }}>030</div>
                </div>
            </div>

            {/* Datos identificativos */}
            <div style={{ ...secBox, ...sAbs(8) }}>
                <Sub title="Datos identificativos" />
                <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
                    <div style={{ flex: 1.1, border: `0.5px dashed ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', color: '#777', minHeight: '52px', textAlign: 'center' }}>
                        Espacio reservado para la<br />etiqueta identificativa.
                    </div>
                    <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <Rw mb={0}><F code="01" label="NIF" value={f.nif} mono /></Rw>
                        <Rw mb={0}><F code="02" label="Apellidos" value={f.apellidos} flex={1.3} /><F code="03" label="Nombre" value={f.nombre} flex={1} /></Rw>
                    </div>
                    <div style={{ flex: 1, border: `0.5px dashed ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', color: '#777', textAlign: 'center' }}>
                        Espacio reservado para<br />numeración por código de barras
                    </div>
                </div>
            </div>

            {/* 1. Causas */}
            <div style={{ ...secBox, ...sAbs(19.5) }}>
                <Sec n="1" title="Causas de presentación" />
                <span style={{ fontSize: '6px', color: '#333', marginLeft: '6px' }}>(Marque con una "X" la casilla o casillas que correspondan al motivo por el que se presenta esta declaración)</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 18px', marginTop: '5px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <CausaRow label="Alta en el censo de obligados tributarios" ci="101" cc="102" f={f} />
                        <CausaRow label="Modificaciones/cambio de domicilio fiscal" ci="103" cc="104" f={f} />
                        <CausaRow label="Consignación/modificación/baja domicilio notificaciones" ci="105" cc="106" f={f} />
                        <CausaRow label="Modificación de datos identificativos" ci="107" cc="108" f={f} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <CausaRow label="Cambio/modificación de estado civil" ci="111" cc="112" f={f} />
                        <CausaRow label="Petición de etiquetas identificativas" ci="113" cc="114" f={f} />
                        <CausaRow label="Solicitud de nueva tarjeta acreditativa del NIF" ci="115" cc="116" f={f} />
                        <CausaRow label="Consig./modif. datos de teléfonos y direcciones electrónicas" ci="117" cc="118" f={f} />
                    </div>
                </div>
                <div style={{ fontSize: '5.5px', color: '#333', marginTop: '4px', fontStyle: 'italic' }}>
                    Marque la casilla 102 y/o 104 sólo si desea cambiar el domicilio fiscal y el domicilio a efectos de notificaciones, y éste coincide con el declarado por el interesado en el presente modelo.
                </div>
            </div>

            {/* 2. Interesado */}
            <div style={{ ...secBox, ...sAbs(31) }}>
                <Sec n="2" title="Datos identificativos del interesado" />
                <Rw>
                    <Chk code="201" label="Residente fiscal en España" on={f.i_residente === '201'} />
                    <span style={{ width: '10px' }} />
                    <Chk code="202" label="NO residente fiscal" on={f.i_residente === '202'} />
                    <span style={{ flex: 1 }} />
                    <F code="203" label="NIF otros países/CIF" value={f.i_nifOtros} w="90px" mono />
                    <F code="204" label="Nº pasaporte" value={f.i_pasaporte} w="80px" />
                    <F code="205" label="Nacionalidad" value={f.i_nacionalidad} w="80px" />
                    <F code="206" label="Sexo" value={f.i_sexo} w="26px" />
                </Rw>
                <Rw>
                    <F code="207" label="NIF" value={f.i_nif} flex={0.8} mono />
                    <F code="208" label="Primer apellido" value={f.i_ap1} flex={1.2} />
                    <F code="209" label="Segundo apellido" value={f.i_ap2} flex={1.2} />
                    <F code="210" label="Nombre" value={f.i_nombre} flex={1} />
                </Rw>
                <Rw mb={0}>
                    <div style={{ flex: '0 0 auto', padding: '0 2px' }}>
                        <div style={{ fontSize: '5.6px', color: '#000', lineHeight: 1.4 }}>Fecha de nacimiento</div>
                        <div style={{ display: 'flex' }}>
                            <DateCell code="211" label="Día" value={f.i_nacD} />
                            <DateCell code="212" label="Mes" value={f.i_nacM} />
                            <DateCell code="213" label="Año" value={f.i_nacA} w="26px" />
                        </div>
                    </div>
                    <F code="214" label="Municipio de nacimiento" value={f.i_nacMun} flex={1.1} />
                    <F code="215" label="Provincia" value={f.i_nacProv} flex={0.9} />
                    <F code="216" label="País" value={f.i_nacPais} flex={0.9} />
                </Rw>
            </div>

            {/* 3. Cónyuge */}
            <div style={{ ...secBox, ...sAbs(45) }}>
                <Sec n="3" title="Datos identificativos del cónyuge" />
                <Rw>
                    <Chk code="301" label="Residente fiscal en España" on={f.c_residente === '301'} />
                    <span style={{ width: '10px' }} />
                    <Chk code="302" label="NO residente fiscal" on={f.c_residente === '302'} />
                    <span style={{ flex: 1 }} />
                    <F code="303" label="NIF otros países/CIF" value={f.c_nifOtros} w="90px" mono />
                    <F code="304" label="Nº pasaporte" value={f.c_pasaporte} w="80px" />
                    <F code="305" label="Nacionalidad" value={f.c_nacionalidad} w="80px" />
                    <F code="306" label="Sexo" value={f.c_sexo} w="26px" />
                </Rw>
                <Rw>
                    <F code="307" label="NIF" value={f.c_nif} flex={0.8} mono />
                    <F code="308" label="Primer apellido" value={f.c_ap1} flex={1.2} />
                    <F code="309" label="Segundo apellido" value={f.c_ap2} flex={1.2} />
                    <F code="310" label="Nombre" value={f.c_nombre} flex={1} />
                </Rw>
                <Rw mb={0}>
                    <div style={{ flex: '0 0 auto', padding: '0 2px' }}>
                        <div style={{ fontSize: '5.6px', color: '#000', lineHeight: 1.4 }}>Fecha de nacimiento</div>
                        <div style={{ display: 'flex' }}>
                            <DateCell code="311" label="Día" value={f.c_nacD} />
                            <DateCell code="312" label="Mes" value={f.c_nacM} />
                            <DateCell code="313" label="Año" value={f.c_nacA} w="26px" />
                        </div>
                    </div>
                    <F code="314" label="Municipio de nacimiento" value={f.c_nacMun} flex={1.1} />
                    <F code="315" label="Provincia" value={f.c_nacProv} flex={0.9} />
                    <F code="316" label="País" value={f.c_nacPais} flex={0.9} />
                </Rw>
            </div>

            {/* 4. Teléfonos */}
            <div style={{ ...secBox, ...sAbs(57) }}>
                <Sec n="4" title="Datos de teléfonos y direcciones electrónicas" />
                <Rw>
                    <F code="426" label="Tlfo. fijo nacional" value={f.telFijoNac} flex={1} mono />
                    <F code="427" label="Tlfo. móvil nacional" value={f.telMovilNac} flex={1} mono />
                    <F code="511" label="Tlfo. fijo extranjero" value={f.telFijoExt} flex={1} mono />
                    <F code="512" label="Tlfo. móvil extranjero" value={f.telMovilExt} flex={1} mono />
                </Rw>
                <Rw mb={0}><F code="405" label="Correo electrónico" value={f.email} flex={1} /></Rw>
            </div>

            {/* 5. Domicilio fiscal */}
            <div style={{ ...secBox, ...sAbs(65) }}>
                <Sec n="5" title="Consignación de domicilio fiscal" />
                <Sub title="Domicilio fiscal en España" />
                <DomicilioRow tipoVia={f.df_tipoVia} nombreVia={f.df_nombreVia} numCasa={f.df_numCasa} bloque={f.df_bloque} planta={f.df_planta} puerta={f.df_puerta} codes={['411', '412', '413', '414', '415', '416', '417', '418', '419', '420']} />
                <Rw>
                    <F code="421" label="Complemento domicilio (Urbanización, Polígono Ind., C. Comercial...)" value={f.df_complemento} flex={1.6} />
                    <F code="422" label="Localidad/Población (si distinta de Municipio)" value={f.df_localidad} flex={1} />
                </Rw>
                <Rw>
                    <F code="423" label="C. Postal" value={f.df_cp} w="52px" mono />
                    <F code="424" label="Nombre del Municipio" value={f.df_municipio} flex={1.4} />
                    <F code="425" label="Provincia" value={f.df_provincia} flex={1} />
                </Rw>
                <Rw mb={0}><F code="429" label="Referencia catastral" value={f.df_refCatastral} flex={1} mono /></Rw>
            </div>

            {/* 6. Extranjero */}
            <div style={{ ...secBox, ...sAbs(82.5) }}>
                <Sec n="6" title="Consignación de domicilio en el extranjero" />
                <Rw>
                    <Chk code="501" label="Domicilio fiscal" on={f.ex_domFiscal} />
                    <span style={{ width: '14px' }} />
                    <Chk code="502" label="Otros domicilios" on={f.ex_otros} />
                </Rw>
                <Rw><F code="503" label="Domicilio (Address)" value={f.ex_domicilio} flex={1} /></Rw>
                <Rw>
                    <F code="504" label="Complemento domicilio (si fuese necesario)" value={f.ex_complemento} flex={1.4} />
                    <F code="505" label="Población / Ciudad" value={f.ex_poblacion} flex={1} />
                </Rw>
                <Rw mb={0}>
                    <F code="507" label="C. Postal (ZIP)" value={f.ex_cp} w="70px" mono />
                    <F code="508" label="Provincia / Región / Estado" value={f.ex_provincia} flex={1.3} />
                    <F code="509" label="País" value={f.ex_pais} flex={1} />
                    <F code="510" label="Cod. País" value={f.ex_codPais} w="46px" />
                </Rw>
            </div>
        </div>

        {/* ═══════════════ PÁGINA 2 ═══════════════ */}
        <div className="m030-page" style={page}>
            {/* Cabecera reducida */}
            <div style={{ ...sAbs(1.5), display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ border: '1.5px solid #000', padding: '2px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '7px', fontWeight: 700 }}>Modelo</div>
                    <div style={{ fontSize: '17px', fontWeight: 900, lineHeight: 1 }}>030</div>
                </div>
                <div style={{ flex: 1, display: 'flex', gap: '4px', margin: '0 10px', border: '1px solid #000', padding: '3px' }}>
                    <F code="" label="NIF" value={f.nif} flex={0.8} mono />
                    <F code="" label="Apellidos" value={f.apellidos} flex={1.4} />
                    <F code="" label="Nombre" value={f.nombre} flex={1} />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ border: '1.5px solid #000', padding: '2px 8px', fontSize: '10px', fontWeight: 700, marginBottom: '3px' }}>Pág. 2</div>
                    <div style={{ border: `0.5px dashed ${BORDER}`, padding: '4px 6px', fontSize: '5.5px', color: '#777', textAlign: 'center' }}>Espacio reservado<br />para Nº justificante</div>
                </div>
            </div>

            {/* 7. Notificaciones */}
            <div style={{ ...secBox, ...sAbs(7) }}>
                <Sec n="7" title="Consignación del domicilio a efectos de notificaciones" />
                <div style={{ fontSize: '7px', fontWeight: 700, color: '#000', marginBottom: '4px' }}>Domicilio a efectos de notificaciones (si es distinto del fiscal, cumplimente el apartado 1 ó el 2 según estime oportuno)</div>
                <Rw mb={4}><Chk code="600" label="Baja" on={f.n_baja} /></Rw>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '7px', fontWeight: 700, marginRight: '2px', marginBottom: '1px' }}>1)</span>
                    <div style={{ flex: 1 }}>
                        <DomicilioRow tipoVia={f.n_tipoVia} nombreVia={f.n_nombreVia} numCasa={f.n_numCasa} bloque={f.n_bloque} planta={f.n_planta} puerta={f.n_puerta} codes={['601', '602', '603', '604', '605', '606', '607', '608', '609', '610']} />
                    </div>
                </div>
                <Rw>
                    <F code="611" label="Complemento domicilio (Urbanización, Polígono Ind., C. Comercial...)" value={f.n_complemento} flex={1.6} />
                    <F code="612" label="Localidad/Población (si distinta de Municipio)" value={f.n_localidad} flex={1} />
                </Rw>
                <Rw>
                    <F code="614" label="C. Postal" value={f.n_cp} w="52px" mono />
                    <F code="615" label="Nombre del Municipio" value={f.n_municipio} flex={1.2} />
                    <F code="616" label="Provincia" value={f.n_provincia} flex={1} />
                </Rw>
                <Rw>
                    <F code="620" label="Destinatario (si distinto del declarante)" value={f.n_destinatario} flex={1.3} />
                    <F code="621" label="En calidad de: (representante, apoderado, familiar, etc...)" value={f.n_calidad} flex={1.3} />
                </Rw>
                <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '2px' }}>
                    <span style={{ fontSize: '7px', fontWeight: 700, marginRight: '2px', marginBottom: '1px' }}>2)</span>
                    <div style={{ flex: 1 }}>
                        <Rw>
                            <F code="622" label="APARTADO DE CORREOS NÚMERO:" value={f.ap_correos} flex={1.4} />
                            <F code="623" label="Población / Ciudad" value={f.ap_poblacion} flex={1.2} />
                        </Rw>
                    </div>
                </div>
                <Rw mb={0}>
                    <F code="624" label="C. Postal" value={f.ap_cp} w="52px" mono />
                    <F code="625" label="Provincia" value={f.ap_provincia} flex={1} />
                    <F code="629" label="Destinatario (si distinto del declarante)" value={f.ap_destinatario} flex={1.3} />
                    <F code="630" label="En calidad de: (representante, apoderado...)" value={f.ap_calidad} flex={1.3} />
                </Rw>
            </div>

            {/* 8. Representante */}
            <div style={{ ...secBox, ...sAbs(36) }}>
                <Sec n="8" title="Representante" />
                <Sub title="Identificación del representante" />
                <Rw>
                    <F code="701" label="NIF" value={f.r_nif} flex={0.8} mono />
                    <F code="702" label="Apellidos y nombre o razón social" value={f.r_nombre} flex={2.4} />
                </Rw>
                <Rw mb={5}>
                    <span style={{ fontSize: '7px', color: '#000', marginRight: '4px' }}>703 Residente</span>
                    <Chk code="" label="SÍ" on={f.r_residente === 'SI'} />
                    <span style={{ width: '8px' }} />
                    <Chk code="" label="NO" on={f.r_residente === 'NO'} />
                </Rw>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                        <Sub title="Causa de la representación" />
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end' }}>
                            <Chk code="704" label="Legal" on={f.r_legal} />
                            <F code="705" label="Clave" value={f.r_claveLegal} w="64px" />
                        </div>
                        <div style={{ marginTop: '3px' }}><Chk code="706" label="Voluntaria" on={f.r_voluntaria} /></div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '5px' }}>
                    <div style={{ flex: 1 }}>
                        <Sub title="Tipo de representación" />
                        <F code="707" label="Clave" value={f.r_tipoClave} w="64px" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <Sub title="Título de la representación" />
                        <F code="708" label="Clave" value={f.r_tituloClave} w="64px" />
                    </div>
                </div>
            </div>

            {/* 9. Estado civil */}
            <div style={{ ...secBox, ...sAbs(57) }}>
                <Sec n="9" title="Estado civil" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '7px', color: '#000' }}>Estado civil actual:</span>
                    <Chk code="801" label="Soltero/a" on={f.ec === '801'} />
                    <Chk code="802" label="Casado/a" on={f.ec === '802'} />
                    <Chk code="803" label="Viudo/a" on={f.ec === '803'} />
                    <Chk code="804" label="Divorciado/a o separado/a legalmente" on={f.ec === '804'} />
                    <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '3px' }}>
                        <span style={{ fontSize: '6.5px', color: '#000', lineHeight: 1.2 }}>Fecha de adquisición<br />del estado civil actual:</span>
                        <F code="805" label="" value={f.ec_fecha} w="64px" />
                    </span>
                </div>
            </div>

            {/* 10. Firma */}
            <div style={{ ...secBox, ...sAbs(63) }}>
                <Sec n="10" title="Fecha y firma de la declaración" />
                <div style={{ fontSize: '7px', color: '#000', marginBottom: '6px' }}>Manifiesto/manifestamos que son ciertos los datos consignados en la presente declaración.</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '7px' }}>En</span>
                    <F code="" label="" value={f.f_en} w="150px" />
                    <span style={{ fontSize: '7px' }}>a</span>
                    <F code="" label="" value={f.f_dia} w="34px" />
                    <span style={{ fontSize: '7px' }}>de</span>
                    <F code="" label="" value={f.f_mes} w="80px" />
                    <span style={{ fontSize: '7px' }}>de</span>
                    <F code="" label="" value={f.f_ano} w="44px" />
                </div>
                <div style={{ display: 'flex', border: `0.5px solid ${BORDER}`, minHeight: '54px', background: '#fff' }}>
                    <div style={{ flex: 1, padding: '3px 5px', borderRight: `0.5px solid ${BORDER}`, fontSize: '7px', color: '#000' }}>Firma del interesado</div>
                    <div style={{ flex: 1, padding: '3px 5px', fontSize: '7px', color: '#000' }}>Firma del cónyuge<br /><span style={{ fontSize: '5.5px', color: '#444' }}>(obligatoria si se modifica algún dato común o específico del cónyuge)</span></div>
                </div>
            </div>
        </div>
        </>
    );
};

/* Casilla doble Interesado/Cónyuge para sección 1 */
const CausaRow: React.FC<{ label: string; ci: string; cc: string; f: M030 }> = ({ label, ci, cc, f }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <span style={{ fontSize: '6px', color: '#000', flex: 1, lineHeight: 1.2 }}>{label}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '6px', fontWeight: 700 }}>{ci}</span>
            <span style={{ width: '8px', height: '8px', border: `0.5px solid ${BORDER}`, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', fontWeight: 900 }}>{f.causas[ci] ? '✕' : ''}</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '6px', fontWeight: 700 }}>{cc}</span>
            <span style={{ width: '8px', height: '8px', border: `0.5px solid ${BORDER}`, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', fontWeight: 900 }}>{f.causas[cc] ? '✕' : ''}</span>
        </span>
    </div>
);

/* Celda fecha Día/Mes/Año */
const DateCell: React.FC<{ code: string; label: string; value: string; w?: string }> = ({ code, label, value, w }) => (
    <div style={{ marginRight: '3px' }}>
        <div style={{ fontSize: '5px', color: '#000', whiteSpace: 'nowrap' }}><span style={{ fontWeight: 700 }}>{code}</span> {label}</div>
        <div style={{ width: w || '20px', height: '13px', border: `0.5px solid ${BORDER}`, background: '#fff', fontSize: '8px', textAlign: 'center', lineHeight: '13px' }}>{value}</div>
    </div>
);

export default Modelo030;
