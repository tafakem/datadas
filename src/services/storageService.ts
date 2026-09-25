import { Atencion, User, AuditLog, DistrictCoverage } from '../types/health';
import { INITIAL_ATENCIONES, INITIAL_USERS, INITIAL_LOGS, INITIAL_DISTRICTS } from '../data/mockData';

const ATENCIONES_KEY = 'minsa_estadisticas_atenciones_v2';
const USERS_KEY = 'minsa_estadisticas_usuarios_v1';
const LOGS_KEY = 'minsa_estadisticas_logs_v1';
const CURRENT_USER_KEY = 'minsa_estadisticas_current_user_v1';
const DISTRICTS_KEY = 'minsa_estadisticas_distritos_v1';

class StorageService {
  private cacheAtenciones: Atencion[] | null = null;

  getAtenciones(): Atencion[] {
    if (this.cacheAtenciones && this.cacheAtenciones.length > 0) {
      return this.cacheAtenciones;
    }
    try {
      const data = localStorage.getItem(ATENCIONES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cacheAtenciones = parsed;
          return this.cacheAtenciones;
        }
      }
    } catch (e) {
      console.error('Error reading atenciones from localStorage:', e);
    }
    this.cacheAtenciones = [...INITIAL_ATENCIONES];
    this.saveAtenciones(this.cacheAtenciones);
    return this.cacheAtenciones;
  }

  saveAtenciones(atenciones: Atencion[]): void {
    this.cacheAtenciones = atenciones;
    try {
      localStorage.setItem(ATENCIONES_KEY, JSON.stringify(atenciones));
    } catch (e) {
      console.error('Error saving atenciones:', e);
    }
  }

  addAtenciones(nuevas: Omit<Atencion, 'id'>[], updateExisting: boolean): { added: number; updated: number; skipped: number } {
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
    const actuales = this.getAtenciones();
    const filtradas = actuales.filter(a => a.periodo_cierre !== period);
    const deletedCount = actuales.length - filtradas.length;
    this.saveAtenciones(filtradas);
    return deletedCount;
  }

  deleteAtencion(id: number): boolean {
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
        usuario_actualiza: this.getCurrentUser()?.username || 'admin',
      };
      this.saveAtenciones(actuales);
    }
  }

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
    // Keep last 200 logs
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

  resetToDefaultData(): void {
    this.cacheAtenciones = null;
    this.saveAtenciones(INITIAL_ATENCIONES);
    this.saveUsers(INITIAL_USERS);
    this.saveAuditLogs(INITIAL_LOGS);
    localStorage.setItem(DISTRICTS_KEY, JSON.stringify(INITIAL_DISTRICTS));
  }

  exportFullBackup(): string {
    return JSON.stringify({
      version: '1.0',
      exported_at: new Date().toISOString(),
      atenciones: this.getAtenciones(),
      usuarios: this.getUsers(),
      auditoria_logs: this.getAuditLogs(),
      distritos: this.getDistricts(),
    }, null, 2);
  }

  importFullBackup(jsonContent: string): boolean {
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed.atenciones && Array.isArray(parsed.atenciones)) {
        this.saveAtenciones(parsed.atenciones);
      }
      if (parsed.usuarios && Array.isArray(parsed.usuarios)) {
        this.saveUsers(parsed.usuarios);
      }
      if (parsed.auditoria_logs && Array.isArray(parsed.auditoria_logs)) {
        this.saveAuditLogs(parsed.auditoria_logs);
      }
      if (parsed.distritos && Array.isArray(parsed.distritos)) {
        localStorage.setItem(DISTRICTS_KEY, JSON.stringify(parsed.distritos));
      }
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
}

export const storageService = new StorageService();
