import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Calendar,
  Building2,
  FileSpreadsheet,
  Download,
  Clock,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  ChevronRight,
  Eye,
  X,
  Filter,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  DollarSign
} from 'lucide-react';
import { Atencion, DigitadorRecord, DigitadorEstadisticaCompleta, DigitadorEstadisticaMensual, FilterState } from '../../types/health';
import { storageService } from '../../services/storageService';
import { ExcelService } from '../../services/excelService';
import { PdfService } from '../../services/pdfService';
import { TablePagination } from '../TablePagination';
import { apiService } from '../../services/apiService';

interface Props {
  atenciones: Atencion[];
  filters?: Partial<FilterState>;
  onNavigateToUpload?: () => void;
  onNavigateToPunto?: (punto: string) => void;
}

// Helper to normalize names for linking
const normalizeStr = (s: string): string => {
  return (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(lic\.|tec\.|bach\.|dr\.|dra\.|ing\.|mg\.)\s*/i, '')
    .replace(/\s+/g, ' ');
};

const formatMesLabel = (yearMonth: string): string => {
  const [y, m] = yearMonth.split('-');
  const monthNum = parseInt(m, 10);
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'
  ];
  return `${months[monthNum - 1] || m} ${y}`;
};

const formatMesLabelFull = (yearMonth: string): string => {
  const [y, m] = yearMonth.split('-');
  const monthNum = parseInt(m, 10);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${months[monthNum - 1] || m} ${y}`;
};

export const AtencionesDigitadores: React.FC<Props> = ({
  atenciones,
  filters,
  onNavigateToUpload,
  onNavigateToPunto,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPunto, setSelectedPunto] = useState('TODOS');
  const [selectedMesFiltro, setSelectedMesFiltro] = useState('TODOS');
  const [activeTab, setActiveTab] = useState<'matriz' | 'puntos' | 'oportunidad'>('matriz');
  const [selectedDigitadorModal, setSelectedDigitadorModal] = useState<DigitadorEstadisticaCompleta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [serverStats, setServerStats] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const combinedFilters = {
      ...filters,
      puntoDigitacion: selectedPunto !== 'TODOS' ? selectedPunto : (filters?.puntoDigitacion || ''),
      search: searchTerm.trim(),
    };
    apiService.getModulesStats(combinedFilters).then(data => {
      if (active) setServerStats(data);
    }).catch(err => console.warn('Digitadores stats notice:', err));
    return () => { active = false; };
  }, [filters, selectedPunto, searchTerm, atenciones]);

  // Load digitadores from storage
  const digitadoresPadrón = useMemo(() => {
    return storageService.getDigitadores();
  }, []);

  // 1. Extract all unique months based on FECHA DE ATENCIÓN (CRITICAL REQUIREMENT)
  const allMonthsFechaAtencion = useMemo(() => {
    const monthSet = new Set<string>();
    atenciones.forEach(a => {
      if (a.fecha_atencion) {
        const ym = a.fecha_atencion.substring(0, 7);
        if (/^\d{4}-\d{2}$/.test(ym)) {
          monthSet.add(ym);
        }
      }
    });
    return Array.from(monthSet).sort();
  }, [atenciones]);

  // 2. Extract unique puntos de digitación
  const uniquePuntos = useMemo(() => {
    const set = new Set<string>();
    atenciones.forEach(a => {
      if (a.punto_digitacion) set.add(a.punto_digitacion.trim());
    });
    digitadoresPadrón.forEach(d => {
      if (d.punto_digitacion) set.add(d.punto_digitacion.trim());
    });
    return Array.from(set).sort();
  }, [atenciones, digitadoresPadrón]);

  // 3. Compile linked statistics for each digitador
  // We merge padrón records with atenciones by matching normalized name or DNI
  const compiledStats = useMemo<DigitadorEstadisticaCompleta[]>(() => {
    // Collect all unique digitador representations
    const digitadorMap = new Map<string, {
      record?: DigitadorRecord;
      usuario: string;
      nombre: string;
      dni: string;
      punto: string;
      codPunto: string;
      eessPrincipal: string;
      cargo: string;
      estado: 'ACTIVO' | 'INACTIVO';
      correo: string;
      telefono: string;
      matchingAtenciones: Atencion[];
    }>();

    // First populate from registered padrón
    digitadoresPadrón.forEach(padron => {
      const key = normalizeStr(padron.nombre_completo) || padron.usuario.toLowerCase();
      digitadorMap.set(key, {
        record: padron,
        usuario: padron.usuario || '',
        nombre: padron.nombre_completo,
        dni: padron.dni || '',
        punto: padron.punto_digitacion || 'PUNTO NO ESPECIFICADO',
        codPunto: padron.cod_punto_digitacion || 'S/C',
        eessPrincipal: padron.nombre_eess || '',
        cargo: padron.cargo || 'Digitador Asistencial',
        estado: padron.estado || 'ACTIVO',
        correo: padron.correo || '',
        telefono: padron.telefono || '',
        matchingAtenciones: [],
      });
    });

    // Match atenciones to digitadores
    atenciones.forEach(a => {
      const rawName = (a.digitador || 'SIN DIGITADOR').trim();
      const normKey = normalizeStr(rawName);
      const rawLower = rawName.toLowerCase();

      // Find matching entry by normalized full name, by username, or by user updater
      let foundEntry: {
        record?: DigitadorRecord;
        usuario: string;
        nombre: string;
        dni: string;
        punto: string;
        codPunto: string;
        eessPrincipal: string;
        cargo: string;
        estado: 'ACTIVO' | 'INACTIVO';
        correo: string;
        telefono: string;
        matchingAtenciones: Atencion[];
      } | undefined = undefined;

      for (const entry of digitadorMap.values()) {
        const normEntryName = normalizeStr(entry.nombre);
        const entryUser = entry.usuario.toLowerCase();

        if (
          (normEntryName && normKey && normEntryName === normKey) ||
          (entryUser && (rawLower === entryUser || (a.usuario_actualiza && a.usuario_actualiza.toLowerCase() === entryUser))) ||
          (entry.dni && a.doc_identidad && entry.dni === a.doc_identidad)
        ) {
          foundEntry = entry;
          break;
        }
      }

      if (!foundEntry) {
        // Create an unlinked or auto-detected entry
        const generatedUser = rawName.toLowerCase().replace(/^(lic\.|tec\.|bach\.|dr\.|dra\.|ing\.|mg\.)\s*/i, '').replace(/[^a-z0-9]/g, '');
        foundEntry = {
          usuario: generatedUser,
          nombre: rawName,
          dni: '',
          punto: a.punto_digitacion || 'PUNTO ASIGNADO EN ATENCIÓN',
          codPunto: a.cod_punto_digitacion || 'S/C',
          eessPrincipal: a.nombre_eess || '',
          cargo: 'Digitador Asistencial',
          estado: 'ACTIVO',
          correo: '',
          telefono: '',
          matchingAtenciones: [],
        };
        digitadorMap.set(normKey, foundEntry);
      } else {
        // If entry didn't have punto specified from simple Excel (usuario, DNI, nombres), auto-link from atenciones!
        if ((!foundEntry.punto || foundEntry.punto === 'PUNTO NO ESPECIFICADO') && a.punto_digitacion) {
          foundEntry.punto = a.punto_digitacion;
          foundEntry.codPunto = a.cod_punto_digitacion || foundEntry.codPunto;
        }
        if (!foundEntry.eessPrincipal && a.nombre_eess) {
          foundEntry.eessPrincipal = a.nombre_eess;
        }
      }

      foundEntry.matchingAtenciones.push(a);
    });

    // Build the full complete stats for each
    const result: DigitadorEstadisticaCompleta[] = [];

    digitadorMap.forEach((entry, key) => {
      // Calculate monthly stats strictly based on FECHA DE ATENCIÓN
      const atencList = entry.matchingAtenciones;
      const totalAtenciones = atencList.length;

      // Unique patients
      const pacSet = new Set(atencList.map(a => a.doc_identidad || String(a.id)));
      const pacientesUnicos = pacSet.size;

      // Opportunity days calculation
      let totalDays = 0;
      let countedDays = 0;
      atencList.forEach(a => {
        if (a.fecha_atencion && a.fecha_registro) {
          const dAt = new Date(a.fecha_atencion.substring(0, 10)).getTime();
          const dReg = new Date(a.fecha_registro.substring(0, 10)).getTime();
          if (!isNaN(dAt) && !isNaN(dReg)) {
            const diff = Math.max(0, Math.round((dReg - dAt) / (1000 * 60 * 60 * 24)));
            totalDays += diff;
            countedDays++;
          }
        }
      });
      const diasPromedioOportunidad = countedDays > 0 ? Math.round((totalDays / countedDays) * 10) / 10 : 0;

      // Total Tarifa
      const totalTarifa = atencList.reduce((sum, a) => sum + (a.tarifa || 0), 0);

      // Unique EESS & Servicios
      const eessMap: Record<string, number> = {};
      const serviciosMap: Record<string, number> = {};

      atencList.forEach(a => {
        const eName = a.nombre_eess || 'NO ESPECIFICADO';
        eessMap[eName] = (eessMap[eName] || 0) + 1;

        const sDesc = a.descripcion_servicio || 'NO ESPECIFICADO';
        serviciosMap[sDesc] = (serviciosMap[sDesc] || 0) + 1;
      });

      // Monthly breakdown based on fecha_atencion
      const mensualizado: DigitadorEstadisticaMensual[] = allMonthsFechaAtencion.map(ym => {
        const atencDelMes = atencList.filter(a => a.fecha_atencion && a.fecha_atencion.startsWith(ym));
        const [yStr, mStr] = ym.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);

        let mDays = 0;
        let mCounted = 0;
        const mPacSet = new Set<string>();
        let mTarifa = 0;
        const mEessSet = new Set<string>();

        atencDelMes.forEach(a => {
          mPacSet.add(a.doc_identidad || String(a.id));
          mTarifa += a.tarifa || 0;
          if (a.nombre_eess) mEessSet.add(a.nombre_eess);
          if (a.fecha_atencion && a.fecha_registro) {
            const dAt = new Date(a.fecha_atencion.substring(0, 10)).getTime();
            const dReg = new Date(a.fecha_registro.substring(0, 10)).getTime();
            if (!isNaN(dAt) && !isNaN(dReg)) {
              mDays += Math.max(0, Math.round((dReg - dAt) / (1000 * 60 * 60 * 24)));
              mCounted++;
            }
          }
        });

        return {
          mes: ym,
          labelMes: formatMesLabelFull(ym),
          year: y,
          month: m,
          totalAtenciones: atencDelMes.length,
          pacientesUnicos: mPacSet.size,
          diasPromedioOportunidad: mCounted > 0 ? Math.round((mDays / mCounted) * 10) / 10 : 0,
          totalTarifa: mTarifa,
          eessCount: mEessSet.size,
        };
      });

      // Top EESS
      const topEess = Object.entries(eessMap)
        .map(([nombre, count]) => {
          const pacCount = new Set(atencList.filter(a => a.nombre_eess === nombre).map(a => a.doc_identidad)).size;
          return { nombre, atenciones: count, pacientes: pacCount };
        })
        .sort((a, b) => b.atenciones - a.atenciones)
        .slice(0, 8);

      // Top Servicios
      const topServicios = Object.entries(serviciosMap)
        .map(([desc, count]) => ({ desc, atenciones: count }))
        .sort((a, b) => b.atenciones - a.atenciones)
        .slice(0, 8);

      result.push({
        id: entry.record?.id || `auto-${key}`,
        usuario: entry.usuario || entry.nombre.toLowerCase().replace(/[^a-z0-9]/g, ''),
        dni: entry.dni,
        nombre_completo: entry.nombre,
        cod_punto_digitacion: entry.codPunto,
        punto_digitacion: entry.punto,
        codigo_eess: entry.record?.codigo_eess,
        nombre_eess: entry.eessPrincipal,
        cargo: entry.cargo,
        estado: entry.estado,
        correo: entry.correo,
        telefono: entry.telefono,
        totalAtenciones,
        pacientesUnicos,
        diasPromedioOportunidad,
        totalTarifa,
        eessCount: Object.keys(eessMap).length,
        serviciosCount: Object.keys(serviciosMap).length,
        mensualizado,
        topEess,
        topServicios,
      });
    });

    if (serverStats?.digitadores && serverStats.digitadores.length > 0) {
      const serverMap = new Map<string, any>();
      serverStats.digitadores.forEach((sd: any) => {
        if (sd.digitador) serverMap.set(normalizeStr(sd.digitador), sd);
      });

      result.forEach(r => {
        const normName = normalizeStr(r.nombre_completo);
        const match = serverMap.get(normName);
        if (match) {
          r.totalAtenciones = Number(match.atenciones) || r.totalAtenciones;
          r.pacientesUnicos = Number(match.pacientes) || r.pacientesUnicos;
          if (match.eessCount) r.eessCount = Number(match.eessCount);
        }
      });
    }

    // Sort by total atenciones descending
    return result.sort((a, b) => b.totalAtenciones - a.totalAtenciones);
  }, [digitadoresPadrón, atenciones, allMonthsFechaAtencion, serverStats]);

  // 4. Filtered stats
  const filteredStats = useMemo(() => {
    return compiledStats.filter(stat => {
      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = stat.nombre_completo.toLowerCase().includes(term);
        const matchUser = (stat.usuario || '').toLowerCase().includes(term);
        const matchDni = stat.dni.toLowerCase().includes(term);
        const matchPunto = stat.punto_digitacion.toLowerCase().includes(term);
        const matchEess = (stat.nombre_eess || '').toLowerCase().includes(term);
        if (!matchName && !matchUser && !matchDni && !matchPunto && !matchEess) return false;
      }

      // Filter by punto
      if (selectedPunto !== 'TODOS' && stat.punto_digitacion !== selectedPunto) {
        return false;
      }

      // Filter by mes fecha atencion: only keep if has at least 1 atencion in that month
      if (selectedMesFiltro !== 'TODOS') {
        const monthData = stat.mensualizado.find(m => m.mes === selectedMesFiltro);
        if (!monthData || monthData.totalAtenciones === 0) return false;
      }

      return true;
    });
  }, [compiledStats, searchTerm, selectedPunto, selectedMesFiltro]);

  // Paginated list
  const paginatedStats = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStats.slice(start, start + pageSize);
  }, [filteredStats, currentPage, pageSize]);

  // Global KPIs for summary
  const summaryKpis = useMemo(() => {
    const totalDigitadores = compiledStats.length;
    const activos = compiledStats.filter(s => s.estado === 'ACTIVO').length;
    const totalAtenciones = compiledStats.reduce((sum, s) => sum + s.totalAtenciones, 0);
    const totalPacientes = compiledStats.reduce((sum, s) => sum + s.pacientesUnicos, 0);
    const avgOportunidad = compiledStats.length > 0
      ? Math.round((compiledStats.reduce((sum, s) => sum + s.diasPromedioOportunidad, 0) / compiledStats.length) * 10) / 10
      : 0;
    const totalTarifas = compiledStats.reduce((sum, s) => sum + s.totalTarifa, 0);

    return {
      totalDigitadores,
      activos,
      totalAtenciones,
      totalPacientes,
      avgOportunidad,
      totalTarifas,
    };
  }, [compiledStats]);

  // Grouped by Punto de Digitación for Tab 2
  const groupedByPunto = useMemo(() => {
    const groups: Record<string, DigitadorEstadisticaCompleta[]> = {};
    compiledStats.forEach(stat => {
      const pto = stat.punto_digitacion || 'SIN PUNTO ASIGNADO';
      if (!groups[pto]) groups[pto] = [];
      groups[pto].push(stat);
    });
    return groups;
  }, [compiledStats]);

  // Handler for individual PDF download
  const handleDownloadFicha = (stat: DigitadorEstadisticaCompleta) => {
    const total = stat.totalAtenciones || 1;

    // Build sample records of actual atenciones for this digitador
    const normKey = normalizeStr(stat.nombre_completo);
    const matchingAtenc = atenciones.filter(a => normalizeStr(a.digitador) === normKey);

    const muestrasAtenciones = matchingAtenc.slice(0, 30).map(a => {
      let diasOportunidad = 0;
      if (a.fecha_atencion && a.fecha_registro) {
        const dAt = new Date(a.fecha_atencion.substring(0, 10)).getTime();
        const dReg = new Date(a.fecha_registro.substring(0, 10)).getTime();
        if (!isNaN(dAt) && !isNaN(dReg)) {
          diasOportunidad = Math.max(0, Math.round((dReg - dAt) / (1000 * 60 * 60 * 24)));
        }
      }
      return {
        fechaAtencion: a.fecha_atencion,
        fechaRegistro: a.fecha_registro,
        nroFormato: a.nro_formato,
        eess: a.nombre_eess,
        servicio: a.descripcion_servicio,
        paciente: a.beneficiario,
        docIdentidad: a.doc_identidad,
        diasOportunidad,
      };
    });

    PdfService.generateFichaDigitadorPdf({
      digitador: {
        usuario: stat.usuario,
        dni: stat.dni,
        nombre: stat.nombre_completo,
        puntoDigitacion: stat.punto_digitacion,
        codPunto: stat.cod_punto_digitacion,
        eessPrincipal: stat.nombre_eess,
        cargo: stat.cargo,
        estado: stat.estado,
        correo: stat.correo,
        telefono: stat.telefono,
      },
      kpis: {
        totalAtenciones: stat.totalAtenciones,
        pacientesUnicos: stat.pacientesUnicos,
        diasPromedioOportunidad: stat.diasPromedioOportunidad,
        totalTarifa: stat.totalTarifa,
        eessCount: stat.eessCount,
        serviciosCount: stat.serviciosCount,
      },
      mensualizado: stat.mensualizado.map(m => ({
        mes: m.mes,
        labelMes: m.labelMes,
        atenciones: m.totalAtenciones,
        pacientes: m.pacientesUnicos,
        pct: Math.round((m.totalAtenciones / total) * 1000) / 10,
        diasOportunidad: m.diasPromedioOportunidad,
        tarifa: m.totalTarifa,
      })),
      topEess: stat.topEess.map(e => ({
        nombre: e.nombre,
        atenciones: e.atenciones,
        pacientes: e.pacientes,
        pct: Math.round((e.atenciones / total) * 1000) / 10,
      })),
      topServicios: stat.topServicios.map(s => ({
        desc: s.desc,
        atenciones: s.atenciones,
        pct: Math.round((s.atenciones / total) * 1000) / 10,
      })),
      muestrasAtenciones,
    });
  };

  // Handler for Excel download
  const handleDownloadExcel = () => {
    ExcelService.exportDigitadoresMensualizadoExcel(
      filteredStats,
      allMonthsFechaAtencion,
      `Reporte_Mensualizado_Digitadores_${new Date().toISOString().substring(0, 10)}.xlsx`
    );
  };

  // Handler for General PDF report
  const handleDownloadGeneralPdf = () => {
    const headers = [
      'Digitador',
      'DNI',
      'Punto Digitación',
      'Atenciones',
      'Pacientes',
      'Oport. Prom.',
      'Monto (S/)',
      'Estado',
    ];

    const rows = filteredStats.map(s => [
      s.nombre_completo,
      s.dni || 'S/D',
      s.punto_digitacion,
      s.totalAtenciones,
      s.pacientesUnicos,
      `${s.diasPromedioOportunidad} d`,
      `S/ ${s.totalTarifa.toFixed(2)}`,
      s.estado,
    ]);

    PdfService.generateEstadisticaPdf({
      titulo: 'REPORTE CONSOLIDADO DE DIGITADORES POR PUNTO DE DIGITACIÓN',
      subtitulo: 'Evaluación verificando Fecha de Atención Médica • SIS / MINSA',
      headers,
      rows,
      resumenKpis: [
        { label: 'TOTAL DIGITADORES', valor: filteredStats.length },
        { label: 'ATENCIONES TOTALES', valor: summaryKpis.totalAtenciones },
        { label: 'PACIENTES ATENDIDOS', valor: summaryKpis.totalPacientes },
        { label: 'OPORTUNIDAD PROM.', valor: `${summaryKpis.avgOportunidad} d` },
      ],
      orientation: 'landscape',
      filename: `Consolidado_Digitadores_${new Date().toISOString().substring(0, 10)}.pdf`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Buttons */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 rounded-2xl text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verificación Obligatoria por Fecha de Atención Médica</span>
            </div>
            
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center space-x-3 text-white">
              <Users className="w-7 h-7 text-emerald-400" />
              <span>B.2.1 Estadísticas y Rendimiento de Digitadores</span>
            </h1>
            
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Módulo integral de entrelazamiento entre el <strong className="text-white">Maestro de Digitadores</strong> y las <strong className="text-white">Atenciones de Salud</strong>. Los reportes mensualizados se consolidan verificando estrictamente la <strong className="text-emerald-300">fecha de atención</strong> de cada paciente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onNavigateToUpload && (
              <button
                onClick={onNavigateToUpload}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Cargar Formato Excel Digitadores</span>
              </button>
            )}

            <button
              onClick={handleDownloadExcel}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel Mensual (.xlsx)</span>
            </button>

            <button
              onClick={handleDownloadGeneralPdf}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Consolidado PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Digitadores Registrados</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{summaryKpis.totalDigitadores}</span>
            <span className="text-[11px] font-semibold text-emerald-600">({summaryKpis.activos} activos)</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">En padrón y atenciones</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Atenciones Totales</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{summaryKpis.totalAtenciones.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400 mt-1 block">Por fecha de atención</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pacientes Atendidos</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{summaryKpis.totalPacientes.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400 mt-1 block">Personas únicas cubiertas</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Oportunidad Promedio</span>
          <div className="flex items-baseline space-x-1.5 mt-1">
            <span className="text-2xl font-black text-amber-600">{summaryKpis.avgOportunidad}</span>
            <span className="text-xs font-bold text-slate-500">días</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Entre atención y registro</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Puntos de Digitación</span>
          <div className="text-2xl font-black text-indigo-600 mt-1">{uniquePuntos.length}</div>
          <span className="text-[10px] text-slate-400 mt-1 block">Centros operativos</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Monto Tarifado SIS</span>
          <div className="text-xl font-black text-slate-900 mt-1 truncate">
            S/ {summaryKpis.totalTarifas.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Valorización estimada</span>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('matriz')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'matriz'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Matriz Mensualizada (Fecha Atención)
          </button>
          <button
            onClick={() => setActiveTab('puntos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'puntos'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Por Punto de Digitación
          </button>
          <button
            onClick={() => setActiveTab('oportunidad')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'oportunidad'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Oportunidad y Brecha Temporal
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por digitador, DNI..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Punto Filter */}
          <select
            value={selectedPunto}
            onChange={e => {
              setSelectedPunto(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="TODOS">Todos los Puntos de Digitación</option>
            {uniquePuntos.map(pto => (
              <option key={pto} value={pto}>{pto}</option>
            ))}
          </select>

          {/* Mes Filter */}
          <select
            value={selectedMesFiltro}
            onChange={e => {
              setSelectedMesFiltro(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="TODOS">Todos los Meses de Atención</option>
            {allMonthsFechaAtencion.map(m => (
              <option key={m} value={m}>{formatMesLabelFull(m)}</option>
            ))}
          </select>

          {(searchTerm || selectedPunto !== 'TODOS' || selectedMesFiltro !== 'TODOS') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedPunto('TODOS');
                setSelectedMesFiltro('TODOS');
                setCurrentPage(1);
              }}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Limpiar filtros"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Matriz Mensualizada (Verificando Fecha de Atención) */}
      {activeTab === 'matriz' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Matriz de Producción Mensualizada por Digitador (Base: Fecha de Atención)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Columnas mensuales generadas según el mes de la prestación asistencial. Descargue la Ficha Oficial en PDF con 1 clic.
              </p>
            </div>

            <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
              {filteredStats.length} digitadores evaluados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Digitador / DNI</th>
                  <th className="py-3 px-3">Punto de Digitación</th>
                  {allMonthsFechaAtencion.map(m => (
                    <th key={m} className="py-3 px-3 text-center whitespace-nowrap bg-blue-50/40 text-blue-900 font-extrabold border-l border-slate-200/60">
                      {formatMesLabel(m)}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right bg-slate-200/50 font-black">Total Atenc.</th>
                  <th className="py-3 px-3 text-right text-emerald-800 font-bold">Atendidos</th>
                  <th className="py-3 px-3 text-center">Oportunidad</th>
                  <th className="py-3 px-3 text-center">Ficha / Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedStats.length === 0 ? (
                  <tr>
                    <td colSpan={8 + allMonthsFechaAtencion.length} className="text-center py-12 text-slate-400">
                      No se encontraron digitadores coincidentes con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  paginatedStats.map((stat, idx) => {
                    const rowNum = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={stat.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{rowNum}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 flex items-center space-x-2">
                            <span>{stat.nombre_completo}</span>
                            {stat.usuario && (
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                                @{stat.usuario}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                            <span className="font-mono">DNI: {stat.dni || 'S/DNI'}</span>
                            <span>•</span>
                            <span className="truncate max-w-[120px]">{stat.cargo || 'Digitador'}</span>
                            <span>•</span>
                            <span className={`px-1 rounded text-[9px] font-bold ${
                              stat.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {stat.estado}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800 block text-xs">{stat.punto_digitacion}</span>
                          <span className="text-[10px] text-slate-400 font-mono">[{stat.cod_punto_digitacion}]</span>
                        </td>

                        {/* Monthly counts based on fecha_atencion */}
                        {allMonthsFechaAtencion.map(m => {
                          const mData = stat.mensualizado.find(x => x.mes === m);
                          const count = mData ? mData.totalAtenciones : 0;
                          return (
                            <td key={m} className="py-2.5 px-3 text-center border-l border-slate-100 font-mono">
                              {count > 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">
                                  {count}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Totals */}
                        <td className="py-2.5 px-3 text-right bg-slate-50/60 font-black text-slate-900 font-mono text-sm">
                          {stat.totalAtenciones.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-mono">
                          {stat.pacientesUnicos.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            stat.diasPromedioOportunidad <= 10
                              ? 'bg-emerald-100 text-emerald-700'
                              : stat.diasPromedioOportunidad <= 29
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {stat.diasPromedioOportunidad} d
                          </span>
                        </td>

                        {/* Action: Download Ficha PDF & View Details */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleDownloadFicha(stat)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-[11px] font-bold border border-blue-200 transition-colors flex items-center space-x-1 cursor-pointer"
                              title="Descargar Ficha Estadística Oficial del Digitador en PDF"
                            >
                              <Download className="w-3 h-3" />
                              <span>Ficha PDF</span>
                            </button>

                            <button
                              onClick={() => setSelectedDigitadorModal(stat)}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Ver detalle completo de producción y servicios"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-slate-100">
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredStats.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {/* TAB 2: Por Punto de Digitación */}
      {activeTab === 'puntos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedByPunto).map(([puntoNombre, dList]) => {
              const totalAtencPunto = dList.reduce((sum, d) => sum + d.totalAtenciones, 0);
              const totalPacPunto = dList.reduce((sum, d) => sum + d.pacientesUnicos, 0);
              const avgOportPunto = dList.length > 0
                ? Math.round((dList.reduce((sum, d) => sum + d.diasPromedioOportunidad, 0) / dList.length) * 10) / 10
                : 0;

              return (
                <div key={puntoNombre} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4 hover:border-blue-400 transition-all">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 leading-tight">{puntoNombre}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">[{dList[0]?.cod_punto_digitacion || 'S/C'}]</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {dList.length} digitador{dList.length > 1 ? 'es' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Atenciones</span>
                        <span className="text-base font-extrabold text-blue-600">{totalAtencPunto}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Atendidos</span>
                        <span className="text-base font-extrabold text-emerald-600">{totalPacPunto}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold">Oportunidad</span>
                        <span className="text-base font-extrabold text-amber-600">{avgOportPunto}d</span>
                      </div>
                    </div>

                    {/* Breakdown list of digitadores inside this point */}
                    <div className="mt-4 space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Digitadores del Punto</span>
                      {dList.map(dig => {
                        const pctOfPunto = totalAtencPunto > 0 ? Math.round((dig.totalAtenciones / totalAtencPunto) * 100) : 0;
                        return (
                          <div key={dig.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800">{dig.nombre_completo}</span>
                              <span className="font-mono font-bold text-blue-700">{dig.totalAtenciones} atenc.</span>
                            </div>

                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pctOfPunto}%` }} />
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>DNI: {dig.dni || 'S/D'} • {dig.pacientesUnicos} atendidos</span>
                              <button
                                onClick={() => handleDownloadFicha(dig)}
                                className="text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-0.5 cursor-pointer"
                              >
                                <Download className="w-2.5 h-2.5" />
                                <span>Ficha PDF</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {onNavigateToPunto && (
                    <button
                      onClick={() => onNavigateToPunto(puntoNombre)}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <span>Ver Ranking Completo del Punto</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Oportunidad y Brecha Temporal */}
      {activeTab === 'oportunidad' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Indicadores de Oportunidad de Digitación por Digitador</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Días transcurridos entre la fecha de atención médica y la fecha de registro en el sistema. Meta oficial MINSA: ≤ 10 días calendario.
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="text-slate-600 font-medium">0-10 días (Oportuno)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span className="text-slate-600 font-medium">11-29 días (Alerta)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="text-slate-600 font-medium">≥ 30 días (Crítico)</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStats.map(stat => {
              // Calculate buckets for this digitador
              const normKey = normalizeStr(stat.nombre_completo);
              const matching = atenciones.filter(a => normalizeStr(a.digitador) === normKey);
              let r0_10 = 0;
              let r11_29 = 0;
              let r30plus = 0;

              matching.forEach(a => {
                if (a.fecha_atencion && a.fecha_registro) {
                  const dAt = new Date(a.fecha_atencion.substring(0, 10)).getTime();
                  const dReg = new Date(a.fecha_registro.substring(0, 10)).getTime();
                  if (!isNaN(dAt) && !isNaN(dReg)) {
                    const diff = Math.max(0, Math.round((dReg - dAt) / (1000 * 60 * 60 * 24)));
                    if (diff <= 10) r0_10++;
                    else if (diff <= 29) r11_29++;
                    else r30plus++;
                  }
                }
              });

              const total = matching.length || 1;
              const pctOportuno = Math.round((r0_10 / total) * 100);

              return (
                <div key={stat.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs">{stat.nombre_completo}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{stat.punto_digitacion}</p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                      pctOportuno >= 80 ? 'bg-emerald-100 text-emerald-800' : pctOportuno >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {pctOportuno}% Oportuno
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${(r0_10 / total) * 100}%` }} title={`0-10d: ${r0_10}`} />
                    <div className="bg-amber-500 h-full" style={{ width: `${(r11_29 / total) * 100}%` }} title={`11-29d: ${r11_29}`} />
                    <div className="bg-rose-500 h-full" style={{ width: `${(r30plus / total) * 100}%` }} title={`≥30d: ${r30plus}`} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-emerald-700 font-semibold">0-10d: {r0_10} atenc.</span>
                    <span className="text-amber-700 font-semibold">11-29d: {r11_29} atenc.</span>
                    <span className="text-rose-700 font-semibold">≥30d: {r30plus} atenc.</span>
                    <button
                      onClick={() => handleDownloadFicha(stat)}
                      className="px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-[10px] cursor-pointer flex items-center space-x-1"
                    >
                      <Download className="w-2.5 h-2.5 text-blue-600" />
                      <span>Ficha</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Ficha Detallada del Digitador */}
      {selectedDigitadorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedDigitadorModal.nombre_completo}</h3>
                  <p className="text-xs text-slate-500">
                    DNI: <strong className="text-slate-800">{selectedDigitadorModal.dni || 'S/D'}</strong> • Punto: <strong className="text-slate-800">{selectedDigitadorModal.punto_digitacion}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDigitadorModal(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Atenciones</span>
                <span className="text-xl font-black text-blue-600 block mt-0.5">{selectedDigitadorModal.totalAtenciones}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Pacientes Únicos</span>
                <span className="text-xl font-black text-emerald-600 block mt-0.5">{selectedDigitadorModal.pacientesUnicos}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Oportunidad Prom.</span>
                <span className="text-xl font-black text-amber-600 block mt-0.5">{selectedDigitadorModal.diasPromedioOportunidad} d</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Tarifa SIS Total</span>
                <span className="text-xl font-black text-slate-900 block mt-0.5">S/ {selectedDigitadorModal.totalTarifa.toFixed(2)}</span>
              </div>
            </div>

            {/* Producción Mensualizada (Verificando Fecha de Atención) */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Producción Mensualizada (Basada en Fecha de Atención)</span>
              </h4>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 font-bold text-slate-700 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Mes de Atención</th>
                      <th className="py-2 px-3 text-right">Atenciones</th>
                      <th className="py-2 px-3 text-right">Pacientes</th>
                      <th className="py-2 px-3 text-right">Oportunidad</th>
                      <th className="py-2 px-3 text-right">Tarifa (S/)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDigitadorModal.mensualizado.map(m => (
                      <tr key={m.mes} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-800">{m.labelMes} ({m.mes})</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-600">{m.totalAtenciones}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold">{m.pacientesUnicos}</td>
                        <td className="py-2 px-3 text-right font-mono">{m.diasPromedioOportunidad} días</td>
                        <td className="py-2 px-3 text-right font-mono">S/ {m.totalTarifa.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top EESS & Servicios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Establecimientos Digitados</h4>
                <div className="space-y-1.5">
                  {selectedDigitadorModal.topEess.map(e => (
                    <div key={e.nombre} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate max-w-[200px]">{e.nombre}</span>
                      <span className="font-mono font-bold text-blue-700">{e.atenciones} atenc.</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Servicios Más Frecuentes</h4>
                <div className="space-y-1.5">
                  {selectedDigitadorModal.topServicios.map(s => (
                    <div key={s.desc} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate max-w-[200px]">{s.desc}</span>
                      <span className="font-mono font-bold text-emerald-700">{s.atenciones} atenc.</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedDigitadorModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>

              <button
                onClick={() => handleDownloadFicha(selectedDigitadorModal)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Ficha Oficial (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
