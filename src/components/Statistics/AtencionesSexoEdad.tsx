import React, { useState } from 'react';
import { Users, Filter } from 'lucide-react';
import { Atencion } from '../../types/health';

interface Props {
  atenciones: Atencion[];
}

interface AgeGroup {
  label: string;
  min: number;
  max: number;
}

const AGE_GROUPS: AgeGroup[] = [
  { label: 'Menores de 1 año', min: 0, max: 0 },
  { label: '1 a 4 años (Infancia)', min: 1, max: 4 },
  { label: '5 a 11 años (Niñez)', min: 5, max: 11 },
  { label: '12 a 17 años (Adolescencia)', min: 12, max: 17 },
  { label: '18 a 29 años (Joven)', min: 18, max: 29 },
  { label: '30 a 59 años (Adulto)', min: 30, max: 59 },
  { label: '60 a más años (Adulto Mayor)', min: 60, max: 150 },
];

export const AtencionesSexoEdad: React.FC<Props> = ({ atenciones }) => {
  const [selectedRango, setSelectedRango] = useState<string>('TODOS');

  // Filter if user selects a specific age range
  const filtered = atenciones.filter(a => {
    if (selectedRango === 'TODOS') return true;
    const group = AGE_GROUPS.find(g => g.label === selectedRango);
    if (!group) return true;
    return a.edad >= group.min && a.edad <= group.max;
  });

  // Calculate Pyramid counts
  const pyramidData = AGE_GROUPS.map(group => {
    const hombres = atenciones.filter(a => a.sexo === 'MASCULINO' && a.edad >= group.min && a.edad <= group.max).length;
    const mujeres = atenciones.filter(a => a.sexo === 'FEMENINO' && a.edad >= group.min && a.edad <= group.max).length;
    const total = hombres + mujeres;
    return {
      label: group.label,
      hombres,
      mujeres,
      total,
    };
  });

  const maxValInGroup = Math.max(...pyramidData.map(d => Math.max(d.hombres, d.mujeres)), 1);

  const totalHombres = atenciones.filter(a => a.sexo === 'MASCULINO').length;
  const totalMujeres = atenciones.filter(a => a.sexo === 'FEMENINO').length;
  const totalGral = atenciones.length || 1;

  const pctHombres = Math.round((totalHombres / totalGral) * 100);
  const pctMujeres = Math.round((totalMujeres / totalGral) * 100);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Users className="w-6 h-6 text-purple-600" />
            <span>B.5. Atenciones por Sexo y Grupos Etarios</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pirámide poblacional epidemiológica y distribución demográfica de la demanda
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Rango Etario:</span>
          <select
            value={selectedRango}
            onChange={e => setSelectedRango(e.target.value)}
            className="bg-transparent font-bold text-slate-800 focus:outline-none"
          >
            <option value="TODOS">Todos los Grupos Etarios</option>
            {AGE_GROUPS.map(g => (
              <option key={g.label} value={g.label}>{g.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sex Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 p-5 rounded-2xl border border-blue-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Hombres (Masculino)</span>
            <div className="text-3xl font-extrabold text-blue-900 font-mono mt-1">{totalHombres}</div>
            <div className="text-xs text-blue-600 font-medium mt-0.5">{pctHombres}% de las atenciones</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20">
            ♂
          </div>
        </div>

        <div className="bg-gradient-to-r from-rose-50 to-rose-100/50 p-5 rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Mujeres (Femenino)</span>
            <div className="text-3xl font-extrabold text-rose-900 font-mono mt-1">{totalMujeres}</div>
            <div className="text-xs text-rose-600 font-medium mt-0.5">{pctMujeres}% de las atenciones</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-rose-500/20">
            ♀
          </div>
        </div>
      </div>

      {/* Pirámide Poblacional Epidemiológica */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Pirámide de Atención por Edades (Hombres vs Mujeres)</h3>
          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="flex items-center space-x-1.5 text-blue-700">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
              <span>Hombres</span>
            </span>
            <span className="flex items-center space-x-1.5 text-rose-700">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
              <span>Mujeres</span>
            </span>
          </div>
        </div>

        {/* Pyramid rows */}
        <div className="space-y-4">
          {pyramidData.slice().reverse().map(d => {
            const hBarWidth = Math.max(Math.round((d.hombres / maxValInGroup) * 100), 2);
            const mBarWidth = Math.max(Math.round((d.mujeres / maxValInGroup) * 100), 2);

            return (
              <div key={d.label} className="grid grid-cols-12 items-center gap-2 text-xs">
                {/* Hombres Bar (Right-aligned bar, extends to left) */}
                <div className="col-span-5 flex items-center justify-end space-x-2">
                  <span className="font-mono font-bold text-blue-700">{d.hombres}</span>
                  <div className="w-full bg-slate-100 h-4 rounded-l-md overflow-hidden flex justify-end">
                    <div 
                      className="bg-blue-600 h-full rounded-l-md transition-all duration-500"
                      style={{ width: `${hBarWidth}%` }}
                    ></div>
                  </div>
                </div>

                {/* Age Label Center */}
                <div className="col-span-2 text-center font-bold text-slate-800 text-[11px] bg-slate-50 py-1 rounded border border-slate-200 truncate" title={d.label}>
                  {d.label}
                </div>

                {/* Mujeres Bar (Left-aligned bar, extends to right) */}
                <div className="col-span-5 flex items-center space-x-2">
                  <div className="w-full bg-slate-100 h-4 rounded-r-md overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-r-md transition-all duration-500"
                      style={{ width: `${mBarWidth}%` }}
                    ></div>
                  </div>
                  <span className="font-mono font-bold text-rose-700">{d.mujeres}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Consolidado por Grupos Etarios
          </span>
        </div>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
            <tr>
              <th className="py-2.5 px-4">Grupo Etario</th>
              <th className="py-2.5 px-4 text-center">Hombres</th>
              <th className="py-2.5 px-4 text-center">Mujeres</th>
              <th className="py-2.5 px-4 text-right">Total</th>
              <th className="py-2.5 px-4 text-right">% del Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pyramidData.map(d => (
              <tr key={d.label} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-800">{d.label}</td>
                <td className="py-3 px-4 text-center font-mono text-blue-700 font-semibold">{d.hombres}</td>
                <td className="py-3 px-4 text-center font-mono text-rose-700 font-semibold">{d.mujeres}</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{d.total}</td>
                <td className="py-3 px-4 text-right font-mono text-slate-600">
                  {Math.round((d.total / totalGral) * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
