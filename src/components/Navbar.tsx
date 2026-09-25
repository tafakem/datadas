import React, { useState } from 'react';
import { 
  Activity, 
  BarChart3, 
  FileText, 
  Map as MapIcon, 
  PieChart, 
  UploadCloud, 
  Users, 
  BookOpen, 
  LogIn, 
  LogOut, 
  Menu, 
  X, 
  ChevronDown, 
  Filter,
  RefreshCw,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { User } from '../types/health';

interface NavbarProps {
  currentModule: string;
  onNavigate: (module: string) => void;
  currentUser: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenDoc: () => void;
  onToggleFilterBar: () => void;
  isFilterBarOpen: boolean;
  activeFilterCount: number;
  onRefreshData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentModule,
  onNavigate,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenDoc,
  onToggleFilterBar,
  isFilterBarOpen,
  activeFilterCount,
  onRefreshData
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statsDropdownOpen, setStatsDropdownOpen] = useState(false);
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false);

  const handleNavClick = (mod: string) => {
    onNavigate(mod);
    setMobileMenuOpen(false);
    setStatsDropdownOpen(false);
    setReportsDropdownOpen(false);
  };

  const isStatsActive = currentModule.startsWith('stats-') || currentModule.startsWith('est-');
  const isReportsActive = currentModule.startsWith('report-') || currentModule.startsWith('rep-');

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-lg">
      {/* Top micro bar with institution brand */}
      <div className="bg-blue-950/70 border-b border-blue-900/40 px-4 py-1 text-xs flex justify-between items-center text-slate-300">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium tracking-wide">MINISTERIO DE SALUD • SISTEMA INTEGRADO DE ESTADÍSTICAS</span>
        </div>
        <div className="hidden sm:flex items-center space-x-4">
          <span className="text-slate-400">Versión 2.5 • Producción</span>
          <button 
            onClick={onOpenDoc}
            className="hover:text-emerald-400 flex items-center space-x-1 transition-colors cursor-pointer text-slate-300"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Documentación & Entregables</span>
          </button>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Main Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNavClick('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-emerald-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-base sm:text-lg tracking-tight flex items-center space-x-1.5 leading-none">
                <span className="text-white">Estadísticas</span>
                <span className="text-emerald-400">Salud</span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wider font-medium">GESTIÓN DE ATENCIONES</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {/* Inicio */}
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
                currentModule === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>Inicio</span>
            </button>

            {/* Submenú Estadísticas */}
            <div className="relative">
              <button
                onClick={() => {
                  setStatsDropdownOpen(!statsDropdownOpen);
                  setReportsDropdownOpen(false);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
                  isStatsActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Estadísticas</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {statsDropdownOpen && (
                <div 
                  className="absolute left-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseLeave={() => setStatsDropdownOpen(false)}
                >
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    Módulos Estadísticos
                  </div>
                  <button onClick={() => handleNavClick('stats-mes-eess')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white flex items-center justify-between">
                    <span>B.1. Por Mes y EESS</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-white">Matriz</span>
                  </button>
                  <button onClick={() => handleNavClick('stats-punto-dig')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white flex items-center justify-between">
                    <span>B.2. Por Punto de Digitación</span>
                    <span className="text-[10px] text-slate-400">Ranking</span>
                  </button>
                  <button onClick={() => handleNavClick('stats-profesional')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white flex items-center justify-between">
                    <span>B.3. Por Profesional</span>
                    <span className="text-[10px] text-slate-400">Top 10</span>
                  </button>
                  <button onClick={() => handleNavClick('stats-servicio')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white flex items-center justify-between">
                    <span>B.4. Por Servicio</span>
                    <span className="text-[10px] text-slate-400">Distribución</span>
                  </button>
                  <button onClick={() => handleNavClick('stats-sexo-edad')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white flex items-center justify-between">
                    <span>B.5. Por Sexo y Edad</span>
                    <span className="text-[10px] text-slate-400">Pirámide</span>
                  </button>
                  <button onClick={() => handleNavClick('stats-materna')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white flex items-center justify-between">
                    <span>B.6. Por Condición Materna</span>
                    <span className="text-[10px] text-slate-400">Gestantes</span>
                  </button>
                  <button onClick={() => handleNavClick('stats-tipo-atencion')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white flex items-center justify-between">
                    <span>B.7. Por Tipo de Atención</span>
                    <span className="text-[10px] text-slate-400">Intra/Extramural</span>
                  </button>
                  <button onClick={() => handleNavClick('stats-disa')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white flex items-center justify-between">
                    <span>B.8. Por DISA / Región</span>
                    <span className="text-[10px] text-slate-400">Regional</span>
                  </button>
                  <button onClick={() => handleNavClick('stats-oportunidad')} className="w-full text-left px-3 py-2 text-xs text-emerald-300 font-semibold hover:bg-emerald-600 hover:text-white flex items-center justify-between border-t border-slate-800">
                    <span>B.9. Oportunidad (0-10d, 11-29d, ≥30d)</span>
                    <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700/60 font-mono">Días Atención-Registro</span>
                  </button>
                </div>
              )}
            </div>

            {/* Submenú Reportes */}
            <div className="relative">
              <button
                onClick={() => {
                  setReportsDropdownOpen(!reportsDropdownOpen);
                  setStatsDropdownOpen(false);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
                  isReportsActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Reportes</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {reportsDropdownOpen && (
                <div 
                  className="absolute left-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onMouseLeave={() => setReportsDropdownOpen(false)}
                >
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    Informes Oficiales
                  </div>
                  <button onClick={() => handleNavClick('report-general')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white flex items-center justify-between">
                    <span>C.1. Reporte General</span>
                    <span className="text-[10px] text-slate-400">PDF / Excel</span>
                  </button>
                  <button onClick={() => handleNavClick('report-productividad')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white flex items-center justify-between">
                    <span>C.2. Reporte de Productividad</span>
                    <span className="text-[10px] text-slate-400">Rendimiento</span>
                  </button>
                  <button onClick={() => handleNavClick('report-cobertura')} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white flex items-center justify-between">
                    <span>C.3. Reporte de Cobertura</span>
                    <span className="text-[10px] text-slate-400">Semáforo</span>
                  </button>
                </div>
              )}
            </div>

            {/* D. Mapa */}
            <button
              onClick={() => handleNavClick('mapa')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
                currentModule === 'mapa'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <MapIcon className="w-4 h-4 text-emerald-400" />
              <span>Mapa</span>
            </button>

            {/* E. Gráficos */}
            <button
              onClick={() => handleNavClick('graficos')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
                currentModule === 'graficos'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <PieChart className="w-4 h-4 text-emerald-400" />
              <span>Gráficos</span>
            </button>

            {/* F. Carga de Datos */}
            <button
              onClick={() => handleNavClick('carga-datos')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
                currentModule === 'carga-datos'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              <span>Carga Excel</span>
              {!currentUser && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" title="Requiere iniciar sesión"></span>
              )}
            </button>

            {/* G. Usuarios (Admin) */}
            {currentUser?.rol === 'Administrador' && (
              <button
                onClick={() => handleNavClick('usuarios')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
                  currentModule === 'usuarios'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Usuarios</span>
              </button>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2">
            
            {/* Toggle Filters Button */}
            <button
              onClick={onToggleFilterBar}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 border transition-colors ${
                isFilterBarOpen
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
              title="Filtros Globales del Sistema"
            >
              <Filter className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-bold rounded-full text-[10px]">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Quick Refresh */}
            <button
              onClick={onRefreshData}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Refrescar datos del sistema"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* User Auth Info / Login */}
            {currentUser ? (
              <div className="flex items-center pl-2 space-x-2 border-l border-slate-700">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight flex items-center justify-end space-x-1">
                    <UserCheck className="w-3 h-3 text-emerald-400" />
                    <span>{currentUser.username}</span>
                  </div>
                  <span className="text-[10px] text-blue-300 font-mono bg-blue-900/60 px-1 rounded">
                    {currentUser.rol}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 border border-slate-700 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Acceder</span>
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold ${
              currentModule === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Inicio (Dashboard)
          </button>
          
          <div className="pt-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3">
            Estadísticas
          </div>
          <div className="grid grid-cols-2 gap-1 px-1">
            <button onClick={() => handleNavClick('stats-mes-eess')} className="text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800">B.1 Mes y EESS</button>
            <button onClick={() => handleNavClick('stats-punto-dig')} className="text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800">B.2 Punto Digitación</button>
            <button onClick={() => handleNavClick('stats-profesional')} className="text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800">B.3 Profesional</button>
            <button onClick={() => handleNavClick('stats-servicio')} className="text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800">B.4 Servicio</button>
            <button onClick={() => handleNavClick('stats-sexo-edad')} className="text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800">B.5 Sexo y Edad</button>
            <button onClick={() => handleNavClick('stats-materna')} className="text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800">B.6 Condición Materna</button>
            <button onClick={() => handleNavClick('stats-tipo-atencion')} className="text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800">B.7 Tipo Atención</button>
            <button onClick={() => handleNavClick('stats-disa')} className="text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800">B.8 DISA / Región</button>
            <button onClick={() => handleNavClick('stats-oportunidad')} className="col-span-2 text-left px-2 py-1.5 rounded text-xs text-emerald-300 font-bold bg-emerald-950/40 border border-emerald-800/40 hover:bg-slate-800">B.9 Oportunidad (0-10d / 11-29d / ≥30d)</button>
          </div>

          <div className="pt-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3">
            Reportes
          </div>
          <div className="grid grid-cols-1 gap-1 px-1">
            <button onClick={() => handleNavClick('report-general')} className="text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800">C.1 Reporte General (PDF / Excel)</button>
            <button onClick={() => handleNavClick('report-productividad')} className="text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800">C.2 Reporte de Productividad</button>
            <button onClick={() => handleNavClick('report-cobertura')} className="text-left px-2 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800">C.3 Reporte de Cobertura</button>
          </div>

          <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-1">
            <button onClick={() => handleNavClick('mapa')} className="text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800">D. Mapa</button>
            <button onClick={() => handleNavClick('graficos')} className="text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800">E. Gráficos</button>
            <button onClick={() => handleNavClick('carga-datos')} className="text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800">F. Carga Excel</button>
            {currentUser?.rol === 'Administrador' && (
              <button onClick={() => handleNavClick('usuarios')} className="text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800">G. Usuarios</button>
            )}
            <button onClick={onOpenDoc} className="text-left px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-slate-800">Documentación & SQL</button>
          </div>
        </div>
      )}
    </header>
  );
};
