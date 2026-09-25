/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ActiveModule, 
  Atencion, 
  FilterState, 
  User, 
  DistrictCoverage 
} from './types/health';
import { storageService } from './services/storageService';

// Layout & Global Components
import { Navbar } from './components/Navbar';
import { GlobalFilters } from './components/GlobalFilters';
import { LoginModal } from './components/LoginModal';

// Specific Modules
import { Dashboard } from './components/Dashboard';
import { AtencionesMesEess } from './components/Statistics/AtencionesMesEess';
import { AtencionesPuntoDigitacion } from './components/Statistics/AtencionesPuntoDigitacion';
import { AtencionesProfesional } from './components/Statistics/AtencionesProfesional';
import { AtencionesServicio } from './components/Statistics/AtencionesServicio';
import { AtencionesSexoEdad } from './components/Statistics/AtencionesSexoEdad';
import { AtencionesCondicionMaterna } from './components/Statistics/AtencionesCondicionMaterna';
import { AtencionesTipoAtencion } from './components/Statistics/AtencionesTipoAtencion';
import { AtencionesDisa } from './components/Statistics/AtencionesDisa';
import { AtencionesOportunidad } from './components/Statistics/AtencionesOportunidad';

import { ReporteGeneral } from './components/Reports/ReporteGeneral';
import { ReporteProductividad } from './components/Reports/ReporteProductividad';
import { ReporteCobertura } from './components/Reports/ReporteCobertura';

import { InteractiveMap } from './components/InteractiveMap';
import { ChartsGallery } from './components/ChartsGallery';
import { DataUpload } from './components/DataUpload';
import { UserManagement } from './components/UserManagement';
import { SystemDocumentation } from './components/SystemDocumentation';

import { CheckCircle2, AlertTriangle, AlertCircle, X, RotateCcw } from 'lucide-react';

export default function App() {
  const initialFilters: FilterState = {
    fechaInicio: '',
    fechaFin: '',
    eess: '',
    profesional: '',
    servicio: '',
    tipoProfesional: '',
    puntoDigitacion: '',
    disa: '',
    sexo: '',
    condicionMaterna: '',
    tipoAtencion: '',
  };

  const [currentUser, setCurrentUser] = useState<User | null>(() => storageService.getCurrentUser());
  const [currentModule, setCurrentModule] = useState<ActiveModule>('dashboard');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [atenciones, setAtenciones] = useState<Atencion[]>(() => storageService.getAtenciones());
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  // Global Filter State
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const reloadData = () => {
    setAtenciones(storageService.getAtenciones());
  };

  const handleResetData = () => {
    if (window.confirm('¿Desea restaurar la base de datos a los datos de prueba iniciales oficiales?')) {
      storageService.resetToDefaultData();
      reloadData();
      showToast('Base de datos restaurada a valores iniciales.', 'success');
    }
  };

  // Active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(Boolean).length;
  }, [filters]);

  // Filter application
  const filteredAtenciones = useMemo(() => {
    return atenciones.filter(a => {
      if (filters.fechaInicio && a.fecha_atencion < filters.fechaInicio) return false;
      if (filters.fechaFin && a.fecha_atencion > filters.fechaFin) return false;
      if (filters.eess && a.nombre_eess !== filters.eess) return false;
      if (filters.profesional && a.nombre_profesional !== filters.profesional) return false;
      if (filters.servicio && a.descripcion_servicio !== filters.servicio) return false;
      if (filters.tipoProfesional && a.tipo_profesional !== filters.tipoProfesional) return false;
      if (filters.disa && a.disa !== filters.disa) return false;
      if (filters.puntoDigitacion && a.punto_digitacion !== filters.puntoDigitacion) return false;
      if (filters.sexo && a.sexo !== filters.sexo) return false;
      if (filters.condicionMaterna && a.condicion_materna !== filters.condicionMaterna) return false;
      if (filters.tipoAtencion && a.tipo_atencion !== filters.tipoAtencion) return false;
      return true;
    });
  }, [atenciones, filters]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold animate-in slide-in-from-bottom-5 duration-200 bg-white">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
          <span className="text-slate-800">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        currentUser={currentUser}
        currentModule={currentModule}
        onNavigate={mod => setCurrentModule(mod as ActiveModule)}
        onOpenLogin={() => setLoginModalOpen(true)}
        onLogout={() => {
          storageService.setCurrentUser(null);
          setCurrentUser(null);
          showToast('Sesión cerrada correctamente.', 'warning');
        }}
        onOpenDoc={() => setCurrentModule('documentacion')}
        onToggleFilterBar={() => setIsFilterBarOpen(prev => !prev)}
        isFilterBarOpen={isFilterBarOpen}
        activeFilterCount={activeFilterCount}
        onRefreshData={reloadData}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Global Filters Component (collapsible panel with real-time feedback) */}
        {currentModule !== 'documentacion' && currentModule !== 'usuarios' && currentModule !== 'carga-datos' && (
          <GlobalFilters
            filters={filters}
            onFilterChange={setFilters}
            onReset={() => setFilters(initialFilters)}
            isOpen={isFilterBarOpen}
            onClose={() => setIsFilterBarOpen(false)}
            atenciones={atenciones}
            filteredCount={filteredAtenciones.length}
          />
        )}

        {/* Notice when filters hide all records */}
        {atenciones.length > 0 && filteredAtenciones.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-amber-800 font-medium">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>Los filtros aplicados no devuelven registros coincidentes (0 de {atenciones.length} atenciones).</span>
            </div>
            <button
              onClick={() => setFilters(initialFilters)}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              Restablecer Filtros
            </button>
          </div>
        )}

        {/* Notice when database has 0 records */}
        {atenciones.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Base de Datos Sin Atenciones Registradas</h3>
            <p className="text-xs text-slate-500 mt-2">
              No se han encontrado registros en el almacenamiento local. Puede cargar los datos de demostración o importar un archivo Excel oficial (.xlsx).
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  storageService.resetToDefaultData();
                  reloadData();
                  showToast('Se cargaron 180 atenciones oficiales de demostración.', 'success');
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Cargar Datos de Demostración
              </button>
              <button
                onClick={() => setCurrentModule('carga-datos')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Importar Archivo Excel
              </button>
            </div>
          </div>
        )}

        {/* Modules Routing */}
        {(currentModule === 'dashboard' || !currentModule) && (
          <Dashboard
            atenciones={filteredAtenciones}
            onNavigate={mod => setCurrentModule(mod as ActiveModule)}
            onRefresh={reloadData}
          />
        )}

        {(currentModule === 'stats-mes-eess' || currentModule === 'est-mes-eess') && (
          <AtencionesMesEess atenciones={filteredAtenciones} />
        )}

        {(currentModule === 'stats-punto-dig' || currentModule === 'est-punto') && (
          <AtencionesPuntoDigitacion
            atenciones={filteredAtenciones}
            initialPunto={filters.puntoDigitacion}
            onNavigateToOportunidad={() => setCurrentModule('stats-oportunidad')}
          />
        )}

        {(currentModule === 'stats-profesional' || currentModule === 'est-profesional') && (
          <AtencionesProfesional atenciones={filteredAtenciones} />
        )}

        {(currentModule === 'stats-servicio' || currentModule === 'est-servicio') && (
          <AtencionesServicio atenciones={filteredAtenciones} />
        )}

        {(currentModule === 'stats-sexo-edad' || currentModule === 'est-sexo-edad') && (
          <AtencionesSexoEdad atenciones={filteredAtenciones} />
        )}

        {(currentModule === 'stats-materna' || currentModule === 'est-materna') && (
          <AtencionesCondicionMaterna atenciones={filteredAtenciones} />
        )}

        {(currentModule === 'stats-tipo-atencion' || currentModule === 'est-tipo') && (
          <AtencionesTipoAtencion atenciones={filteredAtenciones} />
        )}

        {(currentModule === 'stats-disa' || currentModule === 'est-disa') && (
          <AtencionesDisa
            atenciones={filteredAtenciones}
            onNavigateToMap={() => setCurrentModule('mapa')}
          />
        )}

        {(currentModule === 'stats-oportunidad' || currentModule === 'est-oportunidad') && (
          <AtencionesOportunidad atenciones={filteredAtenciones} />
        )}

        {(currentModule === 'report-general' || currentModule === 'rep-general') && (
          <ReporteGeneral atenciones={filteredAtenciones} />
        )}

        {(currentModule === 'report-productividad' || currentModule === 'rep-productividad') && (
          <ReporteProductividad atenciones={filteredAtenciones} />
        )}

        {(currentModule === 'report-cobertura' || currentModule === 'rep-cobertura') && (
          <ReporteCobertura atenciones={filteredAtenciones} />
        )}

        {currentModule === 'mapa' && (
          <InteractiveMap />
        )}

        {currentModule === 'graficos' && (
          <ChartsGallery atenciones={filteredAtenciones} />
        )}

        {currentModule === 'carga-datos' && (
          <DataUpload
            currentUser={currentUser}
            onOpenLogin={() => setLoginModalOpen(true)}
            atenciones={atenciones}
            onDataModified={reloadData}
            onShowToast={showToast}
          />
        )}

        {currentModule === 'usuarios' && (
          <UserManagement
            currentUser={currentUser}
            onOpenLogin={() => setLoginModalOpen(true)}
            onShowToast={showToast}
          />
        )}

        {currentModule === 'documentacion' && (
          <SystemDocumentation />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">Sistema Web de Estadísticas de Salud</span>
            <span>•</span>
            <span>Plataforma de Gestión y Análisis Epidemiológico</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleResetData}
              className="text-slate-400 hover:text-slate-600 flex items-center space-x-1 cursor-pointer transition-colors"
              title="Restaurar base de datos a demo inicial"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer Demo</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setCurrentModule('documentacion')}
              className="text-blue-600 hover:underline font-semibold"
            >
              Manuales y Script SQL
            </button>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={user => {
          setCurrentUser(user);
          showToast(`Bienvenido al sistema, ${user.nombre_completo}.`, 'success');
        }}
      />
    </div>
  );
}
