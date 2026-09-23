import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Trash2, 
  RefreshCw, 
  FileCheck, 
  Lock, 
  Eye, 
  X,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Atencion, User } from '../types/health';
import { ExcelService, ParseExcelResult } from '../services/excelService';
import { storageService } from '../services/storageService';

interface Props {
  currentUser: User | null;
  onOpenLogin: () => void;
  atenciones: Atencion[];
  onDataModified: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export const DataUpload: React.FC<Props> = ({
  currentUser,
  onOpenLogin,
  atenciones,
  onDataModified,
  onShowToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseExcelResult | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [deletePeriod, setDeletePeriod] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = currentUser?.rol === 'Administrador' || currentUser?.rol === 'Digitador';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.match(/\.(xlsx|xls|csv)$/i)) {
      onShowToast('El archivo debe tener formato .xlsx, .xls o .csv', 'error');
      return;
    }

    setFile(selected);
    setLoading(true);

    try {
      const buffer = await selected.arrayBuffer();
      const result = ExcelService.parseExcelFile(buffer, atenciones);
      setParseResult(result);
      if (result.success) {
        onShowToast(`Archivo analizado: ${result.data.length} filas válidas encontradas.`, 'success');
      } else {
        onShowToast('Errores encontrados al validar el archivo Excel.', 'error');
      }
    } catch (err: unknown) {
      onShowToast(`Error de lectura: ${(err as Error).message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = () => {
    if (!parseResult || !parseResult.success || parseResult.data.length === 0) return;

    try {
      const { added, updated, skipped } = storageService.addAtenciones(parseResult.data, updateExisting);
      storageService.addAuditLog(
        'CARGA_EXCEL',
        `Carga de ${parseResult.data.length} registros (Nuevos: ${added}, Actualizados: ${updated}, Omitidos: ${skipped}) desde ${file?.name}`
      );
      onShowToast(`Carga exitosa: ${added} agregados, ${updated} actualizados, ${skipped} omitidos.`, 'success');
      setFile(null);
      setParseResult(null);
      setConfirmModalOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onDataModified();
    } catch (err: unknown) {
      onShowToast(`Error al guardar: ${(err as Error).message}`, 'error');
    }
  };

  const handleDeleteByPeriod = () => {
    if (!deletePeriod) return;
    const count = storageService.deleteByPeriod(deletePeriod);
    storageService.addAuditLog(
      'ELIMINACION',
      `Eliminación masiva de ${count} atenciones pertenecientes al período ${deletePeriod}`
    );
    onShowToast(`Se eliminaron ${count} registros del período ${deletePeriod}.`, 'warning');
    setDeleteModalOpen(false);
    setDeletePeriod('');
    onDataModified();
  };

  if (!canUpload) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">Módulo de Carga Restringido</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Para realizar la importación masiva de atenciones médicas mediante archivos Excel, se requiere contar con credenciales de usuario con rol de <strong className="text-slate-800">Digitador</strong> o <strong className="text-slate-800">Administrador</strong>.
        </p>

        <button
          onClick={onOpenLogin}
          className="mt-6 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center space-x-2"
        >
          <span>Iniciar Sesión para Cargar Datos</span>
        </button>
      </div>
    );
  }

  const existingPeriods = Array.from(new Set(atenciones.map(a => a.periodo_cierre))).sort().reverse();

  return (
    <div className="space-y-6">
      {/* Title & Help */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <UploadCloud className="w-6 h-6 text-blue-600" />
            <span>F. Carga Masiva y Actualización de Atenciones (Excel)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Importación automatizada con validación de cabeceras, detección de duplicados y control transaccional
          </p>
        </div>

        <button
          onClick={() => ExcelService.downloadSampleTemplate()}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-1.5 border border-slate-300 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>Descargar Plantilla Oficial (.xlsx)</span>
        </button>
      </div>

      {/* Main Upload Box & Options Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Drop Zone */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors flex flex-col items-center justify-center text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
            id="excel-file-input"
          />

          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          <label
            htmlFor="excel-file-input"
            className="text-base font-extrabold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
          >
            {file ? file.name : 'Haga clic para seleccionar o arrastre el archivo Excel'}
          </label>

          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Formatos compatibles: Microsoft Excel (.xlsx, .xls) y valores separados por comas (.csv).
          </p>

          <div className="mt-4 flex items-center space-x-3">
            <label
              htmlFor="excel-file-input"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
            >
              Seleccionar Archivo
            </label>
            {file && (
              <button
                onClick={() => {
                  setFile(null);
                  setParseResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Quitar archivo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Import Settings Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              Opciones de Ingesta
            </h3>

            <div className="space-y-3">
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={e => setUpdateExisting(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Actualizar existentes (Upsert)</span>
                  <span className="text-[11px] text-slate-400 block leading-tight">
                    Si el N° de formato ya existe, sobreescribir datos y registrar timestamp de actualización.
                  </span>
                </div>
              </label>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-1">
                  Eliminación por Período
                </span>
                <p className="text-[11px] text-slate-400 mb-2">
                  Permite limpiar completamente registros de un mes antes de recargar.
                </p>
                <div className="flex space-x-2">
                  <select
                    value={deletePeriod}
                    onChange={e => setDeletePeriod(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="">Seleccionar período...</option>
                    {existingPeriods.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    disabled={!deletePeriod}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Status summary */}
          {parseResult && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-600">Estado:</span>
                <span className={`font-bold font-mono ${parseResult.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {parseResult.success ? '✓ VÁLIDO' : '✗ ERRORES'}
                </span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-slate-600">Total Filas:</span>
                <span className="font-mono font-bold text-slate-800">{parseResult.totalRows}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-600">Duplicados detectados:</span>
                <span className="font-mono font-bold text-amber-600">{parseResult.duplicateCount}</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Validation Errors banner */}
      {parseResult && parseResult.errors.length > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl text-xs text-rose-800 space-y-1">
          <div className="font-bold flex items-center space-x-1.5 text-rose-900">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Observaciones en la validación del archivo:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto pl-1 font-mono text-[11px]">
            {parseResult.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Data Preview Table */}
      {parseResult && parseResult.success && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Vista Previa de Filas a Importar ({parseResult.data.length} registros)
              </span>
            </div>

            <button
              onClick={() => setConfirmModalOpen(true)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar y Guardar en Base de Datos</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-white font-bold uppercase sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">N° Formato</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Paciente</th>
                  <th className="py-2.5 px-3">Doc Id.</th>
                  <th className="py-2.5 px-3">EESS</th>
                  <th className="py-2.5 px-3">Servicio</th>
                  <th className="py-2.5 px-3">Profesional</th>
                  <th className="py-2.5 px-3 text-right">Tarifa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parseResult.data.slice(0, 20).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-400">{i + 1}</td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-600">{row.nro_formato}</td>
                    <td className="py-2 px-3 font-mono">{row.fecha_atencion}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{row.beneficiario}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{row.doc_identidad}</td>
                    <td className="py-2 px-3 truncate max-w-[150px]">{row.nombre_eess}</td>
                    <td className="py-2 px-3 truncate max-w-[150px]">{row.descripcion_servicio}</td>
                    <td className="py-2 px-3">{row.nombre_profesional}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">S/ {Number(row.tarifa).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parseResult.data.length > 20 && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
              Mostrando las primeras 20 filas de {parseResult.data.length} registros totales.
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-extrabold text-slate-900">¿Confirmar Guardado en Base de Datos?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Se ingresarán <strong className="text-slate-800">{parseResult?.data.length}</strong> atenciones a la base de datos principal.
              {updateExisting ? (
                <span className="block mt-1 text-blue-600 font-medium">
                  • Los formatos duplicados serán actualizados con los datos nuevos.
                </span>
              ) : (
                <span className="block mt-1 text-amber-600 font-medium">
                  • Los formatos duplicados serán omitidos.
                </span>
              )}
            </p>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-extrabold shadow-md cursor-pointer"
              >
                Sí, Guardar Atenciones
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">¿Eliminar período {deletePeriod}?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Esta acción eliminará de forma irreversible todas las atenciones registradas con el período de cierre <strong className="text-rose-600 font-bold">{deletePeriod}</strong>.
            </p>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteByPeriod}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                Sí, Eliminar Registros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
