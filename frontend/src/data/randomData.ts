// Generadores de datos españoles realistas — compartidos entre fichas.

export const NOMBRES_H = ['ANTONIO','MANUEL','FRANCISCO','JOSE','DAVID','JUAN','JAVIER','CARLOS','DANIEL','MIGUEL','PEDRO','ALEJANDRO','LUIS','JORGE','SERGIO','PABLO','FERNANDO','ALBERTO','ANGEL','RAFAEL','IVAN','RUBEN','OSCAR','ADRIAN','VICTOR','MARIO','RAUL','ENRIQUE','JESUS','RICARDO'];
export const NOMBRES_M = ['MARIA','CARMEN','JOSEFA','ISABEL','ANA','LAURA','CRISTINA','MARTA','DOLORES','PILAR','ROSA','ELENA','PATRICIA','SARA','LUCIA','RAQUEL','SILVIA','BEATRIZ','PAULA','NURIA','SANDRA','MONICA','IRENE','ANDREA','ALBA','TERESA','ROCIO','NEREA','CLAUDIA','EVA'];
export const APELLIDOS = ['GARCIA','MARTINEZ','GONZALEZ','RODRIGUEZ','LOPEZ','HERNANDEZ','SANCHEZ','PEREZ','MARTIN','GOMEZ','RUIZ','DIAZ','JIMENEZ','ALONSO','MORENO','MUNOZ','ALVAREZ','ROMERO','GUTIERREZ','NAVARRO','TORRES','DOMINGUEZ','RAMOS','GIL','MOLINA','SERRANO','BLANCO','MORALES','SUAREZ','ORTEGA','DELGADO','CASTRO','RUBIO','MARIN','SANZ','IGLESIAS','MEDINA','GARRIDO','CASTILLO','VARGAS'];
export const CALLES = ['ALCALA','GRAN VIA','SERRANO','VELAZQUEZ','GOYA','FUENCARRAL','HORTALEZA','BRAVO MURILLO','ATOCHA','MAYOR','ARENAL','TOLEDO','SIERPES','DIAGONAL','BALMES','COLON','CONSTITUCION','CERVANTES','LEPANTO','LIBERTAD','PAZ','ROSARIO','SAN JOSE','SAN PEDRO','SANTA MARIA','VIRGEN','SAN JUAN','REAL','NUEVA','PRINCIPAL'];
export const TIPOS_VIA = ['CALLE','AVENIDA','PASEO','PLAZA','RONDA','CAMINO','CARRETERA','TRAVESIA','CALLEJON','URBANIZACION'];

export const MUNICIPIOS = [
    { m: 'MADRID', p: 'MADRID', cp: '28' }, { m: 'BARCELONA', p: 'BARCELONA', cp: '08' },
    { m: 'VALENCIA', p: 'VALENCIA', cp: '46' }, { m: 'SEVILLA', p: 'SEVILLA', cp: '41' },
    { m: 'ZARAGOZA', p: 'ZARAGOZA', cp: '50' }, { m: 'MALAGA', p: 'MALAGA', cp: '29' },
    { m: 'MURCIA', p: 'MURCIA', cp: '30' }, { m: 'PALMA', p: 'BALEARES', cp: '07' },
    { m: 'BILBAO', p: 'VIZCAYA', cp: '48' }, { m: 'ALICANTE', p: 'ALICANTE', cp: '03' },
    { m: 'CORDOBA', p: 'CORDOBA', cp: '14' }, { m: 'VALLADOLID', p: 'VALLADOLID', cp: '47' },
    { m: 'GRANADA', p: 'GRANADA', cp: '18' }, { m: 'OVIEDO', p: 'ASTURIAS', cp: '33' },
    { m: 'PAMPLONA', p: 'NAVARRA', cp: '31' }, { m: 'ALMERIA', p: 'ALMERIA', cp: '04' },
    { m: 'SAN SEBASTIAN', p: 'GUIPUZCOA', cp: '20' }, { m: 'BURGOS', p: 'BURGOS', cp: '09' },
    { m: 'SANTANDER', p: 'CANTABRIA', cp: '39' }, { m: 'SALAMANCA', p: 'SALAMANCA', cp: '37' },
    { m: 'HUELVA', p: 'HUELVA', cp: '21' }, { m: 'BADAJOZ', p: 'BADAJOZ', cp: '06' },
    { m: 'TOLEDO', p: 'TOLEDO', cp: '45' }, { m: 'LEON', p: 'LEON', cp: '24' },
    { m: 'CADIZ', p: 'CADIZ', cp: '11' }, { m: 'TARRAGONA', p: 'TARRAGONA', cp: '43' },
];

const DOMINIOS = ['gmail.com', 'hotmail.com', 'outlook.es', 'yahoo.es', 'telefonica.net'];

export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const genNIF = () => {
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const num = rand(10000000, 89999999);
    return `${num}${letters[num % 23]}`;
};

export const genTelMovil = () => `${Math.random() > 0.5 ? '6' : '7'}${rand(10000000, 99999999)}`;
export const genTelFijo = () => `9${rand(10000000, 99999999)}`;

export const genFecha = (minYear = 1955, maxYear = 2003) => ({
    d: String(rand(1, 28)).padStart(2, '0'),
    m: String(rand(1, 12)).padStart(2, '0'),
    a: String(rand(minYear, maxYear)),
});

export const genIdentidad = (sexo: 'H' | 'M') => ({
    nombre: pick(sexo === 'H' ? NOMBRES_H : NOMBRES_M),
    ap1: pick(APELLIDOS),
    ap2: pick(APELLIDOS),
});

export const genEmail = (nombre: string, ap1: string) => {
    const n = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const a = ap1.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const sep = pick(['.', '_', '']);
    const suf = Math.random() > 0.5 ? rand(1, 99) : '';
    return `${n}${sep}${a}${suf}@${pick(DOMINIOS)}`;
};

export const genDireccion = () => {
    const loc = pick(MUNICIPIOS);
    return {
        tipoVia: pick(TIPOS_VIA),
        nombreVia: pick(CALLES),
        numero: String(rand(1, 150)),
        piso: String(rand(1, 8)),
        puerta: pick(['A', 'B', 'C', 'D', '1', '2', '3', 'IZ', 'DR']),
        municipio: loc.m,
        provincia: loc.p,
        cp: loc.cp + String(rand(0, 999)).padStart(3, '0'),
    };
};
