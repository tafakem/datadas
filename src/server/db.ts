import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { Atencion, DigitadorRecord, User, AuditLog, DistrictCoverage, BackupRecord, BackupSettings } from '../types/health';
import { INITIAL_ATENCIONES, INITIAL_USERS, INITIAL_LOGS, INITIAL_DISTRICTS, INITIAL_DIGITADORES } from '../data/mockData';

const DB_DIR = path.resolve('data');
const DB_FILE = path.join(DB_DIR, 'minsa_database.sqlite');
const BACKUPS_DIR = path.join(DB_DIR, 'backups');

let db: Database.Database | null = null;

// Statistics in-memory cache to avoid recomputing when data hasn't changed
interface CacheEntry {
  data: any;
  timestamp: number;
}
const statsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

export function invalidateCache(): void {
  statsCache.clear();
}

/**
 * Initialize native SQLite Database with tables, constraints, PRAGMAs and B-Tree indexes
 */
export function getDatabase(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_FILE, {
    // verbose: process.env.NODE_ENV !== 'production' ? console.log : undefined
  });

  // Optimize SQLite PRAGMAs for high-volume 2M+ records
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache in RAM
  db.pragma('temp_store = MEMORY');
  db.pragma('mmap_size = 30000000000'); // Memory-mapped I/O
  db.pragma('page_size = 4096');

  createSchema(db);
  seedInitialDataIfEmpty(db);
  return db;
}

export function persistDatabase(): void {
  // Better-sqlite3 writes directly to disk on COMMIT/WAL checkpoint.
  // Explicit checkpointing flushes WAL to the main db file safely.
  if (db) {
    try {
      db.pragma('wal_checkpoint(PASSIVE)');
    } catch (e) {
      console.warn('WAL checkpoint notice:', e);
    }
  }
}

function createSchema(database: Database.Database): void {
  // 1. ATENCIONES TABLE (Optimized for 2+ million records)
  database.exec(`
    CREATE TABLE IF NOT EXISTS atenciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nro_formato TEXT UNIQUE NOT NULL,
      fecha_atencion TEXT NOT NULL,
      hora_atencion TEXT,
      tipo_doc TEXT,
      doc_identidad TEXT,
      beneficiario TEXT,
      edad INTEGER,
      sexo TEXT,
      codigo_eess TEXT,
      nombre_eess TEXT,
      cod_servicio TEXT,
      descripcion_servicio TEXT,
      dni_profesional TEXT,
      nombre_profesional TEXT,
      tipo_profesional TEXT,
      colegiatura TEXT,
      rne TEXT,
      tarifa REAL DEFAULT 0,
      historia_clinica TEXT,
      componente TEXT,
      condicion_materna TEXT,
      tipo_atencion TEXT,
      lugar_atencion TEXT,
      eess_referencia TEXT,
      fecha_registro TEXT,
      digitador TEXT,
      nro_cred TEXT,
      periodo_cierre TEXT,
      disa TEXT,
      cod_punto_digitacion TEXT,
      punto_digitacion TEXT,
      fecha_actualiza TEXT,
      usuario_actualiza TEXT
    );
  `);

  // B-Tree Indexes on frequently searched, filtered, and aggregated columns
  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_atenciones_nro_formato ON atenciones(nro_formato);
    CREATE INDEX IF NOT EXISTS idx_atenciones_fecha_atencion ON atenciones(fecha_atencion);
    CREATE INDEX IF NOT EXISTS idx_atenciones_periodo_cierre ON atenciones(periodo_cierre);
    CREATE INDEX IF NOT EXISTS idx_atenciones_punto_digitacion ON atenciones(punto_digitacion);
    CREATE INDEX IF NOT EXISTS idx_atenciones_digitador ON atenciones(digitador);
    CREATE INDEX IF NOT EXISTS idx_atenciones_codigo_eess ON atenciones(codigo_eess);
    CREATE INDEX IF NOT EXISTS idx_atenciones_nombre_eess ON atenciones(nombre_eess);
    CREATE INDEX IF NOT EXISTS idx_atenciones_cod_servicio ON atenciones(cod_servicio);
    CREATE INDEX IF NOT EXISTS idx_atenciones_desc_servicio ON atenciones(descripcion_servicio);
    CREATE INDEX IF NOT EXISTS idx_atenciones_dni_profesional ON atenciones(dni_profesional);
    CREATE INDEX IF NOT EXISTS idx_atenciones_nombre_prof ON atenciones(nombre_profesional);
    CREATE INDEX IF NOT EXISTS idx_atenciones_doc_identidad ON atenciones(doc_identidad);
    CREATE INDEX IF NOT EXISTS idx_atenciones_sexo ON atenciones(sexo);
    CREATE INDEX IF NOT EXISTS idx_atenciones_disa ON atenciones(disa);
    CREATE INDEX IF NOT EXISTS idx_atenciones_cond_materna ON atenciones(condicion_materna);
    CREATE INDEX IF NOT EXISTS idx_atenciones_tipo_atencion ON atenciones(tipo_atencion);
    CREATE INDEX IF NOT EXISTS idx_atenciones_comp_fecha_pto ON atenciones(fecha_atencion, punto_digitacion);
    CREATE INDEX IF NOT EXISTS idx_atenciones_comp_fecha_eess ON atenciones(fecha_atencion, codigo_eess);
    CREATE INDEX IF NOT EXISTS idx_atenciones_comp_periodo_eess ON atenciones(periodo_cierre, codigo_eess);
    CREATE INDEX IF NOT EXISTS idx_atenciones_periodo_doc ON atenciones(periodo_cierre, doc_identidad);
    CREATE INDEX IF NOT EXISTS idx_atenciones_eess_doc ON atenciones(nombre_eess, doc_identidad);
  `);

  // 2. DIGITADORES TABLE
  database.exec(`
    CREATE TABLE IF NOT EXISTS digitadores (
      id TEXT PRIMARY KEY,
      usuario TEXT UNIQUE NOT NULL,
      dni TEXT,
      nombre_completo TEXT NOT NULL,
      cod_punto_digitacion TEXT,
      punto_digitacion TEXT,
      codigo_eess TEXT,
      nombre_eess TEXT,
      cargo TEXT DEFAULT 'Digitador Asistencial',
      estado TEXT DEFAULT 'ACTIVO',
      correo TEXT,
      telefono TEXT,
      fecha_creacion TEXT,
      fecha_actualizacion TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_digitadores_usuario ON digitadores(usuario);
    CREATE INDEX IF NOT EXISTS idx_digitadores_dni ON digitadores(dni);
    CREATE INDEX IF NOT EXISTS idx_digitadores_nombre ON digitadores(nombre_completo);
  `);

  // 3. USERS TABLE
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      nombre_completo TEXT NOT NULL,
      email TEXT,
      rol TEXT NOT NULL,
      dni TEXT,
      cargo TEXT,
      estado TEXT DEFAULT 'ACTIVO',
      ultimo_acceso TEXT,
      punto_asignado TEXT
    );
  `);

  // 4. AUDIT LOGS TABLE
  database.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      fecha TEXT NOT NULL,
      usuario TEXT NOT NULL,
      rol TEXT NOT NULL,
      accion TEXT NOT NULL,
      detalle TEXT NOT NULL,
      ip TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_audit_fecha ON audit_logs(fecha);
  `);

  // 5. DISTRICT COVERAGE TABLE
  database.exec(`
    CREATE TABLE IF NOT EXISTS district_coverage (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      disa TEXT NOT NULL,
      meta INTEGER NOT NULL,
      realizado INTEGER NOT NULL,
      porcentaje REAL NOT NULL,
      categoria TEXT NOT NULL
    );
  `);

  // 6. BACKUP LOGS TABLE
  database.exec(`
    CREATE TABLE IF NOT EXISTS backup_logs (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      format TEXT NOT NULL DEFAULT 'sqlite',
      type TEXT NOT NULL DEFAULT 'MANUAL',
      total_records INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      checksum TEXT,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_backup_created_at ON backup_logs(created_at);
  `);

  // 7. BACKUP SETTINGS TABLE
  database.exec(`
    CREATE TABLE IF NOT EXISTS backup_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled INTEGER NOT NULL DEFAULT 1,
      frequency TEXT NOT NULL DEFAULT 'DIARIO',
      scheduled_time TEXT NOT NULL DEFAULT '02:00',
      retention_count INTEGER NOT NULL DEFAULT 10,
      last_run TEXT,
      next_run TEXT
    );
    INSERT OR IGNORE INTO backup_settings (id, enabled, frequency, scheduled_time, retention_count)
    VALUES (1, 1, 'DIARIO', '02:00', 10);
  `);
}

export function clearAtencionesData(): { cleared: boolean; totalBefore: number } {
  const database = getDatabase();
  invalidateCache();
  const countRow = database.prepare('SELECT count(*) as total FROM atenciones').get() as { total: number };
  const totalBefore = countRow ? Number(countRow.total) : 0;
  database.prepare('DELETE FROM atenciones;').run();
  try {
    database.prepare("DELETE FROM sqlite_sequence WHERE name='atenciones';").run();
  } catch {}
  return { cleared: true, totalBefore };
}

function seedInitialDataIfEmpty(database: Database.Database): void {
  const atencionesCount = getCount(database, 'atenciones');
  if (atencionesCount === 0 && INITIAL_ATENCIONES.length > 0) {
    console.log('Seeding initial atenciones data into SQLite...');
    const insertStmt = database.prepare(`
      INSERT OR IGNORE INTO atenciones (
        nro_formato, fecha_atencion, hora_atencion, tipo_doc, doc_identidad,
        beneficiario, edad, sexo, codigo_eess, nombre_eess, cod_servicio,
        descripcion_servicio, dni_profesional, nombre_profesional, tipo_profesional,
        colegiatura, rne, tarifa, historia_clinica, componente, condicion_materna,
        tipo_atencion, lugar_atencion, eess_referencia, fecha_registro, digitador,
        nro_cred, periodo_cierre, disa, cod_punto_digitacion, punto_digitacion
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    const insertMany = database.transaction((records: Atencion[]) => {
      for (const a of records) {
        insertStmt.run(
          a.nro_formato, a.fecha_atencion, a.hora_atencion || null, a.tipo_doc || 'DNI', a.doc_identidad || null,
          a.beneficiario, a.edad, a.sexo, a.codigo_eess, a.nombre_eess, a.cod_servicio,
          a.descripcion_servicio, a.dni_profesional, a.nombre_profesional, a.tipo_profesional,
          a.colegiatura || null, a.rne || null, a.tarifa || 0, a.historia_clinica || null, a.componente || null, a.condicion_materna || null,
          a.tipo_atencion || null, a.lugar_atencion || null, a.eess_referencia || null, a.fecha_registro || null, a.digitador || null,
          a.nro_cred || null, a.periodo_cierre || null, a.disa || null, a.cod_punto_digitacion || null, a.punto_digitacion || null
        );
      }
    });

    insertMany(INITIAL_ATENCIONES);
  }

  const digitadoresCount = getCount(database, 'digitadores');
  if (digitadoresCount === 0) {
    console.log('Seeding initial digitadores...');
    const stmt = database.prepare(`
      INSERT OR IGNORE INTO digitadores (
        id, usuario, dni, nombre_completo, cod_punto_digitacion, punto_digitacion,
        codigo_eess, nombre_eess, cargo, estado, correo, telefono, fecha_creacion, fecha_actualizacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertManyDig = database.transaction((records: DigitadorRecord[]) => {
      for (const d of records) {
        stmt.run(
          d.id, d.usuario, d.dni || null, d.nombre_completo, d.cod_punto_digitacion || null, d.punto_digitacion || null,
          d.codigo_eess || null, d.nombre_eess || null, d.cargo || 'Digitador Asistencial',
          d.estado || 'ACTIVO', d.correo || null, d.telefono || null,
          d.fecha_creacion || null, d.fecha_actualizacion || null
        );
      }
    });

    insertManyDig(INITIAL_DIGITADORES);
  }

  const usersCount = getCount(database, 'users');
  if (usersCount === 0) {
    const stmt = database.prepare(`
      INSERT OR IGNORE INTO users (id, username, nombre_completo, email, rol, dni, cargo, estado, ultimo_acceso, punto_asignado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertManyUsers = database.transaction((records: User[]) => {
      for (const u of records) {
        stmt.run(u.id, u.username, u.nombre_completo, u.email, u.rol, (u as any).dni || null, (u as any).cargo || null, u.estado, u.ultimo_acceso || null, u.punto_asignado || null);
      }
    });
    insertManyUsers(INITIAL_USERS);
  }

  const logsCount = getCount(database, 'audit_logs');
  if (logsCount === 0) {
    const stmt = database.prepare(`
      INSERT OR IGNORE INTO audit_logs (id, fecha, usuario, rol, accion, detalle, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertManyLogs = database.transaction((records: AuditLog[]) => {
      for (const l of records) {
        stmt.run(l.id, l.fecha, l.usuario, l.rol, l.accion, l.detalle, l.ip || null);
      }
    });
    insertManyLogs(INITIAL_LOGS);
  }

  const districtsCount = getCount(database, 'district_coverage');
  if (districtsCount === 0) {
    const stmt = database.prepare(`
      INSERT OR IGNORE INTO district_coverage (id, nombre, disa, meta, realizado, porcentaje, categoria)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertManyDistricts = database.transaction((records: DistrictCoverage[]) => {
      for (const dc of records) {
        stmt.run(dc.id, dc.nombre, dc.disa, dc.meta, dc.realizado, dc.porcentaje, dc.categoria);
      }
    });
    insertManyDistricts(INITIAL_DISTRICTS);
  }
}

function getCount(database: Database.Database, table: string): number {
  try {
    const row = database.prepare(`SELECT count(*) as total FROM ${table}`).get() as { total: number };
    return row ? Number(row.total) : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Builds standard WHERE clause and binds for atenciones based on filters and search
 */
export const SQL_NORMALIZED_MES = `
  CASE 
    WHEN periodo_cierre IS NOT NULL AND length(trim(periodo_cierre)) >= 6 THEN
      CASE 
        WHEN periodo_cierre LIKE '____-__%' THEN substr(periodo_cierre, 1, 7)
        WHEN length(trim(periodo_cierre)) = 6 AND periodo_cierre GLOB '[0-9][0-9][0-9][0-9][0-9][0-9]' THEN substr(periodo_cierre, 1, 4) || '-' || substr(periodo_cierre, 5, 2)
        WHEN periodo_cierre LIKE '__/__/____%' THEN substr(periodo_cierre, 7, 4) || '-' || substr(periodo_cierre, 4, 2)
        ELSE substr(periodo_cierre, 1, 7)
      END
    WHEN fecha_atencion IS NOT NULL AND length(trim(fecha_atencion)) >= 7 THEN
      CASE
        WHEN fecha_atencion LIKE '____-__%' THEN substr(fecha_atencion, 1, 7)
        WHEN fecha_atencion LIKE '__/__/____%' THEN substr(fecha_atencion, 7, 4) || '-' || substr(fecha_atencion, 4, 2)
        WHEN fecha_atencion LIKE '__-__-____%' THEN substr(fecha_atencion, 7, 4) || '-' || substr(fecha_atencion, 4, 2)
        ELSE substr(fecha_atencion, 1, 7)
      END
    ELSE 'S/P'
  END
`;

function buildFilterClause(filters: Record<string, string>, search?: string): { whereClause: string; binds: any[] } {
  const conditions: string[] = [];
  const binds: any[] = [];

  if (filters.fechaInicio) {
    conditions.push('fecha_atencion >= ?');
    binds.push(filters.fechaInicio);
  }
  if (filters.fechaFin) {
    conditions.push('fecha_atencion <= ?');
    binds.push(filters.fechaFin);
  }
  if (filters.anio || filters.year) {
    const yr = (filters.anio || filters.year).trim();
    conditions.push('(periodo_cierre LIKE ? OR fecha_atencion LIKE ?)');
    binds.push(`${yr}%`, `${yr}%`);
  }
  if (filters.periodo) {
    const p = filters.periodo.trim();
    if (p.length === 4) {
      // 4-digit Year (e.g. 2026, 2025)
      conditions.push('(periodo_cierre LIKE ? OR fecha_atencion LIKE ?)');
      binds.push(`${p}%`, `${p}%`);
    } else if (p.length === 6 && !p.includes('-')) {
      // YYYYMM (e.g. 202603)
      const ym = `${p.substring(0, 4)}-${p.substring(4, 6)}`;
      conditions.push('(periodo_cierre = ? OR periodo_cierre = ? OR fecha_atencion LIKE ?)');
      binds.push(p, ym, `${ym}%`);
    } else {
      // YYYY-MM
      conditions.push('(periodo_cierre = ? OR periodo_cierre LIKE ? OR fecha_atencion LIKE ?)');
      binds.push(p, `${p}%`, `${p}%`);
    }
  }
  if (filters.eess) {
    conditions.push('(codigo_eess = ? OR nombre_eess = ? OR lower(nombre_eess) LIKE ?)');
    binds.push(filters.eess, filters.eess, `%${filters.eess.toLowerCase()}%`);
  }
  if (filters.profesional) {
    conditions.push('(dni_profesional = ? OR nombre_profesional = ?)');
    binds.push(filters.profesional, filters.profesional);
  }
  if (filters.servicio) {
    conditions.push('(cod_servicio = ? OR descripcion_servicio = ?)');
    binds.push(filters.servicio, filters.servicio);
  }
  if (filters.tipoProfesional) {
    conditions.push('tipo_profesional = ?');
    binds.push(filters.tipoProfesional);
  }
  if (filters.puntoDigitacion) {
    conditions.push('(cod_punto_digitacion = ? OR punto_digitacion = ?)');
    binds.push(filters.puntoDigitacion, filters.puntoDigitacion);
  }
  if (filters.disa) {
    conditions.push('disa = ?');
    binds.push(filters.disa);
  }
  if (filters.sexo) {
    conditions.push('sexo = ?');
    binds.push(filters.sexo);
  }
  if (filters.condicionMaterna) {
    conditions.push('condicion_materna = ?');
    binds.push(filters.condicionMaterna);
  }
  if (filters.tipoAtencion) {
    conditions.push('tipo_atencion = ?');
    binds.push(filters.tipoAtencion);
  }

  const effectiveSearch = (search || filters.search || '').trim();
  if (effectiveSearch) {
    const s = `%${effectiveSearch.toLowerCase()}%`;
    conditions.push(`(
      lower(nro_formato) LIKE ? OR
      lower(beneficiario) LIKE ? OR
      doc_identidad LIKE ? OR
      lower(nombre_eess) LIKE ? OR
      lower(nombre_profesional) LIKE ? OR
      lower(digitador) LIKE ? OR
      lower(punto_digitacion) LIKE ?
    )`);
    binds.push(s, s, s, s, s, s, s);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, binds };
}

/**
 * Server-side pagination for atenciones table (Only selects needed columns, respects LIMIT/OFFSET)
 */
export async function getAtencionesPaged(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  filters?: Record<string, string>;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}): Promise<{
  data: Atencion[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const database = getDatabase();
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Math.min(25000, Number(params.pageSize) || 15));
  const offset = (page - 1) * pageSize;

  const { whereClause, binds } = buildFilterClause(params.filters || {}, params.search);

  // 1. Get total count using indexed scan
  const countSql = `SELECT count(*) as total FROM atenciones ${whereClause}`;
  const countRow = database.prepare(countSql).get(...binds) as { total: number };
  const total = countRow ? Number(countRow.total) : 0;

  // 2. Allowed sort columns to prevent SQL injection
  const allowedSortCols = [
    'id', 'nro_formato', 'fecha_atencion', 'hora_atencion', 'doc_identidad',
    'beneficiario', 'edad', 'sexo', 'nombre_eess', 'descripcion_servicio',
    'nombre_profesional', 'tarifa', 'punto_digitacion', 'digitador', 'fecha_registro'
  ];
  let sortBy = 'id';
  if (params.sortBy && allowedSortCols.includes(params.sortBy)) {
    sortBy = params.sortBy;
  }
  const sortDir = params.sortDir === 'ASC' ? 'ASC' : 'DESC';

  // 3. Select explicit columns (NO SELECT *!)
  const selectSql = `
    SELECT 
      id, nro_formato, fecha_atencion, hora_atencion, tipo_doc, doc_identidad,
      beneficiario, edad, sexo, codigo_eess, nombre_eess, cod_servicio,
      descripcion_servicio, dni_profesional, nombre_profesional, tipo_profesional,
      colegiatura, rne, tarifa, historia_clinica, componente, condicion_materna,
      tipo_atencion, lugar_atencion, eess_referencia, fecha_registro, digitador,
      nro_cred, periodo_cierre, disa, cod_punto_digitacion, punto_digitacion
    FROM atenciones
    ${whereClause}
    ORDER BY ${sortBy} ${sortDir}
    LIMIT ? OFFSET ?
  `;

  const queryBinds = [...binds, pageSize, offset];
  const rows = database.prepare(selectSql).all(...queryBinds) as Atencion[];

  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    data: rows,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * High-performance aggregated stats for Dashboard without loading rows into browser memory
 */
export async function getDashboardAggregatedStats(filters: Record<string, string>): Promise<any> {
  const cacheKey = `dashboard_${JSON.stringify(filters)}`;
  const cached = statsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const database = getDatabase();
  const { whereClause, binds } = buildFilterClause(filters, filters.search);

  // 1. Overall KPIs in one single SQL pass
  const kpiSql = `
    SELECT 
      count(*) as totalAtenciones,
      count(DISTINCT doc_identidad) as pacientesUnicos,
      count(DISTINCT codigo_eess) as totalEess,
      count(DISTINCT dni_profesional) as totalProfesionales,
      coalesce(sum(tarifa), 0) as montoTotal
    FROM atenciones
    ${whereClause}
  `;
  const kpiRow = database.prepare(kpiSql).get(...binds) as any;
  const kpis = {
    totalAtenciones: Number(kpiRow?.totalAtenciones) || 0,
    pacientesUnicos: Number(kpiRow?.pacientesUnicos) || 0,
    totalEess: Number(kpiRow?.totalEess) || 0,
    totalProfesionales: Number(kpiRow?.totalProfesionales) || 0,
    montoTotal: Number(kpiRow?.montoTotal) || 0,
  };

  // 2. Monthly Trend (strictly group by YYYY-MM based on normalized periodo_cierre or fecha_atencion)
  const monthlySql = `
    SELECT 
      ${SQL_NORMALIZED_MES} as mes,
      count(*) as total,
      count(DISTINCT doc_identidad) as pacientes,
      coalesce(sum(tarifa), 0) as tarifa
    FROM atenciones
    ${whereClause}
    GROUP BY mes
    ORDER BY mes ASC
  `;
  const monthlyData = database.prepare(monthlySql).all(...binds) as any[];

  // 3. Top 10 EESS
  const eessSql = `
    SELECT 
      nombre_eess as nombre,
      codigo_eess as codigo,
      count(*) as atenciones,
      count(DISTINCT doc_identidad) as pacientes,
      coalesce(sum(tarifa), 0) as totalTarifa
    FROM atenciones
    ${whereClause}
    GROUP BY nombre_eess
    ORDER BY atenciones DESC
    LIMIT 10
  `;
  const topEess = database.prepare(eessSql).all(...binds);

  // 4. Top 10 Servicios
  const servSql = `
    SELECT 
      descripcion_servicio as servicio,
      cod_servicio as codigo,
      count(*) as cantidad,
      coalesce(sum(tarifa), 0) as tarifa
    FROM atenciones
    ${whereClause}
    GROUP BY descripcion_servicio
    ORDER BY cantidad DESC
    LIMIT 10
  `;
  const topServicios = database.prepare(servSql).all(...binds);

  // 5. Sexo Distribution
  const sexoSql = `
    SELECT 
      sexo,
      count(*) as cantidad
    FROM atenciones
    ${whereClause}
    GROUP BY sexo
  `;
  const sexoRows = database.prepare(sexoSql).all(...binds) as any[];
  const sexoDistribucion: Record<string, number> = {};
  for (const r of sexoRows) {
    if (r.sexo) sexoDistribucion[String(r.sexo)] = Number(r.cantidad);
  }

  // 6. Top Puntos de Digitación
  const puntoSql = `
    SELECT 
      punto_digitacion as punto,
      cod_punto_digitacion as codigo,
      count(*) as totalAtenciones,
      count(DISTINCT digitador) as totalDigitadores
    FROM atenciones
    ${whereClause}
    GROUP BY punto_digitacion
    ORDER BY totalAtenciones DESC
    LIMIT 10
  `;
  const topPuntos = database.prepare(puntoSql).all(...binds);

  const result = {
    kpis,
    monthlyData,
    topEess,
    topServicios,
    sexoDistribucion,
    topPuntos,
  };

  statsCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

/**
 * High-speed aggregated metrics specifically for Módulo Atendidos (B.1 Atenciones vs Atendidos)
 */
export async function getAtendidosAggregatedStats(
  filterParams: Record<string, string> = {}
): Promise<{
  grandTotal: number;
  grandTotalAtendidos: number;
  globalConcentracion: string;
  grandTotalTarifas: number;
  eessList: {
    nombre: string;
    codigo: string;
    atenciones: number;
    atendidos: number;
    concentracion: number;
    tarifas: number;
    disa: string;
  }[];
  monthlyList: {
    mes: string;
    atenciones: number;
    atendidos: number;
    concentracion: number;
    tarifas: number;
  }[];
  matrix: Record<string, Record<string, number>>;
  years: string[];
}> {
  const database = getDatabase();
  const { whereClause, binds } = buildFilterClause(filterParams, filterParams.search);

  // 1. Overall KPIs
  const kpiSql = `
    SELECT 
      count(*) as totalAtenciones,
      count(DISTINCT doc_identidad) as totalAtendidos,
      coalesce(sum(tarifa), 0) as totalTarifas
    FROM atenciones
    ${whereClause}
  `;
  const kpi = database.prepare(kpiSql).get(...binds) as any;
  const grandTotal = Number(kpi?.totalAtenciones) || 0;
  const grandTotalAtendidos = Number(kpi?.totalAtendidos) || 0;
  const grandTotalTarifas = Number(kpi?.totalTarifas) || 0;
  const globalConcentracion = grandTotalAtendidos > 0 ? (grandTotal / grandTotalAtendidos).toFixed(2) : '1.00';

  // 2. By EESS
  const eessSql = `
    SELECT 
      nombre_eess as nombre,
      codigo_eess as codigo,
      count(*) as atenciones,
      count(DISTINCT doc_identidad) as atendidos,
      coalesce(sum(tarifa), 0) as tarifas,
      max(disa) as disa
    FROM atenciones
    ${whereClause}
    GROUP BY nombre_eess
    ORDER BY atenciones DESC
  `;
  const rawEess = database.prepare(eessSql).all(...binds) as any[];
  const eessList = rawEess.map(e => {
    const atenc = Number(e.atenciones) || 0;
    const atend = Number(e.atendidos) || 0;
    return {
      nombre: e.nombre || 'EESS SIN NOMBRE',
      codigo: e.codigo || '000000',
      atenciones: atenc,
      atendidos: atend,
      concentracion: atend > 0 ? Math.round((atenc / atend) * 100) / 100 : 1.0,
      tarifas: Number(e.tarifas) || 0,
      disa: e.disa || 'MINSA',
    };
  });

  // 3. By Month (YYYY-MM)
  const monthlySql = `
    SELECT 
      ${SQL_NORMALIZED_MES} as mes,
      count(*) as atenciones,
      count(DISTINCT doc_identidad) as atendidos,
      coalesce(sum(tarifa), 0) as tarifas
    FROM atenciones
    ${whereClause}
    GROUP BY mes
    ORDER BY mes ASC
  `;
  const rawMonthly = database.prepare(monthlySql).all(...binds) as any[];
  const monthlyList = rawMonthly.map(m => {
    const atenc = Number(m.atenciones) || 0;
    const atend = Number(m.atendidos) || 0;
    return {
      mes: m.mes,
      atenciones: atenc,
      atendidos: atend,
      concentracion: atend > 0 ? Math.round((atenc / atend) * 100) / 100 : 1.0,
      tarifas: Number(m.tarifas) || 0,
    };
  });

  // 4. Matrix EESS x Month
  const matrixSql = `
    SELECT 
      nombre_eess as eess,
      ${SQL_NORMALIZED_MES} as mes,
      count(*) as atenciones
    FROM atenciones
    ${whereClause}
    GROUP BY nombre_eess, mes
  `;
  const matrixRows = database.prepare(matrixSql).all(...binds) as any[];
  const matrix: Record<string, Record<string, number>> = {};
  for (const r of matrixRows) {
    const e = r.eess || 'EESS SIN NOMBRE';
    if (!matrix[e]) matrix[e] = {};
    matrix[e][r.mes] = Number(r.atenciones) || 0;
  }

  // 5. Distinct Years
  const yearsSet = new Set<string>();
  monthlyList.forEach(m => {
    if (m.mes && m.mes.length >= 4) {
      yearsSet.add(m.mes.substring(0, 4));
    }
  });
  const years = Array.from(yearsSet).sort().reverse();

  return {
    grandTotal,
    grandTotalAtendidos,
    globalConcentracion,
    grandTotalTarifas,
    eessList,
    monthlyList,
    matrix,
    years: years.length > 0 ? years : ['2026'],
  };
}

/**
 * High-speed aggregated metrics across all statistical modules for 2,000,000+ records
 */
export async function getModulesAggregatedStats(filterParams: Record<string, string> = {}): Promise<any> {
  const cacheKey = `modules_${JSON.stringify(filterParams)}`;
  const cached = statsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const database = getDatabase();
  const { whereClause, binds } = buildFilterClause(filterParams, filterParams.search);

  // 1. Overall KPIs
  const kpiRow = database.prepare(`
    SELECT 
      count(*) as totalAtenciones,
      count(DISTINCT doc_identidad) as totalPacientes,
      count(DISTINCT codigo_eess) as totalEess,
      count(DISTINCT dni_profesional) as totalProfesionales,
      count(DISTINCT cod_punto_digitacion) as totalPuntos,
      coalesce(sum(tarifa), 0) as totalTarifas
    FROM atenciones
    ${whereClause}
  `).get(...binds) as any;

  // 2. Puntos de Digitación Ranking
  const puntos = database.prepare(`
    SELECT 
      punto_digitacion as nombre,
      cod_punto_digitacion as codigo,
      count(*) as atenciones,
      count(DISTINCT digitador) as digitadores,
      count(DISTINCT codigo_eess) as eessCount,
      count(DISTINCT doc_identidad) as pacientes,
      coalesce(sum(tarifa), 0) as totalTarifa
    FROM atenciones
    ${whereClause}
    GROUP BY punto_digitacion
    ORDER BY atenciones DESC
  `).all(...binds);

  // 3. Profesionales Ranking
  const profesionales = database.prepare(`
    SELECT 
      nombre_profesional as nombre,
      dni_profesional as dni,
      max(tipo_profesional) as tipo,
      max(colegiatura) as colegiatura,
      count(*) as atenciones,
      count(DISTINCT doc_identidad) as pacientes,
      coalesce(sum(tarifa), 0) as totalTarifa
    FROM atenciones
    ${whereClause}
    GROUP BY nombre_profesional
    ORDER BY atenciones DESC
    LIMIT 200
  `).all(...binds);

  // 4. Servicios Ranking
  const servicios = database.prepare(`
    SELECT 
      descripcion_servicio as servicio,
      cod_servicio as codigo,
      count(*) as atenciones,
      count(DISTINCT doc_identidad) as pacientes,
      coalesce(sum(tarifa), 0) as totalTarifa
    FROM atenciones
    ${whereClause}
    GROUP BY descripcion_servicio
    ORDER BY atenciones DESC
  `).all(...binds);

  // 5. Sexo & Edad Pyramid
  const sexoEdad = database.prepare(`
    SELECT 
      sexo,
      edad,
      count(*) as cantidad
    FROM atenciones
    ${whereClause}
    GROUP BY sexo, edad
  `).all(...binds);

  // 6. Condición Materna
  const condicionMaterna = database.prepare(`
    SELECT 
      condicion_materna as condicion,
      count(*) as cantidad
    FROM atenciones
    ${whereClause}
    GROUP BY condicion_materna
  `).all(...binds);

  // 7. Tipo y Lugar de Atención
  const tipoAtencion = database.prepare(`
    SELECT 
      tipo_atencion as tipo,
      lugar_atencion as lugar,
      count(*) as cantidad
    FROM atenciones
    ${whereClause}
    GROUP BY tipo_atencion, lugar_atencion
  `).all(...binds);

  // 8. DISA / Región
  const disa = database.prepare(`
    SELECT 
      disa,
      count(*) as atenciones,
      count(DISTINCT codigo_eess) as eessCount,
      count(DISTINCT doc_identidad) as pacientes,
      coalesce(sum(tarifa), 0) as totalTarifa
    FROM atenciones
    ${whereClause}
    GROUP BY disa
    ORDER BY atenciones DESC
  `).all(...binds);

  const result = {
    kpis: {
      totalAtenciones: Number(kpiRow?.totalAtenciones) || 0,
      totalPacientes: Number(kpiRow?.totalPacientes) || 0,
      totalEess: Number(kpiRow?.totalEess) || 0,
      totalProfesionales: Number(kpiRow?.totalProfesionales) || 0,
      totalPuntos: Number(kpiRow?.totalPuntos) || 0,
      totalTarifas: Number(kpiRow?.totalTarifas) || 0,
    },
    puntos,
    profesionales,
    servicios,
    sexoEdad,
    condicionMaterna,
    tipoAtencion,
    disa,
  };

  statsCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

/**
 * Filter options extraction (cached) for instant dropdown rendering
 */
export async function getFilterOptions(): Promise<{
  eessList: { codigo: string; nombre: string }[];
  profesionalesList: { dni: string; nombre: string; tipo: string }[];
  serviciosList: { codigo: string; descripcion: string }[];
  puntosList: { codigo: string; nombre: string }[];
  disasList: string[];
  periodosList: string[];
}> {
  const cacheKey = 'filter_options_global';
  const cached = statsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS * 5) {
    return cached.data;
  }

  const database = getDatabase();

  const eessList = database.prepare(`
    SELECT DISTINCT codigo_eess as codigo, nombre_eess as nombre 
    FROM atenciones 
    WHERE nombre_eess IS NOT NULL AND nombre_eess != '' 
    ORDER BY nombre_eess ASC
  `).all() as any[];

  const profesionalesList = database.prepare(`
    SELECT DISTINCT dni_profesional as dni, nombre_profesional as nombre, tipo_profesional as tipo 
    FROM atenciones 
    WHERE nombre_profesional IS NOT NULL AND nombre_profesional != '' 
    ORDER BY nombre_profesional ASC 
    LIMIT 200
  `).all() as any[];

  const serviciosList = database.prepare(`
    SELECT DISTINCT cod_servicio as codigo, descripcion_servicio as descripcion 
    FROM atenciones 
    WHERE descripcion_servicio IS NOT NULL AND descripcion_servicio != '' 
    ORDER BY descripcion_servicio ASC
  `).all() as any[];

  const puntosList = database.prepare(`
    SELECT DISTINCT cod_punto_digitacion as codigo, punto_digitacion as nombre 
    FROM atenciones 
    WHERE punto_digitacion IS NOT NULL AND punto_digitacion != '' 
    ORDER BY punto_digitacion ASC
  `).all() as any[];

  const disasList = (database.prepare(`
    SELECT DISTINCT disa 
    FROM atenciones 
    WHERE disa IS NOT NULL AND disa != '' 
    ORDER BY disa ASC
  `).all() as any[]).map(r => r.disa);

  const periodosList = (database.prepare(`
    SELECT DISTINCT periodo_cierre 
    FROM atenciones 
    WHERE periodo_cierre IS NOT NULL AND periodo_cierre != '' 
    ORDER BY periodo_cierre DESC
  `).all() as any[]).map(r => r.periodo_cierre);

  const result = {
    eessList,
    profesionalesList,
    serviciosList,
    puntosList,
    disasList,
    periodosList,
  };

  statsCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

/**
 * High-speed batch upsert for Excel uploads with chunk transaction processing
 */
export async function insertAtencionesBatch(
  rows: Omit<Atencion, 'id'>[],
  updateExisting: boolean,
  currentUser = 'sistema'
): Promise<{ added: number; updated: number; skipped: number; errors: { row: number; format: string; error: string }[] }> {
  const database = getDatabase();
  invalidateCache();

  let added = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { row: number; format: string; error: string }[] = [];

  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const insertSql = `
    INSERT INTO atenciones (
      nro_formato, fecha_atencion, hora_atencion, tipo_doc, doc_identidad,
      beneficiario, edad, sexo, codigo_eess, nombre_eess, cod_servicio,
      descripcion_servicio, dni_profesional, nombre_profesional, tipo_profesional,
      colegiatura, rne, tarifa, historia_clinica, componente, condicion_materna,
      tipo_atencion, lugar_atencion, eess_referencia, fecha_registro, digitador,
      nro_cred, periodo_cierre, disa, cod_punto_digitacion, punto_digitacion,
      fecha_actualiza, usuario_actualiza
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(nro_formato) DO UPDATE SET
      fecha_atencion = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.fecha_atencion ELSE atenciones.fecha_atencion END,
      hora_atencion = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.hora_atencion ELSE atenciones.hora_atencion END,
      tipo_doc = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.tipo_doc ELSE atenciones.tipo_doc END,
      doc_identidad = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.doc_identidad ELSE atenciones.doc_identidad END,
      beneficiario = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.beneficiario ELSE atenciones.beneficiario END,
      edad = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.edad ELSE atenciones.edad END,
      sexo = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.sexo ELSE atenciones.sexo END,
      codigo_eess = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.codigo_eess ELSE atenciones.codigo_eess END,
      nombre_eess = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.nombre_eess ELSE atenciones.nombre_eess END,
      cod_servicio = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.cod_servicio ELSE atenciones.cod_servicio END,
      descripcion_servicio = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.descripcion_servicio ELSE atenciones.descripcion_servicio END,
      dni_profesional = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.dni_profesional ELSE atenciones.dni_profesional END,
      nombre_profesional = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.nombre_profesional ELSE atenciones.nombre_profesional END,
      tipo_profesional = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.tipo_profesional ELSE atenciones.tipo_profesional END,
      colegiatura = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.colegiatura ELSE atenciones.colegiatura END,
      rne = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.rne ELSE atenciones.rne END,
      tarifa = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.tarifa ELSE atenciones.tarifa END,
      historia_clinica = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.historia_clinica ELSE atenciones.historia_clinica END,
      componente = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.componente ELSE atenciones.componente END,
      condicion_materna = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.condicion_materna ELSE atenciones.condicion_materna END,
      tipo_atencion = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.tipo_atencion ELSE atenciones.tipo_atencion END,
      lugar_atencion = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.lugar_atencion ELSE atenciones.lugar_atencion END,
      eess_referencia = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.eess_referencia ELSE atenciones.eess_referencia END,
      fecha_registro = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.fecha_registro ELSE atenciones.fecha_registro END,
      digitador = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.digitador ELSE atenciones.digitador END,
      nro_cred = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.nro_cred ELSE atenciones.nro_cred END,
      periodo_cierre = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.periodo_cierre ELSE atenciones.periodo_cierre END,
      disa = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.disa ELSE atenciones.disa END,
      cod_punto_digitacion = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.cod_punto_digitacion ELSE atenciones.cod_punto_digitacion END,
      punto_digitacion = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.punto_digitacion ELSE atenciones.punto_digitacion END,
      fecha_actualiza = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.fecha_actualiza ELSE atenciones.fecha_actualiza END,
      usuario_actualiza = CASE WHEN ${updateExisting ? '1' : '0'} THEN excluded.usuario_actualiza ELSE atenciones.usuario_actualiza END
  `;

  const insertStmt = database.prepare(insertSql);
  const checkStmt = database.prepare('SELECT 1 FROM atenciones WHERE nro_formato = ? LIMIT 1');

  const executeBatch = database.transaction((items: Omit<Atencion, 'id'>[]) => {
    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      if (!a.nro_formato || !a.fecha_atencion) {
        errors.push({
          row: i + 1,
          format: a.nro_formato || 'S/F',
          error: 'Falta N° de formato o fecha de atención',
        });
        continue;
      }

      const existing = checkStmt.get(a.nro_formato);
      if (existing) {
        if (updateExisting) {
          updated++;
        } else {
          skipped++;
          continue;
        }
      } else {
        added++;
      }

      insertStmt.run(
        a.nro_formato, a.fecha_atencion, a.hora_atencion || null, a.tipo_doc || 'DNI', a.doc_identidad || null,
        a.beneficiario || 'PACIENTE', a.edad || 0, a.sexo || 'MASCULINO', a.codigo_eess || null,
        a.nombre_eess || 'EESS NO ESPECIFICADO', a.cod_servicio || null, a.descripcion_servicio || null,
        a.dni_profesional || null, a.nombre_profesional || null, a.tipo_profesional || null,
        a.colegiatura || null, a.rne || null, a.tarifa || 0, a.historia_clinica || null,
        a.componente || null, a.condicion_materna || null, a.tipo_atencion || null,
        a.lugar_atencion || null, a.eess_referencia || null, a.fecha_registro || null,
        a.digitador || null, a.nro_cred || null, a.periodo_cierre || null, a.disa || null,
        a.cod_punto_digitacion || null, a.punto_digitacion || null,
        nowStr, currentUser
      );
    }
  });

  executeBatch(rows);

  return { added, updated, skipped, errors };
}

/**
 * Delete records by period directly in database
 */
export async function deleteAtencionesByPeriod(period: string): Promise<number> {
  const database = getDatabase();
  invalidateCache();

  const countRow = database.prepare('SELECT count(*) as total FROM atenciones WHERE periodo_cierre = ?').get(period) as any;
  const count = countRow ? Number(countRow.total) : 0;

  database.prepare('DELETE FROM atenciones WHERE periodo_cierre = ?').run(period);
  return count;
}

/**
 * Delete single atencion
 */
export async function deleteAtencionById(id: number): Promise<boolean> {
  const database = getDatabase();
  invalidateCache();
  const info = database.prepare('DELETE FROM atenciones WHERE id = ?').run(id);
  return info.changes > 0;
}

/**
 * DIGITADORES CRUD
 */
export async function getDigitadoresList(): Promise<DigitadorRecord[]> {
  const database = getDatabase();
  return database.prepare('SELECT * FROM digitadores ORDER BY nombre_completo ASC').all() as DigitadorRecord[];
}

export async function addOrUpdateDigitadoresBatch(
  items: Omit<DigitadorRecord, 'id'>[]
): Promise<{ added: number; updated: number }> {
  const database = getDatabase();
  invalidateCache();

  let added = 0;
  let updated = 0;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const stmt = database.prepare(`
    INSERT INTO digitadores (
      id, usuario, dni, nombre_completo, cod_punto_digitacion, punto_digitacion,
      codigo_eess, nombre_eess, cargo, estado, correo, telefono, fecha_creacion, fecha_actualizacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(usuario) DO UPDATE SET
      dni = coalesce(excluded.dni, digitadores.dni),
      nombre_completo = excluded.nombre_completo,
      cod_punto_digitacion = coalesce(excluded.cod_punto_digitacion, digitadores.cod_punto_digitacion),
      punto_digitacion = coalesce(excluded.punto_digitacion, digitadores.punto_digitacion),
      codigo_eess = coalesce(excluded.codigo_eess, digitadores.codigo_eess),
      nombre_eess = coalesce(excluded.nombre_eess, digitadores.nombre_eess),
      cargo = coalesce(excluded.cargo, digitadores.cargo),
      estado = coalesce(excluded.estado, digitadores.estado),
      correo = coalesce(excluded.correo, digitadores.correo),
      telefono = coalesce(excluded.telefono, digitadores.telefono),
      fecha_actualizacion = excluded.fecha_actualizacion
  `);

  const checkStmt = database.prepare('SELECT 1 FROM digitadores WHERE usuario = ? LIMIT 1');

  const insertManyDig = database.transaction((records: Omit<DigitadorRecord, 'id'>[]) => {
    for (const d of records) {
      if (!d.usuario || !d.nombre_completo) continue;
      const exists = checkStmt.get(d.usuario);
      if (exists) updated++;
      else added++;

      const id = `dig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      stmt.run(
        id, d.usuario, d.dni || null, d.nombre_completo,
        d.cod_punto_digitacion || null, d.punto_digitacion || null,
        d.codigo_eess || null, d.nombre_eess || null,
        d.cargo || 'Digitador Asistencial', d.estado || 'ACTIVO',
        d.correo || null, d.telefono || null,
        nowStr, nowStr
      );
    }
  });

  insertManyDig(items);

  return { added, updated };
}

export async function deleteDigitadorById(id: string): Promise<boolean> {
  const database = getDatabase();
  invalidateCache();
  const info = database.prepare('DELETE FROM digitadores WHERE id = ?').run(id);
  return info.changes > 0;
}

/**
 * HIGH-SPEED BENCHMARK SIMULATION GENERATOR
 * Generates N realistic records in chunks of 25,000 using native SQLite transactions
 * Easily simulates 100k, 500k, 1M, 2M+ records in seconds!
 */
export async function generateBenchmarkRecords(count: number): Promise<{
  generated: number;
  totalNow: number;
  elapsedMs: number;
}> {
  const database = getDatabase();
  invalidateCache();

  const start = Date.now();
  const eessPool = [
    { cod: '00001045', nom: 'C.S. SAN MARTIN DE PORRES', disa: 'DIRIS LIMA NORTE', pto: 'DIGITACIÓN SAN MARTÍN', codPto: 'PTO-DIG-01' },
    { cod: '00002130', nom: 'HOSPITAL NACIONAL DOS DE MAYO', disa: 'DIRIS LIMA CENTRO', pto: 'DIGITACIÓN JESÚS MARÍA', codPto: 'PTO-DIG-02' },
    { cod: '00003412', nom: 'C.S. MIRAFLORES', disa: 'DIRIS LIMA CENTRO', pto: 'DIGITACIÓN MIRAFLORES', codPto: 'PTO-DIG-03' },
    { cod: '00004561', nom: 'HOSPITAL MARIA AUXILIADORA', disa: 'DIRIS LIMA SUR', pto: 'DIGITACIÓN SUR', codPto: 'PTO-DIG-04' },
    { cod: '00005820', nom: 'HOSPITAL CAYETANO HEREDIA', disa: 'DIRIS LIMA NORTE', pto: 'DIGITACIÓN NORTE CENTRAL', codPto: 'PTO-DIG-05' },
    { cod: '00006789', nom: 'HOSPITAL HIPOLITO UNANUE', disa: 'DIRIS LIMA ESTE', pto: 'DIGITACIÓN EL AGUSTINO', codPto: 'PTO-DIG-06' },
  ];

  const serviciosPool = [
    { cod: '056', desc: 'CONSULTA MÉDICA GENERAL', tarifa: 12.00 },
    { cod: '020', desc: 'ATENCIÓN INTEGRAL DEL NIÑO - CRED', tarifa: 10.00 },
    { cod: '009', desc: 'VACUNACIÓN SEGÚN ESQUEMA REGULAR', tarifa: 8.50 },
    { cod: '018', desc: 'CONTROL PRENATAL Y ESTIMULACIÓN', tarifa: 15.00 },
    { cod: '068', desc: 'SALUD BUCAL Y ODONTOLOGÍA BÁSICA', tarifa: 14.00 },
    { cod: '071', desc: 'TAMIZAJE DE SALUD MENTAL', tarifa: 12.00 },
    { cod: '085', desc: 'PLANIFICACIÓN FAMILIAR Y CONSEJERÍA', tarifa: 10.00 },
    { cod: '092', desc: 'ATENCIÓN DE URGENCIAS Y TRIJE', tarifa: 25.00 },
  ];

  const profesionalesPool = [
    { dni: '08541236', nom: 'Dr. Roberto Carlos Silva Perez', tipo: 'MEDICO' },
    { dni: '40125896', nom: 'Lic. Maria Elena Gomez Torres', tipo: 'ENFERMERA' },
    { dni: '10258741', nom: 'Obst. Carmen Rosa Benites Ramos', tipo: 'OBSTETRA' },
    { dni: '45896321', nom: 'C.D. Juan Manuel Castro Rios', tipo: 'ODONTOLOGO' },
    { dni: '70258963', nom: 'Psic. Sofia Milagros Davila Luna', tipo: 'PSICOLOGO' },
    { dni: '41258963', nom: 'Dra. Ana Maria Valdivia Suarez', tipo: 'MEDICO' },
  ];

  const digitadoresPool = [
    'Lic. Patricia Vega Salas',
    'Tec. Marco Aurelio Soto',
    'Bach. Andrea Vivanco',
    'Tec. Julio Quispe Peña',
    'Lic. Lorena Rojas Ramos',
    'Ing. Carlos Gutierrez Miranda'
  ];

  const meses = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  const dias = ['01', '03', '07', '12', '15', '18', '22', '25', '28'];

  // Current max ID
  const maxRow = database.prepare('SELECT max(id) as maxId FROM atenciones').get() as { maxId: number | null };
  let currentMaxId = maxRow && maxRow.maxId ? Number(maxRow.maxId) : 0;

  const insertSql = `
    INSERT INTO atenciones (
      nro_formato, fecha_atencion, hora_atencion, tipo_doc, doc_identidad,
      beneficiario, edad, sexo, codigo_eess, nombre_eess, cod_servicio,
      descripcion_servicio, dni_profesional, nombre_profesional, tipo_profesional,
      colegiatura, rne, tarifa, historia_clinica, componente, condicion_materna,
      tipo_atencion, lugar_atencion, eess_referencia, fecha_registro, digitador,
      nro_cred, periodo_cierre, disa, cod_punto_digitacion, punto_digitacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const insertStmt = database.prepare(insertSql);
  const CHUNK_SIZE = 25000;
  let inserted = 0;

  const insertChunk = database.transaction((numToInsert: number) => {
    for (let i = 0; i < numToInsert; i++) {
      currentMaxId++;
      const eess = eessPool[currentMaxId % eessPool.length];
      const serv = serviciosPool[currentMaxId % serviciosPool.length];
      const prof = profesionalesPool[currentMaxId % profesionalesPool.length];
      const dig = digitadoresPool[currentMaxId % digitadoresPool.length];
      const mes = meses[currentMaxId % meses.length];
      const dia = dias[currentMaxId % dias.length];
      const fechaAt = `${mes}-${dia}`;
      const horaAt = `${String((currentMaxId % 12) + 7).padStart(2, '0')}:${String((currentMaxId * 7) % 60).padStart(2, '0')}:00`;
      const dniPac = String(10000000 + (currentMaxId % 8000000));
      const sexo = currentMaxId % 2 === 0 ? 'FEMENINO' : 'MASCULINO';
      const edad = (currentMaxId % 85) + 1;
      const fua = `FUA-2026-${String(currentMaxId).padStart(8, '0')}`;

      insertStmt.run(
        fua, fechaAt, horaAt, 'DNI', dniPac,
        `PACIENTE SIMULADO ${dniPac}`, edad, sexo, eess.cod, eess.nom, serv.cod,
        serv.desc, prof.dni, prof.nom, prof.tipo,
        'CMP-05421', 'RNE-0214', serv.tarifa, `HC-${dniPac.substring(0, 6)}`,
        'SUBSIDIADO', (edad > 15 && edad < 45 && sexo === 'FEMENINO' && currentMaxId % 5 === 0) ? 'GESTANTE' : 'NO APLICA',
        currentMaxId % 10 === 0 ? 'EXTRAMURAL' : 'AMBULATORIO', 'INTRAMURAL',
        '', `${mes}-28 14:00:00`, dig,
        `CRED-${currentMaxId % 1000}`, mes, eess.disa, eess.codPto, eess.pto
      );
    }
  });

  while (inserted < count) {
    const toInsert = Math.min(CHUNK_SIZE, count - inserted);
    insertChunk(toInsert);
    inserted += toInsert;
  }

  const totalNow = getCount(database, 'atenciones');
  const elapsedMs = Date.now() - start;

  return {
    generated: inserted,
    totalNow,
    elapsedMs,
  };
}

// -------------------------------------------------------------
// BACKUP CONTROL MANAGEMENT FUNCTIONS
// -------------------------------------------------------------

function ensureBackupsDirExists(): void {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

export function getBackupsList(): BackupRecord[] {
  const database = getDatabase();
  ensureBackupsDirExists();

  const rows = database.prepare(`
    SELECT id, filename, size_bytes, format, type, total_records, created_at, created_by, checksum, notes
    FROM backup_logs
    ORDER BY created_at DESC
  `).all() as BackupRecord[];

  return rows.map(r => {
    const filePath = path.join(BACKUPS_DIR, r.filename);
    let realSize = r.size_bytes;
    if (fs.existsSync(filePath)) {
      try {
        realSize = fs.statSync(filePath).size;
      } catch {}
    }
    return {
      ...r,
      size_bytes: realSize,
    };
  });
}

export function createDatabaseBackup(params: {
  type?: 'MANUAL' | 'AUTOMATICO' | 'RESTAURACION';
  format?: 'sqlite' | 'json' | 'sql';
  createdBy?: string;
  notes?: string;
}): BackupRecord {
  const database = getDatabase();
  ensureBackupsDirExists();

  const backupType = params.type || 'MANUAL';
  const format = params.format || 'sqlite';
  const createdBy = params.createdBy || 'Administrador';
  const now = new Date();

  // YYYYMMDD_HHmmss
  const dateStr = now.toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
  const id = `bkp_${Date.now()}`;
  
  const countRow = database.prepare('SELECT count(*) as total FROM atenciones').get() as { total: number };
  const totalRecords = countRow ? Number(countRow.total) : 0;

  let filename = `backup_minsa_${dateStr}.${format}`;
  let filePath = path.join(BACKUPS_DIR, filename);
  let fileSize = 0;

  if (format === 'sqlite') {
    try {
      database.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {
      console.warn('WAL checkpoint notice before backup:', e);
    }
    fs.copyFileSync(DB_FILE, filePath);
    fileSize = fs.statSync(filePath).size;
  } else if (format === 'json') {
    const atenciones = database.prepare('SELECT * FROM atenciones').all();
    const users = database.prepare('SELECT * FROM users').all();
    const digitadores = database.prepare('SELECT * FROM digitadores').all();
    const audit_logs = database.prepare('SELECT * FROM audit_logs').all();
    
    const dump = {
      system: 'MINSA Estadisticas Salud',
      version: '2.5',
      created_at: now.toISOString(),
      created_by: createdBy,
      total_atenciones: totalRecords,
      tables: {
        atenciones,
        users,
        digitadores,
        audit_logs
      }
    };
    
    const content = JSON.stringify(dump, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
    fileSize = Buffer.byteLength(content, 'utf-8');
  } else if (format === 'sql') {
    const sqlDump = generateFullSqlDumpString(database);
    fs.writeFileSync(filePath, sqlDump, 'utf-8');
    fileSize = Buffer.byteLength(sqlDump, 'utf-8');
  }

  const record: BackupRecord = {
    id,
    filename,
    size_bytes: fileSize,
    format,
    type: backupType,
    total_records: totalRecords,
    created_at: now.toISOString(),
    created_by: createdBy,
    notes: params.notes || `Respaldo ${backupType.toLowerCase()} generado correctamente (${format.toUpperCase()})`,
  };

  database.prepare(`
    INSERT INTO backup_logs (id, filename, size_bytes, format, type, total_records, created_at, created_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id, record.filename, record.size_bytes, record.format,
    record.type, record.total_records, record.created_at, record.created_by, record.notes
  );

  cleanOldBackupsPolicy();

  return record;
}

function cleanOldBackupsPolicy(): void {
  try {
    const settings = getBackupSettings();
    if (!settings.retention_count || settings.retention_count <= 0) return;

    const list = getBackupsList();

    if (list.length > settings.retention_count) {
      const toDelete = list.slice(settings.retention_count);
      for (const item of toDelete) {
        deleteBackupFileAndRecord(item.id, item.filename);
      }
    }
  } catch (e) {
    console.warn('Retention policy cleanup warning:', e);
  }
}

function deleteBackupFileAndRecord(id: string, filename: string): void {
  const database = getDatabase();
  database.prepare('DELETE FROM backup_logs WHERE id = ? OR filename = ?').run(id, filename);
  const filePath = path.join(BACKUPS_DIR, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.warn(`Could not delete backup file ${filename}:`, e);
    }
  }
}

export function deleteBackup(idOrFilename: string): boolean {
  const database = getDatabase();
  const row = database.prepare('SELECT * FROM backup_logs WHERE id = ? OR filename = ?').get(idOrFilename, idOrFilename) as BackupRecord | undefined;
  if (row) {
    deleteBackupFileAndRecord(row.id, row.filename);
    return true;
  }
  const filePath = path.join(BACKUPS_DIR, idOrFilename);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch {}
    return true;
  }
  return false;
}

export function restoreDatabaseBackup(filename: string, restoredBy: string): { success: boolean; totalRecords: number; message: string } {
  const database = getDatabase();
  ensureBackupsDirExists();

  const filePath = path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`El archivo de respaldo "${filename}" no existe en el servidor.`);
  }

  invalidateCache();

  if (filename.endsWith('.sqlite')) {
    database.pragma('wal_checkpoint(TRUNCATE)');
    database.close();
    db = null;

    fs.copyFileSync(filePath, DB_FILE);
    
    const restoredDb = getDatabase();
    const countRow = restoredDb.prepare('SELECT count(*) as total FROM atenciones').get() as { total: number };
    const total = countRow ? Number(countRow.total) : 0;

    restoredDb.prepare(`
      INSERT INTO audit_logs (id, fecha, usuario, rol, accion, detalle)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `log_${Date.now()}`, new Date().toISOString(), restoredBy, 'Administrador',
      'ACTUALIZACION', `Base de datos restaurada desde el respaldo ${filename} (${total} atenciones).`
    );

    return {
      success: true,
      totalRecords: total,
      message: `Restauración de SQLite completada exitosamente. Total de atenciones: ${total.toLocaleString()}.`,
    };
  } else if (filename.endsWith('.json')) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const dump = JSON.parse(raw);

    if (!dump.tables || !Array.isArray(dump.tables.atenciones)) {
      throw new Error('El archivo JSON no contiene un formato de respaldo válido de la aplicación.');
    }

    const insertAtenciones = database.transaction((items: any[]) => {
      database.prepare('DELETE FROM atenciones;').run();
      const insertStmt = database.prepare(`
        INSERT INTO atenciones (
          nro_formato, fecha_atencion, hora_atencion, tipo_doc, doc_identidad,
          beneficiario, edad, sexo, codigo_eess, nombre_eess, cod_servicio,
          descripcion_servicio, dni_profesional, nombre_profesional, tipo_profesional,
          colegiatura, rne, tarifa, historia_clinica, componente, condicion_materna,
          tipo_atencion, lugar_atencion, eess_referencia, fecha_registro, digitador,
          nro_cred, periodo_cierre, disa, cod_punto_digitacion, punto_digitacion
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `);

      for (const row of items) {
        insertStmt.run(
          row.nro_formato, row.fecha_atencion, row.hora_atencion, row.tipo_doc, row.doc_identidad,
          row.beneficiario, row.edad, row.sexo, row.codigo_eess, row.nombre_eess, row.cod_servicio,
          row.descripcion_servicio, row.dni_profesional, row.nombre_profesional, row.tipo_profesional,
          row.colegiatura, row.rne, row.tarifa, row.historia_clinica, row.componente, row.condicion_materna,
          row.tipo_atencion, row.lugar_atencion, row.eess_referencia, row.fecha_registro, row.digitador,
          row.nro_cred, row.periodo_cierre, row.disa, row.cod_punto_digitacion, row.punto_digitacion
        );
      }
    });

    insertAtenciones(dump.tables.atenciones);
    const countRow = database.prepare('SELECT count(*) as total FROM atenciones').get() as { total: number };
    const total = countRow ? Number(countRow.total) : 0;

    return {
      success: true,
      totalRecords: total,
      message: `Restauración JSON completada exitosamente. Se importaron ${total.toLocaleString()} atenciones.`,
    };
  }

  throw new Error('Formato de respaldo no soportado para restauración.');
}

export function getBackupSettings(): BackupSettings {
  const database = getDatabase();
  const row = database.prepare('SELECT enabled, frequency, scheduled_time, retention_count, last_run, next_run FROM backup_settings WHERE id = 1').get() as any;
  if (!row) {
    return {
      enabled: true,
      frequency: 'DIARIO',
      scheduled_time: '02:00',
      retention_count: 10,
    };
  }
  return {
    enabled: Boolean(row.enabled),
    frequency: row.frequency || 'DIARIO',
    scheduled_time: row.scheduled_time || '02:00',
    retention_count: Number(row.retention_count) || 10,
    last_run: row.last_run,
    next_run: row.next_run,
  };
}

export function updateBackupSettings(settings: Partial<BackupSettings>): BackupSettings {
  const database = getDatabase();
  const current = getBackupSettings();
  const updated: BackupSettings = {
    ...current,
    ...settings,
  };

  database.prepare(`
    UPDATE backup_settings
    SET enabled = ?, frequency = ?, scheduled_time = ?, retention_count = ?, last_run = ?, next_run = ?
    WHERE id = 1
  `).run(
    updated.enabled ? 1 : 0,
    updated.frequency,
    updated.scheduled_time,
    updated.retention_count,
    updated.last_run || null,
    updated.next_run || null
  );

  return updated;
}

export function generateFullSqlDumpString(databaseParam?: Database.Database): string {
  const database = databaseParam || getDatabase();
  let sql = `-- MINSA ESTADISTICAS DE SALUD - FULL SQL DATABASE DUMP\n`;
  sql += `-- Fecha de generación: ${new Date().toISOString()}\n`;
  sql += `-- Motor: SQLite 3 / Schema Compatible con PostgreSQL & MySQL\n\n`;

  const tables = ['atenciones', 'users', 'digitadores', 'district_coverage', 'audit_logs'];
  for (const table of tables) {
    try {
      const rows = database.prepare(`SELECT * FROM ${table}`).all();
      sql += `-- Tabla: ${table} (${rows.length} registros)\n`;
      if (rows.length > 0) {
        const firstRow = rows[0] as Record<string, any>;
        const keys = Object.keys(firstRow);
        for (const r of rows) {
          const vals = keys.map(k => {
            const v = (r as any)[k];
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number') return v;
            return `'${String(v).replace(/'/g, "''")}'`;
          });
          sql += `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${vals.join(', ')});\n`;
        }
      }
      sql += `\n`;
    } catch (e) {
      console.warn(`Could not dump table ${table}:`, e);
    }
  }

  return sql;
}
