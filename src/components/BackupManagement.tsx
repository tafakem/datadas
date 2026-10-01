import React, { useState, useEffect } from 'react';
import { 
  Database, 
  HardDrive, 
  ShieldAlert, 
  Download, 
  RotateCcw, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  FileCode, 
  FileSpreadsheet, 
  Plus, 
  Settings, 
  Lock, 
  RefreshCw, 
  AlertTriangle,
  Server,
  Calendar,
  Check,
  Info
} from 'lucide-react';
import { User, BackupRecord, BackupSettings } from '../types/health';
import { apiService } from '../services/apiService';

interface BackupManagementProps {
  currentUser: User | null;
  onOpenLogin: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning') => void;
  onDataModified: () => void;
}

export const BackupManagement: React.FC<BackupManagementProps> = ({
  currentUser,
  onOpenLogin,
  onShowToast,
  onDataModified
}) => {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [settings, setSettings] = useState<BackupSettings>({
    enabled: true,
    frequency: 'DIARIO',
    scheduled_time: '02:00',
    retention_count: 10,
  });
  const [dbHealth, setDbHealth] = useState<{
    totalAtenciones: number;
    engine: string;
    memoryHeapUsedMB?: number;
  }>({ totalAtenciones: 0, engine: 'SQLite 3' });

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringFilename, setRestoringFilename] = useState<string | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'sqlite' | 'json' | 'sql'>('sqlite');
  const [backupNote, setBackupNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Security Gate
  const isAdmin = currentUser?.rol === 'Administrador';

  const loadBackupData = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const [data, health] = await Promise.all([
        apiService.getBackups(),
        apiService.getHealth().catch(() => ({ totalAtenciones: 0, engine: 'SQLite 3' }))
      ]);
      setBackups(data.backups || []);
      if (data.settings) setSettings(data.settings);
      setDbHealth(health);
    } catch (err: any) {
      onShowToast(err.message || 'Error al cargar módulo de respaldos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackupData();
  }, [isAdmin]);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      const newBackup = await apiService.createBackup({
        format: selectedFormat,
        notes: backupNote.trim() || undefined,
        createdBy: currentUser?.username || 'Administrador'
      });
      onShowToast(`Respaldo "${newBackup.filename}" generado exitosamente.`, 'success');
      setBackupNote('');
      await loadBackupData();
    } catch (err: any) {
      onShowToast(err.message || 'Error al generar el respaldo', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoringFilename) return;
    try {
      setLoading(true);
      const result = await apiService.restoreBackup(restoringFilename, currentUser?.username || 'Administrador');
      onShowToast(result.message || 'Base de datos restaurada correctamente', 'success');
      setIsRestoreModalOpen(false);
      setRestoringFilename(null);
      onDataModified();
      await loadBackupData();
    } catch (err: any) {
      onShowToast(err.message || 'Error durante la restauración', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (id: string, filename: string) => {
    if (!window.confirm(`¿Está seguro de eliminar de forma permanente el respaldo "${filename}"?`)) return;
    try {
      await apiService.deleteBackup(id);
      onShowToast(`Respaldo "${filename}" eliminado del servidor.`, 'warning');
      await loadBackupData();
    } catch (err: any) {
      onShowToast('Error al eliminar respaldo', 'error');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const updated = await apiService.updateBackupSettings(settings);
      setSettings(updated);
      onShowToast('Programación de respaldos automáticos actualizada.', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Error al guardar configuración', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredBackups = backups.filter(b => 
    b.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.notes && b.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
    b.created_by.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBackupBytes = backups.reduce((acc, b) => acc + (b.size_bytes || 0), 0);

  // If NOT ADMIN, render Security Restriction Screen
  if (!isAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-2xl mx-auto shadow-sm my-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <span className="px-3 py-1 bg-rose-100 text-rose-800 text-[11px] font-bold uppercase tracking-wider rounded-full inline-block mb-3">
          Acceso Restringido
        </span>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Control de Respaldos de Copias de Seguridad</h2>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-md mx-auto">
          El módulo de copias de seguridad de la base de datos institucional está protegido por políticas de ciberseguridad. Solo los usuarios con el rol <strong className="text-slate-800">Administrador</strong> tienen permisos para crear, descargar o restaurar puntos de control.
        </p>

        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span>Usuario actual:</span>
            <span className="font-semibold text-slate-800">{currentUser ? currentUser.username : 'No autenticado'}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Rol en el sistema:</span>
            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {currentUser ? currentUser.rol : 'Sin sesión'}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onOpenLogin}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Iniciar Sesión como Administrador</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Database className="w-64 h-64 text-emerald-400" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 uppercase tracking-wider">
                Control de Administrador
              </span>
              <span className="text-xs text-slate-400 font-medium">• Motor SQLite en Producción</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
              <HardDrive className="w-7 h-7 text-emerald-400" />
              <span>Gestión y Control de Respaldos (Backups)</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Generación de respaldos nativos del motor de datos SQLite, resguardos en formato JSON y volcados de scripts SQL para protección ante eventualidades operativas o migraciones.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadBackupData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Refrescar estado"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <a
              href="/api/admin/backups/export-sql"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <FileCode className="w-4 h-4" />
              <span>Exportar Script SQL (.sql)</span>
            </a>
          </div>
        </div>

        {/* Dashboard Status Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Registros en Base de Datos</span>
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-black text-white mt-1">
              {dbHealth.totalAtenciones.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">Atenciones activas</span>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Respaldos Guardados</span>
              <HardDrive className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-black text-white mt-1">
              {backups.length}
            </div>
            <span className="text-[10px] text-blue-300 font-mono">
              Total {formatFileSize(totalBackupBytes)}
            </span>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Modo Base de Datos</span>
              <Server className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm font-extrabold text-white mt-1 truncate">
              WAL / Memory Mapped
            </div>
            <span className="text-[10px] text-slate-400 font-mono">B-Tree Auto Indexing</span>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Respaldo Automático</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-extrabold text-white mt-1 flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${settings.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
              <span>{settings.enabled ? settings.frequency : 'Inactivo'}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Hora: {settings.scheduled_time} HRS</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Create Backup & Automated Scheduler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel 1: Generar Copia de Seguridad Manual */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Crear Punto de Control (Backup Manual)</h2>
              <p className="text-xs text-slate-500">Seleccione el formato del archivo de respaldo que desea generar</p>
            </div>
          </div>

          {/* Format selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSelectedFormat('sqlite')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedFormat === 'sqlite'
                  ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Database className={`w-5 h-5 ${selectedFormat === 'sqlite' ? 'text-emerald-600' : 'text-slate-500'}`} />
                {selectedFormat === 'sqlite' && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <div className="font-bold text-xs text-slate-900">Binario Nativo (.sqlite)</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Copia física rápida de la base de datos completa. Restauración inmediata.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat('json')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedFormat === 'json'
                  ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <FileSpreadsheet className={`w-5 h-5 ${selectedFormat === 'json' ? 'text-blue-600' : 'text-slate-500'}`} />
                {selectedFormat === 'json' && <Check className="w-4 h-4 text-blue-600" />}
              </div>
              <div className="font-bold text-xs text-slate-900">Estructura JSON (.json)</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Exportación de registros y tablas en formato JSON legibles para auditorías.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat('sql')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedFormat === 'sql'
                  ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <FileCode className={`w-5 h-5 ${selectedFormat === 'sql' ? 'text-purple-600' : 'text-slate-500'}`} />
                {selectedFormat === 'sql' && <Check className="w-4 h-4 text-purple-600" />}
              </div>
              <div className="font-bold text-xs text-slate-900">Script SQL Dump (.sql)</div>
              <p className="text-[11px] text-slate-500 mt-1">
                Comandos SQL `INSERT INTO` compatibles con motores externos o migración.
              </p>
            </button>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nota u Observación del Respaldo (Opcional):
            </label>
            <input
              type="text"
              value={backupNote}
              onChange={e => setBackupNote(e.target.value)}
              placeholder="Ej. Respaldo previo a cierre de mes de atenciones FUAs"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {creating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generando Respaldo...</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4" />
                  <span>Generar Respaldo Ahora ({selectedFormat.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Panel 2: Configuración de Programación Automática */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Programación Automática</h2>
              <p className="text-xs text-slate-500">Política de respaldos periódicos</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {/* Toggle Enable */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="font-semibold text-slate-800">Activar respaldos automáticos:</span>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={e => setSettings({ ...settings, enabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Frecuencia de Ejecución:</label>
              <select
                value={settings.frequency}
                onChange={e => setSettings({ ...settings, frequency: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DIARIO">Diario (Todos los días a la hora fijada)</option>
                <option value="SEMANAL">Semanal (Todos los domingos)</option>
                <option value="MENSUAL">Mensual (1ro de cada mes)</option>
              </select>
            </div>

            {/* Time */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hora de Ejecución Programada:</label>
              <input
                type="time"
                value={settings.scheduled_time}
                onChange={e => setSettings({ ...settings, scheduled_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Retention */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Límite de Retención de Archivos:</label>
              <select
                value={settings.retention_count}
                onChange={e => setSettings({ ...settings, retention_count: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>Conservar últimos 5 respaldos</option>
                <option value={10}>Conservar últimos 10 respaldos (Recomendado)</option>
                <option value={20}>Conservar últimos 20 respaldos</option>
                <option value={50}>Conservar últimos 50 respaldos</option>
              </select>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              <span>Guardar Configuración</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table: Historial de Respaldos Almacenados */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Historial de Copias de Seguridad Almacenadas</h2>
              <p className="text-xs text-slate-500">Puntos de control disponibles para descarga o restauración</p>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Buscar por nombre o nota..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {filteredBackups.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <HardDrive className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p>No se encontraron respaldos registrados en el servidor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Archivo de Respaldo</th>
                  <th className="py-3 px-3">Formato</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Registros</th>
                  <th className="py-3 px-3">Tamaño</th>
                  <th className="py-3 px-3">Fecha de Creación</th>
                  <th className="py-3 px-3">Usuario</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredBackups.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <div className="flex items-center space-x-2">
                        {b.format === 'sqlite' && <Database className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                        {b.format === 'json' && <FileSpreadsheet className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                        {b.format === 'sql' && <FileCode className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                        <div>
                          <span className="font-mono text-xs">{b.filename}</span>
                          {b.notes && (
                            <p className="text-[10px] text-slate-400 font-sans">{b.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                        b.format === 'sqlite' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        b.format === 'json' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        .{b.format}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.type === 'AUTOMATICO' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {b.type}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {b.total_records.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {formatFileSize(b.size_bytes)}
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(b.created_at).toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-slate-600 font-semibold">
                      {b.created_by}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {/* Download button */}
                        <a
                          href={`/api/admin/backups/download/${b.filename}`}
                          download={b.filename}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 transition-colors cursor-pointer"
                          title="Descargar archivo a la computadora"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        {/* Restore button */}
                        {b.format !== 'sql' && (
                          <button
                            onClick={() => {
                              setRestoringFilename(b.filename);
                              setIsRestoreModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 transition-colors cursor-pointer"
                            title="Restaurar base de datos a este punto de control"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteBackup(b.id, b.filename)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition-colors cursor-pointer"
                          title="Eliminar archivo del servidor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Restoration */}
      {isRestoreModalOpen && restoringFilename && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Confirmar Restauración de Base de Datos</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Está a punto de restaurar la base de datos desde el archivo de respaldo:
              </p>
              <div className="mt-2 font-mono font-bold text-xs bg-slate-100 text-slate-800 p-2 rounded-xl border border-slate-200">
                {restoringFilename}
              </div>
              <p className="text-[11px] text-amber-700 mt-2 font-medium bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-left">
                ⚠️ <strong>Atención:</strong> Esta acción sobrescribirá los datos actuales de atenciones con el estado exacto registrado en la copia de seguridad. Las cuentas de usuario se conservarán de forma segura.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => {
                  setIsRestoreModalOpen(false);
                  setRestoringFilename(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>Restaurar Ahora</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
