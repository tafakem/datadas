import { Atencion, DigitadorRecord, FilterState } from '../types/health';

export interface PagedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStatsResponse {
  kpis: {
    totalAtenciones: number;
    pacientesUnicos: number;
    totalEess: number;
    totalProfesionales: number;
    montoTotal: number;
  };
  monthlyData: { mes: string; total: number; pacientes: number; tarifa: number }[];
  topEess: { nombre: string; codigo: string; atenciones: number; pacientes: number; totalTarifa: number }[];
  topServicios: { servicio: string; codigo: string; cantidad: number; tarifa: number }[];
  sexoDistribucion: Record<string, number>;
  topPuntos: { punto: string; codigo: string; totalAtenciones: number; totalDigitadores: number }[];
}

export interface FilterOptionsResponse {
  eessList: { codigo: string; nombre: string }[];
  profesionalesList: { dni: string; nombre: string; tipo: string }[];
  serviciosList: { codigo: string; descripcion: string }[];
  puntosList: { codigo: string; nombre: string }[];
  disasList: string[];
  periodosList: string[];
}

export interface BatchUploadResult {
  added: number;
  updated: number;
  skipped: number;
  errors: { row: number; format: string; error: string }[];
}

class ApiService {
  private cacheStats = new Map<string, { data: any; expires: number }>();
  private cacheOptions: { data: FilterOptionsResponse; expires: number } | null = null;

  async getHealth(): Promise<{ status: string; totalAtenciones: number; engine: string }> {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Servidor no disponible');
    return res.json();
  }

  async getAtencionesPaged(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    filters?: Partial<FilterState>;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
  }): Promise<PagedResponse<Atencion>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    if (params.search) query.set('search', params.search);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortDir) query.set('sortDir', params.sortDir);

    if (params.filters) {
      for (const [key, val] of Object.entries(params.filters)) {
        if (val && val !== 'TODOS') {
          query.set(key, val);
        }
      }
    }

    const res = await fetch(`/api/atenciones?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener atenciones');
    }
    return res.json();
  }

  async getDashboardStats(filters?: Partial<FilterState>): Promise<DashboardStatsResponse> {
    const query = new URLSearchParams();
    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        if (val && val !== 'TODOS') query.set(key, val);
      }
    }
    const cacheKey = query.toString();
    const cached = this.cacheStats.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    const res = await fetch(`/api/stats/dashboard?${cacheKey}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al calcular estadísticas');
    }
    const data = await res.json();
    this.cacheStats.set(cacheKey, { data, expires: Date.now() + 30000 });
    return data;
  }

  async getFilterOptions(): Promise<FilterOptionsResponse> {
    if (this.cacheOptions && Date.now() < this.cacheOptions.expires) {
      return this.cacheOptions.data;
    }

    const res = await fetch('/api/filter-options');
    if (!res.ok) throw new Error('Error al cargar opciones de filtrado');
    const data = await res.json();
    this.cacheOptions = { data, expires: Date.now() + 60000 };
    return data;
  }

  async uploadAtencionesBatch(
    rows: Omit<Atencion, 'id'>[],
    updateExisting: boolean,
    currentUser = 'sistema'
  ): Promise<BatchUploadResult> {
    this.cacheStats.clear();
    this.cacheOptions = null;

    const res = await fetch('/api/atenciones/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, updateExisting, currentUser }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al procesar lote en base de datos');
    }
    return res.json();
  }

  async deleteByPeriod(period: string): Promise<number> {
    this.cacheStats.clear();
    this.cacheOptions = null;

    const res = await fetch('/api/atenciones/delete-period', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al eliminar período');
    }
    const data = await res.json();
    return data.count || 0;
  }

  async deleteAtencion(id: number): Promise<boolean> {
    this.cacheStats.clear();
    const res = await fetch(`/api/atenciones/${id}`, { method: 'DELETE' });
    return res.ok;
  }

  async getDigitadores(): Promise<DigitadorRecord[]> {
    const res = await fetch('/api/digitadores');
    if (!res.ok) throw new Error('Error al obtener digitadores');
    return res.json();
  }

  async uploadDigitadoresBatch(items: Omit<DigitadorRecord, 'id'>[]): Promise<{ added: number; updated: number }> {
    const res = await fetch('/api/digitadores/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) throw new Error('Error al guardar digitadores');
    return res.json();
  }

  async deleteDigitador(id: string): Promise<boolean> {
    const res = await fetch(`/api/digitadores/${id}`, { method: 'DELETE' });
    return res.ok;
  }

  async generateBenchmark(count: number): Promise<{ generated: number; totalNow: number; elapsedMs: number }> {
    this.cacheStats.clear();
    this.cacheOptions = null;
    const res = await fetch('/api/benchmark/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error en benchmark');
    }
    return res.json();
  }
}

export const apiService = new ApiService();
