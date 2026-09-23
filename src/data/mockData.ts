import { Atencion, User, AuditLog, DistrictCoverage } from '../types/health';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    username: 'admin',
    nombre_completo: 'Dr. Carlos Mendoza Ramos',
    email: 'admin.salud@minsa.gob.pe',
    rol: 'Administrador',
    estado: 'ACTIVO',
    ultimo_acceso: '2026-09-23 09:30:15',
    punto_asignado: 'SEDE CENTRAL - LIMA',
  },
  {
    id: 'usr-2',
    username: 'digitador',
    nombre_completo: 'Lic. Patricia Vega Salas',
    email: 'pvega.digitacion@minsa.gob.pe',
    rol: 'Digitador',
    estado: 'ACTIVO',
    ultimo_acceso: '2026-09-23 08:15:20',
    punto_asignado: 'C.S. SAN MARTIN DE PORRES',
  },
  {
    id: 'usr-3',
    username: 'consultor',
    nombre_completo: 'Mg. Elena Quispe Flores',
    email: 'equispe.estadistica@minsa.gob.pe',
    rol: 'Consultor',
    estado: 'ACTIVO',
    ultimo_acceso: '2026-09-22 17:40:00',
    punto_asignado: 'DIRESA / GERESA',
  },
];

export const INITIAL_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    fecha: '2026-09-23 09:30:15',
    usuario: 'admin',
    rol: 'Administrador',
    accion: 'LOGIN',
    detalle: 'Inicio de sesión exitoso desde estación IP 192.168.1.45',
  },
  {
    id: 'log-2',
    fecha: '2026-09-23 08:15:20',
    usuario: 'digitador',
    rol: 'Digitador',
    accion: 'CARGA_EXCEL',
    detalle: 'Carga masiva de 145 atenciones período 2026-09 (Archivo: RPT_ATENCIONES_SET2026.xlsx)',
  },
  {
    id: 'log-3',
    fecha: '2026-09-22 16:45:10',
    usuario: 'admin',
    rol: 'Administrador',
    accion: 'ACTUALIZACION',
    detalle: 'Actualización de parámetros de metas para C.S. BELLAVISTA',
  },
];

// Helper to generate seed dataset
const generateMockAtenciones = (): Atencion[] => {
  const eessList = [
    { cod: '00001245', nombre: 'C.S. SAN MARTIN DE PORRES', disa: 'DIRIS LIMA NORTE', pto: 'PTO-DIG-01', ptoNom: 'DIGITACIÓN SAN MARTÍN' },
    { cod: '00003189', nombre: 'C.S. CONDEVILLA', disa: 'DIRIS LIMA NORTE', pto: 'PTO-DIG-01', ptoNom: 'DIGITACIÓN SAN MARTÍN' },
    { cod: '00004512', nombre: 'C.S. JESUS MARIA', disa: 'DIRIS LIMA CENTRO', pto: 'PTO-DIG-02', ptoNom: 'DIGITACIÓN JESÚS MARÍA' },
    { cod: '00002874', nombre: 'C.S. BREÑA', disa: 'DIRIS LIMA CENTRO', pto: 'PTO-DIG-02', ptoNom: 'DIGITACIÓN JESÚS MARÍA' },
    { cod: '00005698', nombre: 'HOSPITAL CAYETANO HEREDIA', disa: 'DIRIS LIMA NORTE', pto: 'PTO-DIG-03', ptoNom: 'DIGITACIÓN HOSP CAYETANO' },
    { cod: '00007812', nombre: 'C.S. BELLAVISTA', disa: 'DIRESA CALLAO', pto: 'PTO-DIG-04', ptoNom: 'DIGITACIÓN CALLAO' },
    { cod: '00006321', nombre: 'C.S. VILLA EL SALVADOR', disa: 'DIRIS LIMA SUR', pto: 'PTO-DIG-05', ptoNom: 'DIGITACIÓN V.E.S.' },
    { cod: '00008945', nombre: 'P.S. LAS LOMAS', disa: 'DIRIS LIMA NORTE', pto: 'PTO-DIG-01', ptoNom: 'DIGITACIÓN SAN MARTÍN' }
  ];

  const servicios = [
    { cod: '001', desc: 'CONSULTA MÉDICA GENERAL', tarifa: 15.00 },
    { cod: '002', desc: 'CONTROL DE CRECIMIENTO Y DESARROLLO (CRED)', tarifa: 12.00 },
    { cod: '003', desc: 'CONTROL PRENATAL INTEGRAL', tarifa: 18.00 },
    { cod: '004', desc: 'ATENCIÓN ODONTOLÓGICA PREVENTIVA', tarifa: 22.00 },
    { cod: '005', desc: 'INMUNIZACIONES (VACUNACIÓN)', tarifa: 10.00 },
    { cod: '006', desc: 'PLANIFICACIÓN FAMILIAR Y CONSEJERÍA', tarifa: 14.00 },
    { cod: '007', desc: 'TAMIZAJE Y PREVENCIÓN DE ANEMIA', tarifa: 16.50 },
    { cod: '008', desc: 'ATENCIÓN INTEGRAL DEL ADULTO MAYOR', tarifa: 20.00 },
    { cod: '009', desc: 'SALUD MENTAL COMUNITARIA', tarifa: 25.00 },
    { cod: '010', desc: 'TRIAJE Y EMERGENCIAS MENORES', tarifa: 12.50 }
  ];

  const profesionales = [
    { dni: '45128963', nombre: 'Mendoza Ramos Carlos Alberto', tipo: 'MEDICO', col: 'CMP 45892', rne: 'RNE 21458' },
    { dni: '10254789', nombre: 'Quispe Flores Elena Beatriz', tipo: 'ENFERMERA(O)', col: 'CEP 32415', rne: '' },
    { dni: '72589634', nombre: 'Paredes Rios Maria Cecilia', tipo: 'OBSTETRA', col: 'COP 18962', rne: '' },
    { dni: '41258963', nombre: 'Castillo Huaman Jorge Luis', tipo: 'ODONTOLOGO', col: 'COP 09841', rne: 'RNE 14256' },
    { dni: '09852147', nombre: 'Vargas Alarcon Sofia Milagros', tipo: 'MEDICO', col: 'CMP 56123', rne: 'RNE 31258' },
    { dni: '44521896', nombre: 'Gomez Chavez Pedro Fernando', tipo: 'ENFERMERA(O)', col: 'CEP 41258', rne: '' },
    { dni: '70258961', nombre: 'Salazar Soto Carmen Rosa', tipo: 'OBSTETRA', col: 'COP 22451', rne: '' },
    { dni: '42589631', nombre: 'Rojas Cabrera Victor Manuel', tipo: 'TECNICO', col: 'CTMP 04512', rne: '' }
  ];

  const nombresPacientes = [
    { nom: 'FLORES HUERTA JUAN CARLOS', sexo: 'MASCULINO' as const, edad: 34, cond: 'NO APLICA' },
    { nom: 'QUISPE APAZA ROSA MARIA', sexo: 'FEMENINO' as const, edad: 27, cond: 'GESTANTE' },
    { nom: 'SANCHEZ LEON THIAGO ANDRE', sexo: 'MASCULINO' as const, edad: 3, cond: 'NO APLICA' },
    { nom: 'MAMANI CALSIN LUZ DELIA', sexo: 'FEMENINO' as const, edad: 31, cond: 'PUERPERA' },
    { nom: 'TORRES VEGA CARLOS MIGUEL', sexo: 'MASCULINO' as const, edad: 68, cond: 'NO APLICA' },
    { nom: 'RODRIGUEZ PAZ ANA LUCIA', sexo: 'FEMENINO' as const, edad: 19, cond: 'NO GESTANTE' },
    { nom: 'FERNANDEZ SOTO DIEGO VALENTIN', sexo: 'MASCULINO' as const, edad: 11, cond: 'NO APLICA' },
    { nom: 'CHAVEZ ALVAREZ VALERIA NICOLE', sexo: 'FEMENINO' as const, edad: 8, cond: 'NO APLICA' },
    { nom: 'LOPEZ GOMEZ DANIEL ENRIQUE', sexo: 'MASCULINO' as const, edad: 45, cond: 'NO APLICA' },
    { nom: 'HERRERA RAMOS MARLENE ESTHER', sexo: 'FEMENINO' as const, edad: 54, cond: 'NO GESTANTE' },
    { nom: 'RAMIREZ SUAREZ LIAM GAEL', sexo: 'MASCULINO' as const, edad: 0, cond: 'NO APLICA' },
    { nom: 'PAREDES CRUZ MIRIAM YSABEL', sexo: 'FEMENINO' as const, edad: 24, cond: 'GESTANTE' },
    { nom: 'AGUILAR BUSTAMANTE CESAR AUGUSTO', sexo: 'MASCULINO' as const, edad: 72, cond: 'NO APLICA' },
    { nom: 'DIAZ MORALES KAREN SILVIA', sexo: 'FEMENINO' as const, edad: 29, cond: 'GESTANTE' },
    { nom: 'CASTRO VILCA LUIS ALBERTO', sexo: 'MASCULINO' as const, edad: 23, cond: 'NO APLICA' },
  ];

  const digitadores = ['Lic. Patricia Vega Salas', 'Tec. Marco Aurelio Soto', 'Bach. Andrea Vivanco'];
  const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  const atenciones: Atencion[] = [];

  let idCounter = 1;

  for (let i = 0; i < 180; i++) {
    const eess = eessList[i % eessList.length];
    const srv = servicios[i % servicios.length];
    const prof = profesionales[i % profesionales.length];
    const pac = nombresPacientes[i % nombresPacientes.length];
    const month = months[i % months.length];
    
    // Day in month between 01 and 28
    const day = String((i % 27) + 1).padStart(2, '0');
    const fechaAtencion = `${month}-${day}`;
    const hora = `${String(8 + (i % 10)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00`;

    // Birth date calculation
    const birthYear = 2026 - pac.edad;
    const fechaNac = `${birthYear}-04-15`;

    const isExtramural = i % 7 === 0;
    const isHospitalizado = (i % 11 === 0 && srv.cod !== '002');

    atenciones.push({
      id: idCounter,
      nro_formato: `F-${month.replace('-', '')}-${String(1000 + idCounter).padStart(5, '0')}`,
      fecha_atencion: fechaAtencion,
      hora_atencion: hora,
      tipo_doc: 'DNI',
      doc_identidad: String(70000000 + (idCounter * 1234) % 9999999),
      contrato: `SIS-${20260000 + idCounter}`,
      beneficiario: pac.nom,
      fecha_nacimiento: fechaNac,
      edad: pac.edad,
      sexo: pac.sexo,
      codigo_eess: eess.cod,
      nombre_eess: eess.nombre,
      cod_servicio: srv.cod,
      descripcion_servicio: srv.desc,
      dni_profesional: prof.dni,
      nombre_profesional: prof.nombre,
      tipo_profesional: prof.tipo,
      colegiatura: prof.col,
      rne: prof.rne,
      tarifa: srv.tarifa,
      historia_clinica: `HC-${10000 + (idCounter % 500)}`,
      componente: i % 10 === 0 ? 'SEMISUBSIDIADO' : 'SUBSIDIADO',
      condicion_materna: pac.sexo === 'FEMENINO' && pac.edad >= 15 && pac.edad <= 49 ? pac.cond : 'NO APLICA',
      tipo_atencion: isHospitalizado ? 'HOSPITALIZADO' : 'AMBULATORIO',
      lugar_atencion: isExtramural ? 'EXTRAMURAL' : 'INTRAMURAL',
      eess_referencia: i % 8 === 0 ? 'HOSPITAL NACIONAL ARZOBISPO LOAYZA' : '',
      fecha_registro: `${fechaAtencion} ${hora}`,
      digitador: digitadores[i % digitadores.length],
      nro_cred: srv.cod === '002' ? `CRED-${100 + idCounter}` : '',
      usuario_actualiza: i % 15 === 0 ? 'admin' : undefined,
      fecha_actualiza: i % 15 === 0 ? '2026-09-22 14:00:00' : undefined,
      periodo_cierre: month,
      disa: eess.disa,
      cod_punto_digitacion: eess.pto,
      punto_digitacion: eess.ptoNom,
    });

    idCounter++;
  }

  return atenciones;
};

export const INITIAL_ATENCIONES: Atencion[] = generateMockAtenciones();

export const INITIAL_DISTRICTS: DistrictCoverage[] = [
  { id: 'DIST-01', nombre: 'San Martín de Porres', disa: 'DIRIS LIMA NORTE', meta: 2200, realizado: 1495, porcentaje: 67.95, categoria: 'REVISA', eessCount: 14, profesionalesCount: 88 },
  { id: 'DIST-02', nombre: 'Los Olivos', disa: 'DIRIS LIMA NORTE', meta: 1800, realizado: 1180, porcentaje: 65.55, categoria: 'BUENO', eessCount: 9, profesionalesCount: 54 },
  { id: 'DIST-03', nombre: 'Jesús María', disa: 'DIRIS LIMA CENTRO', meta: 1400, realizado: 820, porcentaje: 58.57, categoria: 'REGULAR', eessCount: 6, profesionalesCount: 42 },
  { id: 'DIST-04', nombre: 'Breña', disa: 'DIRIS LIMA CENTRO', meta: 1100, realizado: 710, porcentaje: 64.54, categoria: 'BUENO', eessCount: 5, profesionalesCount: 30 },
  { id: 'DIST-05', nombre: 'Callao Cercado', disa: 'DIRESA CALLAO', meta: 2600, realizado: 1740, porcentaje: 66.92, categoria: 'REVISA', eessCount: 16, profesionalesCount: 95 },
  { id: 'DIST-06', nombre: 'Bellavista', disa: 'DIRESA CALLAO', meta: 1500, realizado: 710, porcentaje: 47.33, categoria: 'MALO', eessCount: 7, profesionalesCount: 38 },
  { id: 'DIST-07', nombre: 'Villa El Salvador', disa: 'DIRIS LIMA SUR', meta: 3100, realizado: 1650, porcentaje: 53.22, categoria: 'REGULAR', eessCount: 19, profesionalesCount: 112 },
  { id: 'DIST-08', nombre: 'San Juan de Lurigancho', disa: 'DIRIS LIMA CENTRO', meta: 4200, realizado: 2050, porcentaje: 48.80, categoria: 'MALO', eessCount: 28, profesionalesCount: 160 },
  { id: 'DIST-09', nombre: 'Comas', disa: 'DIRIS LIMA NORTE', meta: 2800, realizado: 1810, porcentaje: 64.64, categoria: 'BUENO', eessCount: 17, profesionalesCount: 104 },
  { id: 'DIST-10', nombre: 'Chorrillos', disa: 'DIRIS LIMA SUR', meta: 1950, realizado: 1320, porcentaje: 67.69, categoria: 'REVISA', eessCount: 11, profesionalesCount: 65 },
];
