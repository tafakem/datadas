import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Layers,
  Building2,
  Clock,
  Download,
  Filter,
  Search,
  ArrowRight,
  TrendingUp,
  FileText,
  CheckCircle2,
  AlertTriangle,
  History,
  Sparkles,
  BarChart3,
  X,
  UserCheck,
} from 'lucide-react';
import { Atencion } from '../../types/health';

interface Props {
  atenciones: Atencion[];
  onNavigateToPunto?: (punto: string) => void;
}

// Helper to extract year and month info
export const getYearMonthInfo = (
  dateStr: string | undefined
): { key: string; label: string; shortLabel: string; year: number; month: number } => {
  if (!dateStr) {
    return { key: 'S/F', label: 'Sin Fecha', shortLabel: 'S/F', year: 0, month: 0 };
  }
  const str = String(dateStr).trim();
  const match = str.match(/^(\d{4})[-/](\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const shortMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
    const label = `${months[month - 1] || 'Mes ' + month} ${year}`;
    const shortLabel = `${shortMonths[month - 1] || 'M' + month} ${year}`;
    return { key, label, shortLabel, year, month };
  }
  return { key: str.substring(0, 7), label: str.substring(0, 7), shortLabel: str.substring(0, 7), year: 0, month: 0 };
};

// Calculate difference in months between registration date and attention date
export const calculateMonthLag = (
  fechaAtencionStr: string | undefined,
  fechaRegistroStr: string | undefined
): { lagMonths: number; label: string; badgeColor: string } => {
  const atencion = getYearMonthInfo(fechaAtencionStr);
  const registro = getYearMonthInfo(fechaRegistroStr);

  if (atencion.key === 'S/F' || registro.key === 'S/F') {
    return { lagMonths: 0, label: 'Sin Fecha', badgeColor: 'bg-slate-100 text-slate-700' };
  }

  const lagMonths = (registro.year - atencion.year) * 12 + (registro.month - atencion.month);

  if (lagMonths <= 0) {
    return { lagMonths: 0, label: 'Mismo Mes (Al Día)', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  } else if (lagMonths === 1) {
    return { lagMonths: 1, label: 'Rezago 1 Mes', badgeColor: 'bg-blue-100 text-blue-800 border-blue-300' };
  } else if (lagMonths === 2) {
    return { lagMonths: 2, label: 'Rezago 2 Meses', badgeColor: 'bg-amber-100 text-amber-800 border-amber-300' };
  } else {
    return { lagMonths, label: `Rezago ${lagMonths} Meses`, badgeColor: 'bg-rose-100 text-rose-800 border-rose-300' };
  }
};

export const AtencionesRegistroVsAtencion: React.FC<Props> = ({
  atenciones,
  onNavigateToPunto,
}) => {
  const [activeTab, setActiveTab] = useState<'matriz' | 'periodo' | 'punto' | 'detalle'>('matriz');
  const [selectedPunto, setSelectedPunto] = useState<string>('TODOS');
  const [selectedPeriodoRegistro, setSelectedPeriodoRegistro] = useState<string>('TODOS');
  const [selectedMesAtencion, setSelectedMesAtencion] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination for detail table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  // Extract all unique Puntos de Digitacion
  const allPuntos = useMemo(() => {
    return Array.from(new Set(atenciones.map(a => a.punto_digitacion))).filter(Boolean).sort();
  }, [atenciones]);

  // Extract all distinct Registration Periods (Mes de Digitación)
  const allPeriodosRegistro = useMemo(() => {
    const map = new Map<string, { key: string; label: string; shortLabel: string; year: number; month: number }>();
    atenciones.forEach(a => {
      const reg = getYearMonthInfo(a.fecha_registro);
      if (reg.key !== 'S/F' && !map.has(reg.key)) {
        map.set(reg.key, reg);
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [atenciones]);

  // Extract all distinct Attention Months (Mes Clínico de la Prestación)
  const allMesesAtencion = useMemo(() => {
    const map = new Map<string, { key: string; label: string; shortLabel: string; year: number; month: number }>();
    atenciones.forEach(a => {
      const aten = getYearMonthInfo(a.fecha_atencion);
      if (aten.key !== 'S/F' && !map.has(aten.key)) {
        map.set(aten.key, aten);
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [atenciones]);

  // Filtered dataset according to Punto de Digitación
  const puntoFilteredAtenciones = useMemo(() => {
    if (selectedPunto === 'TODOS') return atenciones;
    return atenciones.filter(a => a.punto_digitacion === selectedPunto);
  }, [atenciones, selectedPunto]);

  // 1. Cross Matrix: Row = Mes Registro, Column = Mes Atencion
  const matrixData = useMemo(() => {
    // matrix[periodoRegistroKey][mesAtencionKey] = count
    const matrix: Record<string, Record<string, number>> = {};
    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    let grandTotal = 0;

    // Initialize rows and cols
    allPeriodosRegistro.forEach(p => {
      matrix[p.key] = {};
      rowTotals[p.key] = 0;
      allMesesAtencion.forEach(m => {
        matrix[p.key][m.key] = 0;
        if (!colTotals[m.key]) colTotals[m.key] = 0;
      });
    });

    puntoFilteredAtenciones.forEach(a => {
      const reg = getYearMonthInfo(a.fecha_registro);
      const aten = getYearMonthInfo(a.fecha_atencion);

      if (reg.key !== 'S/F' && aten.key !== 'S/F') {
        if (!matrix[reg.key]) {
          matrix[reg.key] = {};
          rowTotals[reg.key] = 0;
        }
        if (matrix[reg.key][aten.key] === undefined) {
          matrix[reg.key][aten.key] = 0;
        }
        matrix[reg.key][aten.key]++;
        rowTotals[reg.key] = (rowTotals[reg.key] || 0) + 1;
        colTotals[aten.key] = (colTotals[aten.key] || 0) + 1;
        grandTotal++;
      }
    });

    return { matrix, rowTotals, colTotals, grandTotal };
  }, [puntoFilteredAtenciones, allPeriodosRegistro, allMesesAtencion]);

  // 2. Focused Period Analysis (For Tab 2: e.g. "En el Periodo Marzo se digitó FUAs de Ene, Feb y Mar")
  const focusedPeriodKey = useMemo(() => {
    if (selectedPeriodoRegistro !== 'TODOS') return selectedPeriodoRegistro;
    // Default to latest available period
    return allPeriodosRegistro.length > 0 ? allPeriodosRegistro[allPeriodosRegistro.length - 1].key : '';
  }, [selectedPeriodoRegistro, allPeriodosRegistro]);

  const focusedPeriodInfo = useMemo(() => {
    return allPeriodosRegistro.find(p => p.key === focusedPeriodKey) || null;
  }, [focusedPeriodKey, allPeriodosRegistro]);

  const focusedPeriodBreakdown = useMemo(() => {
    if (!focusedPeriodKey) return null;

    const list = puntoFilteredAtenciones.filter(a => {
      const reg = getYearMonthInfo(a.fecha_registro);
      return reg.key === focusedPeriodKey;
    });

    const totalPeriodo = list.length;
    let countMismoMes = 0;
    let countRezago1 = 0;
    let countRezago2 = 0;
    let countRezago3Mas = 0;

    // By Attention Month
    const mesAtencionMap: Record<
      string,
      {
        key: string;
        label: string;
        shortLabel: string;
        count: number;
        pct: number;
        lag: number;
        lagLabel: string;
      }
    > = {};

    // By Punto de Digitación within this period
    const puntoMap: Record<
      string,
      {
        nombre: string;
        total: number;
        mismoMes: number;
        rezagados: number;
        mesesDigitados: Set<string>;
      }
    > = {};

    list.forEach(a => {
      const aten = getYearMonthInfo(a.fecha_atencion);
      const lag = calculateMonthLag(a.fecha_atencion, a.fecha_registro);

      if (lag.lagMonths <= 0) countMismoMes++;
      else if (lag.lagMonths === 1) countRezago1++;
      else if (lag.lagMonths === 2) countRezago2++;
      else countRezago3Mas++;

      if (!mesAtencionMap[aten.key]) {
        mesAtencionMap[aten.key] = {
          key: aten.key,
          label: aten.label,
          shortLabel: aten.shortLabel,
          count: 0,
          pct: 0,
          lag: lag.lagMonths,
          lagLabel: lag.label,
        };
      }
      mesAtencionMap[aten.key].count++;

      const pKey = (a.punto_digitacion || 'SIN PUNTO').trim();
      if (!puntoMap[pKey]) {
        puntoMap[pKey] = {
          nombre: pKey,
          total: 0,
          mismoMes: 0,
          rezagados: 0,
          mesesDigitados: new Set(),
        };
      }
      puntoMap[pKey].total++;
      if (lag.lagMonths <= 0) {
        puntoMap[pKey].mismoMes++;
      } else {
        puntoMap[pKey].rezagados++;
      }
      puntoMap[pKey].mesesDigitados.add(aten.label);
    });

    const mesList = Object.values(mesAtencionMap).map(m => ({
      ...m,
      pct: totalPeriodo > 0 ? Math.round((m.count / totalPeriodo) * 1000) / 10 : 0,
    })).sort((a, b) => b.count - a.count);

    const puntosList = Object.values(puntoMap).sort((a, b) => b.total - a.total);

    return {
      totalPeriodo,
      countMismoMes,
      pctMismoMes: totalPeriodo > 0 ? Math.round((countMismoMes / totalPeriodo) * 1000) / 10 : 0,
      countRezago1,
      pctRezago1: totalPeriodo > 0 ? Math.round((countRezago1 / totalPeriodo) * 1000) / 10 : 0,
      countRezago2,
      pctRezago2: totalPeriodo > 0 ? Math.round((countRezago2 / totalPeriodo) * 1000) / 10 : 0,
      countRezago3Mas,
      pctRezago3Mas: totalPeriodo > 0 ? Math.round((countRezago3Mas / totalPeriodo) * 1000) / 10 : 0,
      mesList,
      puntosList,
    };
  }, [focusedPeriodKey, puntoFilteredAtenciones]);

  // 3. Breakdown by Punto de Digitación Across All Periods
  const puntoAnalysisTable = useMemo(() => {
    const map: Record<
      string,
      {
        nombre: string;
        totalDigitado: number;
        mismoMes: number;
        rezagado1: number;
        rezagado2Mas: number;
        periodosRegistro: Set<string>;
        mesesAtencion: Set<string>;
      }
    > = {};

    puntoFilteredAtenciones.forEach(a => {
      const key = (a.punto_digitacion || 'SIN PUNTO ASIGNADO').trim();
      if (!map[key]) {
        map[key] = {
          nombre: key,
          totalDigitado: 0,
          mismoMes: 0,
          rezagado1: 0,
          rezagado2Mas: 0,
          periodosRegistro: new Set(),
          mesesAtencion: new Set(),
        };
      }
      map[key].totalDigitado++;

      const reg = getYearMonthInfo(a.fecha_registro);
      const aten = getYearMonthInfo(a.fecha_atencion);
      if (reg.key !== 'S/F') map[key].periodosRegistro.add(reg.label);
      if (aten.key !== 'S/F') map[key].mesesAtencion.add(aten.label);

      const lag = calculateMonthLag(a.fecha_atencion, a.fecha_registro);
      if (lag.lagMonths <= 0) map[key].mismoMes++;
      else if (lag.lagMonths === 1) map[key].rezagado1++;
      else map[key].rezagado2Mas++;
    });

    return Object.values(map)
      .map(p => {
        const pctOportuno = p.totalDigitado > 0 ? Math.round((p.mismoMes / p.totalDigitado) * 1000) / 10 : 0;
        return {
          ...p,
          pctOportuno,
        };
      })
      .sort((a, b) => b.totalDigitado - a.totalDigitado);
  }, [puntoFilteredAtenciones]);

  // 4. Detail Records with search and pagination
  const filteredDetail = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return puntoFilteredAtenciones.filter(a => {
      const reg = getYearMonthInfo(a.fecha_registro);
      const aten = getYearMonthInfo(a.fecha_atencion);

      if (selectedPeriodoRegistro !== 'TODOS' && reg.key !== selectedPeriodoRegistro) {
        return false;
      }
      if (selectedMesAtencion !== 'TODOS' && aten.key !== selectedMesAtencion) {
        return false;
      }

      if (term) {
        const matchFua = (a.nro_formato || '').toLowerCase().includes(term);
        const matchEess = (a.nombre_eess || '').toLowerCase().includes(term);
        const matchPunto = (a.punto_digitacion || '').toLowerCase().includes(term);
        const matchDigitador = (a.digitador || '').toLowerCase().includes(term);
        const matchPaciente = (a.beneficiario || '').toLowerCase().includes(term);
        if (!matchFua && !matchEess && !matchPunto && !matchDigitador && !matchPaciente) {
          return false;
        }
      }

      return true;
    });
  }, [puntoFilteredAtenciones, selectedPeriodoRegistro, selectedMesAtencion, searchTerm]);

  const totalPages = Math.ceil(filteredDetail.length / itemsPerPage) || 1;
  const paginatedDetail = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDetail.slice(start, start + itemsPerPage);
  }, [filteredDetail, currentPage, itemsPerPage]);

  // Export matrix to CSV
  const handleExportMatrixCSV = () => {
    const headers = [
      'Periodo de Registro (Mes Digitado)',
      'Total FUAs Digitados',
      ...allMesesAtencion.map(m => `Atendido en ${m.label}`),
    ];

    const rows = allPeriodosRegistro.map(p => {
      const total = matrixData.rowTotals[p.key] || 0;
      const monthCols = allMesesAtencion.map(m => String(matrixData.matrix[p.key]?.[m.key] || 0));
      return [`"${p.label}"`, String(total), ...monthCols];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cruce_periodo_registro_vs_atencion.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export detail to CSV
  const handleExportDetailCSV = () => {
    const headers = [
      'Nro Formato FUA',
      'Periodo Registro (Mes Digitado)',
      'Fecha Registro',
      'Mes de Atencion Clinica',
      'Fecha Atencion',
      'Desfase Meses',
      'Clasificacion Rezago',
      'Punto de Digitacion',
      'Digitador',
      'Establecimiento de Salud (EESS)',
      'Paciente',
      'Servicio',
    ];

    const rows = filteredDetail.map(a => {
      const reg = getYearMonthInfo(a.fecha_registro);
      const aten = getYearMonthInfo(a.fecha_atencion);
      const lag = calculateMonthLag(a.fecha_atencion, a.fecha_registro);

      return [
        `"${a.nro_formato || ''}"`,
        `"${reg.label}"`,
        a.fecha_registro || '',
        `"${aten.label}"`,
        a.fecha_atencion || '',
        String(lag.lagMonths),
        `"${lag.label}"`,
        `"${a.punto_digitacion || ''}"`,
        `"${a.digitador || ''}"`,
        `"${a.nombre_eess || ''}"`,
        `"${a.beneficiario || ''}"`,
        `"${a.descripcion_servicio || ''}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `detalle_fuas_registro_vs_atencion.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                  <span>B.10. Período de Registro vs Mes de Atención</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-bold uppercase">
                    Cruce de Fechas FUAs
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Auditoría del desfase de captura: evalúa en qué mes clínico se realizaron las prestaciones digitadas durante cada período de trabajo
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Metrics */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>{puntoFilteredAtenciones.length} FUAs Evaluados</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 text-cyan-800 text-xs font-bold border border-cyan-200">
              <Layers className="w-3.5 h-3.5 text-cyan-600" />
              <span>{allPeriodosRegistro.length} Períodos de Registro</span>
            </span>
            <button
              onClick={activeTab === 'detalle' ? handleExportDetailCSV : handleExportMatrixCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          {/* Punto de Digitación Filter */}
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={selectedPunto}
              onChange={e => {
                setSelectedPunto(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-800 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            >
              <option value="TODOS">Todos los Puntos de Digitación ({allPuntos.length})</option>
              {allPuntos.map(p => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Periodo de Registro (Mes Digitado) Filter */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={selectedPeriodoRegistro}
              onChange={e => {
                setSelectedPeriodoRegistro(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-800 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            >
              <option value="TODOS">Todos los Períodos de Registro</option>
              {allPeriodosRegistro.map(p => (
                <option key={p.key} value={p.key}>
                  Período Registro: {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Mes de Atencion (Mes Clinico) Filter */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={selectedMesAtencion}
              onChange={e => {
                setSelectedMesAtencion(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-800 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            >
              <option value="TODOS">Todos los Meses de Atención</option>
              {allMesesAtencion.map(m => (
                <option key={m.key} value={m.key}>
                  Mes Atención: {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-slate-200 pt-2 -mb-2 space-x-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('matriz')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'matriz'
                ? 'border-cyan-600 text-cyan-800 bg-cyan-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-600" />
            <span>1. Matriz Cruzada Global</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-100 text-cyan-900 font-mono">
              Fila: Registro vs Col: Atención
            </span>
          </button>

          <button
            onClick={() => setActiveTab('periodo')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'periodo'
                ? 'border-cyan-600 text-cyan-800 bg-cyan-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>2. Análisis del Período {focusedPeriodInfo ? `(${focusedPeriodInfo.shortLabel})` : ''}</span>
          </button>

          <button
            onClick={() => setActiveTab('punto')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'punto'
                ? 'border-cyan-600 text-cyan-800 bg-cyan-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>3. Por Punto de Digitación</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-mono">
              {puntoAnalysisTable.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('detalle')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'detalle'
                ? 'border-cyan-600 text-cyan-800 bg-cyan-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>4. Detalle Individual de FUAs</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-mono">
              {filteredDetail.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MATRIZ CRUZADA DOBLE ENTRADA (REGISTRO VS ATENCIÓN)                */}
      {/* ========================================================================= */}
      {activeTab === 'matriz' && (
        <div className="space-y-6">
          {/* Explanation Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-blue-950 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                <span>Matriz de Doble Entrada: Mes de Digitación vs Mes de Prestación</span>
              </h3>
              <p className="text-xs text-cyan-200 max-w-3xl leading-relaxed">
                Cada fila representa el <strong>Período de Registro (cuándo se digitó en el sistema)</strong>, y cada columna indica el <strong>Mes de Atención (cuándo se atendió al paciente)</strong>.
                La diagonal resaltada corresponde a los FUAs digitados en el mismo mes clínico. Los valores a la izquierda son <strong>FUAs de meses anteriores (rezagos)</strong>.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
                <span>Diagonal = Mismo Mes</span>
              </div>
              <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                <span>Izquierda = Rezagos</span>
              </div>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-cyan-600" />
                  <span>Cruce Período de Digitación (Filas) vs Mes de Atención (Columnas)</span>
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Haga clic en el nombre de cualquier período para ver su análisis detallado
                </span>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-200/80 px-2.5 py-1 rounded-lg font-mono">
                Gran Total: {matrixData.grandTotal} FUAs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 sticky left-0 bg-slate-100 z-10 min-w-[180px]">
                      Período de Registro (Digitado)
                    </th>
                    <th className="py-3 px-3 text-right bg-slate-200/70 border-r border-slate-200 font-black">
                      Total Digitado
                    </th>
                    {allMesesAtencion.map(m => (
                      <th
                        key={m.key}
                        className="py-3 px-3 text-center border-r border-slate-200 font-bold min-w-[90px]"
                      >
                        {m.label}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPeriodosRegistro.map(p => {
                    const rowTotal = matrixData.rowTotals[p.key] || 0;
                    return (
                      <tr key={p.key} className="hover:bg-cyan-50/40 transition-colors group">
                        <td className="py-3 px-4 font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-cyan-50/40 z-10 border-r border-slate-100">
                          <button
                            onClick={() => {
                              setSelectedPeriodoRegistro(p.key);
                              setActiveTab('periodo');
                            }}
                            className="text-left font-bold text-slate-900 hover:text-cyan-700 flex items-center space-x-1.5 cursor-pointer"
                          >
                            <span>{p.label}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-cyan-600 transition-transform group-hover:translate-x-0.5" />
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Mes de Captura
                          </span>
                        </td>

                        {/* Row Total */}
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900 bg-slate-50 group-hover:bg-cyan-100/50 border-r border-slate-200">
                          {rowTotal}
                        </td>

                        {/* Cell for each Mes de Atencion */}
                        {allMesesAtencion.map(m => {
                          const val = matrixData.matrix[p.key]?.[m.key] || 0;
                          const isSameMonth = p.key === m.key;
                          const isLag = p.key > m.key; // Attended before registered = Lag
                          const pctOfRow = rowTotal > 0 ? Math.round((val / rowTotal) * 100) : 0;

                          return (
                            <td
                              key={m.key}
                              className={`py-3 px-3 text-center font-mono border-r border-slate-100 transition-colors ${
                                val > 0
                                  ? isSameMonth
                                    ? 'bg-emerald-50 text-emerald-900 font-black border-emerald-200'
                                    : isLag
                                    ? 'bg-amber-50 text-amber-900 font-bold border-amber-200'
                                    : 'text-slate-700 font-medium'
                                  : 'text-slate-300'
                              }`}
                              title={
                                val > 0
                                  ? `En el Periodo ${p.label} se digitaron ${val} FUAs con fecha de atención en ${m.label} (${pctOfRow}% del periodo)`
                                  : 'Sin FUAs registrados'
                              }
                            >
                              {val > 0 ? (
                                <div>
                                  <span className="text-xs">{val}</span>
                                  <span className="block text-[9px] opacity-75 font-normal">
                                    {pctOfRow}%
                                  </span>
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                          );
                        })}

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedPeriodoRegistro(p.key);
                              setActiveTab('periodo');
                            }}
                            className="text-[10px] px-2 py-1 bg-cyan-50 hover:bg-cyan-600 text-cyan-800 hover:text-white font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Ver Desglose
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Column Totals Footer */}
                <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                  <tr>
                    <td className="py-3 px-4 uppercase sticky left-0 bg-slate-100 z-10 font-black">
                      Total Atendido por Mes
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-cyan-700 bg-slate-200/80 border-r border-slate-200">
                      {matrixData.grandTotal}
                    </td>
                    {allMesesAtencion.map(m => (
                      <td
                        key={m.key}
                        className="py-3 px-3 text-center font-mono font-black text-slate-900 border-r border-slate-200"
                      >
                        {matrixData.colTotals[m.key] || 0}
                      </td>
                    ))}
                    <td className="py-3 px-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ANÁLISIS DEL PERÍODO FOCALIZADO (EJ: MARZO CON FUAS ENE, FEB, MAR) */}
      {/* ========================================================================= */}
      {activeTab === 'periodo' && focusedPeriodBreakdown && focusedPeriodInfo && (
        <div className="space-y-6">
          {/* Main Card: What months were typed in this period */}
          <div className="bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 text-white p-6 rounded-3xl shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 bg-cyan-900/60 px-2.5 py-0.5 rounded-full border border-cyan-700/60 font-bold">
                  Auditoría de Período de Digitación
                </span>
                <h3 className="text-2xl font-black mt-1">
                  En el Período {focusedPeriodInfo.label} se digitaron {focusedPeriodBreakdown.totalPeriodo} FUAs
                </h3>
                <p className="text-xs text-cyan-100/90 mt-1 max-w-2xl">
                  Distribución clínica de las atenciones ingresadas durante este mes de trabajo. Permite ver cuántas correspondían al mismo mes y cuántas venían con rezago de meses anteriores.
                </p>
              </div>

              {/* Selector to switch period */}
              <div className="flex items-center space-x-2 bg-slate-800/90 p-2 rounded-2xl border border-slate-700">
                <span className="text-xs text-slate-300 font-medium">Cambiar Período:</span>
                <select
                  value={focusedPeriodKey}
                  onChange={e => setSelectedPeriodoRegistro(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-cyan-300 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-cyan-500"
                >
                  {allPeriodosRegistro.map(p => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4 Summary Indicator Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800">
              <div className="bg-white/5 rounded-2xl p-3.5 border border-emerald-500/30">
                <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mismo Mes (Al Día)</span>
                </span>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  {focusedPeriodBreakdown.countMismoMes}
                </div>
                <span className="text-[11px] text-emerald-200/80 font-mono">
                  {focusedPeriodBreakdown.pctMismoMes}% del período
                </span>
              </div>

              <div className="bg-white/5 rounded-2xl p-3.5 border border-blue-500/30">
                <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Rezago 1 Mes</span>
                </span>
                <div className="text-2xl font-black font-mono text-blue-400 mt-1">
                  {focusedPeriodBreakdown.countRezago1}
                </div>
                <span className="text-[11px] text-blue-200/80 font-mono">
                  {focusedPeriodBreakdown.pctRezago1}% del período
                </span>
              </div>

              <div className="bg-white/5 rounded-2xl p-3.5 border border-amber-500/30">
                <span className="text-[10px] text-amber-300 uppercase font-bold tracking-wider flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rezago 2 Meses</span>
                </span>
                <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                  {focusedPeriodBreakdown.countRezago2}
                </div>
                <span className="text-[11px] text-amber-200/80 font-mono">
                  {focusedPeriodBreakdown.pctRezago2}% del período
                </span>
              </div>

              <div className="bg-white/5 rounded-2xl p-3.5 border border-rose-500/30">
                <span className="text-[10px] text-rose-300 uppercase font-bold tracking-wider flex items-center space-x-1">
                  <History className="w-3.5 h-3.5 text-rose-400" />
                  <span>Rezago 3+ Meses</span>
                </span>
                <div className="text-2xl font-black font-mono text-rose-400 mt-1">
                  {focusedPeriodBreakdown.countRezago3Mas}
                </div>
                <span className="text-[11px] text-rose-200/80 font-mono">
                  {focusedPeriodBreakdown.pctRezago3Mas}% del período
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Bars and List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: What Months were typed */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-cyan-600" />
                <span>Meses Clínicos Digitados en el Período {focusedPeriodInfo.label}</span>
              </h4>

              <div className="space-y-3">
                {focusedPeriodBreakdown.mesList.map(m => {
                  const isSame = m.key === focusedPeriodKey;
                  const isLag = m.lag > 0;

                  return (
                    <div key={m.key} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{m.label}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                              isSame
                                ? 'bg-emerald-100 text-emerald-800'
                                : isLag
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isSame ? 'Mismo Mes' : `Rezago ${m.lag}m`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="font-bold text-slate-900">{m.count} FUAs</span>
                          <span className="text-slate-400">({m.pct}%)</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSame ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-600 to-amber-500'
                          }`}
                          style={{ width: `${Math.max(m.pct, 4)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: By Punto de Digitación in this Period */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Puntos de Digitación Activos en {focusedPeriodInfo.label}</span>
              </h4>

              <div className="space-y-3">
                {focusedPeriodBreakdown.puntosList.map(p => {
                  const pctMismo = p.total > 0 ? Math.round((p.mismoMes / p.total) * 100) : 0;
                  return (
                    <div key={p.nombre} className="p-3 rounded-xl bg-purple-50/40 border border-purple-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-950 truncate max-w-[220px]">
                          {p.nombre}
                        </span>
                        <div className="flex items-center space-x-2 font-mono text-xs">
                          <span className="font-bold text-purple-900">{p.total} FUAs</span>
                          <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                            {pctMismo}% al día
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>
                          <strong>{p.mismoMes}</strong> mismo mes • <strong>{p.rezagados}</strong> rezagados
                        </span>
                        <span className="truncate max-w-[180px]" title={Array.from(p.mesesDigitados).join(', ')}>
                          Digitó: {Array.from(p.mesesDigitados).join(', ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: POR PUNTO DE DIGITACIÓN Y EFICIENCIA TEMPORAL                      */}
      {/* ========================================================================= */}
      {activeTab === 'punto' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Desempeño de Puntos de Digitación en Oportunidad de Mes</span>
              </span>
              <span className="text-xs text-slate-500">
                Total Puntos: <strong className="text-slate-900">{puntoAnalysisTable.length}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Punto de Digitación</th>
                    <th className="py-2.5 px-3 text-right">Total FUAs</th>
                    <th className="py-2.5 px-3 text-right text-emerald-800 bg-emerald-50/60">
                      Mismo Mes (Al Día)
                    </th>
                    <th className="py-2.5 px-3 text-right text-blue-800 bg-blue-50/60">
                      Rezago 1 Mes
                    </th>
                    <th className="py-2.5 px-3 text-right text-amber-800 bg-amber-50/60">
                      Rezago 2+ Meses
                    </th>
                    <th className="py-2.5 px-3 text-right">% Al Día</th>
                    <th className="py-2.5 px-3">Períodos de Registro</th>
                    <th className="py-2.5 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {puntoAnalysisTable.map(p => (
                    <tr key={p.nombre} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.nombre}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {p.totalDigitado}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                        {p.mismoMes}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                        {p.rezagado1}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-700 bg-amber-50/30">
                        {p.rezagado2Mas}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            p.pctOportuno >= 70
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.pctOportuno >= 40
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.pctOportuno}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[10px]">
                        {p.periodosRegistro.size} períodos
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            if (onNavigateToPunto) {
                              onNavigateToPunto(p.nombre);
                            } else {
                              setSelectedPunto(p.nombre);
                              setActiveTab('matriz');
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-cyan-600 hover:text-white font-bold text-slate-700 text-[10px] transition-colors cursor-pointer"
                        >
                          Filtrar Punto
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DETALLE INDIVIDUAL DE FUAS CON AMBAS FECHAS                        */}
      {/* ========================================================================= */}
      {activeTab === 'detalle' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por N° Formato, EESS, Punto, Digitador o Paciente..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-cyan-500 text-slate-800"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3 text-xs text-slate-500">
              <span>
                Mostrando <strong>{paginatedDetail.length}</strong> de <strong>{filteredDetail.length}</strong> FUAs
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-mono">N° Formato</th>
                    <th className="py-2.5 px-3">Fecha Atención (Mes Clínico)</th>
                    <th className="py-2.5 px-3">Fecha Registro (Período)</th>
                    <th className="py-2.5 px-3 text-center">Desfase</th>
                    <th className="py-2.5 px-3">Punto de Digitación</th>
                    <th className="py-2.5 px-4">Establecimiento (EESS)</th>
                    <th className="py-2.5 px-4">Paciente</th>
                    <th className="py-2.5 px-3">Digitador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDetail.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No se encontraron FUAs con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedDetail.map(a => {
                      const reg = getYearMonthInfo(a.fecha_registro);
                      const aten = getYearMonthInfo(a.fecha_atencion);
                      const lag = calculateMonthLag(a.fecha_atencion, a.fecha_registro);

                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{a.nro_formato}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-slate-900 block">{a.fecha_atencion}</span>
                            <span className="text-[10px] text-slate-400">{aten.label}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-slate-900 block">{a.fecha_registro}</span>
                            <span className="text-[10px] text-cyan-700 font-medium">{reg.label}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${lag.badgeColor}`}
                            >
                              {lag.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{a.punto_digitacion}</td>
                          <td className="py-2.5 px-4 text-slate-700">{a.nombre_eess}</td>
                          <td className="py-2.5 px-4">
                            <span className="font-semibold text-slate-900 block">{a.beneficiario}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {a.tipo_doc}: {a.doc_identidad}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{a.digitador}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
