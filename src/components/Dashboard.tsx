import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Calendar, 
  Building2, 
  UserCheck, 
  Target, 
  ArrowUpRight, 
  Clock, 
  FileSpreadsheet, 
  Sparkles,
  TrendingUp,
  Award,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Atencion } from '../types/health';

interface DashboardProps {
  atenciones: Atencion[];
  onNavigate: (module: string) => void;
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ atenciones, onNavigate, onRefresh }) => {
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(300); // 5 minutes = 300s
  const [selectedPeriod, setSelectedPeriod] = useState<string>('TODOS');
  const [chartMode, setChartMode] = useState<'both' | 'bars' | 'lines'>('both');
  const [chartMetric, setChartMetric] = useState<'atenciones' | 'tarifas'>('atenciones');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isWideChart, setIsWideChart] = useState<boolean>(true);

  // Auto-refresh countdown (every 5 minutes as specified)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilRefresh(prev => {
        if (prev <= 1) {
          onRefresh();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  // Derived calculations
  const totalAcumulado = atenciones.length;
  
  // Current month (default to latest period available in dataset)
  const availablePeriods = Array.from(new Set(atenciones.map(a => a.periodo_cierre))).filter(Boolean).sort().reverse();
  const currentMonthPeriod = availablePeriods[0] || '2026-09';

  const atencionesDelMes = atenciones.filter(a => a.periodo_cierre === currentMonthPeriod).length;
  const eessActivas = new Set(atenciones.map(a => a.codigo_eess)).size;
  const profesionalesActivos = new Set(atenciones.map(a => a.dni_profesional)).size;

  // General Coverage calculation (meta estimate: 300 atenciones per EESS active)
  const metaTotal = Math.max(eessActivas * 250, 100);
  const porcentajeCobertura = Math.min(Math.round((atenciones.length / metaTotal) * 10000) / 100, 100);

  // Semáforo de Cobertura
  let semaforoColor = 'bg-rose-500';
  let semaforoTexto = 'Malo (≤ 49.99%)';
  let semaforoBadge = 'bg-rose-100 text-rose-800 border-rose-300';
  if (porcentajeCobertura >= 66.67) {
    semaforoColor = 'bg-blue-600';
    semaforoTexto = 'Revisa / Óptimo (≥ 66.67%)';
    semaforoBadge = 'bg-blue-100 text-blue-800 border-blue-300';
  } else if (porcentajeCobertura >= 63.33) {
    semaforoColor = 'bg-emerald-500';
    semaforoTexto = 'Bueno (63.33% - 66.67%)';
    semaforoBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  } else if (porcentajeCobertura >= 50.0) {
    semaforoColor = 'bg-orange-500';
    semaforoTexto = 'Regular (50% - 63.33%)';
    semaforoBadge = 'bg-orange-100 text-orange-800 border-orange-300';
  }

  // Monthly trend data - High Performance Single Pass Aggregation (Handles 1M+ records)
  const { monthlyDataMap, monthlyTarifasMap, monthKeys, maxMonthVal, maxTarifaVal } = useMemo(() => {
    const dataMap: Record<string, number> = {};
    const tarifasMap: Record<string, number> = {};

    for (let i = 0; i < atenciones.length; i++) {
      const a = atenciones[i];
      let p = (a.periodo_cierre || '').trim();
      if (!p && a.fecha_atencion) {
        const match = String(a.fecha_atencion).match(/^(\d{4})[-/](\d{1,2})/);
        if (match) {
          p = `${match[1]}-${match[2].padStart(2, '0')}`;
        }
      }
      if (!p) p = 'S/P';

      dataMap[p] = (dataMap[p] || 0) + 1;
      tarifasMap[p] = (tarifasMap[p] || 0) + (Number(a.tarifa) || 0);
    }

    const keys = Object.keys(dataMap).sort();
    const maxVal = Math.max(...Object.values(dataMap), 1);
    const maxTarifa = Math.max(...Object.values(tarifasMap), 1);

    return {
      monthlyDataMap: dataMap,
      monthlyTarifasMap: tarifasMap,
      monthKeys: keys,
      maxMonthVal: maxVal,
      maxTarifaVal: maxTarifa,
    };
  }, [atenciones]);

  // Service distribution data
  const serviceCountMap: Record<string, number> = {};
  atenciones.forEach(a => {
    serviceCountMap[a.descripcion_servicio] = (serviceCountMap[a.descripcion_servicio] || 0) + 1;
  });

  const sortedServices = Object.entries(serviceCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxServiceVal = Math.max(...sortedServices.map(s => s[1]), 1);

  // Opportunity stats (0-10d, 11-29d, 30+d)
  let count0_10 = 0;
  let count11_29 = 0;
  let count30_mas = 0;
  atenciones.forEach(a => {
    if (a.fecha_atencion && a.fecha_registro) {
      const dAtencion = new Date(a.fecha_atencion.substring(0, 10));
      const dRegistro = new Date(a.fecha_registro.substring(0, 10));
      if (!isNaN(dAtencion.getTime()) && !isNaN(dRegistro.getTime())) {
        const diff = Math.round((dRegistro.getTime() - dAtencion.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 10) count0_10++;
        else if (diff <= 29) count11_29++;
        else count30_mas++;
      }
    }
  });
  const pct0_10 = atenciones.length > 0 ? Math.round((count0_10 / atenciones.length) * 1000) / 10 : 0;

  // Recent 8 atenciones
  const ultimasAtenciones = [...atenciones]
    .sort((a, b) => new Date(`${b.fecha_atencion} ${b.hora_atencion}`).getTime() - new Date(`${a.fecha_atencion} ${a.hora_atencion}`).getTime())
    .slice(0, 8);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Helper to parse and format month codes like "2026-09"
  const getMonthInfo = (m: string) => {
    const clean = (m || '').trim();
    const match = clean.match(/^(\d{4})[-/](\d{1,2})/);
    if (match) {
      const year = match[1];
      const monthNum = parseInt(match[2], 10);
      const shortNames = [
        '', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
        'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'
      ];
      const fullNames = [
        '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
        'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      return {
        short: shortNames[monthNum] || match[2],
        full: `${fullNames[monthNum] || match[2]} ${year}`,
        monthNum: monthNum,
        year: year,
      };
    }
    return { short: clean, full: clean, monthNum: 0, year: '' };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Panel Epidemiológico & Gestión Sanitaria</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Dashboard Principal de Salud
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Monitoreo en tiempo real de atenciones médicas, cumplimiento de metas de cobertura institucional y distribución de servicios de salud.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 5-minute Auto-refresh badge */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl px-3.5 py-2 text-xs flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
              <div>
                <span className="text-slate-400 block text-[10px]">Actualización automática</span>
                <span className="font-mono font-bold text-white">{formatTimer(secondsUntilRefresh)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onRefresh();
                setSecondsUntilRefresh(300);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refrescar</span>
            </button>

            <button
              onClick={() => onNavigate('carga-datos')}
              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Cargar Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Tarjetas Resumen (Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* 1. Atenciones del Mes */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Atenciones Mes</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {atencionesDelMes.toLocaleString()}
            </div>
            <div className="flex items-center space-x-1 text-xs text-emerald-600 font-semibold mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>Período {currentMonthPeriod}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Último mes cerrado</span>
            <span className="font-semibold text-slate-700">
              {totalAcumulado > 0 ? Math.round((atencionesDelMes / totalAcumulado) * 100) : 0}% del total
            </span>
          </div>
        </div>

        {/* 2. Total Atenciones Acumuladas */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Acumulado</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {totalAcumulado.toLocaleString()}
            </div>
            <div className="flex items-center space-x-1 text-xs text-indigo-600 font-semibold mt-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>100% de la base activa</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Períodos registrados</span>
            <span className="font-semibold text-slate-700">{availablePeriods.length} meses</span>
          </div>
        </div>

        {/* 3. EESS Activas */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">EESS Activas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {eessActivas}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Centros y Puestos de Salud
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Red de cobertura</span>
            <span className="font-semibold text-emerald-700">Operativa</span>
          </div>
        </div>

        {/* 4. Número de Profesionales */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profesionales</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {profesionalesActivos}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Médicos, Obstetras, Enfermeros
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Prom. atenciones/prof</span>
            <span className="font-semibold text-slate-700">
              {profesionalesActivos > 0 ? Math.round(totalAcumulado / profesionalesActivos) : 0}
            </span>
          </div>
        </div>

        {/* 5. Cobertura General (% Meta vs Realizado) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cobertura General</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-slate-900 font-mono">
                {porcentajeCobertura}%
              </span>
              <span className="text-[10px] text-slate-500 font-medium">de meta</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${semaforoColor}`}
                style={{ width: `${Math.min(porcentajeCobertura, 100)}%` }}
              ></div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${semaforoBadge}`}>
              {semaforoTexto}
            </span>
          </div>
        </div>

      </div>

      {/* Barra Resumen de Oportunidad de Registro (0-10d, 11-29d, ≥30d) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
              <span>Oportunidad de Digitación</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                {pct0_10}% Oportuno (≤10d)
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Días transcurridos entre la Fecha de Atención y la Fecha de Registro en el sistema
            </p>
          </div>
        </div>

        {/* 3 mini-pills y botón de acceso */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>0-10 días: <strong>{count0_10}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>11-29 días: <strong>{count11_29}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>≥30 días: <strong>{count30_mas}</strong></span>
          </div>
          <button
            onClick={() => onNavigate('stats-oportunidad')}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
          >
            <span>Ver B.9 Oportunidad</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigate('stats-registro-atencion')}
            className="px-3 py-1.5 rounded-xl bg-cyan-800 hover:bg-cyan-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
          >
            <span>Ver B.10 Cruce Meses</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Gráficos Principales: Líneas y Barras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Evolución Mensual de Atenciones (Líneas / Barras interactivo) */}
        <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col justify-between transition-all duration-300 ${isWideChart ? 'lg:col-span-2' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Evolución Mensual de Atenciones
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {monthKeys.length} Meses • {getMonthInfo(currentMonthPeriod).short} {getMonthInfo(currentMonthPeriod).year}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {chartMetric === 'atenciones' ? 'Volumen mensual de atenciones producidas' : 'Monto facturado mensual en tarifas SIS'} ({monthKeys.length} períodos registrados) • Vista espaciada y optimizada para visualización clara
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {/* Metric Toggle: Atenciones vs Monto S/ */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  onClick={() => setChartMetric('atenciones')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    chartMetric === 'atenciones' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Ver N° de Atenciones producidas"
                >
                  N° Atenciones
                </button>
                <button
                  onClick={() => setChartMetric('tarifas')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    chartMetric === 'tarifas' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Ver Monto Facturado en Soles (S/)"
                >
                  Monto S/
                </button>
              </div>

              {/* Chart Mode Toggle: Ambos / Barras / Líneas */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  onClick={() => setChartMode('both')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    chartMode === 'both' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Mostrar Barras y Línea de Tendencia"
                >
                  Ambos
                </button>
                <button
                  onClick={() => setChartMode('bars')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    chartMode === 'bars' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Mostrar sólo Barras"
                >
                  Barras
                </button>
                <button
                  onClick={() => setChartMode('lines')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    chartMode === 'lines' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Mostrar sólo Líneas"
                >
                  Líneas
                </button>
              </div>

              {/* Wide View Toggle */}
              <button
                onClick={() => setIsWideChart(prev => !prev)}
                className={`hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border cursor-pointer ${
                  isWideChart
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title={isWideChart ? 'Cambiar a ancho estándar (50%)' : 'Expandir a ancho completo (100%) para ver cómodamente todos los meses'}
              >
                {isWideChart ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isWideChart ? 'Ancho Completo' : 'Expandir'}</span>
              </button>

              <button
                onClick={() => onNavigate('stats-mes-eess')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-0.5 ml-1 cursor-pointer"
                title="Ver matriz detallada en Estadísticas"
              >
                <span>Detalle</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SVG Vector Chart with Horizontal Scroll for Perfect Spacing */}
          {monthKeys.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-slate-400 text-xs">
              No hay datos disponibles para el período seleccionado.
            </div>
          ) : (
            <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
              <div className="h-72 min-w-[700px] w-full relative flex flex-col justify-end">
                {/* Tooltip floating banner */}
                {hoveredIndex !== null && (
                  <div className="absolute top-1 right-2 z-10 bg-slate-900/95 backdrop-blur-xs text-white text-[11px] rounded-xl px-3 py-1.5 font-mono shadow-xl border border-slate-700 flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span className="font-bold text-white">{getMonthInfo(monthKeys[hoveredIndex]).full}</span>
                      {getMonthInfo(monthKeys[hoveredIndex]).monthNum > 0 && (
                        <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded font-sans">
                          Mes {String(getMonthInfo(monthKeys[hoveredIndex]).monthNum).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-600">|</span>
                    <span className="text-blue-300 font-bold">
                      {(monthlyDataMap[monthKeys[hoveredIndex]] || 0).toLocaleString()} atenciones
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className="text-emerald-300 font-bold">
                      S/ {(monthlyTarifasMap[monthKeys[hoveredIndex]] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {(() => {
                  const N = monthKeys.length;
                  const currentMax = chartMetric === 'atenciones' ? maxMonthVal : maxTarifaVal;

                  // High-resolution coordinate grid with generous spacing
                  const svgWidth = Math.max(760, N * 85);
                  const svgHeight = 230;
                  const baselineY = 170;
                  const chartTopY = 40;
                  const availableHeight = baselineY - chartTopY; // 130 units

                  const points = monthKeys.map((m: string, idx: number) => {
                    const x = N === 1 ? svgWidth / 2 : 65 + (idx * (svgWidth - 110)) / (N - 1);
                    const val = chartMetric === 'atenciones' ? (monthlyDataMap[m] || 0) : (monthlyTarifasMap[m] || 0);
                    const h = currentMax > 0 ? (val / currentMax) * availableHeight : 0;
                    const y = baselineY - Math.max(h, 4);
                    return { x, y, val, month: m, h };
                  });

                  // Comfortable bar width with plenty of breathing space
                  const barWidth = Math.min(Math.max(380 / N, 26), 40);
                  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
                  const polygonPoints = points.length > 0 ? `${points[0].x},${baselineY} ${polylinePoints} ${points[points.length - 1].x},${baselineY}` : '';

                  return (
                    <svg className="w-full h-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="dashboardAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal reference grid lines */}
                      {[0.25, 0.5, 0.75, 1].map(ratio => {
                        const gridY = baselineY - ratio * availableHeight;
                        const rawVal = Math.round(currentMax * ratio);
                        const labelStr = chartMetric === 'atenciones' 
                          ? rawVal.toLocaleString() 
                          : `S/ ${rawVal >= 1000 ? (rawVal / 1000).toFixed(1) + 'k' : rawVal}`;
                        return (
                          <g key={ratio}>
                            <line x1="45" y1={gridY} x2={svgWidth - 25} y2={gridY} stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="1" />
                            <text x="40" y={gridY + 3} textAnchor="end" className="text-[10px] font-mono fill-slate-400">
                              {labelStr}
                            </text>
                          </g>
                        );
                      })}

                      {/* Baseline X Axis */}
                      <line x1="42" y1={baselineY} x2={svgWidth - 20} y2={baselineY} stroke="#cbd5e1" strokeWidth="1.5" />

                      <g>
                        {/* Area Fill beneath line */}
                        {(chartMode === 'both' || chartMode === 'lines') && N > 1 && (
                          <polygon points={polygonPoints} fill="url(#dashboardAreaGrad)" />
                        )}

                        {/* Bars - Solid vibrant colors with generous spacing */}
                        {(chartMode === 'both' || chartMode === 'bars') &&
                          points.map((p, idx: number) => {
                            const isHovered = hoveredIndex === idx;
                            return (
                              <rect
                                key={`bar-${p.month}`}
                                x={p.x - barWidth / 2}
                                y={p.y}
                                width={barWidth}
                                height={Math.max(baselineY - p.y, 4)}
                                rx="4"
                                fill={chartMetric === 'atenciones' ? '#2563eb' : '#059669'}
                                stroke={chartMetric === 'atenciones' ? '#1d4ed8' : '#047857'}
                                strokeWidth="1.5"
                                className="transition-all duration-200 cursor-pointer"
                                opacity={hoveredIndex === null || isHovered ? 0.95 : 0.4}
                                onMouseEnter={() => setHoveredIndex(idx)}
                                onMouseLeave={() => setHoveredIndex(null)}
                              />
                            );
                          })}

                        {/* Continuous Trend Line for 2+ months */}
                        {(chartMode === 'both' || chartMode === 'lines') && N > 1 && (
                          <polyline
                            points={polylinePoints}
                            fill="none"
                            stroke={chartMode === 'both' ? '#f59e0b' : '#2563eb'}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Line representation for single month (N === 1) */}
                        {(chartMode === 'both' || chartMode === 'lines') && N === 1 && (
                          <g>
                            <line
                              x1={points[0].x - 80}
                              y1={points[0].y}
                              x2={points[0].x + 80}
                              y2={points[0].y}
                              stroke={chartMode === 'both' ? '#f59e0b' : '#2563eb'}
                              strokeWidth="3.5"
                              strokeLinecap="round"
                            />
                            <line
                              x1={points[0].x}
                              y1={points[0].y}
                              x2={points[0].x}
                              y2={baselineY}
                              stroke="#93c5fd"
                              strokeDasharray="3 3"
                              strokeWidth="1.5"
                            />
                          </g>
                        )}

                        {/* Data Point Dots & Value Labels */}
                        {points.map((p, idx: number) => {
                          const isHovered = hoveredIndex === idx;
                          const info = getMonthInfo(p.month);
                          const isLatest = idx === points.length - 1;
                          const formattedText = chartMetric === 'atenciones' 
                            ? (p.val >= 10000 ? `${(p.val / 1000).toFixed(1)}k` : p.val.toLocaleString())
                            : `S/ ${p.val >= 1000 ? `${(p.val / 1000).toFixed(1)}k` : Math.round(p.val)}`;

                          return (
                            <g
                              key={`pt-${p.month}`}
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredIndex(idx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            >
                              {/* Line node dot */}
                              {(chartMode === 'both' || chartMode === 'lines') && (
                                <>
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={isHovered ? 7.5 : 5}
                                    fill="#ffffff"
                                    stroke={chartMode === 'both' ? '#f59e0b' : '#2563eb'}
                                    strokeWidth="2.5"
                                    className="transition-all duration-200"
                                  />
                                  <circle cx={p.x} cy={p.y} r={isHovered ? 4 : 2.5} fill="#10b981" />
                                </>
                              )}

                              {/* Value label on top (Monto / Cantidad) */}
                              <text
                                x={p.x}
                                y={p.y - 8}
                                textAnchor="middle"
                                className={`text-[11px] font-mono font-bold transition-all select-none ${
                                  isHovered ? 'fill-blue-700 text-xs font-black' : isLatest ? 'fill-blue-900 font-extrabold' : 'fill-slate-700'
                                }`}
                              >
                                {formattedText}
                              </text>

                              {/* X-axis Month Label (Two lines: Clean Month Name + Year) */}
                              <text
                                x={p.x}
                                y="190"
                                textAnchor="middle"
                                className={`text-[12px] font-bold transition-colors select-none ${
                                  isHovered ? 'fill-blue-600 font-extrabold' : isLatest ? 'fill-blue-900 font-extrabold' : 'fill-slate-700'
                                }`}
                              >
                                {info.short}
                              </text>
                              <text
                                x={p.x}
                                y="204"
                                textAnchor="middle"
                                className={`text-[10px] font-mono select-none ${
                                  isHovered ? 'fill-blue-500 font-semibold' : 'fill-slate-400'
                                }`}
                              >
                                {info.year ? `'${info.year.slice(2)}` : ''}
                              </text>

                              {/* Indicator dot for latest active month (e.g. Mes 9) */}
                              {isLatest && (
                                <circle cx={p.x} cy="214" r="2.5" fill="#2563eb" />
                              )}
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Bottom Summary Footer */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block"></span>
                <span className="font-medium text-slate-700">Atenciones ({monthKeys.length} meses)</span>
              </span>
              {chartMode === 'both' && (
                <span className="flex items-center space-x-1.5">
                  <span className="w-3 h-0.5 bg-amber-500 inline-block"></span>
                  <span className="font-medium text-slate-700">Línea de Tendencia</span>
                </span>
              )}
              <span className="text-slate-300">|</span>
              <span>Mes activo en curso: <strong className="text-slate-900 font-bold">{getMonthInfo(currentMonthPeriod).full}</strong></span>
            </div>
            <div className="font-mono text-slate-600">
              Total acumulado del año: <strong className="text-blue-700 font-bold">{totalAcumulado.toLocaleString()}</strong> atenciones
            </div>
          </div>
        </div>

        {/* Gráfico 2: Atenciones por Tipo de Servicio (Barras horizontales) */}
        <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 ${isWideChart ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Award className="w-5 h-5 text-emerald-600" />
                <span>Atenciones por Tipo de Servicio</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Top servicios con mayor demanda de pacientes</p>
            </div>
            <button
              onClick={() => onNavigate('stats-servicio')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-0.5"
            >
              <span>Ver todos</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className={`pt-2 ${isWideChart ? 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5' : 'space-y-3.5'}`}>
            {sortedServices.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center col-span-2">No hay servicios registrados con los filtros activos.</p>
            ) : (
              sortedServices.map(([serviceName, count], idx) => {
                const pct = totalAcumulado > 0 ? Math.round((count / totalAcumulado) * 100) : 0;
                const barWidth = Math.max(Math.round((count / maxServiceVal) * 100), 5);
                const colors = [
                  'bg-blue-600',
                  'bg-emerald-600',
                  'bg-indigo-600',
                  'bg-amber-500',
                  'bg-rose-500',
                  'bg-teal-600'
                ];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={serviceName} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800 truncate pr-2" title={serviceName}>
                        {serviceName}
                      </span>
                      <span className="font-mono font-bold text-slate-700 whitespace-nowrap">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Tabla: Últimas Atenciones Registradas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <span>Últimas Atenciones Registradas</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Listado cronológico de las atenciones más recientes en el sistema</p>
          </div>
          <button
            onClick={() => onNavigate('report-general')}
            className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors flex items-center space-x-1"
          >
            <span>Ver reporte completo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">N° Formato</th>
                <th className="py-3 px-4">Fecha / Hora</th>
                <th className="py-3 px-4">Paciente</th>
                <th className="py-3 px-4">Establecimiento (EESS)</th>
                <th className="py-3 px-4">Servicio</th>
                <th className="py-3 px-4">Profesional</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4 text-right">Tarifa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ultimasAtenciones.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No se encontraron atenciones registradas para mostrar.
                  </td>
                </tr>
              ) : (
                ultimasAtenciones.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                      {a.nro_formato}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <span className="block font-medium text-slate-900">{a.fecha_atencion}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{a.hora_atencion}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{a.beneficiario}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {a.tipo_doc}: {a.doc_identidad} • {a.edad} años ({a.sexo === 'FEMENINO' ? 'F' : 'M'})
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {a.nombre_eess}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {a.descripcion_servicio}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{a.nombre_profesional}</div>
                      <div className="text-[10px] text-slate-500">{a.tipo_profesional}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.tipo_atencion === 'HOSPITALIZADO'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {a.tipo_atencion}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      S/ {Number(a.tarifa).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
