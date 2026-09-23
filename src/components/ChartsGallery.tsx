import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  Calendar, 
  Filter, 
  Sliders, 
  Maximize2,
  Sparkles,
  Layers
} from 'lucide-react';
import { Atencion } from '../types/health';

interface Props {
  atenciones: Atencion[];
}

export const ChartsGallery: React.FC<Props> = ({ atenciones }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('TODOS');
  const [metricType, setMetricType] = useState<'volumen' | 'tarifas'>('volumen');

  const allPeriods = Array.from(new Set(atenciones.map(a => a.periodo_cierre))).sort();

  // Filter dataset
  const filtered = atenciones.filter(a => selectedPeriod === 'TODOS' || a.periodo_cierre === selectedPeriod);

  // 1. Line/Trend Data: Days or Months
  const dateMap: Record<string, number> = {};
  filtered.forEach(a => {
    const key = selectedPeriod === 'TODOS' ? a.periodo_cierre : a.fecha_atencion;
    const value = metricType === 'volumen' ? 1 : Number(a.tarifa) || 0;
    dateMap[key] = (dateMap[key] || 0) + value;
  });

  const trendKeys = Object.keys(dateMap).sort().slice(-14);
  const maxTrendVal = Math.max(...trendKeys.map(k => dateMap[k]), 1);

  // 2. Bar Data: By EESS
  const eessMap: Record<string, number> = {};
  filtered.forEach(a => {
    const val = metricType === 'volumen' ? 1 : Number(a.tarifa) || 0;
    eessMap[a.nombre_eess] = (eessMap[a.nombre_eess] || 0) + val;
  });

  const sortedEess = Object.entries(eessMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxEessVal = Math.max(...sortedEess.map(e => e[1]), 1);

  // 3. Donut Data: Componente (Subsidiado, Semisubsidiado, etc.)
  const compMap: Record<string, number> = {};
  filtered.forEach(a => {
    const key = a.componente || 'SUBSIDIADO';
    compMap[key] = (compMap[key] || 0) + 1;
  });

  const compList = Object.entries(compMap);
  const totalComp = filtered.length || 1;

  // 4. Bar Data: Tipo Profesional
  const profTypeMap: Record<string, number> = {};
  filtered.forEach(a => {
    profTypeMap[a.tipo_profesional] = (profTypeMap[a.tipo_profesional] || 0) + 1;
  });
  const profTypeList = Object.entries(profTypeMap).sort((a, b) => b[1] - a[1]);
  const maxProfType = Math.max(...profTypeList.map(p => p[1]), 1);

  const colors = ['#2563EB', '#10B981', '#6366F1', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Title & Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            <span>E. Galería de Gráficos Analíticos Multidimensionales</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Visualizaciones interactivas de tendencias temporales, distribución institucional y segmentación asistencial
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Métricas: Volumen vs Facturación */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setMetricType('volumen')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                metricType === 'volumen' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              N° Atenciones
            </button>
            <button
              onClick={() => setMetricType('tarifas')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                metricType === 'tarifas' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tarifas Facturadas (S/)
            </button>
          </div>

          {/* Period Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Período:</span>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none"
            >
              <option value="TODOS">Todos los Períodos</option>
              {allPeriods.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid of 4 Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Tendencia Temporal (Líneas y Curvas) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Tendencia Temporal ({selectedPeriod})</span>
              </h3>
              <span className="text-[11px] text-slate-400">Evolución de {metricType === 'volumen' ? 'atenciones' : 'facturación'}</span>
            </div>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {trendKeys.length} puntos
            </span>
          </div>

          <div className="h-60 flex flex-col justify-end pt-4">
            <div className="flex-1 flex items-end gap-2 px-2 border-b border-slate-200">
              {trendKeys.map(k => {
                const val = dateMap[k];
                const height = Math.max(Math.round((val / maxTrendVal) * 100), 8);
                return (
                  <div key={k} className="flex-1 flex flex-col items-center group relative">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] rounded px-2 py-1 pointer-events-none whitespace-nowrap z-20 font-mono">
                      {k}: {metricType === 'tarifas' ? `S/ ${val.toFixed(2)}` : val}
                    </div>
                    <div 
                      className="w-full bg-gradient-to-t from-blue-700 to-indigo-400 rounded-t-sm transition-all duration-300 group-hover:brightness-110 shadow-sm"
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 px-2 mt-2">
              {trendKeys.map(k => (
                <div key={k} className="flex-1 text-center text-[9px] font-mono text-slate-400 truncate">
                  {k.includes('-') && k.length > 7 ? k.substring(5) : k}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico 2: Comparativo por Establecimiento (Barras) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Top Establecimientos de Salud</span>
              </h3>
              <span className="text-[11px] text-slate-400">Demanda asistencial comparativa</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {sortedEess.map(([eess, val], idx) => {
              const width = Math.max(Math.round((val / maxEessVal) * 100), 5);
              return (
                <div key={eess} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate pr-2 text-[11px]">{eess}</span>
                    <span className="font-mono font-bold text-slate-700">
                      {metricType === 'tarifas' ? `S/ ${val.toFixed(2)}` : val}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                      style={{ width: `${width}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfico 3: Distribución por Componente (Circular / Donut) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <PieIcon className="w-4 h-4 text-purple-600" />
                <span>Componente del Seguro / Régimen</span>
              </h3>
              <span className="text-[11px] text-slate-400">Distribución SIS Subsidiado / Semisubsidiado</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 my-2">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {(() => {
                  let accumulated = 0;
                  return compList.map(([comp, count], i) => {
                    const pct = (count / totalComp) * 100;
                    const strokeDasharray = `${pct} ${100 - pct}`;
                    const strokeDashoffset = -accumulated;
                    accumulated += pct;
                    return (
                      <circle
                        key={comp}
                        cx="50"
                        cy="50"
                        r="36"
                        fill="transparent"
                        stroke={colors[i % colors.length]}
                        strokeWidth="20"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black font-mono text-slate-900">{compList.length}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase">Regímenes</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              {compList.map(([comp, count], i) => (
                <div key={comp} className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }}></span>
                  <span className="font-semibold text-slate-700">{comp}:</span>
                  <strong className="font-mono text-slate-900">{count} ({Math.round((count / totalComp) * 100)}%)</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico 4: Distribución por Tipo de Profesional */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Atenciones por Cuadro Profesional</span>
              </h3>
              <span className="text-[11px] text-slate-400">Distribución por rol y especialidad</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {profTypeList.map(([tipo, count], i) => {
              const width = Math.max(Math.round((count / maxProfType) * 100), 5);
              const color = colors[i % colors.length];
              return (
                <div key={tipo} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{tipo}</span>
                    <span className="font-mono font-bold text-slate-700">
                      {count} ({Math.round((count / totalComp) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${width}%`, backgroundColor: color }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
