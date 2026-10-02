import React, { useState, useEffect } from 'react';
import { MapPin, Globe, Building, Award, FileText } from 'lucide-react';
import { Atencion, FilterState } from '../../types/health';
import { PdfService } from '../../services/pdfService';
import { apiService } from '../../services/apiService';

interface Props {
  atenciones: Atencion[];
  filters?: Partial<FilterState>;
  onNavigateToMap: () => void;
}

export const AtencionesDisa: React.FC<Props> = ({ atenciones, filters, onNavigateToMap }) => {
  const [serverStats, setServerStats] = useState<any>(null);

  useEffect(() => {
    let active = true;
    apiService.getModulesStats(filters).then(data => {
      if (active) setServerStats(data);
    }).catch(err => console.warn('DISA stats notice:', err));
    return () => { active = false; };
  }, [filters, atenciones]);

  const disaMap: Record<string, {
    count: number;
    eess: Set<string>;
    profesionales: Set<string>;
    servicios: Set<string>;
    montoTotal: number;
  }> = {};

  atenciones.forEach(a => {
    const key = a.disa || 'OTRAS REGIONES';
    if (!disaMap[key]) {
      disaMap[key] = {
        count: 0,
        eess: new Set(),
        profesionales: new Set(),
        servicios: new Set(),
        montoTotal: 0,
      };
    }
    disaMap[key].count++;
    disaMap[key].eess.add(a.nombre_eess);
    disaMap[key].profesionales.add(a.dni_profesional);
    disaMap[key].servicios.add(a.descripcion_servicio);
    disaMap[key].montoTotal += Number(a.tarifa) || 0;
  });

  const list = (serverStats?.disa && serverStats.disa.length > 0)
    ? serverStats.disa.map((d: any) => {
        const grandTotal = serverStats.kpis?.totalAtenciones || 1;
        return {
          disa: d.disa || 'OTRAS REGIONES',
          atenciones: d.atenciones,
          eessCount: d.eessCount || 1,
          profCount: 1,
          srvCount: 1,
          monto: d.totalTarifa || 0,
          porcentaje: Math.round((d.atenciones / grandTotal) * 1000) / 10,
        };
      })
    : Object.entries(disaMap)
        .map(([disa, data]) => ({
          disa,
          atenciones: data.count,
          eessCount: data.eess.size,
          profCount: data.profesionales.size,
          srvCount: data.servicios.size,
          monto: data.montoTotal,
          porcentaje: Math.round((data.count / (atenciones.length || 1)) * 1000) / 10,
        }))
        .sort((a, b) => b.atenciones - a.atenciones);

  const handleExportPdf = () => {
    const headers = ['DISA / DIRESA / Región', 'Total Atenciones', '% Demanda', 'EESS de Salud', 'Profesionales', 'Servicios', 'Facturado (S/)'];
    const rows: (string | number)[][] = list.map((r: any) => [
      r.disa,
      r.atenciones,
      `${r.porcentaje}%`,
      r.eessCount,
      r.profCount,
      r.srvCount,
      `S/ ${r.monto.toFixed(2)}`,
    ]);

    const totalFact = list.reduce((acc: number, r: any) => acc + r.monto, 0);

    PdfService.generateEstadisticaPdf({
      titulo: 'B.8. CONSOLIDADO DE ATENCIONES POR DISA / DIRESA / REGIÓN',
      subtitulo: 'Distribución Territorial y Descentralización de Servicios de Salud',
      headers,
      rows,
      resumenKpis: [
        { label: 'Total Atenciones', valor: atenciones.length },
        { label: 'Regiones / DISA', valor: list.length },
        { label: 'Facturación Total', valor: `S/ ${totalFact.toFixed(2)}` },
        { label: 'DISA Principal', valor: list[0]?.disa || 'N/A' },
      ],
      orientation: 'landscape',
      filename: `Atenciones_Por_DISA_${new Date().toISOString().substring(0, 10)}.pdf`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Globe className="w-6 h-6 text-blue-600" />
            <span>B.8. Atenciones por DISA / DIRESA / Región</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Consolidado territorial de redes asistenciales de salud y cobertura descentralizada
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
            title="Exportar reporte territorial en formato PDF"
          >
            <FileText className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
          <button
            onClick={onNavigateToMap}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-colors cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-emerald-300" />
            <span>Abrir Mapa Interactivo</span>
          </button>
        </div>
      </div>

      {/* DISA Regional Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((r: any, idx: number) => (
          <div key={r.disa} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-400 font-mono">#0{idx + 1}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {r.porcentaje}% del total
              </span>
            </div>

            <h3 className="font-extrabold text-slate-900 text-base mt-2 truncate" title={r.disa}>
              {r.disa}
            </h3>

            <div className="mt-3">
              <span className="text-2xl font-black font-mono text-slate-900">{r.atenciones}</span>
              <span className="text-xs text-slate-500 ml-1.5 font-medium">atenciones</span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-1.5 rounded-lg">
                <span className="text-[10px] text-slate-400 block">EESS</span>
                <span className="font-bold text-slate-800 font-mono">{r.eessCount}</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Profesionales</span>
                <span className="font-bold text-slate-800 font-mono">{r.profCount}</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Monto S/</span>
                <span className="font-bold text-emerald-700 font-mono text-[11px]">{r.monto.toFixed(0)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Matriz Resumen por Región Sanitaria
          </span>
        </div>
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
            <tr>
              <th className="py-2.5 px-4">DISA / DIRESA</th>
              <th className="py-2.5 px-4 text-center">EESS Activas</th>
              <th className="py-2.5 px-4 text-center">Profesionales</th>
              <th className="py-2.5 px-4 text-center">Servicios Ofertados</th>
              <th className="py-2.5 px-4 text-right">Atenciones</th>
              <th className="py-2.5 px-4 text-right">Monto Facturado (S/)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((r: any) => (
              <tr key={r.disa} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-900">{r.disa}</td>
                <td className="py-3 px-4 text-center font-mono">{r.eessCount}</td>
                <td className="py-3 px-4 text-center font-mono">{r.profCount}</td>
                <td className="py-3 px-4 text-center font-mono">{r.srvCount}</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">{r.atenciones}</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                  S/ {r.monto.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
