import React, { useState } from 'react';
import { UserCheck, Stethoscope, Search, Trophy } from 'lucide-react';
import { Atencion } from '../../types/health';

interface Props {
  atenciones: Atencion[];
}

export const AtencionesProfesional: React.FC<Props> = ({ atenciones }) => {
  const [selectedTipo, setSelectedTipo] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extract professional types
  const allTipos = Array.from(new Set(atenciones.map(a => a.tipo_profesional))).filter(Boolean).sort();

  // Aggregate by doctor/professional DNI
  const profMap: Record<string, {
    dni: string;
    nombre: string;
    tipo: string;
    colegiatura: string;
    rne: string;
    count: number;
    servicios: Set<string>;
    eess: Set<string>;
    fechas: Set<string>;
  }> = {};

  atenciones.forEach(a => {
    const key = a.dni_profesional || a.nombre_profesional;
    if (!profMap[key]) {
      profMap[key] = {
        dni: a.dni_profesional,
        nombre: a.nombre_profesional,
        tipo: a.tipo_profesional,
        colegiatura: a.colegiatura,
        rne: a.rne,
        count: 0,
        servicios: new Set(),
        eess: new Set(),
        fechas: new Set(),
      };
    }
    profMap[key].count++;
    profMap[key].servicios.add(a.descripcion_servicio);
    profMap[key].eess.add(a.nombre_eess);
    profMap[key].fechas.add(a.fecha_atencion);
  });

  const list = Object.values(profMap)
    .filter(p => {
      const matchesTipo = selectedTipo === 'TODOS' || p.tipo === selectedTipo;
      const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.dni.includes(searchTerm) ||
                            p.colegiatura.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTipo && matchesSearch;
    })
    .sort((a, b) => b.count - a.count);

  const top10 = list.slice(0, 10);
  const maxTopVal = Math.max(...top10.map(t => t.count), 1);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <UserCheck className="w-6 h-6 text-emerald-600" />
            <span>B.3. Atenciones por Profesional de Salud</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Productividad asistencial, ranking top 10 y detalle de atenciones por médico / enfermera
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o colegiatura..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 w-64 text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Tipo Profesional Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-100 px-3 py-2 rounded-xl text-xs font-semibold">
            <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
            <span>Tipo:</span>
            <select
              value={selectedTipo}
              onChange={e => setSelectedTipo(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none"
            >
              <option value="TODOS">Todos los Tipos</option>
              {allTipos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top 10 Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Top 10 Profesionales con Mayor Productividad</span>
        </h3>

        <div className="space-y-3">
          {top10.map((prof, idx) => {
            const barWidth = Math.max(Math.round((prof.count / maxTopVal) * 100), 5);
            return (
              <div key={prof.dni} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center space-x-2 truncate pr-4">
                    <span className="w-5 text-center font-bold text-slate-400 font-mono">#{idx + 1}</span>
                    <span className="font-bold text-slate-800">{prof.nombre}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-semibold">
                      {prof.tipo}
                    </span>
                    {prof.colegiatura && (
                      <span className="text-[10px] text-slate-400 hidden sm:inline">({prof.colegiatura})</span>
                    )}
                  </div>
                  <div className="font-mono font-bold text-slate-800 whitespace-nowrap">
                    {prof.count} <span className="text-slate-400 font-normal">atenciones</span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Professional Listing Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Directorio y Desempeño Asistencial
          </span>
          <span className="text-xs text-slate-500">
            Total Profesionales: <strong className="text-slate-900 font-bold">{list.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
              <tr>
                <th className="py-2.5 px-4">DNI</th>
                <th className="py-2.5 px-4">Nombre Completo</th>
                <th className="py-2.5 px-3">Tipo Profesional</th>
                <th className="py-2.5 px-3">Colegiatura / RNE</th>
                <th className="py-2.5 px-3 text-center">EESS Asignados</th>
                <th className="py-2.5 px-3 text-center">Días Asistidos</th>
                <th className="py-2.5 px-4 text-right">Total Atenciones</th>
                <th className="py-2.5 px-4 text-right">Promedio / Día</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map(p => {
                const dias = p.fechas.size || 1;
                const prom = (p.count / dias).toFixed(1);
                return (
                  <tr key={p.dni} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-600">{p.dni}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.nombre}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {p.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {p.colegiatura} {p.rne && `• ${p.rne}`}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">{p.eess.size}</td>
                    <td className="py-3 px-3 text-center font-mono">{dias}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">{p.count}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">{prom}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
