import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { Atencion, DigitadorRecord, User, AuditLog, DistrictCoverage } from '../types/health';
import { INITIAL_ATENCIONES, INITIAL_USERS, INITIAL_LOGS, INITIAL_DISTRICTS, INITIAL_DIGITADORES } from '../data/mockData';

const DB_DIR = path.resolve('data');
const DB_FILE = path.join(DB_DIR, 'minsa_database.sqlite');

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
  if (filters.periodo) {
    conditions.push('periodo_cierre = ?');
    binds.push(filters.periodo);
  }
  if (filters.eess) {
    conditions.push('(codigo_eess = ? OR nombre_eess = ?)');
    binds.push(filters.eess, filters.eess);
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

  if (search && search.trim()) {
    const s = `%${search.trim().toLowerCase()}%`;
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
  const pageSize = Math.max(1, Math.min(100, Number(params.pageSize) || 15));
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
  const { whereClause, binds } = buildFilterClause(filters);

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

  // 2. Monthly Trend (group by indexed periodo_cierre)
  const monthlySql = `
    SELECT 
      periodo_cierre as mes,
      count(*) as total,
      count(DISTINCT doc_identidad) as pacientes,
      coalesce(sum(tarifa), 0) as tarifa
    FROM atenciones
    ${whereClause}
    GROUP BY periodo_cierre
    ORDER BY periodo_cierre ASC
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
