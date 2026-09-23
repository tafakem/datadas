import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Search, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal,
  Printer
} from 'lucide-react';
import { Atencion } from '../../types/health';
import { ExcelService } from '../../services/excelService';
import { PdfService } from '../../services/pdfService';

interface Props {
  atenciones: Atencion[];
}

export const ReporteGeneral: React.FC<Props> = ({ atenciones }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortField, setSortField] = useState<keyof Atencion>('fecha_atencion');
  const [sortAsc, setSortAsc] = useState(false);

  // Search filter across multiple fields
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return atenciones;
    const term = searchTerm.toLowerCase();
    return atenciones.filter(a => 
      a.nro_formato.toLowerCase().includes(term) ||
      a.beneficiario.toLowerCase().includes(term) ||
      a.doc_identidad.includes(term) ||
      a.nombre_eess.toLowerCase().includes(term) ||
      a.descripcion_servicio.toLowerCase().includes(term) ||
      a.nombre_profesional.toLowerCase().includes(term) ||
      a.digitador.toLowerCase().includes(term) ||
      a.punto_digitacion.toLowerCase().includes(term)
    );
  }, [atenciones, searchTerm]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const valA = a[sortField] ?? '';
      const valB = b[sortField] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc 
        ? String(valA).localeCompare(String(valB)) 
        : String(valB).localeCompare(String(valA));
    });
  }, [filtered, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const handleSort = (field: keyof Atencion) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleExportExcel = () => {
    ExcelService.exportToExcel(sorted, `Reporte_General_Atenciones_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  const handleExportPdf = () => {
    PdfService.generateReporteGeneral(
      sorted, 
      searchTerm ? `Búsqueda: "${searchTerm}"` : 'Todos los registros filtrados',
      'REPORTE GENERAL CONSOLIDADO DE ATENCIONES DE SALUD'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>C.1. Reporte General de Atenciones</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Búsqueda avanzada, ordenamiento multicriterio y exportación institucional a PDF y Excel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Exportar PDF Oficial</span>
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por N° Formato, DNI, paciente, médico, establecimiento..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-500">Filas por página:</span>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-100 font-bold text-slate-800 rounded-lg px-2.5 py-1.5 border border-slate-200 focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Main DataTable */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider">
              <tr>
                <th 
                  onClick={() => handleSort('nro_formato')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>N° Formato</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('fecha_atencion')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center space-x-1">
                    <span>Fecha / Hora</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('beneficiario')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Paciente / Beneficiario</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('nombre_eess')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Establecimiento (EESS)</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('descripcion_servicio')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Servicio</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('nombre_profesional')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Profesional</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('tarifa')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Tarifa</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Tipo / Condición</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length > 0 ? (
                paginated.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                      {a.nro_formato}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{a.fecha_atencion}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{a.hora_atencion}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{a.beneficiario}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {a.tipo_doc}: {a.doc_identidad} • {a.edad} años ({a.sexo === 'FEMENINO' ? 'F' : 'M'})
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800">{a.nombre_eess}</div>
                      <div className="text-[10px] text-slate-400">{a.disa}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-800">{a.descripcion_servicio}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900">{a.nombre_profesional}</div>
                      <div className="text-[10px] text-slate-500">{a.tipo_profesional} {a.colegiatura && `(${a.colegiatura})`}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      S/ {Number(a.tarifa).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mr-1">
                        {a.tipo_atencion}
                      </span>
                      {a.condicion_materna && a.condicion_materna !== 'NO APLICA' && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-100 text-pink-700">
                          {a.condicion_materna}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No se encontraron registros que coincidan con los criterios de búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">
            Mostrando <strong className="text-slate-800 font-mono">{paginated.length}</strong> de{' '}
            <strong className="text-slate-800 font-mono">{sorted.length}</strong> registros
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            <span className="font-mono px-2 font-bold text-slate-800">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors flex items-center space-x-1"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
