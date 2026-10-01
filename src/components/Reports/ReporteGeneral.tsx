import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Search, 
  ArrowUpDown, 
  Printer,
  Loader2,
  Database as DatabaseIcon
} from 'lucide-react';
import { Atencion } from '../../types/health';
import { ExcelService } from '../../services/excelService';
import { PdfService } from '../../services/pdfService';
import { apiService } from '../../services/apiService';
import { TablePagination } from '../TablePagination';

interface Props {
  atenciones: Atencion[];
}

export const ReporteGeneral: React.FC<Props> = ({ atenciones }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortField, setSortField] = useState<string>('fecha_atencion');
  const [sortAsc, setSortAsc] = useState(false);

  // Server-Side state
  const [serverData, setServerData] = useState<Atencion[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isServerActive, setIsServerActive] = useState(false);

  // Debounce search input to avoid spamming the database
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Server-Side Fetching (Instant indexed SQL queries)
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getAtencionesPaged({
        page: currentPage,
        pageSize,
        search: debouncedSearch,
        sortBy: sortField,
        sortDir: sortAsc ? 'ASC' : 'DESC',
      });
      setServerData(res.data);
      setTotalCount(res.total);
      setIsServerActive(true);
    } catch (err) {
      console.warn('Fallback to client filtering:', err);
      setIsServerActive(false);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, sortField, sortAsc]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Client-side fallback if server unreachable
  const clientFiltered = useMemo(() => {
    if (isServerActive) return [];
    if (!debouncedSearch.trim()) return atenciones;
    const term = debouncedSearch.toLowerCase();
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
  }, [atenciones, debouncedSearch, isServerActive]);

  const clientSorted = useMemo(() => {
    if (isServerActive) return [];
    return [...clientFiltered].sort((a: any, b: any) => {
      const valA = a[sortField] ?? '';
      const valB = b[sortField] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc 
        ? String(valA).localeCompare(String(valB)) 
        : String(valB).localeCompare(String(valA));
    });
  }, [clientFiltered, sortField, sortAsc, isServerActive]);

  const displayedRows = isServerActive 
    ? serverData 
    : clientSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const displayTotal = isServerActive ? totalCount : clientSorted.length;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  const handleExportExcel = async () => {
    try {
      let exportItems: Atencion[] = displayedRows;
      if (isServerActive && displayTotal > displayedRows.length) {
        const expRes = await apiService.getAtencionesPaged({
          page: 1,
          pageSize: Math.min(250000, displayTotal),
          search: debouncedSearch,
          sortBy: sortField,
          sortDir: sortAsc ? 'ASC' : 'DESC',
        });
        exportItems = expRes.data;
      }
      ExcelService.exportToExcel(exportItems, `Reporte_General_Atenciones_${new Date().toISOString().substring(0, 10)}.xlsx`);
    } catch (err: any) {
      alert(`Error al exportar: ${err.message}`);
    }
  };

  const handleExportPdf = () => {
    PdfService.generateReporteGeneral(
      displayedRows, 
      searchTerm ? `Búsqueda: "${searchTerm}" (Página ${currentPage} de ${Math.ceil(displayTotal / pageSize)})` : `Página ${currentPage} de ${Math.ceil(displayTotal / pageSize)}`,
      'REPORTE GENERAL CONSOLIDADO DE ATENCIONES DE SALUD'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-extrabold text-slate-900">C.1. Reporte General de Atenciones</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <DatabaseIcon className="w-3 h-3 mr-1 text-blue-600" />
              Paginación Servidor SQLite
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Búsqueda optimizada por índice B-Tree, paginación remota y exportación oficial
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
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
          {loading ? (
            <Loader2 className="w-4 h-4 text-blue-500 absolute left-3 top-2.5 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          )}
          <input
            type="text"
            placeholder="Buscar por N° Formato, DNI, paciente, médico, establecimiento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="bg-white px-4 py-2 rounded-xl shadow-lg border border-slate-200 flex items-center space-x-2 text-xs font-bold text-slate-700">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span>Consultando SQLite...</span>
            </div>
          </div>
        )}

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
              {displayedRows.length > 0 ? (
                displayedRows.map(a => (
                  <tr key={a.id || a.nro_formato} className="hover:bg-slate-50 transition-colors">
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
                        {a.tipo_doc || 'DNI'}: {a.doc_identidad} • {a.edad} años ({a.sexo === 'FEMENINO' ? 'F' : 'M'})
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
                      S/ {Number(a.tarifa || 0).toFixed(2)}
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

        {/* Server-Side TablePagination Component */}
        <TablePagination
          currentPage={currentPage}
          totalItems={displayTotal}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          labelSingular="atención"
          labelPlural="atenciones"
        />
      </div>
    </div>
  );
};
