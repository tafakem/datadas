import React, { useState, useEffect } from 'react';
import { Heart, Baby, Activity, AlertCircle, FileText } from 'lucide-react';
import { Atencion } from '../../types/health';
import { PdfService } from '../../services/pdfService';
import { apiService } from '../../services/apiService';

interface Props {
  atenciones: Atencion[];
}

export const AtencionesCondicionMaterna: React.FC<Props> = ({ atenciones }) => {
  const [serverStats, setServerStats] = useState<any>(null);

  useEffect(() => {
    let active = true;
    apiService.getModulesStats().then(data => {
      if (active) setServerStats(data);
    }).catch(err => console.warn('Materna stats notice:', err));
    return () => { active = false; };
  }, []);

  // Filter for reproductive age women (12 to 49) or all records with materna info
  const mujeresMEF = atenciones.filter(a => a.sexo === 'FEMENINO' && a.edad >= 12 && a.edad <= 49);
  const totalInDb = serverStats?.kpis?.totalAtenciones || atenciones.length || 1;

  let gestantes = atenciones.filter(a => a.condicion_materna === 'GESTANTE').length;
  let puerperas = atenciones.filter(a => a.condicion_materna === 'PUERPERA').length;
  let noGestantes = atenciones.filter(a => a.condicion_materna === 'NO GESTANTE').length;
  let noAplica = atenciones.filter(a => a.condicion_materna === 'NO APLICA' || !a.condicion_materna).length;

  if (serverStats?.condicionMaterna && Array.isArray(serverStats.condicionMaterna)) {
    gestantes = 0; puerperas = 0; noGestantes = 0; noAplica = 0;
    for (const c of serverStats.condicionMaterna) {
      const cond = String(c.condicion || '').toUpperCase();
      const cnt = Number(c.cantidad) || 0;
      if (cond === 'GESTANTE') gestantes += cnt;
      else if (cond === 'PUERPERA') puerperas += cnt;
      else if (cond === 'NO GESTANTE') noGestantes += cnt;
      else noAplica += cnt;
    }
  }

  const totalMaterno = gestantes + puerperas + noGestantes;
  const maxVal = Math.max(gestantes, puerperas, noGestantes, 1);

  // Group by EESS for gestantes
  const gestantesPorEess: Record<string, number> = {};
  atenciones.filter(a => a.condicion_materna === 'GESTANTE').forEach(a => {
    gestantesPorEess[a.nombre_eess] = (gestantesPorEess[a.nombre_eess] || 0) + 1;
  });

  const handleExportPdf = () => {
    const headers = ['Condición Materna / Establecimiento', 'Atenciones', '% Relativo', '% Total'];
    const rows: (string | number)[][] = [
      ['Gestantes (Control Prenatal)', gestantes, `${totalMaterno > 0 ? Math.round((gestantes / totalMaterno) * 100) : 0}%`, `${((gestantes / atenciones.length) * 100).toFixed(1)}%`],
      ['Puérperas (Postparto)', puerperas, `${totalMaterno > 0 ? Math.round((puerperas / totalMaterno) * 100) : 0}%`, `${((puerperas / atenciones.length) * 100).toFixed(1)}%`],
      ['No Gestantes (Mujeres MEF)', noGestantes, `${totalMaterno > 0 ? Math.round((noGestantes / totalMaterno) * 100) : 0}%`, `${((noGestantes / atenciones.length) * 100).toFixed(1)}%`],
      ['No Aplica / Otros', noAplica, '—', `${((noAplica / atenciones.length) * 100).toFixed(1)}%`],
    ];

    const eessEntries = Object.entries(gestantesPorEess).sort((a, b) => b[1] - a[1]);
    eessEntries.forEach(([eess, count]) => {
      rows.push([`  • Gestantes en: ${eess}`, count, `${Math.round((count / (gestantes || 1)) * 100)}% de gestantes`, '—']);
    });

    PdfService.generateEstadisticaPdf({
      titulo: 'B.6. ATENCIONES POR CONDICIÓN MATERNA',
      subtitulo: 'Seguimiento a Gestantes, Puérperas y MEF en Establecimientos de Salud',
      headers,
      rows,
      resumenKpis: [
        { label: 'Gestantes', valor: gestantes },
        { label: 'Puérperas', valor: puerperas },
        { label: 'Total Materno', valor: totalMaterno },
        { label: 'Mujeres MEF (12-49a)', valor: mujeresMEF.length },
      ],
      orientation: 'portrait',
      filename: `Condicion_Materna_${new Date().toISOString().substring(0, 10)}.pdf`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Heart className="w-6 h-6 text-pink-600" />
            <span>B.6. Atenciones por Condición Materna</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Seguimiento a la salud materna, control prenatal, puérperas y mujeres en edad fértil (MEF)
          </p>
        </div>

        <button
          onClick={handleExportPdf}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer self-start md:self-auto"
          title="Exportar reporte en formato PDF"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Exportar PDF</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Gestantes */}
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-5 text-white shadow-md">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-100">Gestantes</span>
            <Baby className="w-5 h-5 text-white" />
          </div>
          <div className="text-3xl font-extrabold font-mono mt-2">{gestantes}</div>
          <div className="text-xs text-pink-100 mt-1 font-medium">
            Control Prenatal y Monitoreo Fetal
          </div>
          <div className="mt-3 pt-2 border-t border-pink-400/40 text-[11px] flex justify-between">
            <span>% del total materno</span>
            <span className="font-bold">{totalMaterno > 0 ? Math.round((gestantes / totalMaterno) * 100) : 0}%</span>
          </div>
        </div>

        {/* Puérperas */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-100">Puérperas</span>
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div className="text-3xl font-extrabold font-mono mt-2">{puerperas}</div>
          <div className="text-xs text-purple-100 mt-1 font-medium">
            Atención postparto y recién nacido
          </div>
          <div className="mt-3 pt-2 border-t border-purple-400/40 text-[11px] flex justify-between">
            <span>% del total materno</span>
            <span className="font-bold">{totalMaterno > 0 ? Math.round((puerperas / totalMaterno) * 100) : 0}%</span>
          </div>
        </div>

        {/* No Gestantes (MEF) */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-5 text-white shadow-md">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">No Gestantes</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono mt-2">{noGestantes}</div>
          <div className="text-xs text-slate-300 mt-1 font-medium">
            Planificación Familiar y Ginecológica
          </div>
          <div className="mt-3 pt-2 border-t border-slate-600 text-[11px] flex justify-between">
            <span>% del total materno</span>
            <span className="font-bold">{totalMaterno > 0 ? Math.round((noGestantes / totalMaterno) * 100) : 0}%</span>
          </div>
        </div>

      </div>

      {/* Gráfico Comparativo */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4">
          Comparativa de Volumen Asistencial Materno
        </h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-pink-700">Gestantes (Control Prenatal)</span>
              <span className="font-mono">{gestantes} pacientes</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
              <div 
                className="bg-pink-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round((gestantes / maxVal) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-purple-700">Puérperas (Control Puerperio)</span>
              <span className="font-mono">{puerperas} pacientes</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
              <div 
                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round((puerperas / maxVal) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700">No Gestantes</span>
              <span className="font-mono">{noGestantes} pacientes</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
              <div 
                className="bg-slate-700 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round((noGestantes / maxVal) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Gestantes por Establecimiento */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Gestantes Atendidas por Establecimiento de Salud (EESS)
          </span>
        </div>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
            <tr>
              <th className="py-2.5 px-4">Establecimiento de Salud</th>
              <th className="py-2.5 px-4 text-right">Gestantes Atendidas</th>
              <th className="py-2.5 px-4 text-right">% Cobertura Materna</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(gestantesPorEess).map(([eess, count]) => (
              <tr key={eess} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-semibold text-slate-800">{eess}</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-pink-600">{count}</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                  {Math.round((count / (gestantes || 1)) * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
