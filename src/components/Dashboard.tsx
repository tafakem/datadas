import React, { useState, useEffect } from 'react';
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
  RefreshCw
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
  const availablePeriods = Array.from(new Set(atenciones.map(a => a.periodo_cierre))).sort().reverse();
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

  // Monthly trend data
  const monthlyDataMap: Record<string, number> = {};
  availablePeriods.slice().reverse().forEach(p => {
    monthlyDataMap[p] = atenciones.filter(a => a.periodo_cierre === p).length;
  });

  const maxMonthVal = Math.max(...Object.values(monthlyDataMap), 1);
  const monthKeys = Object.keys(monthlyDataMap);

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
        
        {/* Gráfico 1: Evolución Mensual de Atenciones (Líneas / Área interactiva) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>Evolución Mensual de Atenciones</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Comportamiento histórico por período de cierre</p>
            </div>
            <button
              onClick={() => onNavigate('stats-mes-eess')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-0.5"
            >
              <span>Ver detalle</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Custom SVG Line/Bar Chart */}
          <div className="h-64 flex flex-col justify-end pt-4">
            <div className="flex-1 flex items-end gap-3 sm:gap-6 px-2 border-b border-slate-200">
              {monthKeys.map((m) => {
                const val = monthlyDataMap[m];
                const heightPercent = Math.max(Math.round((val / maxMonthVal) * 100), 8);
                return (
                  <div key={m} className="flex-1 flex flex-col items-center group relative">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[11px] rounded-lg px-2 py-1 pointer-events-none whitespace-nowrap shadow-lg z-20 font-mono">
                      {val} atenciones ({m})
                    </div>
                    {/* Value label */}
                    <span className="text-[11px] font-mono font-bold text-slate-600 mb-1">
                      {val}
                    </span>
                    {/* Bar visual with gradient */}
                    <div 
                      className="w-full bg-gradient-to-t from-blue-700 to-emerald-400 rounded-t-lg transition-all duration-300 group-hover:brightness-110 shadow-sm"
                      style={{ height: `${heightPercent}%` }}
                    ></div>
                  </div>
                );
              })}
            </div>
            {/* X-axis labels */}
            <div className="flex gap-3 sm:gap-6 px-2 mt-2">
              {monthKeys.map((m) => (
                <div key={m} className="flex-1 text-center text-[11px] font-medium text-slate-500 truncate">
                  {m}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico 2: Atenciones por Tipo de Servicio (Barras horizontales) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80">
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

          <div className="space-y-3.5 pt-2">
            {sortedServices.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No hay servicios registrados con los filtros activos.</p>
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
