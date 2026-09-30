import { Atencion, User, AuditLog, DistrictCoverage, DigitadorRecord, FilterState } from '../types/health';
import { INITIAL_ATENCIONES, INITIAL_USERS, INITIAL_LOGS, INITIAL_DISTRICTS, INITIAL_DIGITADORES } from '../data/mockData';
import { apiService, PagedResponse, DashboardStatsResponse, FilterOptionsResponse } from './apiService';

const ATENCIONES_KEY = 'minsa_estadisticas_atenciones_v2';
const USERS_KEY = 'minsa_estadisticas_usuarios_v1';
const LOGS_KEY = 'minsa_estadisticas_logs_v1';
const CURRENT_USER_KEY = 'minsa_estadisticas_current_user_v1';
const DISTRICTS_KEY = 'minsa_estadisticas_distritos_v1';
const DIGITADORES_KEY = 'minsa_estadisticas_digitadores_v1';

class StorageService {
  private cacheAtenciones: Atencion[] | null = null;
  private cacheDigitadores: DigitadorRecord[] | null = null;
  private isServerSynced = false;

  constructor() {
    this.initSync();
  }

  private async initSync() {
    try {
      // Warm up filter options and health from backend
      const health = await apiService.getHealth().catch(() => null);
      if (health && health.totalAtenciones > 0) {
        this.isServerSynced = true;
      }
    } catch {
      // offline or startup
    }
  }

  /**
   * High-performance Server-Side Pagination
   */
  async fetchAtencionesPaged(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    filters?: Partial<FilterState>;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
  }): Promise<PagedResponse<Atencion>> {
    return apiService.getAtencionesPaged(params);
  }

  /**
   * High-performance Server-Side Aggregated Stats for Dashboards
   */
  async fetchDashboardStats(filters?: Partial<FilterState>): Promise<DashboardStatsResponse> {
    return apiService.getDashboardStats(filters);
  }

  /**
   * Filter Options for Dropdowns
   */
  async fetchFilterOptions(): Promise<FilterOptionsResponse> {
    return apiService.getFilterOptions();
  }

  // ===================== SYNCHRONOUS / COMPATIBILITY LAYER =====================

  getAtenciones(): Atencion[] {
    if (this.cacheAtenciones && this.cacheAtenciones.length > 0) {
      return this.cacheAtenciones;
    }
    try {
      const data = localStorage.getItem(ATENCIONES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this.cacheAtenciones = parsed;
          return this.cacheAtenciones;
        }
      }
    } catch (e) {
      console.error('Error reading atenciones from localStorage:', e);
    }
    this.cacheAtenciones = [];
    this.saveAtenciones(this.cacheAtenciones);
    return this.cacheAtenciones;
  }

  saveAtenciones(atenciones: Atencion[]): void {
    this.cacheAtenciones = atenciones;
    try {
      // Safe storage: cap localStorage to 500 rows to prevent QuotaExceededError with millions of rows
      const safeToStore = atenciones.length > 500 ? atenciones.slice(0, 500) : atenciones;
      localStorage.setItem(ATENCIONES_KEY, JSON.stringify(safeToStore));
    } catch (e) {
      console.warn('LocalStorage quota limit reached, relying on SQLite backend.', e);
    }
  }

  addAtenciones(nuevas: Omit<Atencion, 'id'>[], updateExisting: boolean): { added: number; updated: number; skipped: number } {
    // 1. Send asynchronously to SQLite backend
    apiService.uploadAtencionesBatch(nuevas, updateExisting, this.getCurrentUser()?.username || 'sistema').catch(err => {
      console.error('Failed to sync batch to SQLite backend:', err);
    });

    // 2. Local in-memory working array update
    const actuales = this.getAtenciones();
    let currentMaxId = actuales.reduce((max, a) => Math.max(max, a.id), 0);
    
    let added = 0;
    let updated = 0;
    let skipped = 0;

    const mapByFormato = new Map<string, number>();
    actuales.forEach((a, index) => {
      mapByFormato.set(a.nro_formato, index);
    });

    const resultList = [...actuales];

    for (const item of nuevas) {
      const existingIdx = mapByFormato.get(item.nro_formato);
      if (existingIdx !== undefined) {
        if (updateExisting) {
          resultList[existingIdx] = {
            ...item,
            id: resultList[existingIdx].id,
            fecha_actualiza: new Date().toISOString().replace('T', ' ').substring(0, 19),
            usuario_actualiza: this.getCurrentUser()?.username || 'sistema',
          };
          updated++;
        } else {
          skipped++;
        }
      } else {
        currentMaxId++;
        const newRecord: Atencion = {
          ...item,
          id: currentMaxId,
        };
        resultList.push(newRecord);
        mapByFormato.set(item.nro_formato, resultList.length - 1);
        added++;
      }
    }

    this.saveAtenciones(resultList);
    return { added, updated, skipped };
  }

  deleteByPeriod(period: string): number {
    apiService.deleteByPeriod(period).catch(console.error);

    const actuales = this.getAtenciones();
    const filtradas = actuales.filter(a => a.periodo_cierre !== period);
    const deletedCount = actuales.length - filtradas.length;
    this.saveAtenciones(filtradas);
    return deletedCount;
  }

  deleteAtencion(id: number): boolean {
    apiService.deleteAtencion(id).catch(console.error);

    const actuales = this.getAtenciones();
    const filtradas = actuales.filter(a => a.id !== id);
    if (filtradas.length !== actuales.length) {
      this.saveAtenciones(filtradas);
      return true;
    }
    return false;
  }

  updateAtencion(updated: Atencion): void {
    const actuales = this.getAtenciones();
    const index = actuales.findIndex(a => a.id === updated.id);
    if (index !== -1) {
      actuales[index] = {
        ...updated,
        fecha_actualiza: new Date().toISOString().replace('T', ' ').substring(0, 19),
        usuario_actualiza: this.getCurrentUser()?.username || 'sistema',
      };
      this.saveAtenciones(actuales);
    }
  }

  getDigitadores(): DigitadorRecord[] {
    if (this.cacheDigitadores && this.cacheDigitadores.length > 0) {
      return this.cacheDigitadores;
    }
    try {
      const data = localStorage.getItem(DIGITADORES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cacheDigitadores = parsed;
          return this.cacheDigitadores;
        }
      }
    } catch (e) {
      console.error('Error reading digitadores from localStorage:', e);
    }
    this.cacheDigitadores = [...INITIAL_DIGITADORES];
    this.saveDigitadores(this.cacheDigitadores);
    return this.cacheDigitadores;
  }

  saveDigitadores(digitadores: DigitadorRecord[]): void {
    this.cacheDigitadores = digitadores;
    try {
      localStorage.setItem(DIGITADORES_KEY, JSON.stringify(digitadores));
    } catch (e) {
      console.error('Error saving digitadores:', e);
    }
  }

  addOrUpdateDigitadores(nuevos: Omit<DigitadorRecord, 'id'>[]): { added: number; updated: number } {
    apiService.uploadDigitadoresBatch(nuevos).catch(console.error);

    const actuales = this.getDigitadores();
    let added = 0;
    let updated = 0;

    const normalize = (s: string) => s.trim().toLowerCase().replace(/^(lic\.|tec\.|bach\.|dr\.|dra\.|ing\.)\s*/i, '');

    const result = [...actuales];

    for (const item of nuevos) {
      const itemUsuario = (item.usuario || '').trim().toLowerCase();
      const existingIdx = result.findIndex(d => 
        (itemUsuario && d.usuario && d.usuario.trim().toLowerCase() === itemUsuario) ||
        (item.dni && d.dni && d.dni.trim() === item.dni.trim()) ||
        (normalize(d.nombre_completo) === normalize(item.nombre_completo))
      );

      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

      if (existingIdx !== -1) {
        result[existingIdx] = {
          ...result[existingIdx],
          ...item,
          punto_digitacion: item.punto_digitacion || result[existingIdx].punto_digitacion,
          cod_punto_digitacion: item.cod_punto_digitacion || result[existingIdx].cod_punto_digitacion,
          codigo_eess: item.codigo_eess || result[existingIdx].codigo_eess,
          nombre_eess: item.nombre_eess || result[existingIdx].nombre_eess,
          id: result[existingIdx].id,
          fecha_actualizacion: nowStr,
        };
        updated++;
      } else {
        const newRecord: DigitadorRecord = {
          ...item,
          id: `dig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          fecha_creacion: nowStr,
          fecha_actualizacion: nowStr,
        };
        result.push(newRecord);
        added++;
      }
    }

    this.saveDigitadores(result);
    return { added, updated };
  }

  addDigitador(digitador: Omit<DigitadorRecord, 'id'>): DigitadorRecord {
    const list = this.getDigitadores();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newRecord: DigitadorRecord = {
      ...digitador,
      id: `dig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fecha_creacion: nowStr,
      fecha_actualizacion: nowStr,
    };
    list.push(newRecord);
    this.saveDigitadores(list);
    apiService.uploadDigitadoresBatch([digitador]).catch(console.error);
    return newRecord;
  }

  updateDigitador(digitador: DigitadorRecord): void {
    const list = this.getDigitadores();
    const idx = list.findIndex(d => d.id === digitador.id);
    if (idx !== -1) {
      list[idx] = {
        ...digitador,
        fecha_actualizacion: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
      this.saveDigitadores(list);
      apiService.uploadDigitadoresBatch([digitador]).catch(console.error);
    }
  }

  deleteDigitador(id: string): boolean {
    apiService.deleteDigitador(id).catch(console.error);
    const list = this.getDigitadores();
    const filtered = list.filter(d => d.id !== id);
    if (filtered.length !== list.length) {
      this.saveDigitadores(filtered);
      return true;
    }
    return false;
  }

  // ===================== USUARIOS =====================

  getUsers(): User[] {
    try {
      const data = localStorage.getItem(USERS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading users:', e);
    }
    this.saveUsers(INITIAL_USERS);
    return INITIAL_USERS;
  }

  saveUsers(users: User[]): void {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users:', e);
    }
  }

  addUser(user: Omit<User, 'id'>): User {
    const users = this.getUsers();
    const newUser: User = {
      ...user,
      id: `usr-${Date.now()}`,
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  updateUser(user: User): void {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx] = user;
      this.saveUsers(users);
    }
  }

  deleteUser(id: string): void {
    const users = this.getUsers();
    const filtered = users.filter(u => u.id !== id);
    this.saveUsers(filtered);
  }

  getCurrentUser(): User | null {
    try {
      const data = localStorage.getItem(CURRENT_USER_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading current user:', e);
    }
    return null;
  }

  setCurrentUser(user: User | null): void {
    if (!user) {
      localStorage.removeItem(CURRENT_USER_KEY);
    } else {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }
  }

  getAuditLogs(): AuditLog[] {
    try {
      const data = localStorage.getItem(LOGS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading logs:', e);
    }
    this.saveAuditLogs(INITIAL_LOGS);
    return INITIAL_LOGS;
  }

  saveAuditLogs(logs: AuditLog[]): void {
    try {
      localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Error saving logs:', e);
    }
  }

  addAuditLog(accion: AuditLog['accion'], detalle: string): void {
    const logs = this.getAuditLogs();
    const current = this.getCurrentUser();
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      fecha: new Date().toISOString().replace('T', ' ').substring(0, 19),
      usuario: current?.username || 'invitado',
      rol: current?.rol || 'Consultor',
      accion,
      detalle,
      ip: '192.168.1.100',
    };
    logs.unshift(newLog);
    this.saveAuditLogs(logs.slice(0, 200));
  }

  getDistricts(): DistrictCoverage[] {
    try {
      const data = localStorage.getItem(DISTRICTS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Error reading districts:', e);
    }
    localStorage.setItem(DISTRICTS_KEY, JSON.stringify(INITIAL_DISTRICTS));
    return INITIAL_DISTRICTS;
  }

  clearDemoDataPreserveUsers(): void {
    this.cacheAtenciones = null;
    this.saveAtenciones([]);
    apiService.clearDemoData().catch(console.error);
    this.addAuditLog('ELIMINACION', 'Eliminación masiva de datos de demostración conservando la tabla de usuarios intacta.');
  }

  resetToDefaultData(): void {
    this.cacheAtenciones = null;
    this.cacheDigitadores = null;
    this.saveAtenciones([]);
    apiService.clearDemoData().catch(console.error);
    this.saveDigitadores(INITIAL_DIGITADORES);
    this.saveUsers(INITIAL_USERS);
    this.saveAuditLogs(INITIAL_LOGS);
    localStorage.setItem(DISTRICTS_KEY, JSON.stringify(INITIAL_DISTRICTS));
  }

  exportFullBackup(): string {
    return JSON.stringify({
      version: '2.0',
      exported_at: new Date().toISOString(),
      atenciones: this.getAtenciones(),
      digitadores: this.getDigitadores(),
      users: this.getUsers(),
      logs: this.getAuditLogs(),
      districts: this.getDistricts(),
    }, null, 2);
  }

  restoreBackup(jsonString: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'El archivo no contiene un formato JSON válido.' };
      }

      if (Array.isArray(data.atenciones)) {
        this.saveAtenciones(data.atenciones);
      }
      if (Array.isArray(data.digitadores)) {
        this.saveDigitadores(data.digitadores);
      }
      if (Array.isArray(data.users)) {
        this.saveUsers(data.users);
      }
      if (Array.isArray(data.districts)) {
        localStorage.setItem(DISTRICTS_KEY, JSON.stringify(data.districts));
      }

      this.addAuditLog('ACTUALIZACION', 'Restauración completa del sistema desde copia de seguridad JSON');
      return { success: true, message: 'Copia de seguridad restaurada correctamente.' };
    } catch (err: unknown) {
      return { success: false, message: `Error al restaurar: ${(err as Error).message}` };
    }
  }
}

export const storageService = new StorageService();
