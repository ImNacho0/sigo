export interface VulnerabilityData {
    id: string;
    country: string;
    coordinates: [number, number];
    severityScore: number; // 0 to 100

    // New metrics regarding leaks
    totalPopulation: number;
    filteredPopulation: number;
    leakDetails: string; // Brief description
    sensitiveDataHeaders: string[]; // Specific headers like DNI, Nombres
    censusType: string;
    censusPrice: string;
    censusDate: string;
    leakSize: string;
    lastScan: string;

    docs: number;
    status: 'Crítico' | 'Alto' | 'Medio' | 'Bajo' | 'Seguro';

    // Previous intelligence metrics
    president: string;
    presidentPhoto: string;
    king?: string;
    kingPhoto?: string;
    secretService: string;
    filteredDataPercentage: number;
    cybercrimePercentage: string;
    governmentType: string;
    economyStatus: string;
    extraDataValue?: string;
    extraDataDesc?: string;
}

export const mockVulnerabilityData: VulnerabilityData[] = [
    {
        id: 'es',
        country: 'España',
        coordinates: [40.4168, -3.7038],
        severityScore: 87,
        totalPopulation: 48592909, // approximate 2024
        filteredPopulation: 37945702, // Censo 2022
        leakDetails: 'Censos Electorales (2011, 2018, 2022) y bases diversas públicas del INE.',
        sensitiveDataHeaders: ['Nombre', 'Apellidos', 'Direccion', 'Email', 'Telefono', 'DNI', 'Fecha de nacimiento', 'etc...'],
        censusType: 'Electoral',
        censusDate: '2011, 2018 y 2022',
        leakSize: '',
        lastScan: '',
        docs: 0,
        status: 'Alto',
        president: 'Pedro Sánchez',
        presidentPhoto: new URL('../assets/countries/es/president.jpg', import.meta.url).href,
        king: 'Felipe VI',
        kingPhoto: new URL('../assets/countries/es/king.jpg', import.meta.url).href,
        secretService: 'Centro Nacional de Inteligencia (CNI)',
        filteredDataPercentage: 0,
        extraDataDesc: '+300GB',
        extraDataValue: '50.000€',
        censusPrice: '10.000€',
        cybercrimePercentage: '18% - 22%',
        governmentType: 'Monarquía Parlamentaria',
        economyStatus: 'Economía Desarrollada (Alta)'
    },
    {
        id: 'cl',
        country: 'Chile',
        coordinates: [-35.6751, -71.5430],
        severityScore: 80,
        totalPopulation: 19960000,
        filteredPopulation: 13891097, // 2017
        leakDetails: 'Sistema electoral y provincias.',
        sensitiveDataHeaders: ['Nombre', 'Rut', 'DV', 'Circuns', 'Mesa', 'Sexo', 'Dir_Servel', 'Region', 'Provincia', 'Comuna', 'Apellido_P', 'Apellido_M', 'N_Pila'],
        censusType: 'Electoral',
        censusPrice: '50$',
        censusDate: '2018',
        leakSize: '',
        lastScan: '',
        docs: 0,
        status: 'Alto',
        president: 'Gabriel Boric',
        presidentPhoto: new URL('../assets/countries/cl/president.jpg', import.meta.url).href,
        secretService: 'Agencia Nacional de Inteligencia (ANI)',
        filteredDataPercentage: 0,
        cybercrimePercentage: '20% - 25%',
        governmentType: 'República Presidencialista',
        economyStatus: 'Economía Emergente (Alta)'
    },
    {
        id: 'pe',
        country: 'Perú',
        coordinates: [-9.1900, -75.0152],
        severityScore: 95,
        totalPopulation: 34352719,
        filteredPopulation: 31888853, // 2021
        leakDetails: 'Bases de datos provenientes de RENIEC.',
        sensitiveDataHeaders: ['documento', 'paterno', 'materno', 'nombres', 'nacimiento', 'edad', 'ubigeo', 'ubicacion', 'direccion', 'sexo', 'estado', 'sueldo', 'credito', 'madre', 'padre', 'departamento', 'provincia', 'distrito', 'telefono', 'patmatnom', 'caducidad', 'cui', 'emision', 'estatura', 'inscripcion', 'instruccion', 'restriccion'],
        censusType: 'Nacional',
        censusPrice: '100$',
        censusDate: '2021',
        leakSize: '',
        lastScan: '',
        docs: 0,
        status: 'Crítico',
        president: 'José María Balcázar',
        presidentPhoto: new URL('../assets/countries/pe/president.jpg', import.meta.url).href,
        secretService: 'Dirección Nacional de Inteligencia (DINI)',
        filteredDataPercentage: 0,
        cybercrimePercentage: '20% - 28%',
        governmentType: 'República Presidencialista',
        economyStatus: 'Economía en Desarrollo (Media)'
    },
    {
        id: 'ar',
        country: 'Argentina',
        coordinates: [-38.4161, -63.6167],
        severityScore: 99,
        totalPopulation: 46654581,
        filteredPopulation: 273428870, // Number provided by user
        leakDetails: 'Sistema Nacional (Censo nacional 2024)',
        sensitiveDataHeaders: ['ID', 'Nombre', 'Apellidos', 'DNI', 'Fecha de nacimiento', 'Edad', 'Direccion', 'Telefono'],
        censusType: 'Nacional',
        censusPrice: '150$',
        censusDate: '2024',
        leakSize: '',
        lastScan: '',
        docs: 0,
        status: 'Crítico',
        president: 'Javier Milei',
        presidentPhoto: new URL('../assets/countries/ar/president.jpg', import.meta.url).href,
        secretService: 'Secretaría de Inteligencia del Estado (SIDE)',
        filteredDataPercentage: 0,
        cybercrimePercentage: '30% - 40%',
        governmentType: 'República Presidencialista',
        economyStatus: 'Economía en Transición'
    },
    {
        id: 'sv',
        country: 'El Salvador',
        coordinates: [13.7942, -88.8965],
        severityScore: 85,
        totalPopulation: 6364000,
        filteredPopulation: 23420195, // Provided by user
        leakDetails: 'Múltiples bases de datos: Votantes, PNC, Seguro Social, Telecom.',
        sensitiveDataHeaders: ['DUI', 'Nombres', 'Apellidos', 'Departamento', 'Municipio', 'CentroVotacion', 'Avenida', 'Calle', 'ReferenciaZona', 'JuntaReceptoraVotos', 'NumeroMesa'],
        censusType: 'Electoral',
        censusPrice: '35$',
        censusDate: '2024',
        leakSize: '',
        lastScan: '',
        docs: 0,
        status: 'Alto',
        president: 'Nayib Bukele',
        presidentPhoto: new URL('../assets/countries/sv/president.jpg', import.meta.url).href,
        secretService: 'Organismo de Inteligencia del Estado (OIE)',
        filteredDataPercentage: 0,
        cybercrimePercentage: '10% - 15%',
        governmentType: 'República Presidencialista',
        economyStatus: 'Economía Emergente'
    },
    {
        id: 'ni',
        country: 'Nicaragua',
        coordinates: [12.8654, -85.2072],
        severityScore: 85,
        totalPopulation: 7046000,
        filteredPopulation: 4006750, // Provided by user
        leakDetails: 'Sistema electoral (Censo 2020)',
        sensitiveDataHeaders: ['ID', 'TipoDocumento', 'NumeroCedula', 'CodigoElectoral', 'EstadoRegistro', 'CodigoCentroMunicipio', 'PrimerApellido', 'SegundoApellido', 'PrimerNombre', 'SegundoNombre', 'SexoCodigo', 'FechaNacimiento', 'SexoTexto', 'Direccion', 'CodigoTerritorial', 'Zona', 'Municipio', 'Departamento'],
        censusType: 'Electoral',
        censusPrice: '20$',
        censusDate: '2020',
        leakSize: '',
        lastScan: '',
        docs: 0,
        status: 'Alto',
        president: 'Daniel Ortega',
        presidentPhoto: new URL('../assets/countries/ni/president.jpg', import.meta.url).href,
        secretService: 'Dirección de Asuntos de Inteligencia (DAI)',
        filteredDataPercentage: 0,
        cybercrimePercentage: '8% - 12%',
        governmentType: 'República Presidencialista',
        economyStatus: 'Economía en Desarrollo (Baja)'
    },
    {
        id: 'bo',
        country: 'Bolivia',
        coordinates: [-16.2902, -63.5887],
        severityScore: 78,
        totalPopulation: 12388571,
        filteredPopulation: 0,
        leakDetails: 'Padrón biométrico y registros civiles.',
        sensitiveDataHeaders: ['id', 'nombres', 'primerApellido', 'segundoApellido', 'nroDocumento', 'complemento', 'fechaNacimiento', 'sexo', 'estadoCivil', 'nacionalidad', 'direccion', 'telefono', 'correo', 'lugarNacimiento', 'departamento', 'municipio'],
        censusType: 'Electoral/Civil',
        censusPrice: '40$',
        censusDate: '2022',
        leakSize: '',
        lastScan: '',
        docs: 0,
        status: 'Medio',
        president: 'Luis Arce',
        presidentPhoto: new URL('../assets/countries/bo/president.jpg', import.meta.url).href,
        secretService: 'Viceministerio de Defensa Social e Inteligencia',
        filteredDataPercentage: 0,
        cybercrimePercentage: '12% - 18%',
        governmentType: 'República Presidencialista',
        economyStatus: 'Economía en Desarrollo'
    },
    {
        id: 'ec',
        country: 'Ecuador',
        coordinates: [-1.8312, -78.1834],
        severityScore: 92,
        totalPopulation: 18190000,
        filteredPopulation: 0,
        leakDetails: 'Filtración masiva de registros gubernamentales y financieros (Novaestrat).',
        sensitiveDataHeaders: ['Id', 'Nombre', 'Identificacion', 'Sexo', 'Estado_civil', 'Nacionalidad', 'Lugar_nacimiento', 'Residencia', 'Direccion', 'Telefono', 'Celular', 'Edad_aproximada', 'Nombre_Contacto', 'Parentezco', 'Telefono_Contacto', 'Numero_Presentante'],
        censusType: 'Nacional/Financiero',
        censusPrice: '300$',
        censusDate: '2023',
        leakSize: '',
        lastScan: '',
        docs: 0,
        status: 'Crítico',
        president: 'Daniel Noboa',
        presidentPhoto: new URL('../assets/countries/ec/president.jpg', import.meta.url).href,
        secretService: 'Centro de Inteligencia Estratégica (CIES)',
        filteredDataPercentage: 0,
        cybercrimePercentage: '25% - 35%',
        governmentType: 'República Presidencialista',
        economyStatus: 'Economía Dolarizada'
    },
    {
        id: 've',
        country: 'Venezuela',
        coordinates: [6.4238, -66.5897],
        severityScore: 90,
        totalPopulation: 28838499,
        filteredPopulation: 0,
        leakDetails: 'Sistema Patria y registros del CNE.',
        sensitiveDataHeaders: ['cedula', 'nacionalidad', 'primer_apellido', 'segundo_apellido', 'primer_nombre', 'segundo_nombre', 'sexo', 'fecha_nacimiento', 'primernombre', 'segundonombre', 'primerapellido', 'segundoapellido', 'fechanacimiento', 'edad', 'estadocivil', 'genero'],
        censusType: 'Electoral',
        censusPrice: '200$',
        censusDate: '2014',
        leakSize: '',
        lastScan: '',
        docs: 0,
        status: 'Crítico',
        president: 'Nicolás Maduro',
        presidentPhoto: new URL('../assets/countries/ve/president.jpg', import.meta.url).href,
        secretService: 'Servicio Bolivariano de Inteligencia Nacional (SEBIN)',
        filteredDataPercentage: 0,
        cybercrimePercentage: '15% - 22%',
        governmentType: 'República Federal Presidencialista',
        economyStatus: 'Economía en Crisis / Hiperinflación'
    },
    {
        id: 'py',
        country: 'Paraguay',
        coordinates: [-25.2867, -57.6470],
        severityScore: 65,
        totalPopulation: 7075199,
        filteredPopulation: 2576026,
        leakDetails: 'Filtración masiva de registros gubernamentales y financieros (Novaestrat).',
        sensitiveDataHeaders: ['id', 'fecha', 'cedula', 'nombre', 'edad_actual', 'nomdpto', 'nomdist', 'nombarrio', 'personal_salud', 'celular', 'id_estado', 'estado', 'embarazada', 'nomserv', 'fallecido', 'fecha_nacimiento', 'enfermedad', 'profesion'],
        censusType: 'Registro medico',
        censusPrice: '40$',
        censusDate: '2023',
        leakSize: '',
        lastScan: '',
        docs: 0,
        status: 'Medio',
        president: 'Santiago Peña',
        presidentPhoto: new URL('../assets/countries/ec/president.jpg', import.meta.url).href,
        secretService: 'Centro de Inteligencia Estratégica (CIES)',
        filteredDataPercentage: 0,
        cybercrimePercentage: '5% - 15%',
        governmentType: 'República Presidencialista',
        economyStatus: 'Economía en Desarrollo'
    }
];

mockVulnerabilityData.forEach(region => {
    // Manual overrides
    const manualPercentages: Record<string, number> = {
        'bo': 99,
        'ec': 99,
        've': 82,
        'sv': 90,
        'pe': 98
    };

    if (manualPercentages[region.id] !== undefined) {
        region.filteredDataPercentage = manualPercentages[region.id];
    } else if (region.totalPopulation > 0) {
        region.filteredDataPercentage = Math.min(100, Math.round((region.filteredPopulation / region.totalPopulation) * 100));
    }
});

export const getSeverityColor = (status: string) => {
    switch (status) {
        case 'Crítico': return '#ff2a5f';
        case 'Alto': return '#ff7300';
        case 'Medio': return '#ffc400';
        case 'Bajo': return '#00e676';
        case 'Seguro': return '#3b82f6';
        default: return '#94a3b8';
    }
};
