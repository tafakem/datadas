import React, { useState, useRef, useMemo } from 'react';
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
  AlertCircle,
  Users,
  Plus,
  Edit2,
  Search,
  Check,
  Building2,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { Atencion, User, DigitadorRecord } from '../types/health';
import { ExcelService, ParseExcelResult, ParseDigitadoresResult } from '../services/excelService';
import { storageService } from '../services/storageService';

interface Props {
  currentUser: User | null;
  onOpenLogin: () => void;
  atenciones: Atencion[];
  onDataModified: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
  onNavigateToDigitadores?: () => void;
}

export const DataUpload: React.FC<Props> = ({
  currentUser,
  onOpenLogin,
  atenciones,
  onDataModified,
  onShowToast,
  onNavigateToDigitadores,
}) => {
  const [activeUploadTab, setActiveUploadTab] = useState<'atenciones' | 'digitadores' | 'directorio'>('atenciones');

  // --- ATENCIONES STATE ---
  const [fileAtenciones, setFileAtenciones] = useState<File | null>(null);
  const [loadingAtenciones, setLoadingAtenciones] = useState(false);
  const [parseResultAtenciones, setParseResultAtenciones] = useState<ParseExcelResult | null>(null);
  const [updateExistingAtenciones, setUpdateExistingAtenciones] = useState(true);
  const [deletePeriod, setDeletePeriod] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const fileInputRefAtenciones = useRef<HTMLInputElement>(null);

  // --- DIGITADORES STATE ---
  const [fileDigitadores, setFileDigitadores] = useState<File | null>(null);
  const [loadingDigitadores, setLoadingDigitadores] = useState(false);
  const [parseResultDigitadores, setParseResultDigitadores] = useState<ParseDigitadoresResult | null>(null);
  const [confirmModalDigitadoresOpen, setConfirmModalDigitadoresOpen] = useState(false);
  const fileInputRefDigitadores = useRef<HTMLInputElement>(null);

  // --- DIRECTORY / EDIT DIGITADOR MODAL ---
  const [digitadoresList, setDigitadoresList] = useState<DigitadorRecord[]>(() => storageService.getDigitadores());
  const [dirSearchTerm, setDirSearchTerm] = useState('');
  const [editingDigitador, setEditingDigitador] = useState<DigitadorRecord | null>(null);
  const [isNewDigitadorModal, setIsNewDigitadorModal] = useState(false);
  const [deleteDigitadorId, setDeleteDigitadorId] = useState<string | null>(null);

  // Form state for add/edit digitador
  const [formDni, setFormDni] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formCodPunto, setFormCodPunto] = useState('PTO-DIG-01');
  const [formPunto, setFormPunto] = useState('');
  const [formCodEess, setFormCodEess] = useState('');
  const [formEess, setFormEess] = useState('');
  const [formCargo, setFormCargo] = useState('Digitador Asistencial');
  const [formEstado, setFormEstado] = useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');
  const [formCorreo, setFormCorreo] = useState('');
  const [formTelefono, setFormTelefono] = useState('');

  const canUpload = currentUser?.rol === 'Administrador' || currentUser?.rol === 'Digitador';

  const refreshDigitadores = () => {
    setDigitadoresList(storageService.getDigitadores());
  };

  // ----------------------------------------------------
  // ATENCIONES HANDLERS
  // ----------------------------------------------------
  const handleFileAtencionesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.match(/\.(xlsx|xls|csv)$/i)) {
      onShowToast('El archivo debe tener formato .xlsx, .xls o .csv', 'error');
      return;
    }

    setFileAtenciones(selected);
    setLoadingAtenciones(true);

    try {
      const buffer = await selected.arrayBuffer();
      const result = ExcelService.parseExcelFile(buffer, atenciones);
      setParseResultAtenciones(result);
      if (result.success) {
        onShowToast(`Archivo analizado: ${result.data.length} atenciones válidas encontradas.`, 'success');
      } else {
        onShowToast('Errores encontrados al validar el archivo Excel de atenciones.', 'error');
      }
    } catch (err: unknown) {
      onShowToast(`Error de lectura: ${(err as Error).message}`, 'error');
    } finally {
      setLoadingAtenciones(false);
    }
  };

  const handleConfirmSaveAtenciones = () => {
    if (!parseResultAtenciones || !parseResultAtenciones.success || parseResultAtenciones.data.length === 0) return;

    try {
      const { added, updated, skipped } = storageService.addAtenciones(parseResultAtenciones.data, updateExistingAtenciones);
      storageService.addAuditLog(
        'CARGA_EXCEL',
        `Carga de ${parseResultAtenciones.data.length} atenciones (Nuevos: ${added}, Actualizados: ${updated}, Omitidos: ${skipped}) desde ${fileAtenciones?.name}`
      );
      onShowToast(`Carga de atenciones exitosa: ${added} agregados, ${updated} actualizados, ${skipped} omitidos.`, 'success');
      setFileAtenciones(null);
      setParseResultAtenciones(null);
      setConfirmModalOpen(false);
      if (fileInputRefAtenciones.current) fileInputRefAtenciones.current.value = '';
      onDataModified();
    } catch (err: unknown) {
      onShowToast(`Error al guardar atenciones: ${(err as Error).message}`, 'error');
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

  // ----------------------------------------------------
  // DIGITADORES HANDLERS
  // ----------------------------------------------------
  const handleFileDigitadoresChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.match(/\.(xlsx|xls|csv)$/i)) {
      onShowToast('El archivo debe tener formato .xlsx, .xls o .csv', 'error');
      return;
    }

    setFileDigitadores(selected);
    setLoadingDigitadores(true);

    try {
      const buffer = await selected.arrayBuffer();
      const result = ExcelService.parseDigitadoresExcel(buffer);
      setParseResultDigitadores(result);
      if (result.success) {
        onShowToast(`Archivo analizado: ${result.data.length} digitadores listos para importar.`, 'success');
      } else {
        onShowToast('Errores al validar el archivo Excel de digitadores.', 'error');
      }
    } catch (err: unknown) {
      onShowToast(`Error de lectura: ${(err as Error).message}`, 'error');
    } finally {
      setLoadingDigitadores(false);
    }
  };

  const handleConfirmSaveDigitadores = () => {
    if (!parseResultDigitadores || !parseResultDigitadores.success || parseResultDigitadores.data.length === 0) return;

    try {
      const { added, updated } = storageService.addOrUpdateDigitadores(parseResultDigitadores.data);
      storageService.addAuditLog(
        'CARGA_EXCEL',
        `Importación de padrón de digitadores (${parseResultDigitadores.data.length} procesados: ${added} nuevos, ${updated} actualizados) desde ${fileDigitadores?.name}`
      );
      onShowToast(`Maestro de digitadores actualizado: ${added} agregados, ${updated} actualizados.`, 'success');
      setFileDigitadores(null);
      setParseResultDigitadores(null);
      setConfirmModalDigitadoresOpen(false);
      if (fileInputRefDigitadores.current) fileInputRefDigitadores.current.value = '';
      refreshDigitadores();
      onDataModified();
    } catch (err: unknown) {
      onShowToast(`Error al guardar digitadores: ${(err as Error).message}`, 'error');
    }
  };

  // ----------------------------------------------------
  // MANUAL DIGITADOR FORM HANDLERS
  // ----------------------------------------------------
  const handleOpenNewDigitadorModal = () => {
    setFormDni('');
    setFormNombre('');
    setFormCodPunto('PTO-DIG-01');
    setFormPunto('');
    setFormCodEess('');
    setFormEess('');
    setFormCargo('Digitador Asistencial');
    setFormEstado('ACTIVO');
    setFormCorreo('');
    setFormTelefono('');
    setIsNewDigitadorModal(true);
    setEditingDigitador(null);
  };

  const handleOpenEditDigitador = (dig: DigitadorRecord) => {
    setEditingDigitador(dig);
    setFormDni(dig.dni || '');
    setFormNombre(dig.nombre_completo);
    setFormCodPunto(dig.cod_punto_digitacion || 'PTO-DIG-01');
    setFormPunto(dig.punto_digitacion || '');
    setFormCodEess(dig.codigo_eess || '');
    setFormEess(dig.nombre_eess || '');
    setFormCargo(dig.cargo || 'Digitador Asistencial');
    setFormEstado(dig.estado || 'ACTIVO');
    setFormCorreo(dig.correo || '');
    setFormTelefono(dig.telefono || '');
    setIsNewDigitadorModal(false);
  };

  const handleSaveDigitadorForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      onShowToast('El nombre del digitador es obligatorio.', 'error');
      return;
    }

    if (editingDigitador) {
      storageService.updateDigitador({
        ...editingDigitador,
        dni: formDni.trim(),
        nombre_completo: formNombre.trim(),
        cod_punto_digitacion: formCodPunto.trim(),
        punto_digitacion: formPunto.trim() || 'PUNTO DIGITACIÓN ASIGNADO',
        codigo_eess: formCodEess.trim(),
        nombre_eess: formEess.trim(),
        cargo: formCargo.trim(),
        estado: formEstado,
        correo: formCorreo.trim(),
        telefono: formTelefono.trim(),
      });
      storageService.addAuditLog('ACTUALIZACION', `Actualización de datos del digitador ${formNombre.trim()}`);
      onShowToast(`Digitador ${formNombre} actualizado correctamente.`, 'success');
      setEditingDigitador(null);
    } else {
      storageService.addDigitador({
        dni: formDni.trim(),
        nombre_completo: formNombre.trim(),
        cod_punto_digitacion: formCodPunto.trim(),
        punto_digitacion: formPunto.trim() || 'PUNTO DIGITACIÓN ASIGNADO',
        codigo_eess: formCodEess.trim(),
        nombre_eess: formEess.trim(),
        cargo: formCargo.trim(),
        estado: formEstado,
        correo: formCorreo.trim(),
        telefono: formTelefono.trim(),
      });
      storageService.addAuditLog('ACTUALIZACION', `Alta manual de nuevo digitador ${formNombre.trim()}`);
      onShowToast(`Digitador ${formNombre} registrado exitosamente.`, 'success');
      setIsNewDigitadorModal(false);
    }

    refreshDigitadores();
    onDataModified();
  };

  const handleDeleteDigitadorConfirm = () => {
    if (!deleteDigitadorId) return;
    const dig = digitadoresList.find(d => d.id === deleteDigitadorId);
    storageService.deleteDigitador(deleteDigitadorId);
    storageService.addAuditLog('ELIMINACION', `Eliminación del digitador ${dig?.nombre_completo || deleteDigitadorId} del padrón`);
    onShowToast('Digitador eliminado del padrón.', 'warning');
    setDeleteDigitadorId(null);
    refreshDigitadores();
    onDataModified();
  };

  // Filtered directory list
  const filteredDirectory = useMemo(() => {
    if (!dirSearchTerm) return digitadoresList;
    const term = dirSearchTerm.toLowerCase();
    return digitadoresList.filter(d => 
      d.nombre_completo.toLowerCase().includes(term) ||
      d.dni.toLowerCase().includes(term) ||
      d.punto_digitacion.toLowerCase().includes(term) ||
      (d.nombre_eess || '').toLowerCase().includes(term)
    );
  }, [digitadoresList, dirSearchTerm]);

  if (!canUpload) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">Módulo de Carga Restringido</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Para realizar la importación masiva de atenciones médicas y maestros de digitadores mediante archivos Excel, se requiere contar con credenciales de usuario con rol de <strong className="text-slate-800">Digitador</strong> o <strong className="text-slate-800">Administrador</strong>.
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
      {/* Title & Tab Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <UploadCloud className="w-6 h-6 text-blue-600" />
            <span>F. Ingesta Masiva y Gestión de Formatos Excel</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cargue de forma independiente la trama de atenciones de salud o el padrón de digitadores por punto de digitación
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveUploadTab('atenciones')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeUploadTab === 'atenciones'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>1. Atenciones Médicas (Trama SIS)</span>
          </button>

          <button
            onClick={() => setActiveUploadTab('digitadores')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeUploadTab === 'digitadores'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. Formato Excel Digitadores (Padrón)</span>
          </button>

          <button
            onClick={() => {
              setActiveUploadTab('directorio');
              refreshDigitadores();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeUploadTab === 'directorio'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>3. Directorio de Digitadores ({digitadoresList.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CARGA DE ATENCIONES MÉDICAS (TRAMA PRINCIPAL) */}
      {/* ========================================================================= */}
      {activeUploadTab === 'atenciones' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-blue-50/70 border border-blue-100 p-4 rounded-xl text-xs text-blue-900">
            <div className="flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Importación oficial de atenciones médicas individuales (FUAs, prestaciones y consultas).</span>
            </div>
            <button
              onClick={() => ExcelService.downloadSampleTemplate()}
              className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-100/50 font-bold flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Descargar Plantilla Atenciones (.xlsx)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Drop Zone */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors flex flex-col items-center justify-center text-center">
              <input
                type="file"
                ref={fileInputRefAtenciones}
                onChange={handleFileAtencionesChange}
                accept=".xlsx, .xls, .csv"
                className="hidden"
                id="excel-file-input-atenciones"
              />

              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-8 h-8" />
              </div>

              <label
                htmlFor="excel-file-input-atenciones"
                className="text-base font-extrabold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
              >
                {fileAtenciones ? fileAtenciones.name : 'Haga clic para seleccionar o arrastre el archivo de Atenciones'}
              </label>

              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Formatos compatibles: Microsoft Excel (.xlsx, .xls) y valores separados por comas (.csv).
              </p>

              <div className="mt-4 flex items-center space-x-3">
                <label
                  htmlFor="excel-file-input-atenciones"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
                >
                  Seleccionar Archivo
                </label>
                {fileAtenciones && (
                  <button
                    onClick={() => {
                      setFileAtenciones(null);
                      setParseResultAtenciones(null);
                      if (fileInputRefAtenciones.current) fileInputRefAtenciones.current.value = '';
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    title="Quitar archivo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Ingestion Settings Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Opciones de Ingesta
                </h3>

                <div className="space-y-3">
                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateExistingAtenciones}
                      onChange={e => setUpdateExistingAtenciones(e.target.checked)}
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

              {parseResultAtenciones && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-600">Estado:</span>
                    <span className={`font-bold font-mono ${parseResultAtenciones.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {parseResultAtenciones.success ? '✓ VÁLIDO' : '✗ ERRORES'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-600">Total Filas:</span>
                    <span className="font-mono font-bold text-slate-800">{parseResultAtenciones.totalRows}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Duplicados:</span>
                    <span className="font-mono font-bold text-amber-600">{parseResultAtenciones.duplicateCount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Errors Banner */}
          {parseResultAtenciones && parseResultAtenciones.errors.length > 0 && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center space-x-1.5 text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Observaciones en la validación:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto pl-1 font-mono text-[11px]">
                {parseResultAtenciones.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          {parseResultAtenciones && parseResultAtenciones.success && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Vista Previa de Atenciones ({parseResultAtenciones.data.length} registros)
                  </span>
                </div>

                <button
                  onClick={() => setConfirmModalOpen(true)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar y Guardar Atenciones</span>
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
                      <th className="py-2.5 px-3">Digitador</th>
                      <th className="py-2.5 px-3">Punto Digitación</th>
                      <th className="py-2.5 px-3 text-right">Tarifa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parseResultAtenciones.data.slice(0, 20).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-600">{row.nro_formato}</td>
                        <td className="py-2 px-3 font-mono">{row.fecha_atencion}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{row.beneficiario}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{row.doc_identidad}</td>
                        <td className="py-2 px-3 truncate max-w-[150px]">{row.nombre_eess}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{row.digitador}</td>
                        <td className="py-2 px-3 truncate max-w-[150px]">{row.punto_digitacion}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">S/ {Number(row.tarifa).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CARGA DE FORMATO EXCEL DE DIGITADORES (PADRÓN) */}
      {/* ========================================================================= */}
      {activeUploadTab === 'digitadores' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 p-5 rounded-2xl border border-emerald-800/40 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                <Users className="w-3 h-3" />
                <span>Nuevo Formato Excel: Maestro de Digitadores por Punto</span>
              </div>
              <h3 className="text-base font-extrabold text-white">Importar Catálogo / Padrón de Digitadores</h3>
              <p className="text-xs text-slate-300 max-w-xl">
                Cargue la tabla de digitadores con DNI, nombre completo, punto de digitación, establecimiento y datos de contacto para entrelazar con las atenciones.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => ExcelService.downloadDigitadoresTemplate()}
                className="px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-emerald-50 font-bold text-xs flex items-center space-x-1.5 shadow-md transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Descargar Plantilla Digitadores (.xlsx)</span>
              </button>

              {onNavigateToDigitadores && (
                <button
                  onClick={onNavigateToDigitadores}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md transition-colors cursor-pointer"
                >
                  <span>Ver Estadísticas</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Drop Zone */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border-2 border-dashed border-slate-300 hover:border-emerald-500 transition-colors flex flex-col items-center justify-center text-center">
              <input
                type="file"
                ref={fileInputRefDigitadores}
                onChange={handleFileDigitadoresChange}
                accept=".xlsx, .xls, .csv"
                className="hidden"
                id="excel-file-input-digitadores"
              />

              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Users className="w-8 h-8" />
              </div>

              <label
                htmlFor="excel-file-input-digitadores"
                className="text-base font-extrabold text-slate-900 cursor-pointer hover:text-emerald-600 transition-colors"
              >
                {fileDigitadores ? fileDigitadores.name : 'Haga clic para seleccionar o arrastre el archivo de Digitadores'}
              </label>

              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Columnas requeridas: <strong>nombre_completo</strong> (o digitador), <strong>punto_digitacion</strong>, <strong>dni</strong>, <strong>cargo</strong>, <strong>estado</strong>.
              </p>

              <div className="mt-4 flex items-center space-x-3">
                <label
                  htmlFor="excel-file-input-digitadores"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
                >
                  Seleccionar Archivo de Digitadores
                </label>
                {fileDigitadores && (
                  <button
                    onClick={() => {
                      setFileDigitadores(null);
                      setParseResultDigitadores(null);
                      if (fileInputRefDigitadores.current) fileInputRefDigitadores.current.value = '';
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    title="Quitar archivo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Structure info card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Entrelazamiento Automático</span>
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Al cargar este padrón, el sistema entrelazará de forma automática los nombres de los digitadores con todas las atenciones médicas registradas.
                </p>

                <div className="mt-4 space-y-1.5 text-[11px] text-slate-600 font-medium">
                  <div className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Vinculación por DNI y Nombre Completo</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Asignación a Punto de Digitación</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Generación de Ficha Estadística Individual en PDF</span>
                  </div>
                </div>
              </div>

              {parseResultDigitadores && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-emerald-800">Estado:</span>
                    <span className={`font-bold font-mono ${parseResultDigitadores.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {parseResultDigitadores.success ? '✓ VÁLIDO' : '✗ ERRORES'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-emerald-800">Digitadores Válidos:</span>
                    <span className="font-mono font-bold text-emerald-900">{parseResultDigitadores.data.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Errors Banner */}
          {parseResultDigitadores && parseResultDigitadores.errors.length > 0 && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center space-x-1.5 text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Observaciones en la validación de digitadores:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto pl-1 font-mono text-[11px]">
                {parseResultDigitadores.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table of Digitadores */}
          {parseResultDigitadores && parseResultDigitadores.success && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Vista Previa de Digitadores ({parseResultDigitadores.data.length} registros listos)
                  </span>
                </div>

                <button
                  onClick={() => setConfirmModalDigitadoresOpen(true)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar y Guardar en Padrón de Digitadores</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-white font-bold uppercase sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">DNI</th>
                      <th className="py-2.5 px-3">Nombre Completo</th>
                      <th className="py-2.5 px-3">Punto de Digitación</th>
                      <th className="py-2.5 px-3">Cód. Punto</th>
                      <th className="py-2.5 px-3">EESS Principal</th>
                      <th className="py-2.5 px-3">Cargo</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">Contacto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parseResultDigitadores.data.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{row.dni || 'S/D'}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{row.nombre_completo}</td>
                        <td className="py-2 px-3 text-slate-700 font-medium">{row.punto_digitacion}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{row.cod_punto_digitacion}</td>
                        <td className="py-2 px-3 text-slate-600 truncate max-w-[140px]">{row.nombre_eess || '—'}</td>
                        <td className="py-2 px-3 text-slate-600">{row.cargo || 'Digitador'}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {row.estado}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-500 font-mono">
                          {row.telefono || row.correo || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DIRECTORIO Y GESTIÓN DE DIGITADORES REGISTRADOS */}
      {/* ========================================================================= */}
      {activeUploadTab === 'directorio' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Padrón de Digitadores Activo en el Sistema ({digitadoresList.length} registrados)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tabla relacional para el entrelazamiento con las atenciones de salud de cada punto de digitación
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleOpenNewDigitadorModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Digitador Manualmente</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={dirSearchTerm}
              onChange={e => setDirSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, DNI, punto o EESS..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Directory Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 font-bold text-slate-700 text-[11px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">DNI</th>
                  <th className="py-2.5 px-3">Nombre del Digitador</th>
                  <th className="py-2.5 px-3">Punto de Digitación</th>
                  <th className="py-2.5 px-3">EESS Adscrito</th>
                  <th className="py-2.5 px-3">Cargo</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Contacto</th>
                  <th className="py-2.5 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDirectory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400">
                      No se encontraron digitadores en el padrón.
                    </td>
                  </tr>
                ) : (
                  filteredDirectory.map((dig, idx) => (
                    <tr key={dig.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{dig.dni || 'S/D'}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{dig.nombre_completo}</div>
                        {dig.fecha_creacion && (
                          <div className="text-[10px] text-slate-400 font-mono">Alta: {dig.fecha_creacion.substring(0, 10)}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800 block">{dig.punto_digitacion}</span>
                        <span className="text-[10px] font-mono text-slate-400">[{dig.cod_punto_digitacion}]</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-[140px]">{dig.nombre_eess || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{dig.cargo || 'Digitador'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          dig.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {dig.estado}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        <div>{dig.telefono || '—'}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{dig.correo}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleOpenEditDigitador(dig)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Editar digitador"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteDigitadorId(dig.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Eliminar del padrón"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Atenciones */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-extrabold text-slate-900">¿Confirmar Guardado de Atenciones?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Se ingresarán <strong className="text-slate-800">{parseResultAtenciones?.data.length}</strong> atenciones a la base de datos principal.
              {updateExistingAtenciones ? (
                <span className="block mt-1 text-blue-600 font-medium">
                  • Los formatos existentes serán actualizados.
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
                onClick={handleConfirmSaveAtenciones}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                Sí, Guardar Atenciones
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Digitadores */}
      {confirmModalDigitadoresOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">¿Confirmar Importación de Digitadores?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Se procesarán <strong className="text-slate-800">{parseResultDigitadores?.data.length}</strong> digitadores para integrarlos al padrón. Los registros existentes con el mismo DNI o nombre serán actualizados con la información más reciente.
            </p>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModalDigitadoresOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSaveDigitadores}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                Sí, Guardar en Padrón
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Digitador */}
      {(isNewDigitadorModal || editingDigitador) && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingDigitador ? 'Editar Digitador en Padrón' : 'Registrar Nuevo Digitador'}
              </h3>
              <button
                onClick={() => {
                  setIsNewDigitadorModal(false);
                  setEditingDigitador(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDigitadorForm} className="space-y-3.5 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">DNI del Digitador</label>
                  <input
                    type="text"
                    value={formDni}
                    onChange={e => setFormDni(e.target.value)}
                    placeholder="Ej. 45892134"
                    maxLength={10}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Estado</label>
                  <select
                    value={formEstado}
                    onChange={e => setFormEstado(e.target.value as 'ACTIVO' | 'INACTIVO')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nombre y Apellidos Completos *</label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  placeholder="Ej. Lic. Patricia Vega Salas"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cód. Punto Digitación</label>
                  <input
                    type="text"
                    value={formCodPunto}
                    onChange={e => setFormCodPunto(e.target.value)}
                    placeholder="Ej. PTO-DIG-01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Punto Digitación</label>
                  <input
                    type="text"
                    value={formPunto}
                    onChange={e => setFormPunto(e.target.value)}
                    placeholder="Ej. DIGITACIÓN SAN MARTÍN"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Establecimiento (EESS)</label>
                  <input
                    type="text"
                    value={formEess}
                    onChange={e => setFormEess(e.target.value)}
                    placeholder="Ej. C.S. SAN MARTIN DE PORRES"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cargo / Función</label>
                  <input
                    type="text"
                    value={formCargo}
                    onChange={e => setFormCargo(e.target.value)}
                    placeholder="Ej. Digitador Asistencial SIS"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono / Celular</label>
                  <input
                    type="text"
                    value={formTelefono}
                    onChange={e => setFormTelefono(e.target.value)}
                    placeholder="Ej. 984512367"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={formCorreo}
                    onChange={e => setFormCorreo(e.target.value)}
                    placeholder="Ej. digitador@minsa.gob.pe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewDigitadorModal(false);
                    setEditingDigitador(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {editingDigitador ? 'Guardar Cambios' : 'Registrar Digitador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Digitador Modal */}
      {deleteDigitadorId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">¿Eliminar Digitador del Padrón?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              El registro será removido de la tabla maestra de digitadores. Las atenciones históricas asociadas se mantendrán en la base de datos de salud.
            </p>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setDeleteDigitadorId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteDigitadorConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Period Modal */}
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
