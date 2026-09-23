import React, { useState } from 'react';
import { Target, AlertTriangle, CheckCircle2, Info, AlertCircle, ShieldAlert } from 'lucide-react';
import { Atencion, CoverageCategory } from '../../types/health';

interface Props {
  atenciones: Atencion[];
}

export const ReporteCobertura: React.FC<Props> = ({ atenciones }) => {
  const [filterCategory, setFilterCategory] = useState<string>('TODOS');

  // Compute coverage by EESS with institutional target values
  const eessMap: Record<string, {
    cod: string;
    nombre: string;
    disa: string;
    realizado: number;
    meta: number;
  }> = {};

  atenciones.forEach(a => {
    const key = a.codigo_eess || a.nombre_eess;
    if (!eessMap[key]) {
      // Deterministic target for each EESS based on hash/code to simulate official annual SIS targets
      const baseMeta = 60 + ((a.codigo_eess.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 5) + 1) * 20;
      eessMap[key] = {
        cod: a.codigo_eess,
        nombre: a.nombre_eess,
        disa: a.disa,
        realizado: 0,
        meta: baseMeta,
      };
    }
    eessMap[key].realizado++;
  });

  const list = Object.values(eessMap).map(e => {
    const pct = Math.round((e.realizado / (e.meta || 1)) * 10000) / 100;
    let categoria: CoverageCategory = 'MALO';
    let badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
    let barColor = 'bg-rose-500';
    let label = 'Malo (≤ 49.99%)';

    if (pct >= 66.67) {
      categoria = 'REVISA';
      badgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
      barColor = 'bg-blue-600';
      label = 'Revisa (≥ 66.67%)';
    } else if (pct >= 63.33) {
      categoria = 'BUENO';
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      barColor = 'bg-emerald-500';
      label = 'Bueno (63.33% - 66.67%)';
    } else if (pct >= 50.00) {
      categoria = 'REGULAR';
      badgeClass = 'bg-orange-100 text-orange-800 border-orange-300';
      barColor = 'bg-orange-500';
      label = 'Regular (50% - 63.33%)';
    }

    return {
      ...e,
      porcentaje: pct,
      categoria,
      badgeClass,
      barColor,
      label,
    };
  });

  // Category counts
  const countMalo = list.filter(l => l.categoria === 'MALO').length;
  const countRegular = list.filter(l => l.categoria === 'REGULAR').length;
  const countBueno = list.filter(l => l.categoria === 'BUENO').length;
  const countRevisa = list.filter(l => l.categoria === 'REVISA').length;

  const filteredList = list.filter(l => filterCategory === 'TODOS' || l.categoria === filterCategory);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
          <Target className="w-6 h-6 text-rose-600" />
          <span>C.3. Reporte de Cobertura y Semáforo de Cumplimiento (Meta vs Realizado)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Monitoreo estricto según umbrales institucionales: Malo (≤ 49.99%), Regular (50% - 63.33%), Bueno (63.33% - 66.67%) y Revisa (≥ 66.67%)
        </p>
      </div>

      {/* Semáforo Interactive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Malo */}
        <div 
          onClick={() => setFilterCategory(filterCategory === 'MALO' ? 'TODOS' : 'MALO')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            filterCategory === 'MALO' 
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 shadow-md' 
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block animate-pulse"></span>
              <span>Riesgo Crítico (Malo)</span>
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2">{countMalo} EESS</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Cumplimiento ≤ 49.99%</div>
        </div>

        {/* Regular */}
        <div 
          onClick={() => setFilterCategory(filterCategory === 'REGULAR' ? 'TODOS' : 'REGULAR')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            filterCategory === 'REGULAR' 
              ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500/20 shadow-md' 
              : 'bg-white border-slate-200 hover:border-orange-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
              <span>Regular</span>
            </span>
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2">{countRegular} EESS</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Cumplimiento 50.00% - 63.33%</div>
        </div>

        {/* Bueno */}
        <div 
          onClick={() => setFilterCategory(filterCategory === 'BUENO' ? 'TODOS' : 'BUENO')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            filterCategory === 'BUENO' 
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Bueno (Meta)</span>
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2">{countBueno} EESS</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Cumplimiento 63.33% - 66.67%</div>
        </div>

        {/* Revisa / Sobresaliente */}
        <div 
          onClick={() => setFilterCategory(filterCategory === 'REVISA' ? 'TODOS' : 'REVISA')}
          className={`cursor-pointer rounded-2xl p-4 border transition-all ${
            filterCategory === 'REVISA' 
              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-md' 
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
              <span>Revisa (Óptimo)</span>
            </span>
            <Info className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2">{countRevisa} EESS</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Cumplimiento ≥ 66.67%</div>
        </div>

      </div>

      {/* Alertas de Bajo Rendimiento */}
      {countMalo > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl flex items-start space-x-3 text-rose-900">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Alerta Sanitaria: {countMalo} establecimiento(s) presentan nivel crítico de cobertura</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              Se recomienda intervención inmediata de la Dirección de Redes Integradas para refuerzo de personal digitador, campañas extramurales y auditoría del sistema de registro.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Detalle de Cumplimiento de Metas por Establecimiento
          </span>
          {filterCategory !== 'TODOS' && (
            <button
              onClick={() => setFilterCategory('TODOS')}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Mostrar todos los estados
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
              <tr>
                <th className="py-2.5 px-4">Cód.</th>
                <th className="py-2.5 px-4">Establecimiento (EESS)</th>
                <th className="py-2.5 px-3">DISA / Región</th>
                <th className="py-2.5 px-3 text-right">Meta Programada</th>
                <th className="py-2.5 px-3 text-right">Realizado</th>
                <th className="py-2.5 px-4 text-center">Avance Gráfico</th>
                <th className="py-2.5 px-4 text-right">% Cumplimiento</th>
                <th className="py-2.5 px-4 text-center">Estado Semáforo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map(e => (
                <tr key={e.cod + e.nombre} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-500">{e.cod}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{e.nombre}</td>
                  <td className="py-3 px-3 text-slate-600">{e.disa}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-600">{e.meta}</td>
                  <td className="py-3 px-3 text-right font-mono font-extrabold text-blue-600">{e.realizado}</td>
                  <td className="py-3 px-4 w-44">
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${e.barColor}`}
                        style={{ width: `${Math.min(e.porcentaje, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                    {e.porcentaje}%
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${e.badgeClass}`}>
                      {e.label}
                    </span>
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
