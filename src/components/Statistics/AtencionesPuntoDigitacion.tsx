import React, { useState, useMemo, useEffect } from 'react';
import {
  Database,
  Calendar,
  Award,
  PieChart as PieIcon,
  Search,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Users,
  Building2,
  FileSpreadsheet,
  Download,
  Filter,
  X,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Atencion } from '../../types/health';

interface Props {
  atenciones: Atencion[];
  initialPunto?: string;
  onNavigateToOportunidad?: () => void;
  onNavigateToRegistroVsAtencion?: () => void;
}

// Helper to extract year, month and formatted label from fecha_registro
export const extractMesRegistro = (
  fechaRegistroStr: string | undefined
): { key: string; label: string; year: number; month: number } => {
  if (!fechaRegistroStr) {
    return { key: 'SIN_FECHA', label: 'Sin Fecha de Registro', year: 0, month: 0 };
  }

  const str = String(fechaRegistroStr).trim();

  // Pattern YYYY-MM-DD or YYYY/MM/DD
  let match = str.match(/^(\d{4})[-/](\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return { key, label: formatMesAnio(year, month), year, month };
  }

  // Pattern DD/MM/YYYY or DD-MM-YYYY
  match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    const year = parseInt(match[3], 10);
    const month = parseInt(match[2], 10);
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return { key, label: formatMesAnio(year, month), year, month };
  }

  // Native Date parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return { key, label: formatMesAnio(year, month), year, month };
  }

  return { key: 'OTRO', label: str.substring(0, 10), year: 0, month: 0 };
};

const formatMesAnio = (year: number, month: number): string => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const name = months[month - 1] || `Mes ${month}`;
  return `${name} ${year}`;
};

// Calculate difference in days between fecha_atencion and fecha_registro (oportunidad de digitación)
export const calculateDaysDifference = (
  fechaAtencionStr: string | undefined,
  fechaRegistroStr: string | undefined
): number | null => {
  if (!fechaAtencionStr || !fechaRegistroStr) return null;
  try {
    const dAtencion = new Date(fechaAtencionStr.substring(0, 10));
    const dRegistro = new Date(fechaRegistroStr.substring(0, 10));
    if (isNaN(dAtencion.getTime()) || isNaN(dRegistro.getTime())) return null;
    const diffTime = dRegistro.getTime() - dAtencion.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  } catch {
    return null;
  }
};

export const AtencionesPuntoDigitacion: React.FC<Props> = ({
  atenciones,
  initialPunto,
  onNavigateToOportunidad,
  onNavigateToRegistroVsAtencion,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPunto, setSelectedPunto] = useState<string>(initialPunto || 'TODOS');
  const [selectedMesFiltro, setSelectedMesFiltro] = useState<string | null>(null);
  const [selectedRangoFiltro, setSelectedRangoFiltro] = useState<'TODOS' | '0-10' | '11-29' | '30+'>('TODOS');
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sync if initialPunto changes
  useEffect(() => {
    if (initialPunto) {
      setSelectedPunto(initialPunto);
    }
  }, [initialPunto]);

  // Palette for chart items
  const colors = [
    '#2563EB', '#10B981', '#6366F1', '#F59E0B', '#EF4444',
    '#06B6D4', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
  ];

  // 1. Group all records by punto de digitacion for general ranking
  const puntoMap: Record<
    string,
    {
      count: number;
      cod: string;
      eessList: Set<string>;
      digitadores: Set<string>;
      fechasRegistro: string[];
    }
  > = {};

  atenciones.forEach(a => {
    const key = (a.punto_digitacion || 'SIN PUNTO ASIGNADO').trim();
    if (!puntoMap[key]) {
      puntoMap[key] = {
        count: 0,
        cod: a.cod_punto_digitacion || 'S/C',
        eessList: new Set(),
        digitadores: new Set(),
        fechasRegistro: [],
      };
    }
    puntoMap[key].count++;
    if (a.nombre_eess) puntoMap[key].eessList.add(a.nombre_eess);
    if (a.digitador) puntoMap[key].digitadores.add(a.digitador);
    if (a.fecha_registro) puntoMap[key].fechasRegistro.push(a.fecha_registro);
  });

  const fullRanking = useMemo(() => {
    return Object.entries(puntoMap)
      .map(([nombre, data]) => ({
        nombre,
        cod: data.cod,
        count: data.count,
        eessCount: data.eessList.size,
        digitadoresCount: data.digitadores.size,
        porcentaje: Math.round((data.count / (atenciones.length || 1)) * 10000) / 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [puntoMap, atenciones.length]);

  // Filter ranking by search term (search by name, code or digitador)
  const filteredRanking = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return fullRanking;
    return fullRanking.filter(r => {
      const matchName = r.nombre.toLowerCase().includes(term);
      const matchCod = r.cod.toLowerCase().includes(term);
      const pointData = puntoMap[r.nombre];
      const matchDigitador = pointData
        ? Array.from(pointData.digitadores).some(d => d.toLowerCase().includes(term))
        : false;
      return matchName || matchCod || matchDigitador;
    });
  }, [fullRanking, searchTerm, puntoMap]);

  // Auto-select punto if user searches and there's an exact or single match
  const activePunto = selectedPunto;

  // Filter atenciones for the selected punto (or all if TODOS)
  const puntoAtenciones = useMemo(() => {
    let list = atenciones;

    // Filter by selected punto
    if (activePunto !== 'TODOS') {
      list = list.filter(a => (a.punto_digitacion || 'SIN PUNTO ASIGNADO').trim() === activePunto);
    } else if (searchTerm.trim()) {
      // If TODOS is selected but user typed a search term, filter by matching puntos
      const matchingPuntoNames = new Set(filteredRanking.map(r => r.nombre));
      list = list.filter(a => matchingPuntoNames.has((a.punto_digitacion || 'SIN PUNTO ASIGNADO').trim()));
    }

    return list;
  }, [atenciones, activePunto, searchTerm, filteredRanking]);

  // 2. COMPUTE STATS BY MONTH OF DIGITIZATION (fecha_registro)
  const statsMesDigitacion = useMemo(() => {
    const mesMap: Record<
      string,
      {
        key: string;
        label: string;
        year: number;
        month: number;
        count: number;
        digitadores: Set<string>;
        eess: Set<string>;
        delays: number[];
        firstDate: string;
        lastDate: string;
      }
    > = {};

    puntoAtenciones.forEach(a => {
      const mesInfo = extractMesRegistro(a.fecha_registro);
      const mKey = mesInfo.key;

      if (!mesMap[mKey]) {
        mesMap[mKey] = {
          key: mKey,
          label: mesInfo.label,
          year: mesInfo.year,
          month: mesInfo.month,
          count: 0,
          digitadores: new Set(),
          eess: new Set(),
          delays: [],
          firstDate: a.fecha_registro || '',
          lastDate: a.fecha_registro || '',
        };
      }

      mesMap[mKey].count++;
      if (a.digitador) mesMap[mKey].digitadores.add(a.digitador);
      if (a.nombre_eess) mesMap[mKey].eess.add(a.nombre_eess);

      const delay = calculateDaysDifference(a.fecha_atencion, a.fecha_registro);
      if (delay !== null) {
        mesMap[mKey].delays.push(delay);
      }

      if (a.fecha_registro) {
        if (!mesMap[mKey].firstDate || a.fecha_registro < mesMap[mKey].firstDate) {
          mesMap[mKey].firstDate = a.fecha_registro;
        }
        if (!mesMap[mKey].lastDate || a.fecha_registro > mesMap[mKey].lastDate) {
          mesMap[mKey].lastDate = a.fecha_registro;
        }
      }
    });

    const totalInPunto = puntoAtenciones.length || 1;

    // Sort chronologically (year, then month)
    const list = Object.values(mesMap)
      .map(m => {
        const avgDelay = m.delays.length > 0
          ? Math.round((m.delays.reduce((acc, d) => acc + d, 0) / m.delays.length) * 10) / 10
          : 0;

        const porcentaje = Math.round((m.count / totalInPunto) * 1000) / 10;

        return {
          key: m.key,
          label: m.label,
          year: m.year,
          month: m.month,
          count: m.count,
          porcentaje,
          digitadoresCount: m.digitadores.size,
          digitadoresList: Array.from(m.digitadores),
          eessCount: m.eess.size,
          avgDelay,
          firstDate: m.firstDate,
          lastDate: m.lastDate,
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

    return list;
  }, [puntoAtenciones]);

  // Maximum count for relative bar chart width
  const maxMonthCount = useMemo(() => {
    return Math.max(...statsMesDigitacion.map(m => m.count), 1);
  }, [statsMesDigitacion]);

  // Overall KPIs for the selected punto
  const kpiData = useMemo(() => {
    const total = puntoAtenciones.length;
    const mesesCount = statsMesDigitacion.length;

    // Peak month
    const picoMes = statsMesDigitacion.reduce<{ label: string; count: number; porcentaje: number } | null>(
      (acc, m) => {
        if (!acc || m.count > acc.count) {
          return { label: m.label, count: m.count, porcentaje: m.porcentaje };
        }
        return acc;
      },
      null
    );

    // Average delay across all records with dates + breakdown by opportunity brackets
    let totalDelay = 0;
    let delayCount = 0;
    let count0_10 = 0;
    let count11_29 = 0;
    let count30_mas = 0;

    puntoAtenciones.forEach(a => {
      const d = calculateDaysDifference(a.fecha_atencion, a.fecha_registro);
      if (d !== null) {
        totalDelay += d;
        delayCount++;
        if (d <= 10) count0_10++;
        else if (d <= 29) count11_29++;
        else count30_mas++;
      }
    });

    const avgDelayGeneral = delayCount > 0 ? Math.round((totalDelay / delayCount) * 10) / 10 : 0;
    const pct0_10 = total > 0 ? Math.round((count0_10 / total) * 1000) / 10 : 0;
    const pct11_29 = total > 0 ? Math.round((count11_29 / total) * 1000) / 10 : 0;
    const pct30_mas = total > 0 ? Math.round((count30_mas / total) * 1000) / 10 : 0;

    // Unique digitadores
    const allDigitadores = new Set<string>();
    puntoAtenciones.forEach(a => {
      if (a.digitador) allDigitadores.add(a.digitador);
    });

    // Unique EESS
    const allEess = new Set<string>();
    puntoAtenciones.forEach(a => {
      if (a.nombre_eess) allEess.add(a.nombre_eess);
    });

    return {
      total,
      mesesCount,
      picoMes,
      avgDelayGeneral,
      digitadoresCount: allDigitadores.size,
      eessCount: allEess.size,
      count0_10,
      pct0_10,
      count11_29,
      pct11_29,
      count30_mas,
      pct30_mas,
    };
  }, [puntoAtenciones, statsMesDigitacion]);

  // Table of opportunity by Punto de Digitación (0-10 días, 11-29 días, ≥30 días)
  const oportunidadRankingTable = useMemo(() => {
    const map: Record<
      string,
      {
        nombre: string;
        cod: string;
        total: number;
        c0_10: number;
        c11_29: number;
        c30_mas: number;
        delays: number[];
      }
    > = {};

    atenciones.forEach(a => {
      const key = (a.punto_digitacion || 'SIN PUNTO ASIGNADO').trim();
      if (!map[key]) {
        map[key] = {
          nombre: key,
          cod: a.cod_punto_digitacion || 'S/C',
          total: 0,
          c0_10: 0,
          c11_29: 0,
          c30_mas: 0,
          delays: [],
        };
      }
      map[key].total++;
      const d = calculateDaysDifference(a.fecha_atencion, a.fecha_registro);
      if (d !== null) {
        map[key].delays.push(d);
        if (d <= 10) map[key].c0_10++;
        else if (d <= 29) map[key].c11_29++;
        else map[key].c30_mas++;
      }
    });

    return Object.values(map)
      .map(p => {
        const avg = p.delays.length > 0
          ? Math.round((p.delays.reduce((acc, d) => acc + d, 0) / p.delays.length) * 10) / 10
          : 0;
        const pct0_10 = p.total > 0 ? Math.round((p.c0_10 / p.total) * 1000) / 10 : 0;
        const pct11_29 = p.total > 0 ? Math.round((p.c11_29 / p.total) * 1000) / 10 : 0;
        const pct30_mas = p.total > 0 ? Math.round((p.c30_mas / p.total) * 1000) / 10 : 0;
        return {
          ...p,
          avg,
          pct0_10,
          pct11_29,
          pct30_mas,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [atenciones]);

  // Cross analysis: Período de Registro (Digitado) vs Mes de Atención (Clínico) for active punto
  const registroVsAtencionCruzado = useMemo(() => {
    const regPeriodsMap = new Map<string, { key: string; label: string }>();
    const atenMonthsMap = new Map<string, { key: string; label: string }>();
    const matrix: Record<string, Record<string, number>> = {};
    const periodoTotals: Record<string, number> = {};

    puntoAtenciones.forEach(a => {
      const reg = extractMesRegistro(a.fecha_registro);
      const aten = extractMesRegistro(a.fecha_atencion);

      if (reg.key !== 'OTRO' && reg.key !== 'SIN_FECHA' && aten.key !== 'OTRO' && aten.key !== 'SIN_FECHA') {
        if (!regPeriodsMap.has(reg.key)) regPeriodsMap.set(reg.key, reg);
        if (!atenMonthsMap.has(aten.key)) atenMonthsMap.set(aten.key, aten);

        if (!matrix[reg.key]) {
          matrix[reg.key] = {};
          periodoTotals[reg.key] = 0;
        }
        matrix[reg.key][aten.key] = (matrix[reg.key][aten.key] || 0) + 1;
        periodoTotals[reg.key]++;
      }
    });

    const regList = Array.from(regPeriodsMap.values()).sort((a, b) => a.key.localeCompare(b.key));
    const atenList = Array.from(atenMonthsMap.values()).sort((a, b) => a.key.localeCompare(b.key));

    return {
      matrix,
      periodoTotals,
      regList,
      atenList,
      hasData: regList.length > 0 && atenList.length > 0,
    };
  }, [puntoAtenciones]);

  // Filtered detail list (with optional month and opportunity range filter)
  const detailList = useMemo(() => {
    let list = puntoAtenciones;
    if (selectedMesFiltro) {
      list = list.filter(a => extractMesRegistro(a.fecha_registro).key === selectedMesFiltro);
    }
    if (selectedRangoFiltro !== 'TODOS') {
      list = list.filter(a => {
        const d = calculateDaysDifference(a.fecha_atencion, a.fecha_registro);
        if (d === null) return false;
        if (selectedRangoFiltro === '0-10') return d <= 10;
        if (selectedRangoFiltro === '11-29') return d >= 11 && d <= 29;
        if (selectedRangoFiltro === '30+') return d >= 30;
        return true;
      });
    }
    return list;
  }, [puntoAtenciones, selectedMesFiltro, selectedRangoFiltro]);

  // Paginated records for table
  const totalPages = Math.ceil(detailList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return detailList.slice(start, start + itemsPerPage);
  }, [detailList, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPunto, selectedMesFiltro, selectedRangoFiltro, searchTerm, itemsPerPage]);

  // Export current list to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Nro Formato',
      'Fecha Atencion',
      'Hora Atencion',
      'Fecha Registro (Digitacion)',
      'Mes Digitacion',
      'Desfase Dias',
      'Punto Digitacion',
      'Cod Punto',
      'Digitador',
      'Establecimiento',
      'Servicio',
      'Paciente',
      'Doc Identidad',
    ];

    const rows = detailList.map(a => {
      const mes = extractMesRegistro(a.fecha_registro).label;
      const delay = calculateDaysDifference(a.fecha_atencion, a.fecha_registro);
      return [
        a.id,
        `"${a.nro_formato || ''}"`,
        a.fecha_atencion,
        a.hora_atencion,
        `"${a.fecha_registro || ''}"`,
        `"${mes}"`,
        delay !== null ? delay : '',
        `"${a.punto_digitacion || ''}"`,
        `"${a.cod_punto_digitacion || ''}"`,
        `"${a.digitador || ''}"`,
        `"${a.nombre_eess || ''}"`,
        `"${a.descripcion_servicio || ''}"`,
        `"${a.beneficiario || ''}"`,
        `"${a.doc_identidad || ''}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `atenciones_digitacion_${activePunto.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Search / Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Database className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  B.2. Atenciones por Punto de Digitación
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Estadísticas mensuales de captura por fecha de registro, oportunidad y ranking de productividad
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>{fullRanking.length} Puntos de Digitación</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{puntoAtenciones.length} Atenciones Analizadas</span>
            </span>
          </div>
        </div>

        {/* Search & Selector Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100">
          {/* Live Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por punto (ej. SAN MARTÍN, PTO-01) o digitador..."
              className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-medium text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Point Selector Dropdown */}
          <div className="md:col-span-5 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={selectedPunto}
              onChange={e => {
                setSelectedPunto(e.target.value);
                setSelectedMesFiltro(null);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-800 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="TODOS">Todos los Puntos de Digitación ({atenciones.length} registros)</option>
              {fullRanking.map(r => (
                <option key={r.nombre} value={r.nombre}>
                  {r.nombre} [{r.cod}] — {r.count} atenciones ({r.porcentaje}%)
                </option>
              ))}
            </select>
          </div>

          {/* Reset Action */}
          <div className="md:col-span-2 flex items-center">
            {(selectedPunto !== 'TODOS' || searchTerm || selectedMesFiltro) ? (
              <button
                onClick={() => {
                  setSelectedPunto('TODOS');
                  setSearchTerm('');
                  setSelectedMesFiltro(null);
                }}
                className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>
            ) : (
              <div className="text-[11px] text-slate-400 italic text-center w-full">
                Mostrando vista general
              </div>
            )}
          </div>
        </div>

        {/* Quick Selection Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center space-x-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <span>Accesos rápidos:</span>
          </span>
          <button
            onClick={() => {
              setSelectedPunto('TODOS');
              setSelectedMesFiltro(null);
            }}
            className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
              selectedPunto === 'TODOS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Todos ({atenciones.length})
          </button>
          {fullRanking.slice(0, 5).map(r => (
            <button
              key={r.nombre}
              onClick={() => {
                setSelectedPunto(r.nombre);
                setSelectedMesFiltro(null);
              }}
              className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                selectedPunto === r.nombre
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {r.nombre.length > 22 ? r.nombre.substring(0, 22) + '...' : r.nombre} ({r.count})
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN PRINCIPAL: ESTADÍSTICA POR MES DE DIGITACIÓN (FECHA DE REGISTRO)  */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/60 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 space-y-6">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-indigo-800/50 gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/20">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black tracking-tight flex items-center space-x-2 text-white">
                    <span>Estadística por Mes de Digitación</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                      fecha_registro
                    </span>
                  </h3>
                  <p className="text-xs text-indigo-200/80 mt-0.5">
                    Volumen y oportunidad de atenciones ingresadas al sistema según su mes de registro
                    {activePunto !== 'TODOS' && (
                      <span className="text-amber-300 font-bold ml-1">
                        — Punto: {activePunto}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Clear Month Filter if active */}
            {selectedMesFiltro && (
              <div className="flex items-center space-x-2 bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 rounded-xl">
                <span className="text-xs text-amber-300 font-medium">
                  Mes activo:{' '}
                  <strong>
                    {statsMesDigitacion.find(m => m.key === selectedMesFiltro)?.label || selectedMesFiltro}
                  </strong>
                </span>
                <button
                  onClick={() => setSelectedMesFiltro(null)}
                  className="text-amber-400 hover:text-white text-xs font-bold underline cursor-pointer ml-1"
                >
                  Ver todos los meses
                </button>
              </div>
            )}
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
                Total Digitaciones
              </span>
              <div className="text-2xl font-black font-mono text-white mt-1">
                {kpiData.total}
              </div>
              <span className="text-[10px] text-slate-300 mt-1 block">
                {activePunto === 'TODOS' ? 'Todos los puntos' : 'En este punto'}
              </span>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
                Meses con Registros
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                {kpiData.mesesCount}
              </div>
              <span className="text-[10px] text-slate-300 mt-1 block">
                Períodos activos
              </span>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
                Mes Pico (Mayor Carga)
              </span>
              <div className="text-sm font-black text-amber-300 mt-1 truncate" title={kpiData.picoMes?.label}>
                {kpiData.picoMes?.label || 'N/A'}
              </div>
              <span className="text-[10px] font-mono text-slate-300 mt-1 block">
                {kpiData.picoMes ? `${kpiData.picoMes.count} reg. (${kpiData.picoMes.porcentaje}%)` : '—'}
              </span>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
                Promedio Mensual
              </span>
              <div className="text-2xl font-black font-mono text-cyan-300 mt-1">
                {kpiData.mesesCount > 0 ? Math.round(kpiData.total / kpiData.mesesCount) : 0}
              </div>
              <span className="text-[10px] text-slate-300 mt-1 block">
                Registros / mes
              </span>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block flex items-center space-x-1">
                <Clock className="w-3 h-3 text-indigo-300" />
                <span>Oportunidad Prom.</span>
              </span>
              <div className="text-2xl font-black font-mono text-indigo-300 mt-1">
                {kpiData.avgDelayGeneral}d
              </div>
              <span className={`text-[10px] font-bold mt-1 block ${
                kpiData.avgDelayGeneral <= 3 ? 'text-emerald-400' :
                kpiData.avgDelayGeneral <= 7 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {kpiData.avgDelayGeneral <= 3 ? '✓ Oportuno (<4d)' :
                 kpiData.avgDelayGeneral <= 7 ? '⚠ Normal (4-7d)' : '⚡ Rezagado (>7d)'}
              </span>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block flex items-center space-x-1">
                <Users className="w-3 h-3 text-indigo-300" />
                <span>Digitadores</span>
              </span>
              <div className="text-2xl font-black font-mono text-white mt-1">
                {kpiData.digitadoresCount}
              </div>
              <span className="text-[10px] text-slate-300 mt-1 block">
                En {kpiData.eessCount} EESS
              </span>
            </div>
          </div>

          {/* Monthly Comparison Bars & Monthly Table Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Visual Bars by Registration Month */}
            <div className="lg:col-span-6 bg-slate-900/80 rounded-2xl p-5 border border-indigo-900/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Evolución Mensual de Digitaciones (Fecha de Registro)</span>
                  </h4>
                  <span className="text-[10px] text-indigo-300/70">
                    Clic para filtrar tabla
                  </span>
                </div>

                {statsMesDigitacion.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    No se encontraron registros de digitación con los filtros actuales.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {statsMesDigitacion.map((mes, idx) => {
                      const isSelected = selectedMesFiltro === mes.key;
                      const widthPercent = Math.max(Math.round((mes.count / maxMonthCount) * 100), 4);

                      return (
                        <div
                          key={mes.key}
                          onClick={() => setSelectedMesFiltro(isSelected ? null : mes.key)}
                          className={`group p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600/30 border-indigo-400 shadow-md ring-1 ring-indigo-400'
                              : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-indigo-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold text-white flex items-center space-x-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: colors[idx % colors.length] }}
                              ></span>
                              <span>{mes.label}</span>
                              <span className="font-mono text-[10px] text-indigo-300 font-normal">
                                ({mes.key})
                              </span>
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-emerald-400 font-bold">
                                {mes.count} <span className="text-[10px] text-slate-300 font-normal">reg.</span>
                              </span>
                              <span className="text-[11px] font-mono text-indigo-300 font-semibold">
                                {mes.porcentaje}%
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-950/60 rounded-full h-2.5 overflow-hidden flex">
                            <div
                              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-indigo-400 group-hover:from-blue-400 group-hover:to-emerald-400"
                              style={{ width: `${widthPercent}%` }}
                            ></div>
                          </div>

                          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                            <span>
                              {mes.digitadoresCount} digitador{mes.digitadoresCount !== 1 ? 'es' : ''} • {mes.eessCount} EESS
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-2.5 h-2.5 text-indigo-300" />
                              <span>Desfase: <strong className="text-white font-mono">{mes.avgDelay}d</strong></span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Informative Note */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-start space-x-2 text-[11px] text-indigo-200/70">
                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p>
                  El <strong>mes de digitación</strong> se calcula extrayendo el año y mes del campo{' '}
                  <code className="bg-white/10 px-1 py-0.5 rounded text-amber-300 font-mono text-[10px]">
                    fecha_registro
                  </code>
                  . Permite fiscalizar el cumplimiento de plazos frente a la fecha de la prestación clínica real.
                </p>
              </div>
            </div>

            {/* Detailed Table by Month of Digitization */}
            <div className="lg:col-span-6 bg-slate-900/80 rounded-2xl border border-indigo-900/50 overflow-hidden flex flex-col justify-between">
              <div className="p-4 border-b border-indigo-900/50 flex justify-between items-center bg-indigo-950/40">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Resumen Tabular por Mes de Registro</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  {statsMesDigitacion.length} Meses
                </span>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/80 text-indigo-200 uppercase font-semibold text-[10px] tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3">Mes Digitación</th>
                      <th className="py-2.5 px-2 text-right">Atenciones</th>
                      <th className="py-2.5 px-2 text-right">Part. %</th>
                      <th className="py-2.5 px-2 text-center">Digitadores</th>
                      <th className="py-2.5 px-2 text-center">Oportunidad</th>
                      <th className="py-2.5 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {statsMesDigitacion.map(mes => {
                      const isSelected = selectedMesFiltro === mes.key;
                      return (
                        <tr
                          key={mes.key}
                          className={`transition-colors ${
                            isSelected ? 'bg-indigo-600/20' : 'hover:bg-white/5'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">{mes.label}</div>
                            <div className="text-[10px] font-mono text-slate-400">{mes.key}</div>
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-bold text-emerald-400">
                            {mes.count}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-indigo-200 font-semibold">
                            {mes.porcentaje}%
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300">
                            {mes.digitadoresCount}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                mes.avgDelay <= 3
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : mes.avgDelay <= 7
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              <span>{mes.avgDelay}d</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => setSelectedMesFiltro(isSelected ? null : mes.key)}
                              className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-400 text-slate-950 font-black'
                                  : 'bg-white/10 hover:bg-white/20 text-white'
                              }`}
                            >
                              {isSelected ? 'Quitar Filtro' : 'Filtrar'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer summary */}
              <div className="p-3 bg-slate-950/60 border-t border-white/10 text-[11px] text-slate-300 flex justify-between items-center">
                <span>Total Registros en el Período:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {kpiData.total} atenciones
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN OPORTUNIDAD: RANGOS 0-10 DÍAS | 11-29 DÍAS | 30 DÍAS A MÁS        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>Oportunidad de Digitación por Rangos</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Fecha Atención vs Fecha Registro
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluación normativa de plazos: <strong>0-10 días</strong> (Oportuno), <strong>11-29 días</strong> (Con demora) y <strong>≥30 días</strong> (Extemporáneo)
                {activePunto !== 'TODOS' && (
                  <span className="text-indigo-600 font-semibold ml-1">
                    — En {activePunto}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {selectedRangoFiltro !== 'TODOS' && (
              <button
                onClick={() => setSelectedRangoFiltro('TODOS')}
                className="px-2.5 py-1 text-xs rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                Quitar filtro ({selectedRangoFiltro})
              </button>
            )}
            {onNavigateToOportunidad && (
              <button
                onClick={onNavigateToOportunidad}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                <span>Ver Módulo B.9 Oportunidad Completo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 3 Interactive Cards for Brackets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 0 - 10 días */}
          <div
            onClick={() => setSelectedRangoFiltro(selectedRangoFiltro === '0-10' ? 'TODOS' : '0-10')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedRangoFiltro === '0-10'
                ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400 scale-[1.01]'
                : 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                selectedRangoFiltro === '0-10' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                0 a 10 días
              </span>
              <CheckCircle2 className={`w-4 h-4 ${selectedRangoFiltro === '0-10' ? 'text-emerald-100' : 'text-emerald-600'}`} />
            </div>
            <div className="mt-2.5">
              <div className={`text-2xl font-black font-mono ${selectedRangoFiltro === '0-10' ? 'text-white' : 'text-slate-900'}`}>
                {kpiData.count0_10}
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className={selectedRangoFiltro === '0-10' ? 'text-emerald-100' : 'text-slate-600'}>
                  Oportuno (En Plazo)
                </span>
                <span className={`font-mono font-bold ${selectedRangoFiltro === '0-10' ? 'text-white' : 'text-emerald-700'}`}>
                  {kpiData.pct0_10}%
                </span>
              </div>
            </div>
            <div className={`w-full h-1.5 rounded-full mt-2.5 overflow-hidden ${selectedRangoFiltro === '0-10' ? 'bg-white/20' : 'bg-emerald-200/60'}`}>
              <div
                className={`h-full rounded-full ${selectedRangoFiltro === '0-10' ? 'bg-white' : 'bg-emerald-500'}`}
                style={{ width: `${kpiData.pct0_10}%` }}
              ></div>
            </div>
            <span className="text-[10px] block mt-1.5 opacity-80 underline">
              {selectedRangoFiltro === '0-10' ? 'Click para ver todos' : 'Click para filtrar tabla inferior'}
            </span>
          </div>

          {/* Card 11 - 29 días */}
          <div
            onClick={() => setSelectedRangoFiltro(selectedRangoFiltro === '11-29' ? 'TODOS' : '11-29')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedRangoFiltro === '11-29'
                ? 'bg-amber-500 text-slate-950 shadow-lg ring-2 ring-amber-300 scale-[1.01]'
                : 'bg-amber-50/50 hover:bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                selectedRangoFiltro === '11-29' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-amber-100 text-amber-800'
              }`}>
                11 a 29 días
              </span>
              <AlertTriangle className={`w-4 h-4 ${selectedRangoFiltro === '11-29' ? 'text-slate-950' : 'text-amber-500'}`} />
            </div>
            <div className="mt-2.5">
              <div className={`text-2xl font-black font-mono ${selectedRangoFiltro === '11-29' ? 'text-slate-950' : 'text-slate-900'}`}>
                {kpiData.count11_29}
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className={selectedRangoFiltro === '11-29' ? 'text-slate-950/80' : 'text-slate-600'}>
                  Con Demora (Observado)
                </span>
                <span className={`font-mono font-bold ${selectedRangoFiltro === '11-29' ? 'text-slate-950' : 'text-amber-700'}`}>
                  {kpiData.pct11_29}%
                </span>
              </div>
            </div>
            <div className={`w-full h-1.5 rounded-full mt-2.5 overflow-hidden ${selectedRangoFiltro === '11-29' ? 'bg-slate-950/20' : 'bg-amber-200/60'}`}>
              <div
                className={`h-full rounded-full ${selectedRangoFiltro === '11-29' ? 'bg-slate-950' : 'bg-amber-500'}`}
                style={{ width: `${kpiData.pct11_29}%` }}
              ></div>
            </div>
            <span className="text-[10px] block mt-1.5 opacity-80 underline">
              {selectedRangoFiltro === '11-29' ? 'Click para ver todos' : 'Click para filtrar tabla inferior'}
            </span>
          </div>

          {/* Card 30 días a más */}
          <div
            onClick={() => setSelectedRangoFiltro(selectedRangoFiltro === '30+' ? 'TODOS' : '30+')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              selectedRangoFiltro === '30+'
                ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400 scale-[1.01]'
                : 'bg-rose-50/50 hover:bg-rose-50 border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                selectedRangoFiltro === '30+' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                30 días a más
              </span>
              <AlertTriangle className={`w-4 h-4 ${selectedRangoFiltro === '30+' ? 'text-rose-100' : 'text-rose-600'}`} />
            </div>
            <div className="mt-2.5">
              <div className={`text-2xl font-black font-mono ${selectedRangoFiltro === '30+' ? 'text-white' : 'text-slate-900'}`}>
                {kpiData.count30_mas}
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className={selectedRangoFiltro === '30+' ? 'text-rose-100' : 'text-slate-600'}>
                  Extemporáneo (Rezagado)
                </span>
                <span className={`font-mono font-bold ${selectedRangoFiltro === '30+' ? 'text-white' : 'text-rose-700'}`}>
                  {kpiData.pct30_mas}%
                </span>
              </div>
            </div>
            <div className={`w-full h-1.5 rounded-full mt-2.5 overflow-hidden ${selectedRangoFiltro === '30+' ? 'bg-white/20' : 'bg-rose-200/60'}`}>
              <div
                className={`h-full rounded-full ${selectedRangoFiltro === '30+' ? 'bg-white' : 'bg-rose-500'}`}
                style={{ width: `${kpiData.pct30_mas}%` }}
              ></div>
            </div>
            <span className="text-[10px] block mt-1.5 opacity-80 underline">
              {selectedRangoFiltro === '30+' ? 'Click para ver todos' : 'Click para filtrar tabla inferior'}
            </span>
          </div>
        </div>

        {/* Tabla Comparativa de Oportunidad por Punto de Digitación */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Tabla de Oportunidad por Centro de Captura (0-10d | 11-29d | ≥30d)</span>
            </span>
            <span className="text-[11px] text-slate-500">
              Meta Oportuno: ≥ 70% en 0-10 días
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Punto de Digitación</th>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3 text-right">Total Reg.</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50 text-emerald-900 border-x border-emerald-100">
                    0-10 días (Oportuno)
                  </th>
                  <th className="py-2.5 px-3 text-right bg-amber-50 text-amber-900 border-r border-amber-100">
                    11-29 días (Demora)
                  </th>
                  <th className="py-2.5 px-3 text-right bg-rose-50 text-rose-900 border-r border-rose-100">
                    ≥30 días (Rezagado)
                  </th>
                  <th className="py-2.5 px-3 text-center">Desfase Prom.</th>
                  <th className="py-2.5 px-4 text-center">Cumplimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {oportunidadRankingTable.map(p => {
                  const meets = p.pct0_10 >= 70;
                  const isCurrent = activePunto === p.nombre;
                  return (
                    <tr
                      key={p.nombre}
                      onClick={() => {
                        setSelectedPunto(p.nombre);
                        setSelectedMesFiltro(null);
                      }}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isCurrent ? 'bg-blue-50/70 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-900 flex items-center space-x-1.5">
                        <span>{p.nombre}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">
                            Activo
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{p.cod}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600">
                        {p.total}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono bg-emerald-50/40 border-x border-emerald-100">
                        <strong className="text-emerald-700">{p.c0_10}</strong>{' '}
                        <span className="text-[10px] text-slate-500">({p.pct0_10}%)</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono bg-amber-50/40 border-r border-amber-100">
                        <strong className="text-amber-700">{p.c11_29}</strong>{' '}
                        <span className="text-[10px] text-slate-500">({p.pct11_29}%)</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono bg-rose-50/40 border-r border-rose-100">
                        <strong className="text-rose-700">{p.c30_mas}</strong>{' '}
                        <span className="text-[10px] text-slate-500">({p.pct30_mas}%)</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                        {p.avg}d
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            meets
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <span>{p.pct0_10}%</span>
                          <span>{meets ? '✓' : '⚠'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN CRUCE: PERÍODO DE REGISTRO VS MES DE ATENCIÓN                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>Cruce: Período de Registro vs Mes de Atención</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                  {selectedPunto === 'TODOS' ? 'Todos los Puntos' : selectedPunto}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evalúa qué meses de atención clínica (FUAs de Ene, Feb, Mar...) fueron digitados durante cada período de captura
              </p>
            </div>
          </div>

          {onNavigateToRegistroVsAtencion && (
            <button
              onClick={onNavigateToRegistroVsAtencion}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-600 text-cyan-800 hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <span>Ver Módulo Completo B.10</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {registroVsAtencionCruzado.hasData ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 sticky left-0 bg-slate-100 z-10 min-w-[160px]">
                    Período Registro (Mes Digitado)
                  </th>
                  <th className="py-3 px-3 text-right bg-slate-200/70 border-r border-slate-200 font-black">
                    Total Digitado
                  </th>
                  {registroVsAtencionCruzado.atenList.map(m => (
                    <th key={m.key} className="py-3 px-3 text-center border-r border-slate-200 font-bold min-w-[85px]">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registroVsAtencionCruzado.regList.map(reg => {
                  const total = registroVsAtencionCruzado.periodoTotals[reg.key] || 0;
                  return (
                    <tr key={reg.key} className="hover:bg-cyan-50/40 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100">
                        {reg.label}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-slate-50 border-r border-slate-200">
                        {total}
                      </td>
                      {registroVsAtencionCruzado.atenList.map(aten => {
                        const count = registroVsAtencionCruzado.matrix[reg.key]?.[aten.key] || 0;
                        const isSame = reg.key === aten.key;
                        const isLag = reg.key > aten.key;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;

                        return (
                          <td
                            key={aten.key}
                            className={`py-2.5 px-3 text-center font-mono border-r border-slate-100 ${
                              count > 0
                                ? isSame
                                  ? 'bg-emerald-50 text-emerald-900 font-black border-emerald-200'
                                  : isLag
                                  ? 'bg-amber-50 text-amber-900 font-bold border-amber-200'
                                  : 'text-slate-700'
                                : 'text-slate-300'
                            }`}
                            title={
                              count > 0
                                ? `En ${reg.label} se digitaron ${count} FUAs con atención en ${aten.label} (${pct}%)`
                                : 'Sin registros'
                            }
                          >
                            {count > 0 ? (
                              <div>
                                <span className="text-xs">{count}</span>
                                <span className="block text-[9px] opacity-75 font-normal">{pct}%</span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 text-xs">
            No hay registros suficientes para armar la matriz de cruce de fechas.
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RANKING GENERAL Y DISTRIBUCIÓN POR PUNTO DE DIGITACIÓN                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Circular Distribution Donut Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              <span>Distribución de Carga General (%)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Participación porcentual de cada punto sobre el total general
            </p>

            {/* SVG Pie/Donut representation */}
            <div className="flex flex-col items-center justify-center my-4">
              <div className="relative w-44 h-44">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {(() => {
                    let accumulated = 0;
                    return fullRanking.map((r, i) => {
                      const strokeDasharray = `${r.porcentaje} ${100 - r.porcentaje}`;
                      const strokeDashoffset = -accumulated;
                      accumulated += r.porcentaje;
                      return (
                        <circle
                          key={r.nombre}
                          cx="50"
                          cy="50"
                          r="38"
                          fill="transparent"
                          stroke={colors[i % colors.length]}
                          strokeWidth="18"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          onClick={() => {
                            setSelectedPunto(r.nombre);
                            setSelectedMesFiltro(null);
                          }}
                          className={`transition-all hover:stroke-[22] cursor-pointer ${
                            activePunto === r.nombre ? 'stroke-[22] opacity-100' : 'opacity-85'
                          }`}
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold font-mono text-slate-900">
                    {fullRanking.length}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Puntos</span>
                </div>
              </div>

              {/* Legend with direct selection */}
              <div className="w-full space-y-1.5 mt-3 max-h-48 overflow-y-auto pr-1 text-[11px]">
                {fullRanking.map((r, i) => (
                  <div
                    key={r.nombre}
                    onClick={() => {
                      setSelectedPunto(r.nombre);
                      setSelectedMesFiltro(null);
                    }}
                    className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                      activePunto === r.nombre
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors[i % colors.length] }}
                      ></span>
                      <span
                        className={`truncate ${
                          activePunto === r.nombre ? 'font-bold text-indigo-900' : 'text-slate-700'
                        }`}
                        title={r.nombre}
                      >
                        {r.nombre}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono flex-shrink-0">
                      <span className="text-slate-500 font-medium">{r.count}</span>
                      <strong className="text-slate-900">({r.porcentaje}%)</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              Haz clic en cualquier punto para cargar sus estadísticas mensuales
            </span>
          </div>
        </div>

        {/* Ranking Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Ranking de Productividad por Punto de Digitación
              </span>
            </div>
            {searchTerm && (
              <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                Filtrado por: "{searchTerm}" ({filteredRanking.length} resultados)
              </span>
            )}
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-center">Rank</th>
                  <th className="py-2.5 px-4">Punto de Digitación</th>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3 text-center">EESS</th>
                  <th className="py-2.5 px-3 text-center">Digitadores</th>
                  <th className="py-2.5 px-4 text-right">Atenciones</th>
                  <th className="py-2.5 px-3 text-right">Part. %</th>
                  <th className="py-2.5 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRanking.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No se encontraron puntos de digitación con el criterio de búsqueda "{searchTerm}".
                    </td>
                  </tr>
                ) : (
                  filteredRanking.map((r, idx) => {
                    const isSelected = activePunto === r.nombre;
                    return (
                      <tr
                        key={r.nombre}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/80 border-l-4 border-indigo-600'
                            : 'hover:bg-slate-50'
                        }`}
                        onClick={() => {
                          setSelectedPunto(r.nombre);
                          setSelectedMesFiltro(null);
                        }}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-bold text-[10px] ${
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
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center space-x-1.5">
                            <span>{r.nombre}</span>
                            {isSelected && (
                              <span className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded">
                                Seleccionado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{r.cod}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium">{r.eessCount}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-medium">{r.digitadoresCount}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">
                          {r.count}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                          {r.porcentaje}%
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedPunto(r.nombre);
                              setSelectedMesFiltro(null);
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                            title="Ver estadísticas mensuales de este punto"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DETALLE CRONOLÓGICO DE REGISTROS CON FECHA DE REGISTRO DESTACADA          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Detalle Cronológico de Registros
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {activePunto}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
              {selectedMesFiltro && (
                <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                  Mes: {statsMesDigitacion.find(m => m.key === selectedMesFiltro)?.label || selectedMesFiltro}
                </span>
              )}
              {selectedRangoFiltro !== 'TODOS' && (
                <span className={`font-semibold px-2 py-0.5 rounded-full border ${
                  selectedRangoFiltro === '0-10' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  selectedRangoFiltro === '11-29' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  Rango: {selectedRangoFiltro === '0-10' ? '0 a 10 días' : selectedRangoFiltro === '11-29' ? '11 a 29 días' : '≥30 días'}
                </span>
              )}
              <span>({detailList.length} registros encontrados)</span>
              {(selectedMesFiltro || selectedRangoFiltro !== 'TODOS') && (
                <button
                  onClick={() => {
                    setSelectedMesFiltro(null);
                    setSelectedRangoFiltro('TODOS');
                  }}
                  className="text-amber-600 hover:text-amber-800 text-[11px] font-bold underline cursor-pointer ml-1"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Items per page selector */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <span className="text-[11px]">Mostrar:</span>
              <select
                value={itemsPerPage}
                onChange={e => setItemsPerPage(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              title="Descargar listado en formato CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Fecha Atención</th>
                <th className="py-2.5 px-3 bg-indigo-50/60 text-indigo-900 border-x border-indigo-100">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-indigo-600" />
                    <span>Fecha Registro (Digitación)</span>
                  </div>
                </th>
                <th className="py-2.5 px-2 text-center">Días</th>
                <th className="py-2.5 px-3 text-center">Rango Oportunidad</th>
                <th className="py-2.5 px-3">N° Formato</th>
                <th className="py-2.5 px-3">Establecimiento (EESS)</th>
                <th className="py-2.5 px-3">Servicio de Salud</th>
                <th className="py-2.5 px-3">Digitador</th>
                <th className="py-2.5 px-3">Punto de Digitación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No se encontraron registros de atenciones para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedList.map(a => {
                  const delay = calculateDaysDifference(a.fecha_atencion, a.fecha_registro);
                  const mesInfo = extractMesRegistro(a.fecha_registro);

                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                        {a.fecha_atencion}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {a.hora_atencion}
                        </span>
                      </td>

                      {/* Highlighted Fecha de Registro */}
                      <td className="py-2.5 px-3 bg-indigo-50/30 border-x border-indigo-100/60 font-mono">
                        <span className="font-bold text-indigo-950 text-xs">
                          {a.fecha_registro || 'S/F'}
                        </span>
                        <span className="inline-block mt-0.5 ml-1 text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-sans font-semibold">
                          {mesInfo.label}
                        </span>
                      </td>

                      {/* Días transcurridos */}
                      <td className="py-2.5 px-2 text-center font-mono font-extrabold text-xs">
                        {delay !== null ? `+${delay}d` : '—'}
                      </td>

                      {/* Rango de Oportunidad (0-10, 11-29, 30+) */}
                      <td className="py-2.5 px-3 text-center">
                        {delay !== null ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              delay <= 10
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : delay <= 29
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}
                          >
                            {delay <= 10
                              ? '0-10 días (Oportuno)'
                              : delay <= 29
                              ? '11-29 días (Demora)'
                              : '≥30 días (Rezagado)'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Sin fecha</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                        {a.nro_formato}
                      </td>

                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {a.nombre_eess}
                      </td>

                      <td className="py-2.5 px-3 text-slate-800">
                        <span className="font-medium text-slate-900">{a.descripcion_servicio}</span>
                        <span className="block text-[10px] font-mono text-slate-400">
                          Cód: {a.cod_servicio}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {a.digitador}
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800 text-[11px] block">
                          {a.punto_digitacion}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {a.cod_punto_digitacion}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {detailList.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>
              Mostrando registros{' '}
              <strong className="text-slate-800 font-mono">
                {Math.min((currentPage - 1) * itemsPerPage + 1, detailList.length)}
              </strong>{' '}
              al{' '}
              <strong className="text-slate-800 font-mono">
                {Math.min(currentPage * itemsPerPage, detailList.length)}
              </strong>{' '}
              de <strong className="text-slate-800 font-mono">{detailList.length}</strong> totales
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Anterior
              </button>
              <span className="px-3 py-1 font-mono font-bold text-slate-700">
                Pág. {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
