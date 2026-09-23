import React, { useState } from 'react';
import { Activity, PieChart as PieIcon, BarChart2 } from 'lucide-react';
import { Atencion } from '../../types/health';

interface Props {
  atenciones: Atencion[];
}

export const AtencionesServicio: React.FC<Props> = ({ atenciones }) => {
  const [chartType, setChartType] = useState<'barras' | 'circular'>('barras');

  // Aggregate by service
  const serviceMap: Record<string, {
    cod: string;
    desc: string;
    count: number;
    totalTarifa: number;
    pacientesUnicos: Set<string>;
    eess: Set<string>;
  }> = {};

  atenciones.forEach(a => {
    const key = a.cod_servicio || a.descripcion_servicio;
    if (!serviceMap[key]) {
      serviceMap[key] = {
        cod: a.cod_servicio,
        desc: a.descripcion_servicio,
        count: 0,
        totalTarifa: 0,
        pacientesUnicos: new Set(),
        eess: new Set(),
      };
    }
    serviceMap[key].count++;
    serviceMap[key].totalTarifa += Number(a.tarifa) || 0;
    serviceMap[key].pacientesUnicos.add(a.doc_identidad);
    serviceMap[key].eess.add(a.nombre_eess);
  });

  const list = Object.values(serviceMap).sort((a, b) => b.count - a.count);
  const totalAtenciones = atenciones.length || 1;
  const maxVal = Math.max(...list.map(s => s.count), 1);
  const colors = ['#2563EB', '#10B981', '#6366F1', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899', '#14B8A6'];

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Activity className="w-6 h-6 text-teal-600" />
            <span>B.4. Atenciones por Servicio de Salud</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Distribución volumétrica, tarifas tarifarias y desglose por código prestacional
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setChartType('barras')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              chartType === 'barras' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Barras</span>
          </button>
          <button
            onClick={() => setChartType('circular')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              chartType === 'circular' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Circular</span>
          </button>
        </div>
      </div>

      {/* Visual Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        {chartType === 'barras' ? (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Demanda Comparativa por Servicio Médico</h3>
            {list.map((srv, idx) => {
              const pct = Math.round((srv.count / totalAtenciones) * 1000) / 10;
              const barWidth = Math.max(Math.round((srv.count / maxVal) * 100), 5);
              const color = colors[idx % colors.length];

              return (
                <div key={srv.cod + srv.desc} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center space-x-2 truncate pr-4">
                      <span className="font-mono text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        {srv.cod}
                      </span>
                      <span className="font-bold text-slate-800">{srv.desc}</span>
                    </div>
                    <div className="font-mono font-bold text-slate-800 whitespace-nowrap">
                      {srv.count} <span className="text-slate-500 font-normal">({pct}%)</span>
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
            <div className="relative w-56 h-56">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {(() => {
                  let accumulated = 0;
                  return list.map((srv, i) => {
                    const pct = (srv.count / totalAtenciones) * 100;
                    const strokeDasharray = `${pct} ${100 - pct}`;
                    const strokeDashoffset = -accumulated;
                    accumulated += pct;
                    return (
                      <circle
                        key={srv.cod + srv.desc}
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
                <span className="text-2xl font-extrabold font-mono text-slate-900">{list.length}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Servicios</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {list.map((srv, i) => (
                <div key={srv.cod + srv.desc} className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }}></span>
                  <span className="font-semibold text-slate-700 truncate max-w-[200px]" title={srv.desc}>{srv.desc}</span>
                  <span className="font-mono text-slate-900 font-bold">
                    ({Math.round((srv.count / totalAtenciones) * 100)}%)
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
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Detalle por Código de Servicio y Tarifa
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Total Facturado: <strong className="text-slate-900">S/ {list.reduce((acc, s) => acc + s.totalTarifa, 0).toFixed(2)}</strong>
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
                <th className="py-2.5 px-4 text-right">Tarifa Acumulada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map(s => (
                <tr key={s.cod + s.desc} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-500">{s.cod}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{s.desc}</td>
                  <td className="py-3 px-3 text-center font-mono">{s.eess.size}</td>
                  <td className="py-3 px-3 text-center font-mono">{s.pacientesUnicos.size}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">{s.count}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                    S/ {s.totalTarifa.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
