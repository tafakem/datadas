import React, { useState } from 'react';
import { Calendar, Building2, Download, FileSpreadsheet, FileText, BarChart2 } from 'lucide-react';
import { Atencion } from '../../types/health';
import { ExcelService } from '../../services/excelService';
import { PdfService } from '../../services/pdfService';

interface Props {
  atenciones: Atencion[];
}

export const AtencionesMesEess: React.FC<Props> = ({ atenciones }) => {
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedEess, setSelectedEess] = useState<string>('TODOS');

  // Extract all unique months and EESS
  const allMonths = Array.from(new Set(atenciones.map(a => a.periodo_cierre))).sort();
  const allEess = Array.from(new Set(atenciones.map(a => a.nombre_eess))).sort();

  // Filter dataset by chosen year and EESS
  const filtered = atenciones.filter(a => {
    const matchesYear = a.periodo_cierre.startsWith(selectedYear);
    const matchesEess = selectedEess === 'TODOS' || a.nombre_eess === selectedEess;
    return matchesYear && matchesEess;
  });

  const displayEessList = selectedEess === 'TODOS' ? allEess : [selectedEess];

  // Build pivot matrix: EESS x Month
  const matrix: Record<string, Record<string, number>> = {};
  displayEessList.forEach(e => {
    matrix[e] = {};
    allMonths.forEach(m => {
      matrix[e][m] = 0;
    });
  });

  filtered.forEach(a => {
    if (matrix[a.nombre_eess] && matrix[a.nombre_eess][a.periodo_cierre] !== undefined) {
      matrix[a.nombre_eess][a.periodo_cierre]++;
    }
  });

  // Calculate column totals
  const monthTotals: Record<string, number> = {};
  allMonths.forEach(m => {
    monthTotals[m] = displayEessList.reduce((acc, e) => acc + (matrix[e]?.[m] || 0), 0);
  });
  const grandTotal = Object.values(monthTotals).reduce((a, b) => a + b, 0);

  // Maximum value for comparative chart
  const maxVal = Math.max(...displayEessList.map(e => Object.values(matrix[e] || {}).reduce((a, b) => a + b, 0)), 1);

  return (
    <div className="space-y-6">
      {/* Title & Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <BarChart2 className="w-6 h-6 text-blue-600" />
            <span>B.1. Atenciones por Mes y Establecimiento de Salud (EESS)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Matriz consolidada de atenciones médicas y gráficos comparativos por centro de salud
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Año selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Año:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>

          {/* EESS selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>EESS:</span>
            <select
              value={selectedEess}
              onChange={e => setSelectedEess(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none max-w-[180px] truncate"
            >
              <option value="TODOS">Todos los Establecimientos</option>
              {allEess.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Export Buttons */}
          <button
            onClick={() => ExcelService.exportToExcel(filtered, `Atenciones_Mes_EESS_${selectedYear}.xlsx`)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center space-x-1 shadow-sm transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          <button
            onClick={() => PdfService.generateReporteGeneral(filtered, `Año: ${selectedYear} | EESS: ${selectedEess}`, 'ATENCIONES POR MES Y EESS')}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1 shadow-sm transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Comparative Bar Chart by EESS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
          <span>Gráfico Comparativo de Atenciones por Establecimiento ({selectedYear})</span>
        </h3>
        
        <div className="space-y-3">
          {displayEessList.map((eessName, idx) => {
            const totalEess = Object.values(matrix[eessName] || {}).reduce((a, b) => a + b, 0);
            const pct = grandTotal > 0 ? Math.round((totalEess / grandTotal) * 100) : 0;
            const barWidth = Math.max(Math.round((totalEess / maxVal) * 100), 4);
            const barColors = ['bg-blue-600', 'bg-emerald-600', 'bg-indigo-600', 'bg-amber-500', 'bg-teal-600', 'bg-cyan-600'];
            const color = barColors[idx % barColors.length];

            return (
              <div key={eessName} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800 truncate pr-4">{eessName}</span>
                  <span className="font-mono font-bold text-slate-700">{totalEess} ({pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${barWidth}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Pivot Table (Matriz Dinámica con Totales) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Tabla Dinámica Consolidada
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Gran Total: <strong className="text-slate-900 font-bold">{grandTotal}</strong> atenciones
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="py-3 px-4 sticky left-0 bg-slate-900 z-10">Establecimiento de Salud (EESS)</th>
                {allMonths.map(m => (
                  <th key={m} className="py-3 px-3 text-center">{m}</th>
                ))}
                <th className="py-3 px-4 text-right bg-blue-900">Total EESS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayEessList.map(eessName => {
                const totalRow = Object.values(matrix[eessName] || {}).reduce((a, b) => a + b, 0);
                return (
                  <tr key={eessName} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-800 sticky left-0 bg-white shadow-sm whitespace-nowrap">
                      {eessName}
                    </td>
                    {allMonths.map(m => (
                      <td key={m} className="py-2.5 px-3 text-center font-mono text-slate-700">
                        {matrix[eessName]?.[m] || 0}
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700 bg-blue-50/50">
                      {totalRow}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <td className="py-3 px-4 sticky left-0 bg-slate-100">TOTAL GENERAL</td>
                {allMonths.map(m => (
                  <td key={m} className="py-3 px-3 text-center font-mono">
                    {monthTotals[m] || 0}
                  </td>
                ))}
                <td className="py-3 px-4 text-right font-mono text-sm text-emerald-700 bg-emerald-100/60">
                  {grandTotal}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
