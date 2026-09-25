import React, { useState, useMemo } from 'react';
import {
  Activity,
  PieChart as PieIcon,
  BarChart2,
  Calendar,
  Building2,
  Search,
  Download,
  X,
  Layers,
  DollarSign,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Atencion } from '../../types/health';

interface Props {
  atenciones: Atencion[];
}

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

export const AtencionesServicio: React.FC<Props> = ({ atenciones }) => {
  const [activeTab, setActiveTab] = useState<'graficos' | 'meses' | 'eess' | 'detalle'>('graficos');
  const [chartType, setChartType] = useState<'barras' | 'circular'>('barras');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEessFilter, setSelectedEessFilter] = useState<string>('TODOS');
  const [selectedMesFilter, setSelectedMesFilter] = useState<string>('TODOS');
  const [selectedServiceKey, setSelectedServiceKey] = useState<string | null>(null);

  // Extract distinct EESS from all atenciones
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

  // Filter raw atenciones based on selected EESS, Mes, and search term
  const filteredAtenciones = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return atenciones.filter(a => {
      // 1. EESS Filter
      if (selectedEessFilter !== 'TODOS' && a.nombre_eess !== selectedEessFilter) {
        return false;
      }

      // 2. Mes de Atención Filter (fecha_atencion)
      if (selectedMesFilter !== 'TODOS') {
        const m = extractMesAtencion(a.fecha_atencion);
        if (m.key !== selectedMesFilter) return false;
      }

      // 3. Search query: matches service code, service description, OR EESS name
      if (term) {
        const cod = (a.cod_servicio || '').toLowerCase();
        const desc = (a.descripcion_servicio || '').toLowerCase();
        const eess = (a.nombre_eess || '').toLowerCase();
        const codEess = (a.codigo_eess || '').toLowerCase();
        if (!cod.includes(term) && !desc.includes(term) && !eess.includes(term) && !codEess.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [atenciones, selectedEessFilter, selectedMesFilter, searchTerm]);

  // Aggregate by service from filtered atenciones
  interface ServiceItem {
    cod: string;
    desc: string;
    key: string;
    count: number;
    totalTarifa: number;
    pacientesUnicos: Set<string>;
    eess: Set<string>;
    fechasAtencion: Set<string>;
    mesesMap: Record<string, { count: number; tarifa: number }>;
    eessMap: Record<
      string,
      {
        nombre: string;
        codigo: string;
        count: number;
        tarifa: number;
        pacientes: Set<string>;
      }
    >;
  }

  const serviceList = useMemo(() => {
    const map: Record<string, ServiceItem> = {};

    filteredAtenciones.forEach(a => {
      const cod = a.cod_servicio || 'S/C';
      const desc = a.descripcion_servicio || 'SERVICIO NO ESPECIFICADO';
      const key = `${cod}_${desc}`;

      if (!map[key]) {
        map[key] = {
          cod,
          desc,
          key,
          count: 0,
          totalTarifa: 0,
          pacientesUnicos: new Set(),
          eess: new Set(),
          fechasAtencion: new Set(),
          mesesMap: {},
          eessMap: {},
        };
      }

      const s = map[key];
      s.count++;
      s.totalTarifa += Number(a.tarifa) || 0;
      if (a.doc_identidad) s.pacientesUnicos.add(a.doc_identidad);
      if (a.nombre_eess) s.eess.add(a.nombre_eess);
      if (a.fecha_atencion) s.fechasAtencion.add(a.fecha_atencion);

      // Monthly breakdown based on fecha_atencion
      const mes = extractMesAtencion(a.fecha_atencion);
      if (!s.mesesMap[mes.key]) {
        s.mesesMap[mes.key] = { count: 0, tarifa: 0 };
      }
      s.mesesMap[mes.key].count++;
      s.mesesMap[mes.key].tarifa += Number(a.tarifa) || 0;

      // EESS breakdown
      const eessName = a.nombre_eess || 'EESS SIN NOMBRE';
      if (!s.eessMap[eessName]) {
        s.eessMap[eessName] = {
          nombre: eessName,
          codigo: a.codigo_eess || '',
          count: 0,
          tarifa: 0,
          pacientes: new Set(),
        };
      }
      s.eessMap[eessName].count++;
      s.eessMap[eessName].tarifa += Number(a.tarifa) || 0;
      if (a.doc_identidad) s.eessMap[eessName].pacientes.add(a.doc_identidad);
    });

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredAtenciones]);

  // Overall metrics
  const totalAtenciones = filteredAtenciones.length || 1;
  const totalTarifa = useMemo(() => {
    return filteredAtenciones.reduce((acc, a) => acc + (Number(a.tarifa) || 0), 0);
  }, [filteredAtenciones]);

  const totalPacientesUnicos = useMemo(() => {
    const set = new Set<string>();
    filteredAtenciones.forEach(a => {
      if (a.doc_identidad) set.add(a.doc_identidad);
    });
    return set.size;
  }, [filteredAtenciones]);

  const maxVal = useMemo(() => Math.max(...serviceList.map(s => s.count), 1), [serviceList]);

  // Flatten pairs: Service x EESS for Tab 3
  const serviceEessPairs = useMemo(() => {
    const list: Array<{
      serviceCod: string;
      serviceDesc: string;
      eessNombre: string;
      eessCodigo: string;
      count: number;
      pctOfService: number;
      tarifa: number;
      pacientesCount: number;
    }> = [];

    serviceList.forEach(s => {
      Object.values(s.eessMap).forEach(e => {
        const pct = Math.round((e.count / (s.count || 1)) * 1000) / 10;
        list.push({
          serviceCod: s.cod,
          serviceDesc: s.desc,
          eessNombre: e.nombre,
          eessCodigo: e.codigo,
          count: e.count,
          pctOfService: pct,
          tarifa: e.tarifa,
          pacientesCount: e.pacientes.size,
        });
      });
    });

    return list.sort((a, b) => b.count - a.count);
  }, [serviceList]);

  const colors = [
    '#2563EB', '#10B981', '#6366F1', '#F59E0B', '#EF4444',
    '#06B6D4', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
    '#0284C7', '#84CC16', '#64748B'
  ];

  // Export to CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (activeTab === 'meses') {
      headers = [
        'Codigo Servicio',
        'Descripcion del Servicio',
        'Total Atenciones',
        'Tarifa Total (S/)',
        ...allMonthsList.map(m => `Mes ${m.label}`),
      ];
      rows = serviceList.map(s => {
        const monthCols = allMonthsList.map(m => String(s.mesesMap[m.key]?.count || 0));
        return [
          s.cod,
          `"${s.desc}"`,
          String(s.count),
          s.totalTarifa.toFixed(2),
          ...monthCols,
        ];
      });
      filename = 'servicios_por_meses_fecha_atencion.csv';
    } else if (activeTab === 'eess') {
      headers = [
        'Codigo Servicio',
        'Descripcion Servicio',
        'Establecimiento de Salud (EESS)',
        'Codigo EESS',
        'Atenciones en EESS',
        '% del Servicio',
        'Pacientes Unicos',
        'Tarifa Acumulada (S/)',
      ];
      rows = serviceEessPairs.map(item => [
        item.serviceCod,
        `"${item.serviceDesc}"`,
        `"${item.eessNombre}"`,
        item.eessCodigo,
        String(item.count),
        `${item.pctOfService}%`,
        String(item.pacientesCount),
        item.tarifa.toFixed(2),
      ]);
      filename = 'servicios_por_establecimiento_salud.csv';
    } else {
      headers = [
        'Codigo',
        'Descripcion del Servicio',
        'EESS que lo Brindan',
        'Pacientes Unicos',
        'Total Atenciones',
        '% Demanda',
        'Tarifa Acumulada (S/)',
      ];
      rows = serviceList.map(s => [
        s.cod,
        `"${s.desc}"`,
        String(s.eess.size),
        String(s.pacientesUnicos.size),
        String(s.count),
        `${((s.count / totalAtenciones) * 100).toFixed(1)}%`,
        s.totalTarifa.toFixed(2),
      ]);
      filename = 'estadistica_servicios_salud.csv';
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

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                <Activity className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                  <span>B.4. Atenciones por Servicio de Salud</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold uppercase">
                    Por Mes (Fecha Atención) & EESS
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Demanda prestacional, tarifas acumuladas, matrices mensuales clasificadas por <code>fecha_atencion</code> y búsqueda por Establecimiento de Salud
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Export */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>{serviceList.length} Servicios Activos</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              <span>{filteredAtenciones.length} Atenciones</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>S/ {totalTarifa.toFixed(2)}</span>
            </span>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar (Search + EESS + Mes) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-3 border-t border-slate-100">
          {/* Search Box (Matches Service OR EESS) */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Servicio (cód./descripción) o EESS de salud..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-medium text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* EESS Filter Dropdown */}
          <div className="lg:col-span-4 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <select
              value={selectedEessFilter}
              onChange={e => setSelectedEessFilter(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-800 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="TODOS">Todos los Establecimientos de Salud ({allEessList.length})</option>
              {allEessList.map(e => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          {/* Mes de Atención Filter (fecha_atencion) */}
          <div className="lg:col-span-3 flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <select
              value={selectedMesFilter}
              onChange={e => setSelectedMesFilter(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs font-bold text-slate-800 rounded-xl px-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="TODOS">Todos los Meses de Atención</option>
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
            onClick={() => setActiveTab('graficos')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'graficos'
                ? 'border-teal-600 text-teal-700 bg-teal-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>1. Demanda y Gráficos</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
              {serviceList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('meses')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'meses'
                ? 'border-teal-600 text-teal-700 bg-teal-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>2. Matriz por Meses (Fecha de Atención)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-mono">
              {allMonthsList.length} Meses
            </span>
          </button>

          <button
            onClick={() => setActiveTab('eess')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'eess'
                ? 'border-teal-600 text-teal-700 bg-teal-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>3. Por Establecimiento de Salud (EESS)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-mono">
              {serviceEessPairs.length} Asignaciones
            </span>
          </button>

          <button
            onClick={() => setActiveTab('detalle')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'detalle'
                ? 'border-teal-600 text-teal-700 bg-teal-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>4. Detalle Cronológico de Atenciones</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-mono">
              {filteredAtenciones.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DEMANDA, GRÁFICOS Y TABLA PRINCIPAL DE SERVICIOS                   */}
      {/* ========================================================================= */}
      {activeTab === 'graficos' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Servicios Ofertados</span>
                <div className="text-xl font-black text-slate-900 font-mono">{serviceList.length}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
              <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Atenciones Registradas</span>
                <div className="text-xl font-black text-teal-600 font-mono">{filteredAtenciones.length}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Pacientes Atendidos</span>
                <div className="text-xl font-black text-purple-600 font-mono">{totalPacientesUnicos}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Facturación Acumulada</span>
                <div className="text-xl font-black text-emerald-600 font-mono">S/ {totalTarifa.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Visual Chart with toggle */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <span>Demanda Comparativa por Servicio Médico</span>
                </h3>
                <span className="text-xs text-slate-500">
                  {selectedEessFilter !== 'TODOS' ? `En ${selectedEessFilter}` : 'En todos los EESS'} •{' '}
                  {selectedMesFilter !== 'TODOS'
                    ? allMonthsList.find(m => m.key === selectedMesFilter)?.label
                    : 'Todos los meses'}
                </span>
              </div>

              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setChartType('barras')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    chartType === 'barras' ? 'bg-white shadow text-teal-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Barras</span>
                </button>
                <button
                  onClick={() => setChartType('circular')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    chartType === 'circular' ? 'bg-white shadow text-teal-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PieIcon className="w-3.5 h-3.5" />
                  <span>Circular</span>
                </button>
              </div>
            </div>

            {chartType === 'barras' ? (
              <div className="space-y-4">
                {serviceList.map((srv, idx) => {
                  const pct = Math.round((srv.count / totalAtenciones) * 1000) / 10;
                  const barWidth = Math.max(Math.round((srv.count / maxVal) * 100), 5);
                  const color = colors[idx % colors.length];

                  return (
                    <div key={srv.key} className="space-y-1 group">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-2 truncate pr-4">
                          <span className="font-mono text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            {srv.cod}
                          </span>
                          <span className="font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                            {srv.desc}
                          </span>
                          <span className="text-[10px] text-slate-400 hidden md:inline">
                            ({srv.eess.size} EESS)
                          </span>
                        </div>
                        <div className="font-mono font-bold text-slate-800 whitespace-nowrap">
                          {srv.count}{' '}
                          <span className="text-slate-500 font-normal">
                            ({pct}%) • S/ {srv.totalTarifa.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%`, backgroundColor: color }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row items-center justify-around gap-6">
                <div className="relative w-56 h-56 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {(() => {
                      let accumulated = 0;
                      return serviceList.map((srv, i) => {
                        const pct = (srv.count / totalAtenciones) * 100;
                        const strokeDasharray = `${pct} ${100 - pct}`;
                        const strokeDashoffset = -accumulated;
                        accumulated += pct;
                        return (
                          <circle
                            key={srv.key}
                            cx="50"
                            cy="50"
                            r="35"
                            fill="transparent"
                            stroke={colors[i % colors.length]}
                            strokeWidth="22"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-extrabold font-mono text-slate-900">{serviceList.length}</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Servicios</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs flex-1 max-h-72 overflow-y-auto pr-2">
                  {serviceList.map((srv, i) => (
                    <div key={srv.key} className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-50">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors[i % colors.length] }}
                      ></span>
                      <span className="font-semibold text-slate-700 truncate max-w-[180px]" title={srv.desc}>
                        {srv.desc}
                      </span>
                      <span className="font-mono text-slate-900 font-bold ml-auto whitespace-nowrap">
                        {srv.count} ({Math.round((srv.count / totalAtenciones) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Services Detailed Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>Detalle por Código de Servicio, Tarifas y Cobertura</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Total Facturado: <strong className="text-slate-900">S/ {totalTarifa.toFixed(2)}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Cód.</th>
                    <th className="py-2.5 px-4">Descripción del Servicio</th>
                    <th className="py-2.5 px-3 text-center">EESS que lo Brindan</th>
                    <th className="py-2.5 px-3 text-center">Pacientes Únicos</th>
                    <th className="py-2.5 px-4 text-right">Total Atenciones</th>
                    <th className="py-2.5 px-3 text-right">% Demanda</th>
                    <th className="py-2.5 px-4 text-right">Tarifa Acumulada</th>
                    <th className="py-2.5 px-3 text-center">EESS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceList.map(s => {
                    const pct = ((s.count / totalAtenciones) * 100).toFixed(1);
                    return (
                      <tr key={s.key} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">{s.cod}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{s.desc}</td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                            {s.eess.size} EESS
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                          {s.pacientesUnicos.size}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">{s.count}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">{pct}%</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          S/ {s.totalTarifa.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedServiceKey(s.key);
                              setSearchTerm(s.desc);
                              setActiveTab('eess');
                            }}
                            className="p-1 rounded-lg bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white transition-colors cursor-pointer"
                            title="Ver en qué EESS se brindó este servicio"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MATRIZ DE SERVICIOS POR MESES (FECHA DE ATENCIÓN)                  */}
      {/* ========================================================================= */}
      {activeTab === 'meses' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-900 to-teal-950 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span>Matriz de Servicios por Mes de Atención (fecha_atencion)</span>
              </h3>
              <p className="text-xs text-blue-200 mt-1">
                Comportamiento y evolución mensual de la demanda por cada servicio médico basado en la fecha clínica real de atención
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 font-mono">
                {allMonthsList.length} Meses Clínicos
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-500/30 font-bold font-mono">
                {filteredAtenciones.length} Atenciones
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Distribución Mensual por Servicio Médico</span>
              </span>
              <span className="text-xs text-slate-400 italic">
                Celdas con intensidad de color según volumen de atenciones
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 sticky left-0 bg-slate-100 z-10">Cód.</th>
                    <th className="py-2.5 px-4 sticky left-14 bg-slate-100 z-10">Descripción del Servicio</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-right">Total S/</th>
                    {allMonthsList.map(m => (
                      <th key={m.key} className="py-2.5 px-3 text-center border-l border-slate-200 whitespace-nowrap">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceList.map(s => {
                    return (
                      <tr key={s.key} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-500 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100">
                          {s.cod}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 sticky left-14 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 max-w-xs truncate" title={s.desc}>
                          {s.desc}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600">
                          {s.count}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                          S/ {s.totalTarifa.toFixed(2)}
                        </td>

                        {/* Month columns */}
                        {allMonthsList.map(m => {
                          const mData = s.mesesMap[m.key];
                          const count = mData ? mData.count : 0;

                          return (
                            <td
                              key={m.key}
                              className={`py-2.5 px-3 text-center font-mono border-l border-slate-100 ${
                                count > 0
                                  ? count > 20
                                    ? 'bg-blue-100 font-black text-blue-900'
                                    : count > 8
                                    ? 'bg-blue-50 font-bold text-blue-800'
                                    : 'font-semibold text-slate-700'
                                  : 'text-slate-300'
                              }`}
                              title={
                                count > 0
                                  ? `${s.desc} en ${m.label}: ${count} atenciones (S/ ${mData?.tarifa.toFixed(2)})`
                                  : 'Sin atenciones en este mes'
                              }
                            >
                              {count > 0 ? (
                                <div>
                                  <span>{count}</span>
                                  <span className="block text-[9px] text-slate-400 font-normal">
                                    S/ {mData?.tarifa.toFixed(0)}
                                  </span>
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: POR ESTABLECIMIENTO DE SALUD (EESS)                                */}
      {/* ========================================================================= */}
      {activeTab === 'eess' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <span>Servicios de Salud por Establecimiento (EESS)</span>
              </h3>
              <p className="text-xs text-purple-200 mt-1">
                Permite auditar qué centros de salud brindan cada prestación médica, volumen de atenciones, pacientes y tarifas generadas
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 font-mono">
                {serviceEessPairs.length} Asignaciones EESS-Servicio
              </span>
            </div>
          </div>

          {/* Quick Filter Reminder if EESS is selected */}
          {selectedEessFilter !== 'TODOS' && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-purple-900">
                <Building2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <span>
                  Filtrando exclusivamente por el establecimiento:{' '}
                  <strong>{selectedEessFilter}</strong>
                </span>
              </div>
              <button
                onClick={() => setSelectedEessFilter('TODOS')}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
              >
                Ver todos los EESS
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Detalle de Servicios por Centro de Salud (EESS)</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {serviceEessPairs.length} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Cód.</th>
                    <th className="py-2.5 px-4">Descripción del Servicio</th>
                    <th className="py-2.5 px-4">Establecimiento de Salud (EESS)</th>
                    <th className="py-2.5 px-3">Cód. EESS</th>
                    <th className="py-2.5 px-3 text-right">Atenciones</th>
                    <th className="py-2.5 px-3 text-right">% del Servicio</th>
                    <th className="py-2.5 px-3 text-center">Pacientes Únicos</th>
                    <th className="py-2.5 px-4 text-right">Tarifa Facturada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceEessPairs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No se encontraron registros con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    serviceEessPairs.map((item, idx) => (
                      <tr key={`${item.serviceCod}-${item.eessNombre}-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-500">{item.serviceCod}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{item.serviceDesc}</td>
                        <td className="py-3 px-4 font-semibold text-purple-950 flex items-center space-x-1.5">
                          <Building2 className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                          <span>{item.eessNombre}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">{item.eessCodigo || 'S/C'}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-blue-600">
                          {item.count}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                            {item.pctOfService}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                          {item.pacientesCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          S/ {item.tarifa.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DETALLE CRONOLÓGICO INDIVIDUAL DE ATENCIONES                       */}
      {/* ========================================================================= */}
      {activeTab === 'detalle' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Registro Detallado por Fecha de Atención ({filteredAtenciones.length})</span>
            </span>
            <span className="text-xs text-slate-400">
              Ordenadas por fecha de atención clínica
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Fecha Atención</th>
                  <th className="py-2.5 px-2">Hora</th>
                  <th className="py-2.5 px-3">N° Formato</th>
                  <th className="py-2.5 px-3">Cód. Serv.</th>
                  <th className="py-2.5 px-4">Descripción del Servicio</th>
                  <th className="py-2.5 px-4">Establecimiento (EESS)</th>
                  <th className="py-2.5 px-4">Paciente Beneficiario</th>
                  <th className="py-2.5 px-3 text-right">Tarifa</th>
                  <th className="py-2.5 px-3">Profesional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAtenciones.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {a.fecha_atencion}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-slate-400">{a.hora_atencion}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{a.nro_formato}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-500">{a.cod_servicio}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{a.descripcion_servicio}</td>
                    <td className="py-2.5 px-4 font-medium text-purple-950">{a.nombre_eess}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-slate-900 block">{a.beneficiario}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {a.tipo_doc}: {a.doc_identidad}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                      S/ {Number(a.tarifa).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-[140px]" title={a.nombre_profesional}>
                      {a.nombre_profesional}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
