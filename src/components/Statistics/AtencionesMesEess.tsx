import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  Building2, 
  FileSpreadsheet, 
  FileText, 
  BarChart2, 
  Search, 
  ArrowUpDown, 
  X,
  TrendingUp,
  Sparkles,
  Layers,
  Award,
  List,
  Eye,
  CheckCircle2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Atencion } from '../../types/health';
import { ExcelService } from '../../services/excelService';
import { PdfService } from '../../services/pdfService';
import { TablePagination } from '../TablePagination';

interface Props {
  atenciones: Atencion[];
}

export const AtencionesMesEess: React.FC<Props> = ({ atenciones }) => {
  // Extract all distinct years available in data (from periodo_cierre or fecha_atencion)
  const allYears = useMemo(() => {
    const yearsSet = new Set<string>();
    for (let i = 0; i < atenciones.length; i++) {
      const a = atenciones[i];
      let p = a.periodo_cierre || '';
      let match = p.match(/^(\d{4})/);
      if (!match && a.fecha_atencion) {
        match = String(a.fecha_atencion).match(/^(\d{4})/);
      }
      if (match) yearsSet.add(match[1]);
    }
    const sorted = Array.from(yearsSet).sort().reverse();
    return sorted.length > 0 ? sorted : ['2026', '2025'];
  }, [atenciones]);

  // Tab State: 'matriz' (EESS vs Mes), 'ranking' (EESS Ranking), 'meses' (Monthly Summary), 'detalle' (Individual Auditable Records)
  const [activeTab, setActiveTab] = useState<'matriz' | 'ranking' | 'meses' | 'detalle'>('matriz');

  // Filters State
  const [selectedYear, setSelectedYear] = useState<string>('TODOS');
  const [selectedEess, setSelectedEess] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'total_desc' | 'total_asc' | 'nombre_asc' | 'nombre_desc'>('total_desc');
  const [chartMode, setChartMode] = useState<'top10' | 'top20' | 'pagina'>('top10');

  // Distinct Pagination state for each tab
  const [pageMatriz, setPageMatriz] = useState<number>(1);
  const [pageSizeMatriz, setPageSizeMatriz] = useState<number>(15);

  const [pageRanking, setPageRanking] = useState<number>(1);
  const [pageSizeRanking, setPageSizeRanking] = useState<number>(15);

  const [pageMeses, setPageMeses] = useState<number>(1);
  const [pageSizeMeses, setPageSizeMeses] = useState<number>(12);

  const [pageDetalle, setPageDetalle] = useState<number>(1);
  const [pageSizeDetalle, setPageSizeDetalle] = useState<number>(25);

  const resetAllPages = () => {
    setPageMatriz(1);
    setPageRanking(1);
    setPageMeses(1);
    setPageDetalle(1);
  };

  // Reset pagination when any filter changes
  useEffect(() => {
    resetAllPages();
  }, [selectedYear, selectedEess, searchTerm, sortBy]);

  // High-performance single-pass aggregation (O(N)) for 1,000,000+ records
  const { 
    allMonths, 
    allEess, 
    matrix, 
    eessTotalsMap, 
    eessDisaMap,
    eessTopMonthMap,
    monthTotals, 
    monthActiveEessCount,
    monthTopEessMap,
    grandTotal, 
    maxVal 
  } = useMemo(() => {
    const monthSet = new Set<string>();
    const eessSet = new Set<string>();
    const matrixMap: Record<string, Record<string, number>> = {};
    const eessTotals: Record<string, number> = {};
    const eessDisas: Record<string, string> = {};
    const monthTotalsMap: Record<string, number> = {};
    let totalCount = 0;

    for (let i = 0; i < atenciones.length; i++) {
      const a = atenciones[i];
      let period = (a.periodo_cierre || '').trim();
      if (!period && a.fecha_atencion) {
        const m = String(a.fecha_atencion).match(/^(\d{4})[-/](\d{1,2})/);
        if (m) {
          period = `${m[1]}-${m[2].padStart(2, '0')}`;
        }
      }
      if (!period) period = 'S/P';

      if (selectedYear !== 'TODOS' && !period.startsWith(selectedYear)) continue;

      const eessName = (a.nombre_eess || 'EESS SIN NOMBRE').trim();

      monthSet.add(period);
      eessSet.add(eessName);

      if (!matrixMap[eessName]) matrixMap[eessName] = {};
      matrixMap[eessName][period] = (matrixMap[eessName][period] || 0) + 1;

      eessTotals[eessName] = (eessTotals[eessName] || 0) + 1;
      if (a.disa && !eessDisas[eessName]) {
        eessDisas[eessName] = a.disa;
      }
      monthTotalsMap[period] = (monthTotalsMap[period] || 0) + 1;
      totalCount++;
    }

    const sortedMonths = Array.from(monthSet).sort();
    const sortedEess = Array.from(eessSet).sort();
    const max = Math.max(...Object.values(eessTotals), 1);

    // Compute top month for each EESS
    const topMonthByEess: Record<string, { month: string; count: number }> = {};
    sortedEess.forEach(e => {
      let topM = '';
      let topC = 0;
      sortedMonths.forEach(m => {
        const c = matrixMap[e]?.[m] || 0;
        if (c > topC) {
          topC = c;
          topM = m;
        }
      });
      topMonthByEess[e] = { month: topM || '—', count: topC };
    });

    // Compute active EESS count and top EESS for each month
    const activeEessByMonth: Record<string, number> = {};
    const topEessByMonth: Record<string, { eess: string; count: number }> = {};
    sortedMonths.forEach(m => {
      let active = 0;
      let topE = '';
      let topC = 0;
      sortedEess.forEach(e => {
        const c = matrixMap[e]?.[m] || 0;
        if (c > 0) {
          active++;
          if (c > topC) {
            topC = c;
            topE = e;
          }
        }
      });
      activeEessByMonth[m] = active;
      topEessByMonth[m] = { eess: topE || '—', count: topC };
    });

    return {
      allMonths: sortedMonths,
      allEess: sortedEess,
      matrix: matrixMap,
      eessTotalsMap: eessTotals,
      eessDisaMap: eessDisas,
      eessTopMonthMap: topMonthByEess,
      monthTotals: monthTotalsMap,
      monthActiveEessCount: activeEessByMonth,
      monthTopEessMap: topEessByMonth,
      grandTotal: totalCount,
      maxVal: max,
    };
  }, [atenciones, selectedYear]);

  // Filtered and sorted list of EESS
  const filteredEessList = useMemo(() => {
    let list = selectedEess === 'TODOS' ? allEess : [selectedEess];

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(e => e.toLowerCase().includes(term));
    }

    return [...list].sort((a, b) => {
      const totalA = eessTotalsMap[a] || 0;
      const totalB = eessTotalsMap[b] || 0;
      if (sortBy === 'total_desc') return totalB - totalA;
      if (sortBy === 'total_asc') return totalA - totalB;
      if (sortBy === 'nombre_asc') return a.localeCompare(b);
      if (sortBy === 'nombre_desc') return b.localeCompare(a);
      return 0;
    });
  }, [allEess, selectedEess, searchTerm, sortBy, eessTotalsMap]);

  // 1. Paginated slice for Tab 1 (Matriz Cruzada)
  const paginatedMatrizList = useMemo(() => {
    const start = (pageMatriz - 1) * pageSizeMatriz;
    return filteredEessList.slice(start, start + pageSizeMatriz);
  }, [filteredEessList, pageMatriz, pageSizeMatriz]);

  // Subtotals for current page in Tab 1
  const pageMatrizTotals = useMemo(() => {
    const byMonth: Record<string, number> = {};
    let subtotal = 0;
    allMonths.forEach(m => {
      byMonth[m] = paginatedMatrizList.reduce((acc, e) => acc + (matrix[e]?.[m] || 0), 0);
      subtotal += byMonth[m];
    });
    return { byMonth, subtotal };
  }, [allMonths, paginatedMatrizList, matrix]);

  // 2. Paginated slice for Tab 2 (Ranking EESS)
  const paginatedRankingList = useMemo(() => {
    const start = (pageRanking - 1) * pageSizeRanking;
    return filteredEessList.slice(start, start + pageSizeRanking);
  }, [filteredEessList, pageRanking, pageSizeRanking]);

  // 3. Paginated slice for Tab 3 (Monthly Summary)
  const paginatedMesesList = useMemo(() => {
    const start = (pageMeses - 1) * pageSizeMeses;
    return allMonths.slice(start, start + pageSizeMeses);
  }, [allMonths, pageMeses, pageSizeMeses]);

  // 4. Filtered and Paginated slice for Tab 4 (Individual Auditable Records)
  const filteredAtencionesList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const result: Atencion[] = [];

    for (let i = 0; i < atenciones.length; i++) {
      const a = atenciones[i];
      let period = (a.periodo_cierre || '').trim();
      if (!period && a.fecha_atencion) {
        const m = String(a.fecha_atencion).match(/^(\d{4})[-/](\d{1,2})/);
        if (m) period = `${m[1]}-${m[2].padStart(2, '0')}`;
      }
      if (selectedYear !== 'TODOS' && !period.startsWith(selectedYear)) continue;

      const eessName = (a.nombre_eess || '').trim();
      if (selectedEess !== 'TODOS' && eessName !== selectedEess) continue;

      if (term) {
        const matchTerm =
          eessName.toLowerCase().includes(term) ||
          (a.nro_formato || '').toLowerCase().includes(term) ||
          (a.doc_identidad || '').toLowerCase().includes(term) ||
          (a.nombre_profesional || '').toLowerCase().includes(term) ||
          (a.descripcion_servicio || '').toLowerCase().includes(term);
        if (!matchTerm) continue;
      }

      result.push(a);
    }
    return result;
  }, [atenciones, selectedYear, selectedEess, searchTerm]);

  const paginatedDetalleList = useMemo(() => {
    const start = (pageDetalle - 1) * pageSizeDetalle;
    return filteredAtencionesList.slice(start, start + pageSizeDetalle);
  }, [filteredAtencionesList, pageDetalle, pageSizeDetalle]);

  // EESS list to show in the comparative chart (Top 10, Top 20, or Current Page)
  const chartEessList = useMemo(() => {
    if (chartMode === 'top10') {
      return [...filteredEessList].sort((a, b) => (eessTotalsMap[b] || 0) - (eessTotalsMap[a] || 0)).slice(0, 10);
    }
    if (chartMode === 'top20') {
      return [...filteredEessList].sort((a, b) => (eessTotalsMap[b] || 0) - (eessTotalsMap[a] || 0)).slice(0, 20);
    }
    return paginatedMatrizList;
  }, [filteredEessList, chartMode, eessTotalsMap, paginatedMatrizList]);

  // Export handlers
  const handleExportExcel = () => {
    if (activeTab === 'matriz') {
      const rows = filteredEessList.map(e => {
        const row: Record<string, string | number> = {
          'Establecimiento de Salud (EESS)': e,
          'DISA / Región': eessDisaMap[e] || '—',
        };
        allMonths.forEach(m => {
          row[m] = matrix[e]?.[m] || 0;
        });
        row['Total Atenciones'] = eessTotalsMap[e] || 0;
        row['% Participación'] = grandTotal > 0 ? `${(((eessTotalsMap[e] || 0) / grandTotal) * 100).toFixed(2)}%` : '0%';
        return row;
      });
      ExcelService.exportToExcel(rows, `Matriz_Atenciones_Mes_EESS_${selectedYear}.xlsx`);
    } else if (activeTab === 'ranking') {
      const rows = filteredEessList.map((e, idx) => {
        const total = eessTotalsMap[e] || 0;
        const pct = grandTotal > 0 ? `${((total / grandTotal) * 100).toFixed(2)}%` : '0%';
        const avg = allMonths.length > 0 ? Math.round(total / allMonths.length) : total;
        return {
          'Posición (#)': idx + 1,
          'Establecimiento de Salud': e,
          'DISA / Región': eessDisaMap[e] || '—',
          'Total Atenciones': total,
          '% Participación': pct,
          'Mes Mayor Demanda': eessTopMonthMap[e]?.month || '—',
          'Atenciones Mes Mayor Demanda': eessTopMonthMap[e]?.count || 0,
          'Promedio Mensual': avg,
        };
      });
      ExcelService.exportToExcel(rows, `Ranking_Establecimientos_${selectedYear}.xlsx`);
    } else if (activeTab === 'meses') {
      const rows = allMonths.map(m => {
        const tot = monthTotals[m] || 0;
        const pct = grandTotal > 0 ? `${((tot / grandTotal) * 100).toFixed(2)}%` : '0%';
        return {
          'Período / Mes': m,
          'Total Atenciones': tot,
          '% Participación': pct,
          'EESS Activos': monthActiveEessCount[m] || 0,
          'EESS Mayor Producción': monthTopEessMap[m]?.eess || '—',
          'Atenciones EESS Mayor': monthTopEessMap[m]?.count || 0,
        };
      });
      ExcelService.exportToExcel(rows, `Produccion_Mensual_Consolidada_${selectedYear}.xlsx`);
    } else {
      const rows = filteredAtencionesList.slice(0, 10000).map(a => ({
        'N° Formato': a.nro_formato,
        'Fecha Atención': a.fecha_atencion,
        'Hora': a.hora_atencion,
        'Establecimiento (EESS)': a.nombre_eess,
        'Servicio': a.descripcion_servicio,
        'Doc. Identidad': a.doc_identidad,
        'Profesional': a.nombre_profesional,
        'Tipo Profesional': a.tipo_profesional,
        'Componente': a.componente,
        'Tarifa (S/)': a.tarifa,
        'Período': a.periodo_cierre,
      }));
      ExcelService.exportToExcel(rows, `Muestras_Atenciones_EESS_${selectedYear}.xlsx`);
    }
  };

  const handleExportPdf = () => {
    if (activeTab === 'matriz') {
      const headers = ['Establecimiento (EESS)', ...allMonths, 'Total', '% Part.'];
      const rows = filteredEessList.map(e => {
        const eessTotal = eessTotalsMap[e] || 0;
        const pct = grandTotal > 0 ? `${((eessTotal / grandTotal) * 100).toFixed(1)}%` : '0%';
        const cols = allMonths.map(m => matrix[e]?.[m] || 0);
        return [e, ...cols, eessTotal, pct];
      });

      rows.push([
        'TOTAL GENERAL',
        ...allMonths.map(m => monthTotals[m] || 0),
        grandTotal,
        '100%',
      ]);

      PdfService.generateEstadisticaPdf({
        titulo: 'B.1. MATRIZ DE ATENCIONES POR MES Y ESTABLECIMIENTO DE SALUD',
        subtitulo: `Año: ${selectedYear} | EESS: ${selectedEess} | Filtro: "${searchTerm || 'Todos'}"`,
        headers,
        rows,
        resumenKpis: [
          { label: 'Total Atenciones', valor: grandTotal },
          { label: 'EESS Evaluados', valor: filteredEessList.length },
          { label: 'Meses Registrados', valor: allMonths.length },
        ],
        orientation: 'landscape',
        filename: `Matriz_Atenciones_Mes_EESS_${selectedYear}.pdf`,
      });
    } else if (activeTab === 'ranking') {
      const headers = ['#', 'Establecimiento (EESS)', 'DISA', 'Total Atenciones', '% Part.', 'Mes Pico', 'Prom. Mensual'];
      const rows = filteredEessList.map((e, idx) => {
        const total = eessTotalsMap[e] || 0;
        const pct = grandTotal > 0 ? `${((total / grandTotal) * 100).toFixed(1)}%` : '0%';
        const avg = allMonths.length > 0 ? Math.round(total / allMonths.length) : total;
        return [idx + 1, e, eessDisaMap[e] || '—', total, pct, eessTopMonthMap[e]?.month || '—', avg];
      });

      PdfService.generateEstadisticaPdf({
        titulo: 'B.1. RANKING DE PRODUCCIÓN POR ESTABLECIMIENTO DE SALUD (EESS)',
        subtitulo: `Año: ${selectedYear} | Registros: ${filteredEessList.length} EESS`,
        headers,
        rows,
        resumenKpis: [
          { label: 'Total Atenciones', valor: grandTotal },
          { label: 'Establecimientos', valor: filteredEessList.length },
          { label: 'Máx. Producción', valor: maxVal },
        ],
        orientation: 'portrait',
        filename: `Ranking_Establecimientos_${selectedYear}.pdf`,
      });
    } else if (activeTab === 'meses') {
      const headers = ['Período / Mes', 'Total Atenciones', '% Part.', 'EESS Activos', 'EESS Líder del Mes', 'Atenciones Líder'];
      const rows = allMonths.map(m => {
        const tot = monthTotals[m] || 0;
        const pct = grandTotal > 0 ? `${((tot / grandTotal) * 100).toFixed(1)}%` : '0%';
        return [
          m,
          tot,
          pct,
          monthActiveEessCount[m] || 0,
          monthTopEessMap[m]?.eess || '—',
          monthTopEessMap[m]?.count || 0,
        ];
      });

      PdfService.generateEstadisticaPdf({
        titulo: 'B.1. PRODUCCIÓN MENSUAL CRONOLÓGICA DE ATENCIONES',
        subtitulo: `Año: ${selectedYear} | Total General: ${grandTotal.toLocaleString()} atenciones`,
        headers,
        rows,
        resumenKpis: [
          { label: 'Total Atenciones', valor: grandTotal },
          { label: 'Meses Evaluados', valor: allMonths.length },
          { label: 'EESS Activos', valor: filteredEessList.length },
        ],
        orientation: 'portrait',
        filename: `Produccion_Mensual_${selectedYear}.pdf`,
      });
    } else {
      const headers = ['# FUA', 'Fecha', 'EESS', 'Servicio Clínico', 'Doc. Identidad', 'Profesional', 'Tarifa (S/)'];
      const rows = filteredAtencionesList.slice(0, 100).map(a => [
        a.nro_formato,
        a.fecha_atencion,
        a.nombre_eess,
        a.descripcion_servicio,
        a.doc_identidad,
        a.nombre_profesional,
        `S/ ${Number(a.tarifa || 0).toFixed(2)}`,
      ]);

      PdfService.generateEstadisticaPdf({
        titulo: 'B.1. REGISTRO MUESTRAL DE ATENCIONES AUDITABLES POR EESS',
        subtitulo: `Año: ${selectedYear} | EESS: ${selectedEess} | Muestra: ${rows.length} de ${filteredAtencionesList.length}`,
        headers,
        rows,
        resumenKpis: [
          { label: 'Total Muestra', valor: filteredAtencionesList.length },
          { label: 'EESS', valor: selectedEess },
        ],
        orientation: 'landscape',
        filename: `Muestras_Atenciones_${selectedYear}.pdf`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <BarChart2 className="w-6 h-6 text-blue-600" />
            <span>B.1. Atenciones por Mes y Establecimiento de Salud (EESS)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Matriz consolidada, ranking institucional y registro con paginación de alto rendimiento optimizado para más de 1 millón de datos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Año selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Año:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="TODOS">Todos los Años</option>
              {allYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* EESS selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>EESS:</span>
            <select
              value={selectedEess}
              onChange={e => setSelectedEess(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none max-w-[180px] truncate cursor-pointer"
            >
              <option value="TODOS">Todos ({allEess.length})</option>
              {allEess.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Export Buttons */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
            title="Exportar a Excel según la vista activa"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
            title="Exportar reporte institucional en PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Total Atenciones</span>
          <div className="text-2xl font-black font-mono text-blue-600 mt-1">{grandTotal.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400">En período seleccionado</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Establecimientos Activos</span>
          <div className="text-2xl font-black font-mono text-purple-600 mt-1">{filteredEessList.length}</div>
          <span className="text-[10px] text-slate-400">Con producción registrada</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Meses Evaluados</span>
          <div className="text-2xl font-black font-mono text-emerald-600 mt-1">{allMonths.length}</div>
          <span className="text-[10px] text-slate-400">Columnas cronológicas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Máx. Producción EESS</span>
          <div className="text-2xl font-black font-mono text-amber-500 mt-1">{maxVal.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400">Líder del período</span>
        </div>
      </div>

      {/* Comparative Bar Chart by EESS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Gráfico Comparativo de Producción por Establecimiento</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Demanda acumulada según filtros activos ({chartEessList.length} EESS mostrados)
            </p>
          </div>

          {/* Chart Display Mode Selector */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setChartMode('top10')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartMode === 'top10' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Top 10
            </button>
            <button
              onClick={() => setChartMode('top20')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartMode === 'top20' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Top 20
            </button>
            <button
              onClick={() => setChartMode('pagina')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartMode === 'pagina' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Página Actual
            </button>
          </div>
        </div>
        
        {chartEessList.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No hay registros con los filtros seleccionados.</p>
        ) : (
          <div className="space-y-3 pt-1">
            {chartEessList.map((eessName, idx) => {
              const totalEess = eessTotalsMap[eessName] || 0;
              const pct = grandTotal > 0 ? Math.round((totalEess / grandTotal) * 100) : 0;
              const barWidth = Math.max(Math.round((totalEess / maxVal) * 100), 4);
              const barColors = [
                'bg-blue-600',
                'bg-emerald-600',
                'bg-indigo-600',
                'bg-purple-600',
                'bg-amber-500',
                'bg-teal-600',
                'bg-cyan-600'
              ];
              const color = barColors[idx % barColors.length];

              return (
                <div key={eessName} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800 truncate pr-4" title={eessName}>
                      {idx + 1}. {eessName}
                    </span>
                    <span className="font-mono font-bold text-slate-700 whitespace-nowrap">
                      {totalEess.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${color}`}
                      style={{ width: `${barWidth}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs Navigation Strip */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-3 rounded-t-2xl space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('matriz')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'matriz'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. Matriz Cruzada (EESS vs Mes)</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700">
            {filteredEessList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ranking')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'ranking'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>2. Ranking de Establecimientos</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {filteredEessList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('meses')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'meses'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>3. Producción Mensual Cronológica</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700">
            {allMonths.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('detalle')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'detalle'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <List className="w-4 h-4" />
          <span>4. Registro Detallado de Atenciones</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-700">
            {filteredAtencionesList.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Matriz Dinámica Consolidada con Paginación */}
      {activeTab === 'matriz' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Toolbar: Search, Sort and Page info */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Matriz Dinámica Consolidada</span>
              </span>

              {/* Live Search input for EESS */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar EESS por nombre..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-52 sm:w-64"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sorting selector */}
              <div className="flex items-center space-x-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="total_desc">Mayor Producción</option>
                  <option value="total_asc">Menor Producción</option>
                  <option value="nombre_asc">Nombre (A - Z)</option>
                  <option value="nombre_desc">Nombre (Z - A)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
              <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200/60 font-semibold">
                Pág. {pageMatriz} / {Math.max(1, Math.ceil(filteredEessList.length / pageSizeMatriz))}
              </span>
              <span>
                Total: <strong className="text-slate-900 font-bold">{grandTotal.toLocaleString()}</strong> atenciones
              </span>
            </div>
          </div>

          {/* Scrollable Table Viewport */}
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="py-3 px-4 sticky left-0 bg-slate-900 z-30 shadow-md min-w-[220px]">
                    Establecimiento de Salud (EESS)
                  </th>
                  {allMonths.map(m => (
                    <th key={m} className="py-3 px-3 text-center min-w-[75px] font-mono text-slate-200">
                      {m}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right bg-blue-900 min-w-[110px] sticky right-0 z-25 shadow-md">
                    Total EESS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMatrizList.length === 0 ? (
                  <tr>
                    <td colSpan={allMonths.length + 2} className="py-8 text-center text-slate-400">
                      No se encontraron establecimientos de salud que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  paginatedMatrizList.map((eessName, idx) => {
                    const totalRow = eessTotalsMap[eessName] || 0;
                    const pct = grandTotal > 0 ? ((totalRow / grandTotal) * 100).toFixed(1) : '0';
                    const rowNumber = (pageMatriz - 1) * pageSizeMatriz + idx + 1;

                    return (
                      <tr key={eessName} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 sticky left-0 bg-white group-hover:bg-blue-50/90 shadow-sm whitespace-nowrap z-10">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] text-slate-400 w-6 flex-shrink-0">
                              #{rowNumber}
                            </span>
                            <span className="truncate max-w-[260px]" title={eessName}>
                              {eessName}
                            </span>
                          </div>
                        </td>
                        {allMonths.map(m => {
                          const cellVal = matrix[eessName]?.[m] || 0;
                          return (
                            <td 
                              key={m} 
                              className={`py-2.5 px-3 text-center font-mono transition-colors ${
                                cellVal > 0 ? 'text-slate-800 font-semibold' : 'text-slate-300'
                              }`}
                            >
                              {cellVal > 0 ? cellVal.toLocaleString() : '—'}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700 bg-blue-50/50 sticky right-0 group-hover:bg-blue-100/70 shadow-sm">
                          <span>{totalRow.toLocaleString()}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">({pct}%)</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-20 border-t-2 border-slate-300">
                {/* Subtotal Página Actual */}
                <tr className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                  <td className="py-2.5 px-4 sticky left-0 bg-slate-50 shadow-sm whitespace-nowrap text-slate-600">
                    SUBTOTAL (Pág. {pageMatriz} de {Math.max(1, Math.ceil(filteredEessList.length / pageSizeMatriz))})
                  </td>
                  {allMonths.map(m => (
                    <td key={m} className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {(pageMatrizTotals.byMonth[m] || 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="py-2.5 px-4 text-right font-mono text-blue-800 bg-blue-100/40 sticky right-0 shadow-sm">
                    {pageMatrizTotals.subtotal.toLocaleString()}
                  </td>
                </tr>

                {/* Total General Consolidado */}
                <tr className="bg-slate-900 text-white font-bold">
                  <td className="py-3 px-4 sticky left-0 bg-slate-900 shadow-md whitespace-nowrap">
                    TOTAL GENERAL ({filteredEessList.length} EESS)
                  </td>
                  {allMonths.map(m => (
                    <td key={m} className="py-3 px-3 text-center font-mono text-emerald-300">
                      {(monthTotals[m] || 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-right font-mono text-sm text-emerald-400 bg-slate-950 sticky right-0 shadow-md">
                    {grandTotal.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Reusable Pagination Controls */}
          <TablePagination
            currentPage={pageMatriz}
            totalItems={filteredEessList.length}
            pageSize={pageSizeMatriz}
            onPageChange={setPageMatriz}
            onPageSizeChange={setPageSizeMatriz}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            labelSingular="establecimiento de salud"
            labelPlural="establecimientos de salud"
          />
        </div>
      )}

      {/* TAB 2: Ranking de Establecimientos con Paginación */}
      {activeTab === 'ranking' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Ranking de Producción por Establecimiento</span>
              </span>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por nombre de EESS..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-52 sm:w-64"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Total Establecimientos: <strong className="text-slate-900 font-bold">{filteredEessList.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="py-3 px-4 text-center w-14">#</th>
                  <th className="py-3 px-4 min-w-[240px]">Establecimiento de Salud (EESS)</th>
                  <th className="py-3 px-4 min-w-[140px]">DISA / Región</th>
                  <th className="py-3 px-4 text-center min-w-[120px]">Total Atenciones</th>
                  <th className="py-3 px-4 text-center min-w-[100px]">% Total</th>
                  <th className="py-3 px-4 text-center min-w-[120px]">Mes con Mayor Producción</th>
                  <th className="py-3 px-4 text-center min-w-[110px]">Promedio Mensual</th>
                  <th className="py-3 px-4 min-w-[140px]">Nivel Demanda</th>
                  <th className="py-3 px-4 text-center w-28">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRankingList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No se encontraron establecimientos con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  paginatedRankingList.map((eessName, idx) => {
                    const rowNumber = (pageRanking - 1) * pageSizeRanking + idx + 1;
                    const total = eessTotalsMap[eessName] || 0;
                    const pct = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(2) : '0';
                    const avg = allMonths.length > 0 ? Math.round(total / allMonths.length) : total;
                    const barWidth = Math.max(Math.round((total / maxVal) * 100), 3);
                    const topMonth = eessTopMonthMap[eessName];

                    return (
                      <tr key={eessName} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                          {rowNumber <= 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                              {rowNumber}
                            </span>
                          ) : (
                            `#${rowNumber}`
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          <span className="truncate block max-w-[280px]" title={eessName}>
                            {eessName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {eessDisaMap[eessName] || '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-blue-600 text-sm">
                          {total.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600">
                          {pct}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono text-slate-700 font-semibold">
                            {topMonth?.month || '—'}
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            ({topMonth?.count?.toLocaleString() || 0} aten.)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-700 font-semibold">
                          {avg.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${barWidth}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedEess(eessName);
                              setActiveTab('detalle');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-semibold text-[11px] transition-colors cursor-pointer flex items-center justify-center space-x-1 mx-auto"
                            title={`Ver atenciones individuales de ${eessName}`}
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver Detalle</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={pageRanking}
            totalItems={filteredEessList.length}
            pageSize={pageSizeRanking}
            onPageChange={setPageRanking}
            onPageSizeChange={setPageSizeRanking}
            pageSizeOptions={[10, 15, 25, 50, 100]}
            labelSingular="establecimiento de salud"
            labelPlural="establecimientos de salud"
          />
        </div>
      )}

      {/* TAB 3: Producción Mensual Cronológica con Paginación */}
      {activeTab === 'meses' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Desglose Cronológico Mensual de Atenciones</span>
            </span>

            <div className="text-xs text-slate-500 font-mono">
              Meses Registrados: <strong className="text-slate-900 font-bold">{allMonths.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="py-3 px-4 text-center w-14">#</th>
                  <th className="py-3 px-4 min-w-[120px]">Período / Mes</th>
                  <th className="py-3 px-4 text-center min-w-[130px]">Total Atenciones</th>
                  <th className="py-3 px-4 text-center min-w-[100px]">% del Total</th>
                  <th className="py-3 px-4 text-center min-w-[120px]">EESS Activos</th>
                  <th className="py-3 px-4 min-w-[220px]">EESS Líder del Mes</th>
                  <th className="py-3 px-4 text-center min-w-[120px]">Producción Líder</th>
                  <th className="py-3 px-4 min-w-[140px]">Participación Mensual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMesesList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No hay meses registrados en este período.
                    </td>
                  </tr>
                ) : (
                  paginatedMesesList.map((monthStr, idx) => {
                    const rowNumber = (pageMeses - 1) * pageSizeMeses + idx + 1;
                    const tot = monthTotals[monthStr] || 0;
                    const pct = grandTotal > 0 ? ((tot / grandTotal) * 100).toFixed(2) : '0';
                    const activeCount = monthActiveEessCount[monthStr] || 0;
                    const topInfo = monthTopEessMap[monthStr];
                    const maxMonthTot = Math.max(...Object.values(monthTotals), 1);
                    const barWidth = Math.max(Math.round((tot / maxMonthTot) * 100), 4);

                    return (
                      <tr key={monthStr} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                          #{rowNumber}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 text-sm">
                          {monthStr}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 text-sm">
                          {tot.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600">
                          {pct}%
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-purple-700">
                          {activeCount} EESS
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <span className="truncate block max-w-[240px]" title={topInfo?.eess}>
                            {topInfo?.eess || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">
                          {topInfo?.count?.toLocaleString() || 0}
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                              style={{ width: `${barWidth}%` }}
                            ></div>
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
            currentPage={pageMeses}
            totalItems={allMonths.length}
            pageSize={pageSizeMeses}
            onPageChange={setPageMeses}
            onPageSizeChange={setPageSizeMeses}
            pageSizeOptions={[6, 12, 24, 36]}
            labelSingular="mes"
            labelPlural="meses"
          />
        </div>
      )}

      {/* TAB 4: Registro Detallado de Atenciones con Paginación */}
      {activeTab === 'detalle' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <List className="w-4 h-4 text-purple-600" />
                <span>Registro Detallado de Atenciones Auditables</span>
              </span>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar FUA, DNI, paciente, profesional..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-64 sm:w-80"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {selectedEess !== 'TODOS' && (
                <button
                  onClick={() => setSelectedEess('TODOS')}
                  className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg flex items-center space-x-1 cursor-pointer hover:bg-blue-200 transition-colors"
                >
                  <span>Filtro EESS: {selectedEess}</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Registros filtrados: <strong className="text-slate-900 font-bold">{filteredAtencionesList.length.toLocaleString()}</strong>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[620px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-3 min-w-[110px]">N° FUA / Formato</th>
                  <th className="py-3 px-3 min-w-[95px]">Fecha Atención</th>
                  <th className="py-3 px-3 min-w-[70px]">Hora</th>
                  <th className="py-3 px-4 min-w-[180px]">Establecimiento (EESS)</th>
                  <th className="py-3 px-4 min-w-[180px]">Servicio Clínico</th>
                  <th className="py-3 px-3 min-w-[95px]">Doc. Identidad</th>
                  <th className="py-3 px-4 min-w-[160px]">Profesional</th>
                  <th className="py-3 px-3 text-center min-w-[95px]">Componente</th>
                  <th className="py-3 px-3 text-right min-w-[90px]">Tarifa (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedDetalleList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No se encontraron atenciones con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  paginatedDetalleList.map((a, idx) => {
                    const rowNumber = (pageDetalle - 1) * pageSizeDetalle + idx + 1;
                    return (
                      <tr key={`${a.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {rowNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                          {a.nro_formato || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {a.fecha_atencion || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                          {a.hora_atencion || '—'}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          <span className="truncate block max-w-[200px]" title={a.nombre_eess}>
                            {a.nombre_eess || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          <span className="truncate block max-w-[200px]" title={a.descripcion_servicio}>
                            {a.descripcion_servicio || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {a.doc_identidad || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          <span className="truncate block max-w-[180px]" title={a.nombre_profesional}>
                            {a.nombre_profesional || '—'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {a.tipo_profesional || ''}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {a.componente || 'SUBSIDIADO'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          S/ {Number(a.tarifa || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={pageDetalle}
            totalItems={filteredAtencionesList.length}
            pageSize={pageSizeDetalle}
            onPageChange={setPageDetalle}
            onPageSizeChange={setPageSizeDetalle}
            pageSizeOptions={[15, 25, 50, 100, 200]}
            labelSingular="atención médica"
            labelPlural="atenciones médicas"
          />
        </div>
      )}
    </div>
  );
};
