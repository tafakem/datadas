import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Building2,
  Calendar,
  Layers,
  Download,
  Filter,
  Search,
  ArrowUpDown,
  TrendingUp,
  FileSpreadsheet,
  Check,
  ChevronRight,
  Info,
  User,
} from 'lucide-react';
import { Atencion } from '../../types/health';

interface Props {
  atenciones: Atencion[];
}

export type RangoOportunidad = 'TODOS' | '0-10' | '11-29' | '30+';

// Helper to calculate days difference between fecha_atencion and fecha_registro
export const getDiasDiferencia = (
  fechaAtencion: string | undefined,
  fechaRegistro: string | undefined
): number | null => {
  if (!fechaAtencion || !fechaRegistro) return null;
  try {
    const dAtencion = new Date(fechaAtencion.substring(0, 10));
    const dRegistro = new Date(fechaRegistro.substring(0, 10));
    if (isNaN(dAtencion.getTime()) || isNaN(dRegistro.getTime())) return null;
    const diffTime = dRegistro.getTime() - dAtencion.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  } catch {
    return null;
  }
};

export const getRangoInfo = (dias: number | null): {
  id: '0-10' | '11-29' | '30+' | 'SIN_DATOS';
  label: string;
  badgeClass: string;
  bgLight: string;
  borderClass: string;
  textClass: string;
  estado: string;
} => {
  if (dias === null) {
    return {
      id: 'SIN_DATOS',
      label: 'Sin Datos',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      bgLight: 'bg-slate-50',
      borderClass: 'border-slate-200',
      textClass: 'text-slate-600',
      estado: 'Fecha Incompleta',
    };
  }
  if (dias <= 10) {
    return {
      id: '0-10',
      label: '0 a 10 días',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      bgLight: 'bg-emerald-50/60',
      borderClass: 'border-emerald-200',
      textClass: 'text-emerald-700',
      estado: 'Oportuno (En Plazo)',
    };
  }
  if (dias <= 29) {
    return {
      id: '11-29',
      label: '11 a 29 días',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      bgLight: 'bg-amber-50/60',
      borderClass: 'border-amber-200',
      textClass: 'text-amber-700',
      estado: 'Con Demora (Observado)',
    };
  }
  return {
    id: '30+',
    label: '30 días a más',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    bgLight: 'bg-rose-50/60',
    borderClass: 'border-rose-200',
    textClass: 'text-rose-700',
    estado: 'Extemporáneo (Rezagado)',
  };
};

export const AtencionesOportunidad: React.FC<Props> = ({ atenciones }) => {
  const [selectedRango, setSelectedRango] = useState<RangoOportunidad>('TODOS');
  const [selectedPunto, setSelectedPunto] = useState<string>('TODOS');
  const [selectedEess, setSelectedEess] = useState<string>('TODOS');
  const [activeTab, setActiveTab] = useState<'puntos' | 'eess' | 'meses' | 'detalle'>('puntos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  // List of unique puntos and eess for dropdowns
  const uniquePuntos = useMemo(() => {
    return Array.from(new Set(atenciones.map(a => a.punto_digitacion || 'SIN PUNTO'))).sort();
  }, [atenciones]);

  const uniqueEess = useMemo(() => {
    return Array.from(new Set(atenciones.map(a => a.nombre_eess))).sort();
  }, [atenciones]);

  // Overall Global Opportunity Stats
  const globalOpportunity = useMemo(() => {
    let count0_10 = 0;
    let count11_29 = 0;
    let count30_mas = 0;
    let sinDatos = 0;
    let sumDays = 0;
    let validDaysCount = 0;

    atenciones.forEach(a => {
      const dias = getDiasDiferencia(a.fecha_atencion, a.fecha_registro);
      if (dias === null) {
        sinDatos++;
      } else {
        sumDays += dias;
        validDaysCount++;
        if (dias <= 10) count0_10++;
        else if (dias <= 29) count11_29++;
        else count30_mas++;
      }
    });

    const total = atenciones.length || 1;
    const avgDays = validDaysCount > 0 ? Math.round((sumDays / validDaysCount) * 10) / 10 : 0;

    return {
      total: atenciones.length,
      count0_10,
      pct0_10: Math.round((count0_10 / total) * 1000) / 10,
      count11_29,
      pct11_29: Math.round((count11_29 / total) * 1000) / 10,
      count30_mas,
      pct30_mas: Math.round((count30_mas / total) * 1000) / 10,
      sinDatos,
      avgDays,
    };
  }, [atenciones]);

  // 1. Group by Punto de Digitación
  const dataByPunto = useMemo(() => {
    const map: Record<
      string,
      {
        nombre: string;
        cod: string;
        total: number;
        c0_10: number;
        c11_29: number;
        c30_mas: number;
        diasList: number[];
      }
    > = {};

    atenciones.forEach(a => {
      const key = (a.punto_digitacion || 'SIN PUNTO').trim();
      if (!map[key]) {
        map[key] = {
          nombre: key,
          cod: a.cod_punto_digitacion || 'S/C',
          total: 0,
          c0_10: 0,
          c11_29: 0,
          c30_mas: 0,
          diasList: [],
        };
      }
      map[key].total++;
      const dias = getDiasDiferencia(a.fecha_atencion, a.fecha_registro);
      if (dias !== null) {
        map[key].diasList.push(dias);
        if (dias <= 10) map[key].c0_10++;
        else if (dias <= 29) map[key].c11_29++;
        else map[key].c30_mas++;
      }
    });

    return Object.values(map)
      .map(p => {
        const avg = p.diasList.length > 0
          ? Math.round((p.diasList.reduce((acc, d) => acc + d, 0) / p.diasList.length) * 10) / 10
          : 0;
        const pct0_10 = p.total > 0 ? Math.round((p.c0_10 / p.total) * 1000) / 10 : 0;
        const pct11_29 = p.total > 0 ? Math.round((p.c11_29 / p.total) * 1000) / 10 : 0;
        const pct30_mas = p.total > 0 ? Math.round((p.c30_mas / p.total) * 1000) / 10 : 0;

        return {
          ...p,
          avg,
          pct0_10,
          pct11_29,
          pct30_mas,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [atenciones]);

  // 2. Group by Establecimiento (EESS)
  const dataByEess = useMemo(() => {
    const map: Record<
      string,
      {
        nombre: string;
        cod: string;
        punto: string;
        total: number;
        c0_10: number;
        c11_29: number;
        c30_mas: number;
        diasList: number[];
      }
    > = {};

    atenciones.forEach(a => {
      const key = a.nombre_eess;
      if (!map[key]) {
        map[key] = {
          nombre: key,
          cod: a.codigo_eess,
          punto: a.punto_digitacion,
          total: 0,
          c0_10: 0,
          c11_29: 0,
          c30_mas: 0,
          diasList: [],
        };
      }
      map[key].total++;
      const dias = getDiasDiferencia(a.fecha_atencion, a.fecha_registro);
      if (dias !== null) {
        map[key].diasList.push(dias);
        if (dias <= 10) map[key].c0_10++;
        else if (dias <= 29) map[key].c11_29++;
        else map[key].c30_mas++;
      }
    });

    return Object.values(map)
      .map(e => {
        const avg = e.diasList.length > 0
          ? Math.round((e.diasList.reduce((acc, d) => acc + d, 0) / e.diasList.length) * 10) / 10
          : 0;
        const pct0_10 = e.total > 0 ? Math.round((e.c0_10 / e.total) * 1000) / 10 : 0;
        const pct11_29 = e.total > 0 ? Math.round((e.c11_29 / e.total) * 1000) / 10 : 0;
        const pct30_mas = e.total > 0 ? Math.round((e.c30_mas / e.total) * 1000) / 10 : 0;

        return {
          ...e,
          avg,
          pct0_10,
          pct11_29,
          pct30_mas,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [atenciones]);

  // 3. Group by Mes de Atención / Mes de Digitación
  const dataByMes = useMemo(() => {
    const map: Record<
      string,
      {
        mes: string;
        total: number;
        c0_10: number;
        c11_29: number;
        c30_mas: number;
        diasList: number[];
      }
    > = {};

    atenciones.forEach(a => {
      const mes = a.fecha_atencion.substring(0, 7); // YYYY-MM
      if (!map[mes]) {
        map[mes] = {
          mes,
          total: 0,
          c0_10: 0,
          c11_29: 0,
          c30_mas: 0,
          diasList: [],
        };
      }
      map[mes].total++;
      const dias = getDiasDiferencia(a.fecha_atencion, a.fecha_registro);
      if (dias !== null) {
        map[mes].diasList.push(dias);
        if (dias <= 10) map[mes].c0_10++;
        else if (dias <= 29) map[mes].c11_29++;
        else map[mes].c30_mas++;
      }
    });

    return Object.values(map)
      .map(m => {
        const avg = m.diasList.length > 0
          ? Math.round((m.diasList.reduce((acc, d) => acc + d, 0) / m.diasList.length) * 10) / 10
          : 0;
        const pct0_10 = m.total > 0 ? Math.round((m.c0_10 / m.total) * 1000) / 10 : 0;
        const pct11_29 = m.total > 0 ? Math.round((m.c11_29 / m.total) * 1000) / 10 : 0;
        const pct30_mas = m.total > 0 ? Math.round((m.c30_mas / m.total) * 1000) / 10 : 0;

        return {
          ...m,
          avg,
          pct0_10,
          pct11_29,
          pct30_mas,
        };
      })
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [atenciones]);

  // Filtered detailed list
  const filteredList = useMemo(() => {
    return atenciones.filter(a => {
      const dias = getDiasDiferencia(a.fecha_atencion, a.fecha_registro);

      // Filter by range
      if (selectedRango === '0-10' && (dias === null || dias > 10)) return false;
      if (selectedRango === '11-29' && (dias === null || dias < 11 || dias > 29)) return false;
      if (selectedRango === '30+' && (dias === null || dias < 30)) return false;

      // Filter by punto
      if (selectedPunto !== 'TODOS' && a.punto_digitacion !== selectedPunto) return false;

      // Filter by eess
      if (selectedEess !== 'TODOS' && a.nombre_eess !== selectedEess) return false;

      // Filter by search text
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchFormato = a.nro_formato.toLowerCase().includes(term);
        const matchEess = a.nombre_eess.toLowerCase().includes(term);
        const matchProf = a.nombre_profesional.toLowerCase().includes(term);
        const matchDig = a.digitador.toLowerCase().includes(term);
        const matchPunto = a.punto_digitacion.toLowerCase().includes(term);
        const matchDoc = a.doc_identidad.toLowerCase().includes(term);
        if (!matchFormato && !matchEess && !matchProf && !matchDig && !matchPunto && !matchDoc) {
          return false;
        }
      }

      return true;
    });
  }, [atenciones, selectedRango, selectedPunto, selectedEess, searchTerm]);

  // Pagination for detail table
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Nro Formato',
      'Fecha Atencion',
      'Fecha Registro',
      'Dias Transcurridos',
      'Rango Oportunidad',
      'Estado Oportunidad',
      'Establecimiento',
      'Punto Digitacion',
      'Digitador',
      'Profesional',
      'Servicio',
      'Paciente',
      'DNI',
    ];

    const rows = filteredList.map(a => {
      const dias = getDiasDiferencia(a.fecha_atencion, a.fecha_registro);
      const info = getRangoInfo(dias);
      return [
        a.id,
        `"${a.nro_formato || ''}"`,
        a.fecha_atencion,
        `"${a.fecha_registro || ''}"`,
        dias !== null ? dias : '',
        `"${info.label}"`,
        `"${info.estado}"`,
        `"${a.nombre_eess}"`,
        `"${a.punto_digitacion}"`,
        `"${a.digitador}"`,
        `"${a.nombre_profesional}"`,
        `"${a.descripcion_servicio}"`,
        `"${a.beneficiario}"`,
        `"${a.doc_identidad}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_oportunidad_digitacion_${selectedRango}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Title */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                B.9. Oportunidad de Digitación
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cálculo de días transcurridos desde la <strong>Fecha de Atención</strong> con respecto a la <strong>Fecha de Registro</strong> (0-10 días, 11-29 días y ≥30 días)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Total: {atenciones.length} Atenciones</span>
          </span>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Meta SIS: ≤ 10 días</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TARJETAS PRINCIPALES: 0-10 DÍAS | 11-29 DÍAS | 30+ DÍAS                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rango 1: 0 - 10 días */}
        <div
          onClick={() => {
            setSelectedRango(selectedRango === '0-10' ? 'TODOS' : '0-10');
            setActiveTab('detalle');
          }}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            selectedRango === '0-10'
              ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400 scale-[1.01]'
              : 'bg-white hover:bg-emerald-50/40 border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                selectedRango === '0-10'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-100 text-emerald-800 font-black'
              }`}
            >
              0 a 10 días
            </span>
            <CheckCircle2
              className={`w-5 h-5 ${
                selectedRango === '0-10' ? 'text-emerald-200' : 'text-emerald-600'
              }`}
            />
          </div>

          <div className="mt-3">
            <div
              className={`text-3xl font-black font-mono ${
                selectedRango === '0-10' ? 'text-white' : 'text-slate-900'
              }`}
            >
              {globalOpportunity.count0_10}
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span
                className={selectedRango === '0-10' ? 'text-emerald-100' : 'text-slate-500'}
              >
                Oportuno (En Plazo SIS / MINSA)
              </span>
              <span
                className={`font-mono font-bold ${
                  selectedRango === '0-10' ? 'text-white' : 'text-emerald-600'
                }`}
              >
                {globalOpportunity.pct0_10}%
              </span>
            </div>
          </div>

          <div
            className={`w-full h-2 rounded-full mt-3 overflow-hidden ${
              selectedRango === '0-10' ? 'bg-white/20' : 'bg-slate-100'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                selectedRango === '0-10' ? 'bg-white' : 'bg-emerald-500'
              }`}
              style={{ width: `${globalOpportunity.pct0_10}%` }}
            ></div>
          </div>

          <div className="mt-2 text-[11px] flex justify-between items-center opacity-85">
            <span>Dentro del estándar reglamentario</span>
            <span className="font-semibold underline">
              {selectedRango === '0-10' ? 'Quitar filtro' : 'Filtrar registros →'}
            </span>
          </div>
        </div>

        {/* Rango 2: 11 - 29 días */}
        <div
          onClick={() => {
            setSelectedRango(selectedRango === '11-29' ? 'TODOS' : '11-29');
            setActiveTab('detalle');
          }}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            selectedRango === '11-29'
              ? 'bg-amber-500 text-slate-950 shadow-lg ring-2 ring-amber-300 scale-[1.01]'
              : 'bg-white hover:bg-amber-50/40 border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                selectedRango === '11-29'
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-amber-100 text-amber-800 font-black'
              }`}
            >
              11 a 29 días
            </span>
            <AlertTriangle
              className={`w-5 h-5 ${
                selectedRango === '11-29' ? 'text-slate-900' : 'text-amber-500'
              }`}
            />
          </div>

          <div className="mt-3">
            <div
              className={`text-3xl font-black font-mono ${
                selectedRango === '11-29' ? 'text-slate-950' : 'text-slate-900'
              }`}
            >
              {globalOpportunity.count11_29}
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span
                className={selectedRango === '11-29' ? 'text-slate-900/80' : 'text-slate-500'}
              >
                Con Demora (Alerta / Observado)
              </span>
              <span
                className={`font-mono font-bold ${
                  selectedRango === '11-29' ? 'text-slate-950' : 'text-amber-600'
                }`}
              >
                {globalOpportunity.pct11_29}%
              </span>
            </div>
          </div>

          <div
            className={`w-full h-2 rounded-full mt-3 overflow-hidden ${
              selectedRango === '11-29' ? 'bg-slate-950/20' : 'bg-slate-100'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                selectedRango === '11-29' ? 'bg-slate-950' : 'bg-amber-500'
              }`}
              style={{ width: `${globalOpportunity.pct11_29}%` }}
            ></div>
          </div>

          <div className="mt-2 text-[11px] flex justify-between items-center opacity-85">
            <span>Demora moderada en remisión</span>
            <span className="font-semibold underline">
              {selectedRango === '11-29' ? 'Quitar filtro' : 'Filtrar registros →'}
            </span>
          </div>
        </div>

        {/* Rango 3: 30 días a más */}
        <div
          onClick={() => {
            setSelectedRango(selectedRango === '30+' ? 'TODOS' : '30+');
            setActiveTab('detalle');
          }}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            selectedRango === '30+'
              ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400 scale-[1.01]'
              : 'bg-white hover:bg-rose-50/40 border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                selectedRango === '30+'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100 text-rose-800 font-black'
              }`}
            >
              30 días a más
            </span>
            <AlertOctagon
              className={`w-5 h-5 ${
                selectedRango === '30+' ? 'text-rose-200' : 'text-rose-600'
              }`}
            />
          </div>

          <div className="mt-3">
            <div
              className={`text-3xl font-black font-mono ${
                selectedRango === '30+' ? 'text-white' : 'text-slate-900'
              }`}
            >
              {globalOpportunity.count30_mas}
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className={selectedRango === '30+' ? 'text-rose-100' : 'text-slate-500'}>
                Extemporáneo (Rezagado Crítico)
              </span>
              <span
                className={`font-mono font-bold ${
                  selectedRango === '30+' ? 'text-white' : 'text-rose-600'
                }`}
              >
                {globalOpportunity.pct30_mas}%
              </span>
            </div>
          </div>

          <div
            className={`w-full h-2 rounded-full mt-3 overflow-hidden ${
              selectedRango === '30+' ? 'bg-white/20' : 'bg-slate-100'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                selectedRango === '30+' ? 'bg-white' : 'bg-rose-500'
              }`}
              style={{ width: `${globalOpportunity.pct30_mas}%` }}
            ></div>
          </div>

          <div className="mt-2 text-[11px] flex justify-between items-center opacity-85">
            <span>Riesgo de objeción o rechazo</span>
            <span className="font-semibold underline">
              {selectedRango === '30+' ? 'Quitar filtro' : 'Filtrar registros →'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE FILTROS Y PESTAÑAS DE ANÁLISIS                                    */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('puntos')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'puntos' ? 'bg-white text-blue-600 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              1. Por Punto de Digitación
            </button>
            <button
              onClick={() => setActiveTab('eess')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'eess' ? 'bg-white text-blue-600 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              2. Por Establecimiento (EESS)
            </button>
            <button
              onClick={() => setActiveTab('meses')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'meses' ? 'bg-white text-blue-600 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              3. Por Mes (Evolución)
            </button>
            <button
              onClick={() => setActiveTab('detalle')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'detalle' ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
              }`}
            >
              <span>4. Detalle de Registros</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 text-[10px]">
                {filteredList.length}
              </span>
            </button>
          </div>

          {/* Quick Filter Buttons by Range */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center space-x-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Rango:</span>
            </span>
            <button
              onClick={() => setSelectedRango('TODOS')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                selectedRango === 'TODOS'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos ({atenciones.length})
            </button>
            <button
              onClick={() => setSelectedRango('0-10')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                selectedRango === '0-10'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              0-10d ({globalOpportunity.count0_10})
            </button>
            <button
              onClick={() => setSelectedRango('11-29')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                selectedRango === '11-29'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              11-29d ({globalOpportunity.count11_29})
            </button>
            <button
              onClick={() => setSelectedRango('30+')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                selectedRango === '30+'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              ≥30d ({globalOpportunity.count30_mas})
            </button>
          </div>
        </div>

        {/* Secondary Filters for Punto and EESS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Punto de Digitación:
            </label>
            <select
              value={selectedPunto}
              onChange={e => setSelectedPunto(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="TODOS">Todos los Puntos</option>
              {uniquePuntos.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Establecimiento (EESS):
            </label>
            <select
              value={selectedEess}
              onChange={e => setSelectedEess(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-500 truncate"
            >
              <option value="TODOS">Todos los Establecimientos</option>
              {uniqueEess.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Búsqueda en Detalle:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Formato, DNI, paciente, digitador..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: TABLA POR PUNTO DE DIGITACIÓN                                    */}
      {/* ========================================================================= */}
      {activeTab === 'puntos' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Oportunidad de Digitación por Punto de Digitación</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Desglose por rangos de 0-10 días (Oportuno), 11-29 días (Con Demora) y ≥30 días (Extemporáneo)
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              {dataByPunto.length} Puntos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Punto de Digitación</th>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3 text-right">Total Reg.</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50 text-emerald-900 border-x border-emerald-100">
                    0-10 días (Oportuno)
                  </th>
                  <th className="py-2.5 px-3 text-right bg-amber-50 text-amber-900 border-r border-amber-100">
                    11-29 días (Demora)
                  </th>
                  <th className="py-2.5 px-3 text-right bg-rose-50 text-rose-900 border-r border-rose-100">
                    ≥30 días (Rezagado)
                  </th>
                  <th className="py-2.5 px-3 text-center">Desfase Prom.</th>
                  <th className="py-2.5 px-4 text-center">% Cumplimiento Meta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataByPunto.map(p => {
                  const meetsGoal = p.pct0_10 >= 70;
                  return (
                    <tr key={p.nombre} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {p.nombre}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{p.cod}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-600">
                        {p.total}
                      </td>

                      {/* 0-10 days */}
                      <td className="py-3 px-3 text-right font-mono bg-emerald-50/40 border-x border-emerald-100">
                        <strong className="text-emerald-700">{p.c0_10}</strong>{' '}
                        <span className="text-[10px] text-slate-500">({p.pct0_10}%)</span>
                      </td>

                      {/* 11-29 days */}
                      <td className="py-3 px-3 text-right font-mono bg-amber-50/40 border-r border-amber-100">
                        <strong className="text-amber-700">{p.c11_29}</strong>{' '}
                        <span className="text-[10px] text-slate-500">({p.pct11_29}%)</span>
                      </td>

                      {/* 30+ days */}
                      <td className="py-3 px-3 text-right font-mono bg-rose-50/40 border-r border-rose-100">
                        <strong className="text-rose-700">{p.c30_mas}</strong>{' '}
                        <span className="text-[10px] text-slate-500">({p.pct30_mas}%)</span>
                      </td>

                      {/* Average days */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        {p.avg} días
                      </td>

                      {/* Compliance */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              meetsGoal
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            <span>{p.pct0_10}%</span>
                            <span>{meetsGoal ? '✓' : '⚠'}</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: TABLA POR ESTABLECIMIENTO (EESS)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'eess' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Oportunidad de Remisión por Establecimiento de Salud (EESS)</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Identifica qué centros de salud envían sus prestaciones dentro de los 10 días o con desfase mayor
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {dataByEess.length} Establecimientos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Establecimiento</th>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Punto Asignado</th>
                  <th className="py-2.5 px-3 text-right">Total Reg.</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50 text-emerald-900 border-x border-emerald-100">
                    0-10 días (Oportuno)
                  </th>
                  <th className="py-2.5 px-3 text-right bg-amber-50 text-amber-900 border-r border-amber-100">
                    11-29 días (Demora)
                  </th>
                  <th className="py-2.5 px-3 text-right bg-rose-50 text-rose-900 border-r border-rose-100">
                    ≥30 días (Rezagado)
                  </th>
                  <th className="py-2.5 px-3 text-center">Desfase Prom.</th>
                  <th className="py-2.5 px-4 text-center">Semáforo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataByEess.map(e => (
                  <tr key={e.nombre} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{e.nombre}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{e.cod}</td>
                    <td className="py-3 px-3 text-slate-600 text-[11px] truncate max-w-[150px]" title={e.punto}>
                      {e.punto}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-600">{e.total}</td>
                    <td className="py-3 px-3 text-right font-mono bg-emerald-50/40 border-x border-emerald-100">
                      <strong className="text-emerald-700">{e.c0_10}</strong>{' '}
                      <span className="text-[10px] text-slate-500">({e.pct0_10}%)</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono bg-amber-50/40 border-r border-amber-100">
                      <strong className="text-amber-700">{e.c11_29}</strong>{' '}
                      <span className="text-[10px] text-slate-500">({e.pct11_29}%)</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono bg-rose-50/40 border-r border-rose-100">
                      <strong className="text-rose-700">{e.c30_mas}</strong>{' '}
                      <span className="text-[10px] text-slate-500">({e.pct30_mas}%)</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                      {e.avg}d
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block w-3 h-3 rounded-full ${
                          e.pct0_10 >= 70
                            ? 'bg-emerald-500'
                            : e.pct0_10 >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        title={`Oportunidad: ${e.pct0_10}%`}
                      ></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: EVOLUCIÓN MENSUAL                                                */}
      {/* ========================================================================= */}
      {activeTab === 'meses' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Evolución Mensual de la Oportunidad de Digitación</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Comportamiento histórico de la proporción de registros en 0-10 días frente a rezagados
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {dataByMes.length} Meses
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Mes de Atención</th>
                  <th className="py-2.5 px-3 text-right">Total Reg.</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50 text-emerald-900 border-x border-emerald-100">
                    0-10 días (Oportuno)
                  </th>
                  <th className="py-2.5 px-3 text-right bg-amber-50 text-amber-900 border-r border-amber-100">
                    11-29 días (Demora)
                  </th>
                  <th className="py-2.5 px-3 text-right bg-rose-50 text-rose-900 border-r border-rose-100">
                    ≥30 días (Rezagado)
                  </th>
                  <th className="py-2.5 px-4">Distribución Visual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataByMes.map(m => (
                  <tr key={m.mes} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{m.mes}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-600">{m.total}</td>
                    <td className="py-3 px-3 text-right font-mono bg-emerald-50/40 border-x border-emerald-100">
                      <strong className="text-emerald-700">{m.c0_10}</strong>{' '}
                      <span className="text-[10px] text-slate-500">({m.pct0_10}%)</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono bg-amber-50/40 border-r border-amber-100">
                      <strong className="text-amber-700">{m.c11_29}</strong>{' '}
                      <span className="text-[10px] text-slate-500">({m.pct11_29}%)</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono bg-rose-50/40 border-r border-rose-100">
                      <strong className="text-rose-700">{m.c30_mas}</strong>{' '}
                      <span className="text-[10px] text-slate-500">({m.pct30_mas}%)</span>
                    </td>
                    <td className="py-3 px-4">
                      {/* Stacked percentage bar */}
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex shadow-inner">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${m.pct0_10}%` }}
                          title={`0-10 días: ${m.pct0_10}%`}
                        ></div>
                        <div
                          className="bg-amber-400 h-full"
                          style={{ width: `${m.pct11_29}%` }}
                          title={`11-29 días: ${m.pct11_29}%`}
                        ></div>
                        <div
                          className="bg-rose-500 h-full"
                          style={{ width: `${m.pct30_mas}%` }}
                          title={`≥30 días: ${m.pct30_mas}%`}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 4: DETALLE DE REGISTROS CON FILTRO POR RANGO                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Listado Individual de Atenciones y Días Transcurridos</span>
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Filtro activo: Rango{' '}
              <strong className="text-slate-800 font-bold">{selectedRango}</strong> | Mostrando{' '}
              <strong className="text-blue-600 font-mono font-bold">{filteredList.length}</strong>{' '}
              atenciones
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <span className="text-[11px]">Filas:</span>
              <select
                value={itemsPerPage}
                onChange={e => setItemsPerPage(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Fecha Atención</th>
                <th className="py-2.5 px-3">Fecha Registro</th>
                <th className="py-2.5 px-3 text-center">Días Transcurridos</th>
                <th className="py-2.5 px-3 text-center">Rango Oportunidad</th>
                <th className="py-2.5 px-3">N° Formato</th>
                <th className="py-2.5 px-3">Establecimiento</th>
                <th className="py-2.5 px-3">Punto Digitación</th>
                <th className="py-2.5 px-3">Digitador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No se encontraron registros de atenciones para el rango y filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedList.map(a => {
                  const dias = getDiasDiferencia(a.fecha_atencion, a.fecha_registro);
                  const info = getRangoInfo(dias);

                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                        {a.fecha_atencion}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {a.fecha_registro}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-extrabold text-sm">
                        {dias !== null ? `${dias}d` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${info.badgeClass}`}
                        >
                          {info.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                        {a.nro_formato}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {a.nombre_eess}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {a.punto_digitacion}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {a.digitador}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredList.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>
              Mostrando registros{' '}
              <strong className="text-slate-800 font-mono">
                {Math.min((currentPage - 1) * itemsPerPage + 1, filteredList.length)}
              </strong>{' '}
              al{' '}
              <strong className="text-slate-800 font-mono">
                {Math.min(currentPage * itemsPerPage, filteredList.length)}
              </strong>{' '}
              de <strong className="text-slate-800 font-mono">{filteredList.length}</strong> totales
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Anterior
              </button>
              <span className="px-3 py-1 font-mono font-bold text-slate-700">
                Pág. {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
