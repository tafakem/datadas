import React, { useState } from 'react';
import { Award, Building2, Calendar, Download, Printer } from 'lucide-react';
import { Atencion } from '../../types/health';
import { PdfService } from '../../services/pdfService';
import { ExcelService } from '../../services/excelService';

interface Props {
  atenciones: Atencion[];
}

export const ReporteProductividad: React.FC<Props> = ({ atenciones }) => {
  const [activeTab, setActiveTab] = useState<'profesional' | 'eess' | 'periodo'>('profesional');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('TODOS');

  const allPeriods = Array.from(new Set(atenciones.map(a => a.periodo_cierre))).sort().reverse();

  // Filter dataset by period
  const filtered = atenciones.filter(a => selectedPeriod === 'TODOS' || a.periodo_cierre === selectedPeriod);

  // 1. Data By Profesional
  const profMap: Record<string, {
    dni: string;
    nombre: string;
    tipo: string;
    atenciones: number;
    fechas: Set<string>;
    servicios: Set<string>;
  }> = {};

  filtered.forEach(a => {
    const key = a.dni_profesional || a.nombre_profesional;
    if (!profMap[key]) {
      profMap[key] = {
        dni: a.dni_profesional,
        nombre: a.nombre_profesional,
        tipo: a.tipo_profesional,
        atenciones: 0,
        fechas: new Set(),
        servicios: new Set(),
      };
    }
    profMap[key].atenciones++;
    profMap[key].fechas.add(a.fecha_atencion);
    profMap[key].servicios.add(a.descripcion_servicio);
  });

  const listProfesional = Object.values(profMap)
    .map(p => ({
      dni: p.dni,
      nombre: p.nombre,
      tipo: p.tipo,
      atenciones: p.atenciones,
      dias: p.fechas.size || 1,
      promedio: Math.round((p.atenciones / (p.fechas.size || 1)) * 10) / 10,
      serviciosCount: p.servicios.size,
    }))
    .sort((a, b) => b.atenciones - a.atenciones);

  // 2. Data By EESS
  const eessMap: Record<string, {
    codigo: string;
    nombre: string;
    disa: string;
    atenciones: number;
    profesionales: Set<string>;
    pacientes: Set<string>;
  }> = {};

  filtered.forEach(a => {
    const key = a.codigo_eess || a.nombre_eess;
    if (!eessMap[key]) {
      eessMap[key] = {
        codigo: a.codigo_eess,
        nombre: a.nombre_eess,
        disa: a.disa,
        atenciones: 0,
        profesionales: new Set(),
        pacientes: new Set(),
      };
    }
    eessMap[key].atenciones++;
    eessMap[key].profesionales.add(a.dni_profesional);
    eessMap[key].pacientes.add(a.doc_identidad);
  });

  const listEess = Object.values(eessMap)
    .map(e => ({
      codigo: e.codigo,
      nombre: e.nombre,
      disa: e.disa,
      atenciones: e.atenciones,
      profesionalesCount: e.profesionales.size,
      pacientesCount: e.pacientes.size,
      promedioPorProf: Math.round((e.atenciones / (e.profesionales.size || 1)) * 10) / 10,
    }))
    .sort((a, b) => b.atenciones - a.atenciones);

  // 3. Data By Period
  const periodMap: Record<string, {
    atenciones: number;
    diasTrabajados: Set<string>;
    eess: Set<string>;
    profesionales: Set<string>;
    tarifa: number;
  }> = {};

  atenciones.forEach(a => {
    const key = a.periodo_cierre;
    if (!periodMap[key]) {
      periodMap[key] = {
        atenciones: 0,
        diasTrabajados: new Set(),
        eess: new Set(),
        profesionales: new Set(),
        tarifa: 0,
      };
    }
    periodMap[key].atenciones++;
    periodMap[key].diasTrabajados.add(a.fecha_atencion);
    periodMap[key].eess.add(a.nombre_eess);
    periodMap[key].profesionales.add(a.dni_profesional);
    periodMap[key].tarifa += Number(a.tarifa) || 0;
  });

  const listPeriodo = Object.entries(periodMap)
    .map(([p, data]) => ({
      periodo: p,
      atenciones: data.atenciones,
      dias: data.diasTrabajados.size,
      eessCount: data.eess.size,
      profCount: data.profesionales.size,
      tarifa: data.tarifa,
      promedioDiario: Math.round((data.atenciones / (data.diasTrabajados.size || 1)) * 10) / 10,
    }))
    .sort((a, b) => b.periodo.localeCompare(a.periodo));

  const handlePrintPdf = () => {
    const exportRows = listProfesional.map(p => ({
      profesional: p.nombre,
      tipo: p.tipo,
      atenciones: p.atenciones,
      dias: p.dias,
      promedio: p.promedio,
    }));
    PdfService.generateReporteProductividad(exportRows, selectedPeriod);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Award className="w-6 h-6 text-indigo-600" />
            <span>C.2. Reporte de Productividad Asistencial</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Análisis de rendimiento y carga de trabajo por profesional, centro de salud y período
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Período:</span>
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none"
            >
              <option value="TODOS">Todos los Períodos</option>
              {allPeriods.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrintPdf}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('profesional')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'profesional'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Productividad por Profesional
        </button>

        <button
          onClick={() => setActiveTab('eess')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'eess'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Productividad por EESS
        </button>

        <button
          onClick={() => setActiveTab('periodo')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'periodo'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Productividad por Período
        </button>
      </div>

      {/* Tab 1: Por Profesional */}
      {activeTab === 'profesional' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Rendimiento por Profesional de Salud
            </span>
            <span className="text-xs text-slate-500">
              Evaluados: <strong className="text-slate-800 font-mono">{listProfesional.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-4">DNI</th>
                  <th className="py-2.5 px-4">Profesional</th>
                  <th className="py-2.5 px-3">Especialidad / Tipo</th>
                  <th className="py-2.5 px-3 text-center">Días Asistidos</th>
                  <th className="py-2.5 px-3 text-center">Variedad Servicios</th>
                  <th className="py-2.5 px-4 text-right">Total Atenciones</th>
                  <th className="py-2.5 px-4 text-right">Promedio / Día</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listProfesional.map(p => (
                  <tr key={p.dni} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">{p.dni}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.nombre}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {p.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">{p.dias}</td>
                    <td className="py-3 px-3 text-center font-mono">{p.serviciosCount}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">{p.atenciones}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">{p.promedio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Por EESS */}
      {activeTab === 'eess' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Capacidad Resolutiva por Establecimiento (EESS)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-4">Cód. EESS</th>
                  <th className="py-2.5 px-4">Establecimiento de Salud</th>
                  <th className="py-2.5 px-3">DISA / Región</th>
                  <th className="py-2.5 px-3 text-center">Staff Médico</th>
                  <th className="py-2.5 px-3 text-center">Pacientes Únicos</th>
                  <th className="py-2.5 px-4 text-right">Atenciones</th>
                  <th className="py-2.5 px-4 text-right">Promedio / Médico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listEess.map(e => (
                  <tr key={e.codigo + e.nombre} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500">{e.codigo}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{e.nombre}</td>
                    <td className="py-3 px-3 text-slate-600">{e.disa}</td>
                    <td className="py-3 px-3 text-center font-mono">{e.profesionalesCount}</td>
                    <td className="py-3 px-3 text-center font-mono font-semibold">{e.pacientesCount}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">{e.atenciones}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">{e.promedioPorProf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Por Periodo */}
      {activeTab === 'periodo' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Evolución Histórica de Rendimiento Mensual
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-4">Período de Cierre</th>
                  <th className="py-2.5 px-3 text-center">Días con Registro</th>
                  <th className="py-2.5 px-3 text-center">EESS Reportantes</th>
                  <th className="py-2.5 px-3 text-center">Profesionales Activos</th>
                  <th className="py-2.5 px-4 text-right">Total Atenciones</th>
                  <th className="py-2.5 px-4 text-right">Promedio Diario</th>
                  <th className="py-2.5 px-4 text-right">Facturación Estimada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listPeriodo.map(p => (
                  <tr key={p.periodo} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-extrabold text-blue-600">{p.periodo}</td>
                    <td className="py-3 px-3 text-center font-mono">{p.dias}</td>
                    <td className="py-3 px-3 text-center font-mono">{p.eessCount}</td>
                    <td className="py-3 px-3 text-center font-mono">{p.profCount}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{p.atenciones}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">{p.promedioDiario}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                      S/ {p.tarifa.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
