import * as XLSX from 'xlsx';
import { Atencion, Sexo } from '../types/health';

export interface ParseExcelResult {
  success: boolean;
  data: Omit<Atencion, 'id'>[];
  errors: string[];
  totalRows: number;
  duplicateCount: number;
}

export const EXPECTED_EXCEL_COLUMNS = [
  'nro_formato',
  'fecha_atencion',
  'hora_atencion',
  'tipo_doc',
  'doc_identidad',
  'contrato',
  'beneficiario',
  'fecha_nacimiento',
  'edad',
  'sexo',
  'codigo_eess',
  'nombre_eess',
  'cod_servicio',
  'descripcion_servicio',
  'dni_profesional',
  'nombre_profesional',
  'tipo_profesional',
  'colegiatura',
  'rne',
  'tarifa',
  'historia_clinica',
  'componente',
  'condicion_materna',
  'tipo_atencion',
  'lugar_atencion',
  'eess_referencia',
  'fecha_registro',
  'digitador',
  'nro_cred',
  'periodo_cierre',
  'disa',
  'cod_punto_digitacion',
  'punto_digitacion',
];

export class ExcelService {
  /**
   * Parse an uploaded Excel file array buffer
   */
  static parseExcelFile(buffer: ArrayBuffer, existingAtenciones: Atencion[]): ParseExcelResult {
    const errors: string[] = [];
    try {
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return { success: false, data: [], errors: ['El archivo Excel está vacío.'], totalRows: 0, duplicateCount: 0 };
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rawRows.length === 0) {
        return { success: false, data: [], errors: ['La hoja seleccionada no contiene registros.'], totalRows: 0, duplicateCount: 0 };
      }

      // Check column mapping
      const firstRowKeys = Object.keys(rawRows[0]).map(k => k.trim().toLowerCase());
      const missingKeyCols = ['nro_formato', 'fecha_atencion', 'doc_identidad', 'nombre_eess', 'descripcion_servicio'].filter(
        c => !firstRowKeys.includes(c)
      );

      if (missingKeyCols.length > 0) {
        errors.push(`Faltan columnas obligatorias en la cabecera: ${missingKeyCols.join(', ')}`);
        return { success: false, data: [], errors, totalRows: rawRows.length, duplicateCount: 0 };
      }

      const existingNroFormatos = new Set(existingAtenciones.map(a => a.nro_formato.trim().toUpperCase()));
      let duplicateCount = 0;
      const parsedData: Omit<Atencion, 'id'>[] = [];

      rawRows.forEach((row, idx) => {
        const rowNum = idx + 2; // Excel line 2 is row 1
        
        // Normalize helper
        const getVal = (key: string, def = ''): string => {
          const matchedKey = Object.keys(row).find(k => k.trim().toLowerCase() === key);
          if (!matchedKey || row[matchedKey] === null || row[matchedKey] === undefined) return def;
          const val = row[matchedKey];
          if (val instanceof Date) {
            return val.toISOString().substring(0, 10);
          }
          return String(val).trim();
        };

        const nro_formato = getVal('nro_formato');
        if (!nro_formato) {
          errors.push(`Fila ${rowNum}: 'nro_formato' está vacío.`);
          return;
        }

        if (existingNroFormatos.has(nro_formato.toUpperCase())) {
          duplicateCount++;
        }

        const rawSexo = getVal('sexo', 'MASCULINO').toUpperCase();
        const sexo: Sexo = rawSexo.startsWith('F') ? 'FEMENINO' : 'MASCULINO';
        const edadNum = parseInt(getVal('edad', '0'), 10) || 0;
        const tarifaNum = parseFloat(getVal('tarifa', '0')) || 0;

        let fechaAtencion = getVal('fecha_atencion');
        if (fechaAtencion.includes('T')) {
          fechaAtencion = fechaAtencion.substring(0, 10);
        }

        let periodoCierre = getVal('periodo_cierre');
        if (!periodoCierre && fechaAtencion) {
          periodoCierre = fechaAtencion.substring(0, 7);
        }

        const atencion: Omit<Atencion, 'id'> = {
          nro_formato,
          fecha_atencion: fechaAtencion || new Date().toISOString().substring(0, 10),
          hora_atencion: getVal('hora_atencion', '09:00:00'),
          tipo_doc: getVal('tipo_doc', 'DNI').toUpperCase(),
          doc_identidad: getVal('doc_identidad', '00000000'),
          contrato: getVal('contrato', 'SIS-00000'),
          beneficiario: getVal('beneficiario', 'PACIENTE').toUpperCase(),
          fecha_nacimiento: getVal('fecha_nacimiento', '2000-01-01'),
          edad: edadNum,
          sexo,
          codigo_eess: getVal('codigo_eess', '00000000'),
          nombre_eess: getVal('nombre_eess', 'ESTABLECIMIENTO DE SALUD').toUpperCase(),
          cod_servicio: getVal('cod_servicio', '001'),
          descripcion_servicio: getVal('descripcion_servicio', 'CONSULTA GENERAL').toUpperCase(),
          dni_profesional: getVal('dni_profesional', '00000000'),
          nombre_profesional: getVal('nombre_profesional', 'PROFESIONAL DE SALUD').toUpperCase(),
          tipo_profesional: getVal('tipo_profesional', 'MEDICO').toUpperCase(),
          colegiatura: getVal('colegiatura', ''),
          rne: getVal('rne', ''),
          tarifa: tarifaNum,
          historia_clinica: getVal('historia_clinica', `HC-${rowNum}`),
          componente: getVal('componente', 'SUBSIDIADO').toUpperCase(),
          condicion_materna: getVal('condicion_materna', 'NO APLICA').toUpperCase(),
          tipo_atencion: getVal('tipo_atencion', 'AMBULATORIO').toUpperCase(),
          lugar_atencion: getVal('lugar_atencion', 'INTRAMURAL').toUpperCase(),
          eess_referencia: getVal('eess_referencia', ''),
          fecha_registro: getVal('fecha_registro', new Date().toISOString().replace('T', ' ').substring(0, 19)),
          digitador: getVal('digitador', 'SISTEMA'),
          nro_cred: getVal('nro_cred', ''),
          periodo_cierre: periodoCierre || '2026-09',
          disa: getVal('disa', 'DIRIS LIMA').toUpperCase(),
          cod_punto_digitacion: getVal('cod_punto_digitacion', 'PTO-01'),
          punto_digitacion: getVal('punto_digitacion', 'PUNTO DIGITACIÓN').toUpperCase(),
        };

        parsedData.push(atencion);
      });

      return {
        success: parsedData.length > 0,
        data: parsedData,
        errors,
        totalRows: rawRows.length,
        duplicateCount,
      };
    } catch (err: unknown) {
      return {
        success: false,
        data: [],
        errors: [`Error crítico al procesar archivo Excel: ${(err as Error).message}`],
        totalRows: 0,
        duplicateCount: 0,
      };
    }
  }

  /**
   * Export atenciones to a styled .xlsx file
   */
  static exportToExcel(atenciones: Atencion[], filename = 'Reporte_Atenciones_Salud.xlsx'): void {
    const rows = atenciones.map(a => ({
      'ID': a.id,
      'N° Formato': a.nro_formato,
      'Fecha Atención': a.fecha_atencion,
      'Hora': a.hora_atencion,
      'Tipo Doc': a.tipo_doc,
      'N° Documento': a.doc_identidad,
      'Paciente / Beneficiario': a.beneficiario,
      'Edad': a.edad,
      'Sexo': a.sexo,
      'Código EESS': a.codigo_eess,
      'Establecimiento de Salud (EESS)': a.nombre_eess,
      'Cód. Servicio': a.cod_servicio,
      'Descripción Servicio': a.descripcion_servicio,
      'DNI Profesional': a.dni_profesional,
      'Nombre Profesional': a.nombre_profesional,
      'Tipo Profesional': a.tipo_profesional,
      'Colegiatura': a.colegiatura,
      'RNE': a.rne,
      'Tarifa (S/)': a.tarifa,
      'Historia Clínica': a.historia_clinica,
      'Componente': a.componente,
      'Condición Materna': a.condicion_materna,
      'Tipo Atención': a.tipo_atencion,
      'Lugar Atención': a.lugar_atencion,
      'Período Cierre': a.periodo_cierre,
      'DISA / Región': a.disa,
      'Punto Digitación': a.punto_digitacion,
      'Digitador': a.digitador,
      'Fecha Registro': a.fecha_registro,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length + 3, 14),
    }));
    worksheet['!cols'] = colWidths;

    // Create summary sheet
    const summaryData = [
      { 'Métrica': 'Total de Atenciones Exportadas', 'Valor': atenciones.length },
      { 'Métrica': 'Fecha de Generación', 'Valor': new Date().toLocaleString() },
      { 'Métrica': 'Establecimientos Distintos', 'Valor': new Set(atenciones.map(a => a.nombre_eess)).size },
      { 'Métrica': 'Profesionales Distintos', 'Valor': new Set(atenciones.map(a => a.dni_profesional)).size },
      { 'Métrica': 'Monto Total Facturado (S/)', 'Valor': atenciones.reduce((acc, a) => acc + Number(a.tarifa || 0), 0).toFixed(2) },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 32 }, { wch: 25 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Atenciones');
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    XLSX.writeFile(workbook, filename);
  }

  /**
   * Generates the sample Excel file deliverable for users to download
   */
  static downloadSampleTemplate(): void {
    const templateRows = [
      {
        nro_formato: 'F-202609-00101',
        fecha_atencion: '2026-09-15',
        hora_atencion: '08:30:00',
        tipo_doc: 'DNI',
        doc_identidad: '71234567',
        contrato: 'SIS-2026001',
        beneficiario: 'ALVAREZ QUISPE CARLOS',
        fecha_nacimiento: '1992-05-14',
        edad: 34,
        sexo: 'MASCULINO',
        codigo_eess: '00001245',
        nombre_eess: 'C.S. SAN MARTIN DE PORRES',
        cod_servicio: '001',
        descripcion_servicio: 'CONSULTA MÉDICA GENERAL',
        dni_profesional: '45128963',
        nombre_profesional: 'Mendoza Ramos Carlos Alberto',
        tipo_profesional: 'MEDICO',
        colegiatura: 'CMP 45892',
        rne: 'RNE 21458',
        tarifa: 15.00,
        historia_clinica: 'HC-94215',
        componente: 'SUBSIDIADO',
        condicion_materna: 'NO APLICA',
        tipo_atencion: 'AMBULATORIO',
        lugar_atencion: 'INTRAMURAL',
        eess_referencia: '',
        fecha_registro: '2026-09-15 08:45:00',
        digitador: 'Lic. Patricia Vega Salas',
        nro_cred: '',
        periodo_cierre: '2026-09',
        disa: 'DIRIS LIMA NORTE',
        cod_punto_digitacion: 'PTO-DIG-01',
        punto_digitacion: 'DIGITACIÓN SAN MARTÍN'
      },
      {
        nro_formato: 'F-202609-00102',
        fecha_atencion: '2026-09-15',
        hora_atencion: '09:15:00',
        tipo_doc: 'DNI',
        doc_identidad: '74561238',
        contrato: 'SIS-2026002',
        beneficiario: 'FLORES HUERTA ROSA MARIA',
        fecha_nacimiento: '1998-11-20',
        edad: 27,
        sexo: 'FEMENINO',
        codigo_eess: '00001245',
        nombre_eess: 'C.S. SAN MARTIN DE PORRES',
        cod_servicio: '003',
        descripcion_servicio: 'CONTROL PRENATAL INTEGRAL',
        dni_profesional: '72589634',
        nombre_profesional: 'Paredes Rios Maria Cecilia',
        tipo_profesional: 'OBSTETRA',
        colegiatura: 'COP 18962',
        rne: '',
        tarifa: 18.00,
        historia_clinica: 'HC-88412',
        componente: 'SUBSIDIADO',
        condicion_materna: 'GESTANTE',
        tipo_atencion: 'AMBULATORIO',
        lugar_atencion: 'INTRAMURAL',
        eess_referencia: '',
        fecha_registro: '2026-09-15 09:30:00',
        digitador: 'Lic. Patricia Vega Salas',
        nro_cred: '',
        periodo_cierre: '2026-09',
        disa: 'DIRIS LIMA NORTE',
        cod_punto_digitacion: 'PTO-DIG-01',
        punto_digitacion: 'DIGITACIÓN SAN MARTÍN'
      },
      {
        nro_formato: 'F-202609-00103',
        fecha_atencion: '2026-09-16',
        hora_atencion: '10:00:00',
        tipo_doc: 'DNI',
        doc_identidad: '81234901',
        contrato: 'SIS-2026003',
        beneficiario: 'SANCHEZ LEON THIAGO ANDRE',
        fecha_nacimiento: '2023-04-10',
        edad: 3,
        sexo: 'MASCULINO',
        codigo_eess: '00004512',
        nombre_eess: 'C.S. JESUS MARIA',
        cod_servicio: '002',
        descripcion_servicio: 'CONTROL DE CRECIMIENTO Y DESARROLLO (CRED)',
        dni_profesional: '10254789',
        nombre_profesional: 'Quispe Flores Elena Beatriz',
        tipo_profesional: 'ENFERMERA(O)',
        colegiatura: 'CEP 32415',
        rne: '',
        tarifa: 12.00,
        historia_clinica: 'HC-63201',
        componente: 'SUBSIDIADO',
        condicion_materna: 'NO APLICA',
        tipo_atencion: 'AMBULATORIO',
        lugar_atencion: 'INTRAMURAL',
        eess_referencia: '',
        fecha_registro: '2026-09-16 10:20:00',
        digitador: 'Tec. Marco Aurelio Soto',
        nro_cred: 'CRED-504',
        periodo_cierre: '2026-09',
        disa: 'DIRIS LIMA CENTRO',
        cod_punto_digitacion: 'PTO-DIG-02',
        punto_digitacion: 'DIGITACIÓN JESÚS MARÍA'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla_Atenciones');
    XLSX.writeFile(wb, 'plantilla_atenciones_ejemplo.xlsx');
  }
}
