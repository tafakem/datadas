export type Sexo = 'MASCULINO' | 'FEMENINO';

export interface Atencion {
  id: number;
  nro_formato: string;
  fecha_atencion: string; // YYYY-MM-DD
  hora_atencion: string;  // HH:mm:ss
  tipo_doc: string;       // DNI, CE, PASAPORTE, S/D
  doc_identidad: string;
  contrato: string;
  beneficiario: string;
  fecha_nacimiento: string;
  edad: number;
  sexo: Sexo;
  codigo_eess: string;
  nombre_eess: string;
  cod_servicio: string;
  descripcion_servicio: string;
  dni_profesional: string;
  nombre_profesional: string;
  tipo_profesional: string; // MEDICO, ENFERMERA(O), OBSTETRA, ODONTOLOGO, TECNICO
  colegiatura: string;
  rne: string;
  tarifa: number;
  historia_clinica: string;
  componente: string;       // SUBSIDIADO, SEMISUBSIDIADO, NO SUBSIDIADO
  condicion_materna: string;// GESTANTE, PUERPERA, NO GESTANTE, NO APLICA
  tipo_atencion: string;    // AMBULATORIO, HOSPITALIZADO, EMERGENCIA
  lugar_atencion: string;   // INTRAMURAL, EXTRAMURAL
  eess_referencia: string;
  fecha_registro: string;
  digitador: string;
  nro_cred: string;
  usuario_actualiza?: string;
  fecha_actualiza?: string;
  periodo_cierre: string;   // e.g. 2026-03
  disa: string;             // DISA / DIRESA / GERESA
  cod_punto_digitacion: string;
  punto_digitacion: string;
}

export type UserRole = 'Administrador' | 'Digitador' | 'Consultor';

export interface User {
  id: string;
  username: string;
  nombre_completo: string;
  email: string;
  rol: UserRole;
  passwordHash?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  ultimo_acceso?: string;
  punto_asignado?: string;
}

export interface DigitadorRecord {
  id: string;
  usuario: string; // usuario de digitación (login / usuario MINSA)
  dni: string;
  nombre_completo: string;
  cod_punto_digitacion?: string;
  punto_digitacion?: string;
  codigo_eess?: string;
  nombre_eess?: string;
  cargo?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  correo?: string;
  telefono?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface DigitadorEstadisticaMensual {
  mes: string; // YYYY-MM basado en fecha_atencion
  labelMes: string; // ej. "Mayo 2026"
  year: number;
  month: number;
  totalAtenciones: number;
  pacientesUnicos: number;
  diasPromedioOportunidad: number;
  totalTarifa: number;
  eessCount: number;
}

export interface DigitadorEstadisticaCompleta {
  id: string;
  usuario: string;
  dni: string;
  nombre_completo: string;
  cod_punto_digitacion: string;
  punto_digitacion: string;
  codigo_eess?: string;
  nombre_eess?: string;
  cargo?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  correo?: string;
  telefono?: string;
  totalAtenciones: number;
  pacientesUnicos: number;
  diasPromedioOportunidad: number;
  totalTarifa: number;
  eessCount: number;
  serviciosCount: number;
  mensualizado: DigitadorEstadisticaMensual[];
  topEess: { nombre: string; atenciones: number; pacientes: number }[];
  topServicios: { desc: string; atenciones: number }[];
}

export interface AuditLog {
  id: string;
  fecha: string;
  usuario: string;
  rol: UserRole;
  accion: 'LOGIN' | 'CARGA_EXCEL' | 'ACTUALIZACION' | 'ELIMINACION' | 'EXPORTACION' | 'CAMBIO_USUARIO';
  detalle: string;
  ip?: string;
}

export interface FilterState {
  fechaInicio: string;
  fechaFin: string;
  eess: string;
  profesional: string;
  servicio: string;
  tipoProfesional: string;
  puntoDigitacion: string;
  disa: string;
  sexo: string;
  condicionMaterna: string;
  tipoAtencion: string;
}

export interface BackupRecord {
  id: string;
  filename: string;
  size_bytes: number;
  format: 'sqlite' | 'json' | 'sql';
  type: 'MANUAL' | 'AUTOMATICO' | 'RESTAURACION';
  total_records: number;
  created_at: string;
  created_by: string;
  checksum?: string;
  notes?: string;
}

export interface BackupSettings {
  enabled: boolean;
  frequency: 'DIARIO' | 'SEMANAL' | 'MENSUAL';
  scheduled_time: string;
  retention_count: number;
  last_run?: string;
  next_run?: string;
}

export type ActiveModule = 
  | 'dashboard'
  | 'stats-mes-eess'
  | 'stats-punto-dig'
  | 'stats-digitadores'
  | 'stats-profesional'
  | 'stats-servicio'
  | 'stats-sexo-edad'
  | 'stats-materna'
  | 'stats-tipo-atencion'
  | 'stats-disa'
  | 'stats-oportunidad'
  | 'stats-registro-atencion'
  | 'report-general'
  | 'report-productividad'
  | 'report-cobertura'
  | 'rep-general'
  | 'rep-productividad'
  | 'rep-cobertura'
  | 'est-mes-eess'
  | 'est-punto'
  | 'est-digitadores'
  | 'est-profesional'
  | 'est-servicio'
  | 'est-sexo-edad'
  | 'est-materna'
  | 'est-tipo'
  | 'est-disa'
  | 'est-oportunidad'
  | 'est-registro-atencion'
  | 'mapa'
  | 'graficos'
  | 'carga-datos'
  | 'usuarios'
  | 'respaldos'
  | 'backups'
  | 'documentacion';

export type CoverageCategory = 'MALO' | 'REGULAR' | 'BUENO' | 'REVISA';

export interface DistrictCoverage {
  id: string;
  nombre: string;
  disa: string;
  meta: number;
  realizado: number;
  porcentaje: number;
  categoria: CoverageCategory;
  eessCount: number;
  profesionalesCount: number;
}
