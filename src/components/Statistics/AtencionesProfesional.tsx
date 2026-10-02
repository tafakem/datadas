import React, { useState, useMemo, useEffect } from 'react';
import {
  UserCheck,
  Stethoscope,
  Search,
  Trophy,
  Building2,
  Calendar,
  Download,
  Filter,
  ArrowRight,
  Award,
  Activity,
  Layers,
  Briefcase,
  Clock,
  User,
  CheckCircle2,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  FileText,
} from 'lucide-react';
import { Atencion, FilterState } from '../../types/health';
import { PdfService } from '../../services/pdfService';
import { apiService } from '../../services/apiService';

interface Props {
  atenciones: Atencion[];
  filters?: Partial<FilterState>;
}

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemName?: string;
}

const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemName = 'registros',
}) => {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-3 text-slate-500">
        <span>
          Mostrando <strong className="text-slate-800 font-mono">{startItem}</strong> -{' '}
          <strong className="text-slate-800 font-mono">{endItem}</strong> de{' '}
          <strong className="text-slate-800 font-mono">{totalItems}</strong> {itemName}
        </span>
        <div className="flex items-center space-x-1.5 pl-3 border-l border-slate-200">
          <span className="text-[11px] text-slate-400">Por pág:</span>
          <select
            value={pageSize}
            onChange={e => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="bg-white border border-slate-200 text-slate-700 font-bold rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition-colors"
          title="Primera página"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition-colors"
          title="Página anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center space-x-1 px-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1 text-slate-400 font-bold select-none">
                  …
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(Number(p))}
                className={`min-w-[28px] h-7 px-2 font-mono font-bold rounded-lg text-xs transition-colors ${
                  isCurrent
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition-colors"
          title="Página siguiente"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition-colors"
          title="Última página"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// Helper to extract year and month from fecha_atencion
export const extractMesAtencion = (
  fechaAtencion: string | undefined
): { key: string; label: string; year: number; month: number } => {
  if (!fechaAtencion) return { key: 'S/F', label: 'Sin Fecha', year: 0, month: 0 };
  const str = String(fechaAtencion).trim();
  const match = str.match(/^(\d{4})[-/](\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const label = `${months[month - 1] || 'Mes ' + month} ${year}`;
    return { key, label, year, month };
  }
  return { key: str.substring(0, 7), label: str.substring(0, 7), year: 0, month: 0 };
};

export const AtencionesProfesional: React.FC<Props> = ({ atenciones, filters }) => {
  const [activeTab, setActiveTab] = useState<'ranking' | 'meses' | 'eess' | 'ficha'>('ranking');
  const [selectedTipo, setSelectedTipo] = useState<string>('TODOS');
  const [selectedEessFilter, setSelectedEessFilter] = useState<string>('TODOS');
  const [selectedMesFilter, setSelectedMesFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProfDni, setSelectedProfDni] = useState<string | null>(null);

  // Pagination for tables
  const [pageSize, setPageSize] = useState<number>(15);
  const [pageRanking, setPageRanking] = useState<number>(1);
  const [pageMeses, setPageMeses] = useState<number>(1);
  const [pageEess, setPageEess] = useState<number>(1);
  const [pageFicha, setPageFicha] = useState<number>(1);

  const resetAllPages = () => {
    setPageRanking(1);
    setPageMeses(1);
    setPageEess(1);
    setPageFicha(1);
  };

  // Extract distinct professional types
  const allTipos = useMemo(() => {
    return Array.from(new Set(atenciones.map(a => a.tipo_profesional))).filter(Boolean).sort();
  }, [atenciones]);

  // Extract distinct EESS
  const allEessList = useMemo(() => {
    return Array.from(new Set(atenciones.map(a => a.nombre_eess))).filter(Boolean).sort();
  }, [atenciones]);

  // Extract distinct months based on fecha_atencion
  const allMonthsList = useMemo(() => {
    const map = new Map<string, { key: string; label: string; year: number; month: number }>();
    atenciones.forEach(a => {
      const m = extractMesAtencion(a.fecha_atencion);
      if (m.key !== 'S/F' && !map.has(m.key)) {
        map.set(m.key, m);
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [atenciones]);

  // 1. Comprehensive Professional Aggregation
  interface ProfData {
    dni: string;
    nombre: string;
    tipo: string;
    colegiatura: string;
    rne: string;
    totalAtenciones: number;
    montoTotalFacturado: number;
    fechasAtencion: Set<string>;
    servicios: Set<string>;
    serviciosMap: Record<
      string,
      {
        nombre: string;
        codigo: string;
        count: number;
        tarifaTotal: number;
      }
    >;
    eessMap: Record<
      string,
      {
        nombre: string;
        codigo: string;
        count: number;
        mesesCounts: Record<string, number>;
        fechas: Set<string>;
        servicios: Set<string>;
        minFecha: string;
        maxFecha: string;
      }
    >;
    mesesMap: Record<
      string,
      {
        key: string;
        label: string;
        count: number;
        fechas: Set<string>;
        eess: Set<string>;
      }
    >;
    minFecha: string;
    maxFecha: string;
  }

  const profAggregated = useMemo(() => {
    const map: Record<string, ProfData> = {};

    atenciones.forEach(a => {
      const dni = (a.dni_profesional || 'SIN_DNI').trim();
      const nombre = (a.nombre_profesional || 'PROFESIONAL NO IDENTIFICADO').trim();
      const key = dni !== 'SIN_DNI' ? dni : nombre;

      if (!map[key]) {
        map[key] = {
          dni,
          nombre,
          tipo: a.tipo_profesional || 'ASISTENCIAL',
          colegiatura: a.colegiatura || '',
          rne: a.rne || '',
          totalAtenciones: 0,
          montoTotalFacturado: 0,
          fechasAtencion: new Set(),
          servicios: new Set(),
          serviciosMap: {},
          eessMap: {},
          mesesMap: {},
          minFecha: a.fecha_atencion || '',
          maxFecha: a.fecha_atencion || '',
        };
      }

      const p = map[key];
      p.totalAtenciones++;
      p.montoTotalFacturado += Number(a.tarifa) || 0;

      if (a.fecha_atencion) {
        p.fechasAtencion.add(a.fecha_atencion);
        if (!p.minFecha || a.fecha_atencion < p.minFecha) p.minFecha = a.fecha_atencion;
        if (!p.maxFecha || a.fecha_atencion > p.maxFecha) p.maxFecha = a.fecha_atencion;
      }

      if (a.descripcion_servicio) {
        p.servicios.add(a.descripcion_servicio);
        const srvName = a.descripcion_servicio.trim();
        if (!p.serviciosMap[srvName]) {
          p.serviciosMap[srvName] = {
            nombre: srvName,
            codigo: a.cod_servicio || '',
            count: 0,
            tarifaTotal: 0,
          };
        }
        p.serviciosMap[srvName].count++;
        p.serviciosMap[srvName].tarifaTotal += Number(a.tarifa) || 0;
      }

      // Breakdown by Month of Attention (fecha_atencion)
      const mesInfo = extractMesAtencion(a.fecha_atencion);
      if (!p.mesesMap[mesInfo.key]) {
        p.mesesMap[mesInfo.key] = {
          key: mesInfo.key,
          label: mesInfo.label,
          count: 0,
          fechas: new Set(),
          eess: new Set(),
        };
      }
      p.mesesMap[mesInfo.key].count++;
      if (a.fecha_atencion) p.mesesMap[mesInfo.key].fechas.add(a.fecha_atencion);
      if (a.nombre_eess) p.mesesMap[mesInfo.key].eess.add(a.nombre_eess);

      // Breakdown by EESS
      const eessName = a.nombre_eess || 'EESS SIN NOMBRE';
      if (!p.eessMap[eessName]) {
        p.eessMap[eessName] = {
          nombre: eessName,
          codigo: a.codigo_eess || '',
          count: 0,
          mesesCounts: {},
          fechas: new Set(),
          servicios: new Set(),
          minFecha: a.fecha_atencion || '',
          maxFecha: a.fecha_atencion || '',
        };
      }
      p.eessMap[eessName].count++;
      p.eessMap[eessName].mesesCounts[mesInfo.key] = (p.eessMap[eessName].mesesCounts[mesInfo.key] || 0) + 1;
      if (a.fecha_atencion) {
        p.eessMap[eessName].fechas.add(a.fecha_atencion);
        if (!p.eessMap[eessName].minFecha || a.fecha_atencion < p.eessMap[eessName].minFecha) {
          p.eessMap[eessName].minFecha = a.fecha_atencion;
        }
        if (!p.eessMap[eessName].maxFecha || a.fecha_atencion > p.eessMap[eessName].maxFecha) {
          p.eessMap[eessName].maxFecha = a.fecha_atencion;
        }
      }
      if (a.descripcion_servicio) {
        p.eessMap[eessName].servicios.add(a.descripcion_servicio);
      }
    });

    return Object.values(map).sort((a, b) => b.totalAtenciones - a.totalAtenciones);
  }, [atenciones]);

  const [serverStats, setServerStats] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const combinedFilters = {
      ...filters,
      search: searchTerm.trim(),
    };
    apiService.getModulesStats(combinedFilters).then(data => {
      if (active) setServerStats(data);
    }).catch(err => console.warn('Prof stats notice:', err));
    return () => { active = false; };
  }, [filters, searchTerm, atenciones]);

  // Filtered professionals list based on search and top filters
  const filteredProfList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return profAggregated.filter(p => {
      // Type filter
      if (selectedTipo !== 'TODOS' && p.tipo !== selectedTipo) return false;

      // EESS filter
      if (selectedEessFilter !== 'TODOS' && !p.eessMap[selectedEessFilter]) return false;

      // Mes filter
      if (selectedMesFilter !== 'TODOS' && !p.mesesMap[selectedMesFilter]) return false;

      // Search term
      if (term) {
        const matchName = p.nombre.toLowerCase().includes(term);
        const matchDni = p.dni.includes(term);
        const matchCol = p.colegiatura.toLowerCase().includes(term);
        const matchRne = p.rne.toLowerCase().includes(term);
        const matchEess = Object.keys(p.eessMap).some(e => e.toLowerCase().includes(term));
        if (!matchName && !matchDni && !matchCol && !matchRne && !matchEess) return false;
      }

      return true;
    });
  }, [profAggregated, selectedTipo, selectedEessFilter, selectedMesFilter, searchTerm]);

  // Selected professional object for Ficha view
  const currentProf = useMemo(() => {
    if (!selectedProfDni) {
      return filteredProfList[0] || profAggregated[0] || null;
    }
    return profAggregated.find(p => p.dni === selectedProfDni || p.nombre === selectedProfDni) || null;
  }, [selectedProfDni, filteredProfList, profAggregated]);

  // Attentions of current professional
  const currentProfAtenciones = useMemo(() => {
    if (!currentProf) return [];
    return atenciones
      .filter(a => {
        if (currentProf.dni !== 'SIN_DNI') {
          return a.dni_profesional === currentProf.dni;
        }
        return a.nombre_profesional === currentProf.nombre;
      })
      .sort((a, b) => (b.fecha_atencion || '').localeCompare(a.fecha_atencion || ''));
  }, [atenciones, currentProf]);

  // Top 10 for visual chart
  const top10 = useMemo(() => filteredProfList.slice(0, 10), [filteredProfList]);
  const maxTopVal = useMemo(() => Math.max(...top10.map(t => t.totalAtenciones), 1), [top10]);

  // Professional - EESS flat pairs for Table 3
  const profEessPairs = useMemo(() => {
    const list: Array<{
      profDni: string;
      profNombre: string;
      profTipo: string;
      profCol: string;
      eessNombre: string;
      eessCodigo: string;
      count: number;
      pctOfProf: number;
      diasLaborados: number;
      minFecha: string;
      maxFecha: string;
      serviciosCount: number;
      serviciosList: string[];
    }> = [];

    filteredProfList.forEach(p => {
      Object.values(p.eessMap).forEach(e => {
        if (selectedEessFilter !== 'TODOS' && e.nombre !== selectedEessFilter) return;

        const pct = Math.round((e.count / (p.totalAtenciones || 1)) * 1000) / 10;
        list.push({
          profDni: p.dni,
          profNombre: p.nombre,
          profTipo: p.tipo,
          profCol: p.colegiatura,
          eessNombre: e.nombre,
          eessCodigo: e.codigo,
          count: e.count,
          pctOfProf: pct,
          diasLaborados: e.fechas.size,
          minFecha: e.minFecha,
          maxFecha: e.maxFecha,
          serviciosCount: e.servicios.size,
          serviciosList: Array.from(e.servicios),
        });
      });
    });

    return list.sort((a, b) => b.count - a.count);
  }, [filteredProfList, selectedEessFilter]);

  // Total summary metrics
  const totalAtencionesFiltradas = useMemo(() => {
    return filteredProfList.reduce((acc, p) => acc + p.totalAtenciones, 0);
  }, [filteredProfList]);

  // Paginated slices for each tab to guarantee instant performance even with 1M+ records
  const totalRankingPages = Math.max(1, Math.ceil(filteredProfList.length / pageSize));
  const currentRankingPage = Math.min(pageRanking, totalRankingPages);
  const paginatedProfList = useMemo(() => {
    const start = (currentRankingPage - 1) * pageSize;
    return filteredProfList.slice(start, start + pageSize);
  }, [filteredProfList, currentRankingPage, pageSize]);

  const totalMesesPages = Math.max(1, Math.ceil(filteredProfList.length / pageSize));
  const currentMesesPage = Math.min(pageMeses, totalMesesPages);
  const paginatedMesesList = useMemo(() => {
    const start = (currentMesesPage - 1) * pageSize;
    return filteredProfList.slice(start, start + pageSize);
  }, [filteredProfList, currentMesesPage, pageSize]);

  const totalEessPages = Math.max(1, Math.ceil(profEessPairs.length / pageSize));
  const currentEessPage = Math.min(pageEess, totalEessPages);
  const paginatedProfEessPairs = useMemo(() => {
    const start = (currentEessPage - 1) * pageSize;
    return profEessPairs.slice(start, start + pageSize);
  }, [profEessPairs, currentEessPage, pageSize]);

  const totalFichaPages = Math.max(1, Math.ceil(currentProfAtenciones.length / pageSize));
  const currentFichaPage = Math.min(pageFicha, totalFichaPages);
  const paginatedFichaAtenciones = useMemo(() => {
    const start = (currentFichaPage - 1) * pageSize;
    return currentProfAtenciones.slice(start, start + pageSize);
  }, [currentProfAtenciones, currentFichaPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (activeTab === 'meses') {
      headers = [
        'DNI',
        'Profesional',
        'Tipo',
        'Colegiatura',
        'Total Atenciones',
        'Meses Activos',
        ...allMonthsList.map(m => `Mes ${m.label}`),
      ];
      rows = filteredProfList.map(p => {
        const monthCols = allMonthsList.map(m => String(p.mesesMap[m.key]?.count || 0));
        return [
          p.dni,
          `"${p.nombre}"`,
          `"${p.tipo}"`,
          `"${p.colegiatura}"`,
          String(p.totalAtenciones),
          String(Object.keys(p.mesesMap).length),
          ...monthCols,
        ];
      });
      filename = 'produccion_profesionales_por_meses.csv';
    } else if (activeTab === 'eess') {
      headers = [
        'DNI Profesional',
        'Nombre Profesional',
        'Tipo',
        'Establecimiento Salud (EESS)',
        'Codigo EESS',
        'Atenciones en EESS',
        '% Dedicacion',
        'Dias con Produccion',
        'Primera Fecha Atencion',
        'Ultima Fecha Atencion',
      ];
      rows = profEessPairs.map(item => [
        item.profDni,
        `"${item.profNombre}"`,
        `"${item.profTipo}"`,
        `"${item.eessNombre}"`,
        item.eessCodigo,
        String(item.count),
        `${item.pctOfProf}%`,
        String(item.diasLaborados),
        item.minFecha,
        item.maxFecha,
      ]);
      filename = 'produccion_profesionales_por_eess.csv';
    } else {
      headers = [
        'DNI',
        'Profesional',
        'Tipo',
        'Colegiatura',
        'RNE',
        'Total Atenciones',
        'Dias Asistidos',
        'Promedio Diario',
        'Nro EESS Donde Trabajo',
        'Establecimientos',
        'Rango Fechas Atencion',
      ];
      rows = filteredProfList.map(p => {
        const dias = p.fechasAtencion.size || 1;
        const prom = (p.totalAtenciones / dias).toFixed(1);
        const eessNombres = Object.keys(p.eessMap).join(' | ');
        return [
          p.dni,
          `"${p.nombre}"`,
          `"${p.tipo}"`,
          `"${p.colegiatura}"`,
          `"${p.rne}"`,
          String(p.totalAtenciones),
          String(dias),
          prom,
          String(Object.keys(p.eessMap).length),
          `"${eessNombres}"`,
          `"${p.minFecha} al ${p.maxFecha}"`,
        ];
      });
      filename = 'estadistica_profesionales_salud.csv';
    }

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download individual formatted Ficha PDF for a professional
  const handleDownloadFichaPdf = (prof: ProfData) => {
    // 1. Month list (chronological)
    const profMeses = Object.values(prof.mesesMap).sort((a, b) => a.key.localeCompare(b.key));
    const produccionMensual = profMeses.map(m => ({
      mes: m.label,
      count: m.count,
      pct: Math.round((m.count / (prof.totalAtenciones || 1)) * 100),
      dias: m.fechas.size,
      eessCount: m.eess.size,
    }));

    // 2. Establecimiento de Salud Vs Mes de Atención Cross-tab Matrix
    const meses = profMeses.map(m => {
      let shortLabel = m.label;
      const parts = m.label.split(' ');
      if (parts.length >= 2) {
        const mShort = parts[0].substring(0, 3);
        const yShort = parts[1].length === 4 ? parts[1].substring(2) : parts[1];
        shortLabel = `${mShort}'${yShort}`;
      }
      return {
        key: m.key,
        label: m.label,
        shortLabel,
      };
    });

    const eessVsMesFilas = Object.values(prof.eessMap)
      .sort((a, b) => b.count - a.count)
      .map(e => {
        const valores = meses.map(m => e.mesesCounts?.[m.key] || 0);
        const pct = Math.round((e.count / (prof.totalAtenciones || 1)) * 100);
        return {
          nombre: e.nombre,
          codigo: e.codigo,
          valores,
          total: e.count,
          pct,
        };
      });

    const totalesPorMes = meses.map(m => prof.mesesMap[m.key]?.count || 0);

    const eessVsMes = {
      meses,
      filas: eessVsMesFilas,
      totalesPorMes,
      granTotal: prof.totalAtenciones,
    };

    // 3. EESS list
    const establecimientos = Object.values(prof.eessMap)
      .sort((a, b) => b.count - a.count)
      .map(e => ({
        nombre: e.nombre,
        codigo: e.codigo,
        count: e.count,
        pct: Math.round((e.count / (prof.totalAtenciones || 1)) * 100),
        dias: e.fechas.size,
        rangoFechas: `${e.minFecha} al ${e.maxFecha}`,
      }));

    // 4. Services list
    const servicios = Object.values(prof.serviciosMap || {})
      .sort((a, b) => b.count - a.count)
      .map(s => ({
        nombre: s.nombre,
        codigo: s.codigo,
        count: s.count,
        pct: Math.round((s.count / (prof.totalAtenciones || 1)) * 100),
        tarifaTotal: s.tarifaTotal,
      }));

    // 5. Sample attentions
    const profAtenciones = atenciones.filter(a => {
      if (prof.dni !== 'SIN_DNI') {
        return a.dni_profesional === prof.dni;
      }
      return a.nombre_profesional === prof.nombre;
    });

    const muestrasAtenciones = profAtenciones.slice(0, 50).map(a => ({
      fecha: a.fecha_atencion,
      nroFormato: a.nro_formato || '',
      eess: a.nombre_eess || '',
      servicio: a.descripcion_servicio || '',
      paciente: a.beneficiario || '',
      docIdentidad: a.doc_identidad || '',
    }));

    PdfService.generateFichaProfesionalPdf({
      profesional: {
        nombre: prof.nombre,
        dni: prof.dni,
        tipo: prof.tipo,
        colegiatura: prof.colegiatura,
        rne: prof.rne,
        totalAtenciones: prof.totalAtenciones,
        diasAsistidos: prof.fechasAtencion.size,
        totalEess: Object.keys(prof.eessMap).length,
        totalMeses: Object.keys(prof.mesesMap).length,
        minFecha: prof.minFecha,
        maxFecha: prof.maxFecha,
        montoTotal: prof.montoTotalFacturado,
      },
      produccionMensual,
      eessVsMes,
      establecimientos,
      servicios,
      muestrasAtenciones,
    });
  };

  // Export to PDF
  const handleExportPdf = () => {
    if (activeTab === 'ficha' && currentProf) {
      handleDownloadFichaPdf(currentProf);
      return;
    }

    let titulo = 'B.3. PRODUCCIÓN POR PROFESIONAL DE LA SALUD';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = '';

    if (activeTab === 'meses') {
      titulo = 'B.3. PRODUCCIÓN MENSUAL POR PROFESIONAL (FECHA DE ATENCIÓN)';
      headers = ['Profesional', 'DNI', 'Tipo', 'Total', 'Meses', ...allMonthsList.map(m => m.label)];
      rows = filteredProfList.map(p => [
        p.nombre,
        p.dni,
        p.tipo,
        p.totalAtenciones,
        Object.keys(p.mesesMap).length,
        ...allMonthsList.map(m => p.mesesMap[m.key]?.count || 0),
      ]);
      filename = 'Produccion_Profesionales_Meses.pdf';
    } else if (activeTab === 'eess') {
      titulo = 'B.3. PRODUCCIÓN POR PROFESIONAL Y ESTABLECIMIENTO DE SALUD (EESS)';
      headers = ['Profesional', 'Tipo', 'Establecimiento (EESS)', 'Atenciones', '% Dedicación', 'Días Lab.', 'Rango Fechas'];
      rows = profEessPairs.slice(0, 150).map(item => [
        item.profNombre,
        item.profTipo,
        item.eessNombre,
        item.count,
        `${item.pctOfProf}%`,
        item.diasLaborados,
        `${item.minFecha} al ${item.maxFecha}`,
      ]);
      filename = 'Produccion_Profesionales_EESS.pdf';
    } else {
      headers = ['Profesional', 'DNI', 'Tipo', 'Colegiatura', 'Total Aten.', 'Días', 'Prom/Día', 'EESS'];
      rows = filteredProfList.map(p => {
        const dias = p.fechasAtencion.size || 1;
        const prom = (p.totalAtenciones / dias).toFixed(1);
        return [
          p.nombre,
          p.dni,
          p.tipo,
          p.colegiatura || 'S/C',
          p.totalAtenciones,
          dias,
          prom,
          Object.keys(p.eessMap).length,
        ];
      });
      filename = 'Directorio_Profesionales_Salud.pdf';
    }

    PdfService.generateEstadisticaPdf({
      titulo,
      subtitulo: `Filtros: Tipo: ${selectedTipo} | EESS: ${selectedEessFilter} | Mes: ${selectedMesFilter} | Búsqueda: "${searchTerm || 'Ninguna'}"`,
      headers,
      rows,
      resumenKpis: [
        { label: 'Total Profesionales', valor: filteredProfList.length },
        { label: 'Atenciones Verificadas', valor: totalAtencionesFiltradas },
        { label: 'Filtro Tipo', valor: selectedTipo },
        { label: 'Filtro EESS', valor: selectedEessFilter },
      ],
      orientation: 'landscape',
      filename,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                  <span>B.3. Atenciones por Profesional de la Salud</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold uppercase">
                    Verificado por fecha_atencion
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Producción asistencial clasificada por fecha de atención clínica, matrices por meses y centros de salud (EESS) donde laboró
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Export */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>{filteredProfList.length} Profesionales</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>{totalAtencionesFiltradas} Atenciones Verificadas</span>
            </span>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportPdf}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              title="Descargar reporte en formato PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-3 border-t border-slate-100">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por DNI, Nombre, Colegiatura o EESS..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                resetAllPages();
              }}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-medium text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  resetAllPages();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Tipo Profesional Filter */}
          <div className="lg:col-span-3 flex items-center space-x-2">
            <Stethoscope className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={selectedTipo}
              onChange={e => {
                setSelectedTipo(e.target.value);
                resetAllPages();
              }}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-800 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="TODOS">Todos los Tipos ({allTipos.length})</option>
              {allTipos.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Establecimiento Filter */}
          <div className="lg:col-span-3 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={selectedEessFilter}
              onChange={e => {
                setSelectedEessFilter(e.target.value);
                resetAllPages();
              }}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-800 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="TODOS">Todos los EESS donde trabajaron</option>
              {allEessList.map(e => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          {/* Mes de Atencion Filter */}
          <div className="lg:col-span-2 flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={selectedMesFilter}
              onChange={e => {
                setSelectedMesFilter(e.target.value);
                resetAllPages();
              }}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-800 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="TODOS">Todos los Meses</option>
              {allMonthsList.map(m => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-slate-200 pt-2 -mb-2 space-x-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ranking')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'ranking'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>1. Directorio y Ranking</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
              {filteredProfList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('meses')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'meses'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>2. Producción por Meses (Fecha Atención)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-mono">
              {allMonthsList.length} Meses
            </span>
          </button>

          <button
            onClick={() => setActiveTab('eess')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'eess'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>3. Producción por Establecimiento (EESS)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-mono">
              {profEessPairs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ficha')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'ficha'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Briefcase className="w-4 h-4 text-amber-600" />
            <span>4. Ficha Individual del Profesional</span>
            {currentProf && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-bold max-w-[120px] truncate">
                {currentProf.nombre.split(' ')[0]}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DIRECTORIO, RANKING TOP 10 Y DESEMPEÑO                             */}
      {/* ========================================================================= */}
      {activeTab === 'ranking' && (
        <div className="space-y-6">
          {/* Top 10 Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Top 10 Profesionales con Mayor Producción Asistencial</span>
              </h3>
              <span className="text-xs text-slate-500">
                Verificados estrictamente por fecha de atención clínica
              </span>
            </div>

            <div className="space-y-3">
              {top10.map((prof, idx) => {
                const barWidth = Math.max(Math.round((prof.totalAtenciones / maxTopVal) * 100), 5);
                const dias = prof.fechasAtencion.size || 1;
                const prom = (prof.totalAtenciones / dias).toFixed(1);

                return (
                  <div
                    key={prof.dni + prof.nombre}
                    className="group p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                    onClick={() => {
                      setSelectedProfDni(prof.dni);
                      setActiveTab('ficha');
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs mb-1.5">
                      <div className="flex items-center space-x-2 truncate pr-4">
                        <span
                          className={`w-5 h-5 flex items-center justify-center rounded-full font-bold text-[10px] font-mono ${
                            idx === 0
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-900'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {prof.nombre}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono font-bold">
                          {prof.tipo}
                        </span>
                        {prof.colegiatura && (
                          <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                            Col: {prof.colegiatura}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-xs">
                        <span className="text-slate-500 text-[11px]">
                          <strong>{Object.keys(prof.eessMap).length}</strong> EESS •{' '}
                          <strong>{dias}</strong> días ({prom}/día)
                        </span>
                        <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {prof.totalAtenciones} atenciones
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500 group-hover:from-emerald-400 group-hover:to-teal-500"
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Professional Listing Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Directorio Asistencial por Fecha de Atención</span>
              </span>
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                  Pág. <strong className="text-emerald-700">{currentRankingPage}</strong> / {totalRankingPages}
                </span>
                <span>
                  Total: <strong className="text-slate-900">{filteredProfList.length}</strong> profesionales
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">DNI</th>
                    <th className="py-2.5 px-4">Profesional de Salud</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Colegiatura / RNE</th>
                    <th className="py-2.5 px-3">Establecimientos (EESS) donde Laboró</th>
                    <th className="py-2.5 px-2 text-center">Días Asistidos</th>
                    <th className="py-2.5 px-3 text-center">Rango Fechas Atención</th>
                    <th className="py-2.5 px-3 text-right">Atenciones</th>
                    <th className="py-2.5 px-2 text-right">Prom./Día</th>
                    <th className="py-2.5 px-3 text-center">Ficha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProfList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No se encontraron profesionales con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedProfList.map(p => {
                      const dias = p.fechasAtencion.size || 1;
                      const prom = (p.totalAtenciones / dias).toFixed(1);
                      const eessEntries = Object.values(p.eessMap);

                      return (
                        <tr key={p.dni + p.nombre} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 font-mono font-semibold text-slate-600">{p.dni}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center space-x-1.5">
                              <span>{p.nombre}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {p.tipo}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">
                            {p.colegiatura || 'S/C'} {p.rne && <span className="block text-[10px]">RNE: {p.rne}</span>}
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {eessEntries.slice(0, 2).map(e => (
                                <span
                                  key={e.nombre}
                                  className="inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-medium"
                                  title={`${e.nombre}: ${e.count} atenciones`}
                                >
                                  <Building2 className="w-2.5 h-2.5 text-purple-600" />
                                  <span className="truncate max-w-[120px]">{e.nombre}</span>
                                  <strong className="font-mono">({e.count})</strong>
                                </span>
                              ))}
                              {eessEntries.length > 2 && (
                                <span className="text-[10px] text-purple-700 font-bold px-1 py-0.5">
                                  +{eessEntries.length - 2} más
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-slate-700">{dias}</td>
                          <td className="py-3 px-3 text-center font-mono text-[10px] text-slate-500">
                            {p.minFecha}
                            <span className="block text-slate-400">al {p.maxFecha}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                            {p.totalAtenciones}
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-semibold text-slate-700">
                            {prom}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => {
                                  setSelectedProfDni(p.dni);
                                  setActiveTab('ficha');
                                }}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition-colors cursor-pointer"
                                title="Ver ficha completa de producción"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadFichaPdf(p);
                                }}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white transition-colors cursor-pointer"
                                title="Descargar Ficha Estadística en PDF"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentRankingPage}
              totalPages={totalRankingPages}
              totalItems={filteredProfList.length}
              pageSize={pageSize}
              onPageChange={setPageRanking}
              onPageSizeChange={setPageSize}
              itemName="profesionales"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MATRIZ DE PRODUCCIÓN POR MESES (FECHA DE ATENCIÓN)                 */}
      {/* ========================================================================= */}
      {activeTab === 'meses' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span>Matriz de Producción Mensual por Fecha de Atención</span>
              </h3>
              <p className="text-xs text-blue-200 mt-1">
                Atenciones agrupadas mes a mes según el día clínico real de la atención (<code>fecha_atencion</code>), permitiendo evaluar la regularidad de producción
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                <strong>{allMonthsList.length}</strong> Meses Evaluados
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-500/30 font-bold">
                {totalAtencionesFiltradas} Atenciones Totales
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Desglose Mes a Mes por Profesional</span>
              </span>
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                  Pág. <strong className="text-blue-700">{currentMesesPage}</strong> / {totalMesesPages}
                </span>
                <span>
                  Total: <strong className="text-slate-900">{filteredProfList.length}</strong> profesionales
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 sticky left-0 bg-slate-100 z-10">Profesional de Salud</th>
                    <th className="py-2.5 px-2">Tipo</th>
                    <th className="py-2.5 px-2 text-right">Total</th>
                    <th className="py-2.5 px-2 text-center">Meses Act.</th>
                    {allMonthsList.map(m => (
                      <th key={m.key} className="py-2.5 px-3 text-center border-l border-slate-200">
                        {m.label}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedMesesList.map(p => {
                    const mesesActivos = Object.keys(p.mesesMap).length;

                    return (
                      <tr key={p.dni + p.nombre} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100">
                          <div>{p.nombre}</div>
                          <span className="text-[10px] font-mono text-slate-400 font-normal">
                            DNI: {p.dni}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {p.tipo}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-600">
                          {p.totalAtenciones}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-600 font-bold">
                          {mesesActivos}
                        </td>

                        {/* Month columns */}
                        {allMonthsList.map(m => {
                          const mData = p.mesesMap[m.key];
                          const count = mData ? mData.count : 0;

                          return (
                            <td
                              key={m.key}
                              className={`py-2.5 px-3 text-center font-mono border-l border-slate-100 ${
                                count > 0
                                  ? count > 15
                                    ? 'bg-blue-100 font-black text-blue-900'
                                    : count > 5
                                    ? 'bg-blue-50 font-bold text-blue-800'
                                    : 'font-semibold text-slate-700'
                                  : 'text-slate-300'
                              }`}
                              title={
                                count > 0
                                  ? `${p.nombre} - ${m.label}: ${count} atenciones en ${mData?.eess.size} EESS (${mData?.fechas.size} días)`
                                  : 'Sin producción en este mes'
                              }
                            >
                              {count > 0 ? (
                                <div>
                                  <span>{count}</span>
                                  <span className="block text-[9px] text-slate-500 font-normal">
                                    {mData?.fechas.size}d
                                  </span>
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                          );
                        })}

                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => {
                                setSelectedProfDni(p.dni);
                                setActiveTab('ficha');
                                setPageFicha(1);
                              }}
                              className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                            >
                              Ver Ficha
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFichaPdf(p);
                              }}
                              className="p-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white transition-colors cursor-pointer"
                              title="Descargar Ficha Estadística en PDF"
                            >
                              <FileText className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentMesesPage}
              totalPages={totalMesesPages}
              totalItems={filteredProfList.length}
              pageSize={pageSize}
              onPageChange={setPageMeses}
              onPageSizeChange={setPageSize}
              itemName="profesionales"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PRODUCCIÓN POR ESTABLECIMIENTO DE SALUD (EESS)                     */}
      {/* ========================================================================= */}
      {activeTab === 'eess' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <span>Establecimientos de Salud Donde Laboró o Produjo Atenciones</span>
              </h3>
              <p className="text-xs text-purple-200 mt-1">
                Identificación de los centros de salud asignados a cada profesional, volumen producido, dedicación porcentual y fechas de trabajo
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 font-mono">
                {profEessPairs.length} Registros Profesional-EESS
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Detalle de Producción por Profesional y Centro de Salud</span>
              </span>
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                  Pág. <strong className="text-purple-700">{currentEessPage}</strong> / {totalEessPages}
                </span>
                <span>
                  Total: <strong className="text-slate-900">{profEessPairs.length}</strong> asignaciones
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Profesional de Salud</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-4">Establecimiento de Salud (EESS)</th>
                    <th className="py-2.5 px-3">Cód. EESS</th>
                    <th className="py-2.5 px-3 text-right">Atenciones</th>
                    <th className="py-2.5 px-3 text-right">% Dedicación</th>
                    <th className="py-2.5 px-2 text-center">Días Asist.</th>
                    <th className="py-2.5 px-3 text-center">Rango Fechas</th>
                    <th className="py-2.5 px-3">Servicios Atendidos</th>
                    <th className="py-2.5 px-3 text-center">Ficha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedProfEessPairs.map((item, idx) => (
                    <tr key={`${item.profDni}-${item.eessNombre}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{item.profNombre}</div>
                        <span className="text-[10px] font-mono text-slate-400 font-normal">
                          DNI: {item.profDni} {item.profCol && `• Col: ${item.profCol}`}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.profTipo}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-purple-950 flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                        <span>{item.eessNombre}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{item.eessCodigo || 'S/C'}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-600">
                        {item.count}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {item.pctOfProf}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-slate-700">
                        {item.diasLaborados}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[10px] text-slate-500">
                        {item.minFecha}
                        <span className="block text-slate-400">al {item.maxFecha}</span>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <span
                          className="text-[10px] text-slate-600 truncate block"
                          title={item.serviciosList.join(', ')}
                        >
                          {item.serviciosList.slice(0, 2).join(', ')}
                          {item.serviciosList.length > 2 && ` (+${item.serviciosList.length - 2})`}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => {
                              setSelectedProfDni(item.profDni);
                              setActiveTab('ficha');
                              setPageFicha(1);
                            }}
                            className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white transition-colors cursor-pointer"
                            title="Ver ficha individual"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const prof = profAggregated.find(p => p.dni === item.profDni);
                              if (prof) handleDownloadFichaPdf(prof);
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white transition-colors cursor-pointer"
                            title="Descargar Ficha en PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentEessPage}
              totalPages={totalEessPages}
              totalItems={profEessPairs.length}
              pageSize={pageSize}
              onPageChange={setPageEess}
              onPageSizeChange={setPageSize}
              itemName="asignaciones"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FICHA INDIVIDUAL Y DETALLE DEL PROFESIONAL SELECCIONADO            */}
      {/* ========================================================================= */}
      {activeTab === 'ficha' && currentProf && (
        <div className="space-y-6">
          {/* Professional Selector Header */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xl">
                  {currentProf.nombre.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">{currentProf.nombre}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-300">
                    <span className="font-mono bg-white/10 px-2 py-0.5 rounded">
                      DNI: {currentProf.dni}
                    </span>
                    <span className="bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded">
                      {currentProf.tipo}
                    </span>
                    {currentProf.colegiatura && (
                      <span className="font-mono text-slate-300">
                        Colegiatura: {currentProf.colegiatura}
                      </span>
                    )}
                    {currentProf.rne && (
                      <span className="font-mono text-amber-300">RNE: {currentProf.rne}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Selector to switch professional & Download Ficha PDF */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => handleDownloadFichaPdf(currentProf)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer whitespace-nowrap"
                  title="Descargar Ficha en formato PDF oficial para imprimir o auditar"
                >
                  <FileText className="w-4 h-4" />
                  <span>Descargar Ficha PDF</span>
                </button>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Cambiar profesional:</span>
                  <select
                    value={currentProf.dni}
                    onChange={e => {
                      setSelectedProfDni(e.target.value);
                      setPageFicha(1);
                    }}
                    className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 max-w-xs"
                  >
                    {profAggregated.map(p => (
                      <option key={p.dni + p.nombre} value={p.dni}>
                        {p.nombre} ({p.totalAtenciones} aten.)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* KPI Cards for the Professional */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Total Atenciones
                </span>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  {currentProf.totalAtenciones}
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Días Asistidos (Fechas)
                </span>
                <div className="text-2xl font-black font-mono text-blue-400 mt-1">
                  {currentProf.fechasAtencion.size}
                </div>
                <span className="text-[10px] text-slate-400">
                  Promedio: {(currentProf.totalAtenciones / (currentProf.fechasAtencion.size || 1)).toFixed(1)} / día
                </span>
              </div>

              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Establecimientos (EESS)
                </span>
                <div className="text-2xl font-black font-mono text-purple-400 mt-1">
                  {Object.keys(currentProf.eessMap).length}
                </div>
                <span className="text-[10px] text-slate-400">Centros de salud</span>
              </div>

              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Facturación SIS Estimada
                </span>
                <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                  S/ {currentProf.montoTotalFacturado.toFixed(2)}
                </div>
                <span className="text-[10px] text-slate-400">
                  {Object.keys(currentProf.serviciosMap).length} servicios distintos
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown 1: By Month of Attention (fecha_atencion) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Desglose por Mes de Atención (fecha_atencion)</span>
              </h4>

              <div className="space-y-2">
                {Object.values(currentProf.mesesMap).map(m => {
                  const pct = Math.round((m.count / (currentProf.totalAtenciones || 1)) * 100);
                  return (
                    <div key={m.key} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-900">{m.label}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-blue-600">{m.count} aten.</span>
                          <span className="font-mono text-slate-400">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                        <span>{m.fechas.size} días con atención</span>
                        <span>Laboró en {m.eess.size} EESS</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Breakdown 2: By Establecimiento de Salud */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Establecimientos de Salud Donde Realizó Producción</span>
              </h4>

              <div className="space-y-2">
                {Object.values(currentProf.eessMap).map(e => {
                  const pct = Math.round((e.count / (currentProf.totalAtenciones || 1)) * 100);
                  return (
                    <div key={e.nombre} className="p-3 rounded-xl bg-purple-50/50 border border-purple-100">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-purple-950 truncate max-w-[240px]">
                          {e.nombre}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-purple-700">{e.count} aten.</span>
                          <span className="font-mono text-purple-900 font-bold">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-purple-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                        <span>{e.fechas.size} días trabajados</span>
                        <span>
                          Período: {e.minFecha} al {e.maxFecha}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Breakdown 3: By Servicios Clínicos Realizados */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Cartera de Servicios Clínicos que ha Realizado</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Distribución de prestaciones y procedimientos clínicos ejecutados por el profesional
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                {Object.keys(currentProf.serviciosMap).length} Servicios Realizados
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(currentProf.serviciosMap)
                .sort((a, b) => b.count - a.count)
                .map(s => {
                  const pct = Math.round((s.count / (currentProf.totalAtenciones || 1)) * 100);
                  return (
                    <div key={s.nombre} className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 text-xs mb-1">
                          <span className="font-bold text-slate-900 line-clamp-2" title={s.nombre}>
                            {s.nombre}
                          </span>
                          <span className="font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {s.count} aten.
                          </span>
                        </div>
                        <div className="w-full bg-emerald-200/80 rounded-full h-1.5 overflow-hidden my-1.5">
                          <div
                            className="h-full bg-emerald-600 rounded-full"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-emerald-100/60 font-mono">
                        <span>{pct}% de su cartera</span>
                        <span className="font-bold text-slate-700">Fact: S/ {s.tarifaTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Breakdown 4: Chronological Attentions List for this professional */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Atenciones Verificadas por Fecha de Atención ({currentProfAtenciones.length})</span>
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Listado cronológico individual para auditoría de FUAs • Pág. <strong className="text-emerald-700 font-mono">{currentFichaPage}</strong> de {totalFichaPages}
                </span>
              </div>
              <button
                onClick={() => handleDownloadFichaPdf(currentProf)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
                title="Descargar Ficha Estadística en PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Exportar Ficha PDF</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Fecha Atención</th>
                    <th className="py-2.5 px-2">Hora</th>
                    <th className="py-2.5 px-3">N° Formato</th>
                    <th className="py-2.5 px-4">Establecimiento de Salud (EESS)</th>
                    <th className="py-2.5 px-4">Servicio Clínico</th>
                    <th className="py-2.5 px-4">Paciente Beneficiario</th>
                    <th className="py-2.5 px-3">Fecha Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedFichaAtenciones.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {a.fecha_atencion}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-400">{a.hora_atencion}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{a.nro_formato}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">{a.nombre_eess}</td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {a.descripcion_servicio}
                        <span className="block text-[10px] font-mono text-slate-400">
                          Tarifa: S/ {a.tarifa}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-slate-900 block">{a.beneficiario}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {a.tipo_doc}: {a.doc_identidad}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                        {a.fecha_registro}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentFichaPage}
              totalPages={totalFichaPages}
              totalItems={currentProfAtenciones.length}
              pageSize={pageSize}
              onPageChange={setPageFicha}
              onPageSizeChange={setPageSize}
              itemName="atenciones"
            />
          </div>
        </div>
      )}
    </div>
  );
};
