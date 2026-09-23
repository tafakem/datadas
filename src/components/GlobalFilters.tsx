import React from 'react';
import { Filter, RotateCcw, X, Search, Calendar, Building2, User, Stethoscope, MapPin } from 'lucide-react';
import { FilterState, Atencion } from '../types/health';

interface GlobalFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  isOpen: boolean;
  onClose: () => void;
  atenciones: Atencion[];
  filteredCount: number;
}

export const GlobalFilters: React.FC<GlobalFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  isOpen,
  onClose,
  atenciones,
  filteredCount,
}) => {
  if (!isOpen) return null;

  // Extract unique options dynamically from current dataset
  const eessOptions = Array.from(new Set(atenciones.map(a => a.nombre_eess))).sort();
  const profOptions = Array.from(new Set(atenciones.map(a => a.nombre_profesional))).sort();
  const servOptions = Array.from(new Set(atenciones.map(a => a.descripcion_servicio))).sort();
  const tipoProfOptions = Array.from(new Set(atenciones.map(a => a.tipo_profesional))).sort();
  const puntoDigOptions = Array.from(new Set(atenciones.map(a => a.punto_digitacion))).sort();
  const disaOptions = Array.from(new Set(atenciones.map(a => a.disa))).sort();

  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters = Object.values(filters).some(val => val !== '');

  return (
    <div className="bg-slate-900 border-b border-blue-900/60 shadow-xl py-4 px-4 sm:px-6 animate-in slide-in-from-top-4 duration-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              Filtros Globales de Consulta
            </span>
            <span className="text-xs text-slate-400 ml-2">
              (Afecta a todos los módulos y gráficos en tiempo real)
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-slate-800 px-3 py-1 rounded-full text-xs text-slate-300 border border-slate-700">
              Registros coincidentes:{' '}
              <strong className="text-emerald-400 font-mono text-sm">{filteredCount}</strong> de{' '}
              <span className="font-mono">{atenciones.length}</span>
            </div>

            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-800/60 transition-colors"
                title="Limpiar todos los filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Cerrar panel de filtros"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
          
          {/* Fecha Inicio */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-blue-400" />
              <span>Fecha Inicio</span>
            </label>
            <input
              type="date"
              value={filters.fechaInicio}
              onChange={e => handleChange('fechaInicio', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-blue-400" />
              <span>Fecha Fin</span>
            </label>
            <input
              type="date"
              value={filters.fechaFin}
              onChange={e => handleChange('fechaFin', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* EESS (Establecimiento de Salud) */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center space-x-1">
              <Building2 className="w-3 h-3 text-blue-400" />
              <span>Establecimiento (EESS)</span>
            </label>
            <select
              value={filters.eess}
              onChange={e => handleChange('eess', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 truncate"
            >
              <option value="">Todos los EESS</option>
              {eessOptions.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Profesional de Salud */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center space-x-1">
              <User className="w-3 h-3 text-blue-400" />
              <span>Profesional</span>
            </label>
            <select
              value={filters.profesional}
              onChange={e => handleChange('profesional', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 truncate"
            >
              <option value="">Todos los profesionales</option>
              {profOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Tipo de Profesional */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center space-x-1">
              <Stethoscope className="w-3 h-3 text-blue-400" />
              <span>Tipo Profesional</span>
            </label>
            <select
              value={filters.tipoProfesional}
              onChange={e => handleChange('tipoProfesional', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos los tipos</option>
              {tipoProfOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Servicio */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center space-x-1">
              <Search className="w-3 h-3 text-blue-400" />
              <span>Servicio de Salud</span>
            </label>
            <select
              value={filters.servicio}
              onChange={e => handleChange('servicio', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 truncate"
            >
              <option value="">Todos los servicios</option>
              {servOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* DISA / Región */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center space-x-1">
              <MapPin className="w-3 h-3 text-blue-400" />
              <span>DISA / Región</span>
            </label>
            <select
              value={filters.disa}
              onChange={e => handleChange('disa', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">Todas las regiones</option>
              {disaOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Punto de Digitación */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center space-x-1">
              <Building2 className="w-3 h-3 text-blue-400" />
              <span>Punto Digitación</span>
            </label>
            <select
              value={filters.puntoDigitacion}
              onChange={e => handleChange('puntoDigitacion', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 truncate"
            >
              <option value="">Todos los puntos</option>
              {puntoDigOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Sexo */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Sexo</label>
            <select
              value={filters.sexo}
              onChange={e => handleChange('sexo', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">Ambos sexos</option>
              <option value="MASCULINO">MASCULINO</option>
              <option value="FEMENINO">FEMENINO</option>
            </select>
          </div>

          {/* Condición Materna */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Condición Materna</label>
            <select
              value={filters.condicionMaterna}
              onChange={e => handleChange('condicionMaterna', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">Todas las condiciones</option>
              <option value="GESTANTE">GESTANTE</option>
              <option value="PUERPERA">PUERPERA</option>
              <option value="NO GESTANTE">NO GESTANTE</option>
            </select>
          </div>

          {/* Tipo de Atención */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Tipo de Atención</label>
            <select
              value={filters.tipoAtencion}
              onChange={e => handleChange('tipoAtencion', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="AMBULATORIO">AMBULATORIO</option>
              <option value="HOSPITALIZADO">HOSPITALIZADO</option>
              <option value="EMERGENCIA">EMERGENCIA</option>
            </select>
          </div>

        </div>
      </div>
    </div>
  );
};
