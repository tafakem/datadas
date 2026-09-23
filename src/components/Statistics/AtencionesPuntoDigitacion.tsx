import React, { useState } from 'react';
import { Database, Calendar, Award, PieChart as PieIcon, ArrowUpDown } from 'lucide-react';
import { Atencion } from '../../types/health';

interface Props {
  atenciones: Atencion[];
}

export const AtencionesPuntoDigitacion: React.FC<Props> = ({ atenciones }) => {
  const [selectedPunto, setSelectedPunto] = useState<string>('TODOS');

  // Group by punto de digitacion
  const puntoMap: Record<string, { count: number; cod: string; eessList: Set<string>; digitadores: Set<string> }> = {};

  atenciones.forEach(a => {
    const key = a.punto_digitacion || 'SIN PUNTO ASIGNADO';
    if (!puntoMap[key]) {
      puntoMap[key] = {
        count: 0,
        cod: a.cod_punto_digitacion,
        eessList: new Set(),
        digitadores: new Set(),
      };
    }
    puntoMap[key].count++;
    puntoMap[key].eessList.add(a.nombre_eess);
    puntoMap[key].digitadores.add(a.digitador);
  });

  const ranking = Object.entries(puntoMap)
    .map(([nombre, data]) => ({
      nombre,
      cod: data.cod,
      count: data.count,
      eessCount: data.eessList.size,
      digitadoresCount: data.digitadores.size,
      porcentaje: Math.round((data.count / (atenciones.length || 1)) * 10000) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  const colors = ['#2563EB', '#10B981', '#6366F1', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6'];

  // Filtered detail list by chosen point
  const detailList = atenciones
    .filter(a => selectedPunto === 'TODOS' || a.punto_digitacion === selectedPunto)
    .slice(0, 30);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Database className="w-6 h-6 text-indigo-600" />
            <span>B.2. Atenciones por Punto de Digitación</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ranking de centros de captura, porcentaje de carga y detalle por fecha de registro
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-600">Filtrar Detalle:</label>
          <select
            value={selectedPunto}
            onChange={e => setSelectedPunto(e.target.value)}
            className="bg-slate-100 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 border border-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todos los Puntos</option>
            {ranking.map(r => (
              <option key={r.nombre} value={r.nombre}>{r.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Cards & Circular Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Circular Distribution Donut Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
            <PieIcon className="w-4 h-4 text-emerald-600" />
            <span>Distribución de Carga (%)</span>
          </h3>

          {/* SVG Pie/Donut representation */}
          <div className="flex flex-col items-center justify-center my-4">
            <div className="relative w-44 h-44">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {(() => {
                  let accumulated = 0;
                  return ranking.map((r, i) => {
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
                        className="transition-all hover:stroke-[22] cursor-pointer"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold font-mono text-slate-900">{ranking.length}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Puntos</span>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full grid grid-cols-2 gap-2 mt-4 text-[11px]">
              {ranking.map((r, i) => (
                <div key={r.nombre} className="flex items-center space-x-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }}></span>
                  <span className="truncate text-slate-700" title={r.nombre}>{r.nombre}</span>
                  <strong className="text-slate-900 font-mono">({r.porcentaje}%)</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ranking Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Ranking de Productividad por Punto de Digitación</span>
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 text-center">Rank</th>
                  <th className="py-2.5 px-4">Punto de Digitación</th>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3 text-center">EESS Asociados</th>
                  <th className="py-2.5 px-3 text-center">Digitadores</th>
                  <th className="py-2.5 px-4 text-right">Atenciones</th>
                  <th className="py-2.5 px-4 text-right">Part. %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranking.map((r, idx) => (
                  <tr key={r.nombre} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-bold text-[10px] ${
                        idx === 0 ? 'bg-amber-400 text-slate-950 font-black' :
                        idx === 1 ? 'bg-slate-300 text-slate-900' :
                        idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{r.nombre}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{r.cod}</td>
                    <td className="py-3 px-3 text-center font-mono font-medium">{r.eessCount}</td>
                    <td className="py-3 px-3 text-center font-mono font-medium">{r.digitadoresCount}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">{r.count}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">{r.porcentaje}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Detalle por Fecha */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>Detalle Cronológico de Registros ({selectedPunto})</span>
          </span>
          <span className="text-xs text-slate-500">Mostrando últimas atenciones</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
              <tr>
                <th className="py-2.5 px-4">Fecha Atención</th>
                <th className="py-2.5 px-4">Hora</th>
                <th className="py-2.5 px-4">N° Formato</th>
                <th className="py-2.5 px-4">Establecimiento</th>
                <th className="py-2.5 px-4">Servicio</th>
                <th className="py-2.5 px-4">Digitador</th>
                <th className="py-2.5 px-4">Fecha Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detailList.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">{a.fecha_atencion}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-500">{a.hora_atencion}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-blue-600">{a.nro_formato}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-700">{a.nombre_eess}</td>
                  <td className="py-2.5 px-4 text-slate-800">{a.descripcion_servicio}</td>
                  <td className="py-2.5 px-4 text-slate-600 font-medium">{a.digitador}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{a.fecha_registro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
