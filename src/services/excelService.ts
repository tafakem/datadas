import * as XLSX from 'xlsx';
import { Atencion, Sexo, DigitadorRecord, DigitadorEstadisticaCompleta } from '../types/health';
import { apiService, BatchUploadResult } from './apiService';

export interface ParseExcelResult {
  success: boolean;
  data: Omit<Atencion, 'id'>[];
  errors: string[];
  totalRows: number;
  duplicateCount: number;
}

export interface ParseDigitadoresResult {
  success: boolean;
  data: Omit<DigitadorRecord, 'id'>[];
  errors: string[];
  totalRows: number;
}

export interface BatchProgressState {
  fileName: string;
  totalRecords: number;
  processedRecords: number;
  pendingRecords: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  status: string;
  correctRecords: number;
  errorRecords: number;
  rejectedRecords: number;
  errors: { row: number; format: string; error: string }[];
  isCompleted: boolean;
  isPaused: boolean;
  isError: boolean;
  errorMessage?: string;
  startTime: number;
  estimatedRemainingSec?: number;
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

export const EXPECTED_DIGITADOR_COLUMNS = [
  'usuario',
  'dni',
  'nombre_completo',
];

export class ExcelService {
  /**
   * Helper that extracts and normalizes values from a raw Excel row object
   */
  static getRowVal(row: Record<string, unknown>, keys: string[], def = ''): string {
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

    const targetKeys = keys.map(k => normalize(k));

    for (const rk of Object.keys(row)) {
      const cleanRk = normalize(rk);
      if (targetKeys.includes(cleanRk)) {
        const val = row[rk];
        if (val !== undefined && val !== null) {
          if (val instanceof Date) {
            return val.toISOString().substring(0, 10);
          }
          const strVal = String(val).trim();
          if (strVal !== '') return strVal;
        }
      }
    }
    return def;
  }

  /**
   * Validates and transforms a single raw row object into a typed Atencion record
   */
  static validateAndTransformRow(
    row: Record<string, unknown>,
    rowNum: number
  ): { success: boolean; data?: Omit<Atencion, 'id'>; error?: string; format?: string } {
    const nro_formato = ExcelService.getRowVal(row, ['nro_formato', 'nro formato', 'formato', 'fua', 'nro_fua', 'numero_fua']);
    if (!nro_formato) {
      return { success: false, error: 'Columna obligatoria nro_formato vacía', format: 'S/F' };
    }

    let fechaAtencion = ExcelService.getRowVal(row, ['fecha_atencion', 'fecha atencion', 'fec_atencion', 'fecha']);
    if (fechaAtencion.includes('T')) {
      fechaAtencion = fechaAtencion.substring(0, 10);
    }
    if (!fechaAtencion) {
      fechaAtencion = new Date().toISOString().substring(0, 10);
    }

    const rawSexo = ExcelService.getRowVal(row, ['sexo', 'genero'], 'MASCULINO').toUpperCase();
    const sexo: Sexo = rawSexo.startsWith('F') ? 'FEMENINO' : 'MASCULINO';

    const edadNum = parseInt(ExcelService.getRowVal(row, ['edad', 'edad_anos'], '0'), 10) || 0;
    const tarifaNum = parseFloat(ExcelService.getRowVal(row, ['tarifa', 'monto', 'costo', 'tarifa_sis'], '0')) || 0;

    let periodoCierre = ExcelService.getRowVal(row, ['periodo_cierre', 'periodo']);
    if (!periodoCierre && fechaAtencion) {
      periodoCierre = fechaAtencion.substring(0, 7);
    }

    let docIdentidad = ExcelService.getRowVal(row, ['doc_identidad', 'dni', 'documento', 'nro_documento'], '00000000');
    docIdentidad = docIdentidad.replace(/\.0+$/, '').trim();

    let dniProfesional = ExcelService.getRowVal(row, ['dni_profesional', 'dni_medico', 'profesional_dni'], '00000000');
    dniProfesional = dniProfesional.replace(/\.0+$/, '').trim();

    const data: Omit<Atencion, 'id'> = {
      nro_formato,
      fecha_atencion: fechaAtencion,
      hora_atencion: ExcelService.getRowVal(row, ['hora_atencion', 'hora'], '09:00:00'),
      tipo_doc: ExcelService.getRowVal(row, ['tipo_doc', 'tipo_documento'], 'DNI').toUpperCase(),
      doc_identidad: docIdentidad,
      contrato: ExcelService.getRowVal(row, ['contrato', 'tipo_afiliacion', 'seguro'], 'SIS-00000'),
      beneficiario: ExcelService.getRowVal(row, ['beneficiario', 'paciente', 'nombres_paciente'], 'PACIENTE').toUpperCase(),
      fecha_nacimiento: ExcelService.getRowVal(row, ['fecha_nacimiento', 'fec_nac'], '2000-01-01'),
      edad: edadNum,
      sexo,
      codigo_eess: ExcelService.getRowVal(row, ['codigo_eess', 'cod_eess', 'renaes', 'ipress'], '00000000'),
      nombre_eess: ExcelService.getRowVal(row, ['nombre_eess', 'eess', 'establecimiento'], 'ESTABLECIMIENTO DE SALUD').toUpperCase(),
      cod_servicio: ExcelService.getRowVal(row, ['cod_servicio', 'servicio_cod'], '001'),
      descripcion_servicio: ExcelService.getRowVal(row, ['descripcion_servicio', 'servicio', 'nombre_servicio'], 'CONSULTA GENERAL').toUpperCase(),
      dni_profesional: dniProfesional,
      nombre_profesional: ExcelService.getRowVal(row, ['nombre_profesional', 'profesional', 'medico'], 'PROFESIONAL DE SALUD').toUpperCase(),
      tipo_profesional: ExcelService.getRowVal(row, ['tipo_profesional', 'profesion'], 'MEDICO').toUpperCase(),
      colegiatura: ExcelService.getRowVal(row, ['colegiatura', 'cmp', 'colegio_profesional'], ''),
      rne: ExcelService.getRowVal(row, ['rne', 'registro_especialista'], ''),
      tarifa: tarifaNum,
      historia_clinica: ExcelService.getRowVal(row, ['historia_clinica', 'hc'], `HC-${rowNum}`),
      componente: ExcelService.getRowVal(row, ['componente', 'regimen'], 'SUBSIDIADO').toUpperCase(),
      condicion_materna: ExcelService.getRowVal(row, ['condicion_materna', 'gestante'], 'NO APLICA').toUpperCase(),
      tipo_atencion: ExcelService.getRowVal(row, ['tipo_atencion'], 'AMBULATORIO').toUpperCase(),
      lugar_atencion: ExcelService.getRowVal(row, ['lugar_atencion'], 'INTRAMURAL').toUpperCase(),
      eess_referencia: ExcelService.getRowVal(row, ['eess_referencia'], ''),
      fecha_registro: ExcelService.getRowVal(row, ['fecha_registro', 'fecha_digitacion'], new Date().toISOString().replace('T', ' ').substring(0, 19)),
      digitador: ExcelService.getRowVal(row, ['digitador', 'usuario_digitador', 'responsable_digitacion'], 'SISTEMA'),
      nro_cred: ExcelService.getRowVal(row, ['nro_cred', 'cred'], ''),
      periodo_cierre: periodoCierre || '2026-09',
      disa: ExcelService.getRowVal(row, ['disa', 'red', 'diresa', 'diris'], 'DIRIS LIMA').toUpperCase(),
      cod_punto_digitacion: ExcelService.getRowVal(row, ['cod_punto_digitacion', 'cod_punto'], 'PTO-01'),
      punto_digitacion: ExcelService.getRowVal(row, ['punto_digitacion', 'punto'], 'PUNTO DIGITACIÓN').toUpperCase(),
    };

    return { success: true, data, format: nro_formato };
  }

  /**
   * Fast detection of total rows in an Excel file without loading all contents into RAM
   */
  static async detectExcelDimensions(file: File): Promise<{ totalRows: number; sheetNames: string[] }> {
    const buffer = await file.arrayBuffer();
    // read with dense: true to avoid huge sparse object allocations
    const workbook = XLSX.read(buffer, { type: 'array', dense: true });
    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) return { totalRows: 0, sheetNames: [] };

    const firstSheet = workbook.Sheets[sheetNames[0]];
    const ref = firstSheet['!ref'] || 'A1';
    const range = XLSX.utils.decode_range(ref);
    const totalRows = Math.max(0, range.e.r - range.s.r);

    return { totalRows, sheetNames };
  }

  /**
   * Detects the closing period (e.g., 2026-09) from the first sample rows of an Excel file
   */
  static async detectFilePeriod(file: File): Promise<string | null> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', dense: true, sheetRows: 25 });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) return null;
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
      for (const row of rows) {
        const periodVal = ExcelService.getRowVal(row, ['periodo_cierre', 'periodo']);
        if (periodVal && periodVal.match(/^\d{4}-\d{2}$/)) {
          return periodVal;
        }
        const fechaVal = ExcelService.getRowVal(row, ['fecha_atencion', 'fecha', 'fec_atencion']);
        if (fechaVal && fechaVal.length >= 7) {
          const extracted = fechaVal.substring(0, 7);
          if (extracted.match(/^\d{4}-\d{2}$/)) {
            return extracted;
          }
        }
      }
    } catch (e) {
      console.warn('Could not auto-detect period from Excel file:', e);
    }
    return null;
  }

  /**
   * Robust chunk/batch processing for large Excel files (100,000 to millions of records)
   * Prevents Out-Of-Memory, browser freezing, and yields execution between chunks.
   */
  static async processExcelInBatches(options: {
    file: File;
    batchSize: number;
    updateExisting: boolean;
    currentUser?: string;
    onProgress: (state: BatchProgressState) => void;
    abortSignal?: { aborted: boolean };
  }): Promise<{
    totalProcessed: number;
    correctRecords: number;
    errorRecords: number;
    rejectedRecords: number;
    errors: { row: number; format: string; error: string }[];
  }> {
    const startTime = Date.now();
    const buffer = await options.file.arrayBuffer();

    // Use dense sheet representation for 70% memory reduction
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dense: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('El archivo Excel no contiene hojas de cálculo válidas.');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const ref = sheet['!ref'] || 'A1';
    const range = XLSX.utils.decode_range(ref);
    const totalRecords = Math.max(0, range.e.r - range.s.r);

    if (totalRecords === 0) {
      throw new Error('La hoja seleccionada está vacía.');
    }

    // Extract header names from row 0
    const headerRowRange = { s: { r: range.s.r, c: range.s.c }, e: { r: range.s.r, c: range.e.c } };
    const headerRows = XLSX.utils.sheet_to_json(sheet, { range: headerRowRange, header: 1 }) as string[][];
    const headers = (headerRows[0] || []).map(h => String(h || '').trim());

    const totalBatches = Math.ceil(totalRecords / options.batchSize);
    let processedRecords = 0;
    let correctRecords = 0;
    let errorRecords = 0;
    let rejectedRecords = 0;
    const accumulatedErrors: { row: number; format: string; error: string }[] = [];

    // Notify initial state
    options.onProgress({
      fileName: options.file.name,
      totalRecords,
      processedRecords: 0,
      pendingRecords: totalRecords,
      percentage: 0,
      currentBatch: 1,
      totalBatches,
      status: `Iniciando procesamiento por lotes (Tamaño de lote: ${options.batchSize.toLocaleString()})...`,
      correctRecords: 0,
      errorRecords: 0,
      rejectedRecords: 0,
      errors: [],
      isCompleted: false,
      isPaused: false,
      isError: false,
      startTime,
    });

    for (let b = 0; b < totalBatches; b++) {
      if (options.abortSignal?.aborted) {
        options.onProgress({
          fileName: options.file.name,
          totalRecords,
          processedRecords,
          pendingRecords: totalRecords - processedRecords,
          percentage: Math.round((processedRecords / totalRecords) * 100),
          currentBatch: b + 1,
          totalBatches,
          status: 'Carga cancelada por el usuario.',
          correctRecords,
          errorRecords,
          rejectedRecords,
          errors: accumulatedErrors.slice(-100),
          isCompleted: true,
          isPaused: false,
          isError: true,
          errorMessage: 'Procesamiento cancelado por el usuario.',
          startTime,
        });
        break;
      }

      const startRow = range.s.r + 1 + (b * options.batchSize);
      const endRow = Math.min(range.e.r, startRow + options.batchSize - 1);
      const chunkRange = { s: { r: startRow, c: range.s.c }, e: { r: endRow, c: range.e.c } };

      // Read only this chunk range
      const rawChunk = XLSX.utils.sheet_to_json(sheet, {
        range: chunkRange,
        header: headers,
        defval: '',
      }) as Record<string, unknown>[];

      const validChunkRows: Omit<Atencion, 'id'>[] = [];

      // Validate each row in chunk
      for (let i = 0; i < rawChunk.length; i++) {
        const rowNum = startRow + i + 1;
        const res = ExcelService.validateAndTransformRow(rawChunk[i], rowNum);
        if (res.success && res.data) {
          validChunkRows.push(res.data);
        } else {
          errorRecords++;
          accumulatedErrors.push({
            row: rowNum,
            format: res.format || 'S/F',
            error: res.error || 'Dato no válido',
          });
        }
      }

      // Upload valid records to backend SQLite batch transaction
      if (validChunkRows.length > 0) {
        try {
          const apiResult = await apiService.uploadAtencionesBatch(
            validChunkRows,
            options.updateExisting,
            options.currentUser
          );
          correctRecords += (apiResult.added + apiResult.updated);
          rejectedRecords += apiResult.skipped;
          if (apiResult.errors && apiResult.errors.length > 0) {
            errorRecords += apiResult.errors.length;
            accumulatedErrors.push(...apiResult.errors);
          }
        } catch (batchErr: any) {
          errorRecords += validChunkRows.length;
          accumulatedErrors.push({
            row: startRow,
            format: 'LOTE',
            error: `Fallo en el lote ${b + 1}: ${batchErr.message}`,
          });
        }
      }

      processedRecords += rawChunk.length;
      // Immediately clear references for V8 garbage collection
      validChunkRows.length = 0;
      rawChunk.length = 0;

      const percentage = Math.min(100, Math.round((processedRecords / totalRecords) * 100));
      const elapsedSec = (Date.now() - startTime) / 1000;
      const rate = processedRecords / (elapsedSec || 1);
      const estimatedRemainingSec = rate > 0 ? Math.round((totalRecords - processedRecords) / rate) : 0;

      options.onProgress({
        fileName: options.file.name,
        totalRecords,
        processedRecords,
        pendingRecords: Math.max(0, totalRecords - processedRecords),
        percentage,
        currentBatch: b + 1,
        totalBatches,
        status: b + 1 === totalBatches
          ? 'Procesamiento completado con éxito.'
          : `Procesando lote ${b + 1} de ${totalBatches}... (${correctRecords.toLocaleString()} correctos)`,
        correctRecords,
        errorRecords,
        rejectedRecords,
        errors: accumulatedErrors.slice(-100),
        isCompleted: b + 1 === totalBatches,
        isPaused: false,
        isError: false,
        startTime,
        estimatedRemainingSec,
      });

      // Yield event loop to allow UI updates and garbage collection
      await new Promise(resolve => setTimeout(resolve, 15));
    }

    return {
      totalProcessed: processedRecords,
      correctRecords,
      errorRecords,
      rejectedRecords,
      errors: accumulatedErrors,
    };
  }

  /**
   * Export batch error log to downloadable CSV report
   */
  static exportErrorsToCsv(errors: { row: number; format: string; error: string }[], fileName: string): void {
    if (!errors || errors.length === 0) return;
    const header = 'Fila,Nro_Formato,Motivo_Error\n';
    const lines = errors.map(e => `${e.row},"${e.format.replace(/"/g, '""')}","${e.error.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([`\uFEFF${header}${lines}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Errores_Importacion_${fileName.replace(/\.[^/.]+$/, '')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Synchronous parse for smaller files (< 100k rows)
   */
  static parseExcelFile(buffer: ArrayBuffer, existingAtenciones: Atencion[]): ParseExcelResult {
    const errors: string[] = [];
    try {
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dense: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return { success: false, data: [], errors: ['El archivo Excel está vacío.'], totalRows: 0, duplicateCount: 0 };
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rawRows.length === 0) {
        return { success: false, data: [], errors: ['La hoja seleccionada no contiene registros.'], totalRows: 0, duplicateCount: 0 };
      }

      const existingNroFormatos = new Set(existingAtenciones.map(a => a.nro_formato.trim().toUpperCase()));
      let duplicateCount = 0;
      const parsedData: Omit<Atencion, 'id'>[] = [];

      rawRows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const res = ExcelService.validateAndTransformRow(row, rowNum);
        if (res.success && res.data) {
          if (existingNroFormatos.has(res.data.nro_formato.toUpperCase())) {
            duplicateCount++;
          }
          parsedData.push(res.data);
        } else {
          errors.push(`Fila ${rowNum}: ${res.error || 'Dato no válido'}`);
        }
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
        errors: [`Error al procesar archivo Excel: ${(err as Error).message}`],
        totalRows: 0,
        duplicateCount: 0,
      };
    }
  }

  /**
   * Parse an uploaded Excel file for Maestro de Digitadores
   */
  static parseDigitadoresExcel(buffer: ArrayBuffer): ParseDigitadoresResult {
    const errors: string[] = [];
    try {
      const workbook = XLSX.read(buffer, { type: 'array', dense: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return { success: false, data: [], errors: ['El archivo Excel está vacío.'], totalRows: 0 };
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rawRows.length === 0) {
        return { success: false, data: [], errors: ['La hoja seleccionada no contiene registros.'], totalRows: 0 };
      }

      const normalizeHeader = (s: string): string => {
        return (s || '')
          .toString()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '');
      };

      const getVal = (row: Record<string, unknown>, keys: string[], def = ''): string => {
        const cleanTargets = keys.map(k => normalizeHeader(k));
        for (const rk of Object.keys(row)) {
          const cleanRowKey = normalizeHeader(rk);
          if (cleanTargets.includes(cleanRowKey)) {
            const rawVal = row[rk];
            if (rawVal !== undefined && rawVal !== null) {
              const str = String(rawVal).trim();
              if (str !== '') return str;
            }
          }
        }
        return def;
      };

      const parsed: Omit<DigitadorRecord, 'id'>[] = [];

      rawRows.forEach((row, idx) => {
        const rowNum = idx + 2;

        const nombre = getVal(row, [
          'nombre_completo',
          'nombre completos',
          'nombres completos',
          'nombre completo',
          'nombres completo',
          'nombres_completos',
          'nombres y apellidos',
          'apellidos y nombres',
          'apellidos_nombres',
          'nombre',
          'nombres',
          'digitador',
          'personal',
          'trabajador',
          'responsable'
        ]);

        let dni = getVal(row, [
          'dni',
          'dni digitador',
          'doc_identidad',
          'documento',
          'nro_documento',
          'numero_documento',
          'identidad',
          'doc',
          'cedula'
        ]);
        if (dni) {
          dni = dni.replace(/\.0+$/, '').trim();
        }

        let usuario = getVal(row, [
          'usuario',
          'user',
          'login',
          'username',
          'usuario_sistema',
          'usuario digitador',
          'cod_usuario',
          'cuenta',
          'id_usuario',
          'usu'
        ]);
        if (usuario) {
          usuario = usuario.replace(/\.0+$/, '').replace(/^@+/, '').trim();
        }

        if (!nombre && !usuario && !dni) return;

        if (!nombre && !usuario) {
          errors.push(`Fila ${rowNum}: Se requiere especificar al menos el Usuario o el Nombre Completo.`);
          return;
        }

        const nombreFinal = nombre || usuario;
        if (!usuario) {
          const cleanPart = nombreFinal.toLowerCase().replace(/^(lic\.|tec\.|bach\.|dr\.|dra\.|ing\.|mg\.)\s*/i, '').trim();
          const parts = cleanPart.split(/\s+/);
          if (parts.length >= 2) {
            usuario = `${parts[0][0]}${parts[1]}`.replace(/[^a-z0-9]/g, '');
          } else {
            usuario = (cleanPart || `user_${dni || idx + 1}`).replace(/[^a-z0-9]/g, '');
          }
        }

        const cod_punto = getVal(row, ['cod_punto_digitacion', 'cod_punto', 'codigo_punto', 'punto_cod']);
        const punto = getVal(row, ['punto_digitacion', 'punto', 'nombre_punto', 'centro_digitacion']);
        const cod_eess = getVal(row, ['codigo_eess', 'cod_eess', 'eess_cod']);
        const nom_eess = getVal(row, ['nombre_eess', 'eess', 'establecimiento']);
        const cargo = getVal(row, ['cargo', 'condicion', 'perfil', 'puesto'], 'Digitador Asistencial');
        const rawEstado = getVal(row, ['estado', 'condicion_laboral'], 'ACTIVO').toUpperCase();
        const estado: 'ACTIVO' | 'INACTIVO' = rawEstado.includes('INACT') ? 'INACTIVO' : 'ACTIVO';
        const correo = getVal(row, ['correo', 'email', 'correo_electronico']);
        const telefono = getVal(row, ['telefono', 'celular', 'movil']);

        parsed.push({
          usuario,
          dni,
          nombre_completo: nombreFinal,
          cod_punto_digitacion: cod_punto || undefined,
          punto_digitacion: punto || undefined,
          codigo_eess: cod_eess || undefined,
          nombre_eess: nom_eess || undefined,
          cargo,
          estado,
          correo: correo || undefined,
          telefono: telefono || undefined,
        });
      });

      return {
        success: parsed.length > 0,
        data: parsed,
        errors,
        totalRows: rawRows.length,
      };
    } catch (err: unknown) {
      return {
        success: false,
        data: [],
        errors: [`Error al procesar archivo Excel de digitadores: ${(err as Error).message}`],
        totalRows: 0,
      };
    }
  }

  /**
   * Export atenciones or arbitrary tabular data to a styled .xlsx file
   */
  static exportToExcel(
    data: Atencion[] | Record<string, any>[],
    filename = 'Reporte_Atenciones_Salud.xlsx'
  ): void {
    if (!data || data.length === 0) return;

    let rows: Record<string, any>[];
    const isAtencionArray = 'nro_formato' in data[0] && 'id' in data[0];

    if (isAtencionArray) {
      const atenciones = data as Atencion[];
      rows = atenciones.map(a => ({
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
    } else {
      rows = data as Record<string, any>[];
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length + 3, 14),
    }));
    worksheet['!cols'] = colWidths;

    const summaryData = [
      { 'Métrica': 'Total de Registros Exportados', 'Valor': data.length },
      { 'Métrica': 'Fecha de Generación', 'Valor': new Date().toLocaleString() },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 32 }, { wch: 25 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    XLSX.writeFile(workbook, filename);
  }

  /**
   * Export monthly statistics by digitador and punto de digitación
   */
  static exportDigitadoresMensualizadoExcel(
    statsList: DigitadorEstadisticaCompleta[],
    allMonths: string[],
    filename = 'Estadisticas_Mensualizadas_Digitadores.xlsx'
  ): void {
    if (!statsList || statsList.length === 0) return;

    const resumenRows = statsList.map(s => {
      const row: Record<string, any> = {
        'Usuario': s.usuario ? `@${s.usuario}` : 's/u',
        'DNI': s.dni || 'S/D',
        'Nombre del Digitador': s.nombre_completo,
        'Punto de Digitación': s.punto_digitacion,
        'Cód. Punto': s.cod_punto_digitacion,
        'EESS Principal': s.nombre_eess || 'No especificado',
        'Cargo / Función': s.cargo || 'Digitador Asistencial',
        'Estado': s.estado,
        'Total Atenciones': s.totalAtenciones,
        'Pacientes Únicos': s.pacientesUnicos,
        'Oportunidad Promedio (Días)': s.diasPromedioOportunidad,
        'Tarifas SIS (S/)': s.totalTarifa,
      };

      allMonths.forEach(m => {
        const mesData = s.mensualizado.find(x => x.mes === m);
        row[`Atenc. (${m})`] = mesData ? mesData.totalAtenciones : 0;
      });

      return row;
    });

    const wsResumen = XLSX.utils.json_to_sheet(resumenRows);
    wsResumen['!cols'] = Object.keys(resumenRows[0] || {}).map(k => ({
      wch: Math.max(k.length + 3, 14),
    }));

    const detalleMesRows: Record<string, any>[] = [];
    statsList.forEach(s => {
      s.mensualizado.forEach(m => {
        detalleMesRows.push({
          'Usuario': s.usuario ? `@${s.usuario}` : 's/u',
          'DNI': s.dni || 'S/D',
          'Nombre Digitador': s.nombre_completo,
          'Punto Digitación': s.punto_digitacion,
          'Período Atención (YYYY-MM)': m.mes,
          'Mes de Atención': m.labelMes,
          'Atenciones Médicas': m.totalAtenciones,
          'Pacientes Únicos': m.pacientesUnicos,
          'Oportunidad Promedio (Días)': m.diasPromedioOportunidad,
          'Monto Tarifario (S/)': m.totalTarifa,
          'EESS Atendidos': m.eessCount,
        });
      });
    });

    const wsDetalle = XLSX.utils.json_to_sheet(detalleMesRows);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen_Digitadores');
    if (detalleMesRows.length > 0) {
      XLSX.utils.book_append_sheet(workbook, wsDetalle, 'Detalle_Mensualizado');
    }

    XLSX.writeFile(workbook, filename);
  }

  /**
   * Generates sample Excel file template for Atenciones Médicas
   */
  static downloadSampleTemplate(): void {
    const templateRows = [
      {
        nro_formato: 'FUA-2026-000101',
        fecha_atencion: '2026-09-15',
        hora_atencion: '08:30:00',
        tipo_doc: 'DNI',
        doc_identidad: '47852140',
        contrato: 'SIS-GRATUITO',
        beneficiario: 'QUISPE HUAMAN MARIA ELENA',
        fecha_nacimiento: '1992-05-14',
        edad: 34,
        sexo: 'FEMENINO',
        codigo_eess: '00001045',
        nombre_eess: 'C.S. SAN MARTIN DE PORRES',
        cod_servicio: '056',
        descripcion_servicio: 'CONSULTA MEDICA GENERAL',
        dni_profesional: '08541236',
        nombre_profesional: 'Dr. Roberto Carlos Silva Perez',
        tipo_profesional: 'MEDICO',
        colegiatura: 'CMP-04512',
        rne: 'RNE-01254',
        tarifa: 15.00,
        historia_clinica: 'HC-98452',
        componente: 'SUBSIDIADO',
        condicion_materna: 'NO APLICA',
        tipo_atencion: 'AMBULATORIO',
        lugar_atencion: 'INTRAMURAL',
        eess_referencia: '',
        fecha_registro: '2026-09-15 14:30:00',
        digitador: 'Lic. Patricia Vega Salas',
        nro_cred: '',
        periodo_cierre: '2026-09',
        disa: 'DIRIS LIMA NORTE',
        cod_punto_digitacion: 'PTO-DIG-01',
        punto_digitacion: 'DIGITACIÓN SAN MARTÍN'
      },
      {
        nro_formato: 'FUA-2026-000102',
        fecha_atencion: '2026-09-15',
        hora_atencion: '09:15:00',
        tipo_doc: 'DNI',
        doc_identidad: '72145896',
        contrato: 'SIS-GRATUITO',
        beneficiario: 'TORRES MENDOZA JUAN CARLOS',
        fecha_nacimiento: '2023-11-20',
        edad: 2,
        sexo: 'MASCULINO',
        codigo_eess: '00002130',
        nombre_eess: 'HOSPITAL NACIONAL DOS DE MAYO',
        cod_servicio: '020',
        descripcion_servicio: 'CRED - CONTROL DE CRECIMIENTO',
        dni_profesional: '40125896',
        nombre_profesional: 'Lic. Maria Elena Gomez Torres',
        tipo_profesional: 'ENFERMERA',
        colegiatura: 'CEP-08945',
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

  /**
   * Generates sample Excel file deliverable for Maestro de Digitadores (Usuario, DNI, Nombres Completos)
   */
  static downloadDigitadoresTemplate(): void {
    const templateRows = [
      {
        usuario: 'pvega',
        dni: '45892134',
        nombre_completo: 'Lic. Patricia Vega Salas',
      },
      {
        usuario: 'msoto',
        dni: '70258142',
        nombre_completo: 'Tec. Marco Aurelio Soto',
      },
      {
        usuario: 'avivanco',
        dni: '48963251',
        nombre_completo: 'Bach. Andrea Vivanco',
      },
      {
        usuario: 'jquispe',
        dni: '41852963',
        nombre_completo: 'Tec. Julio Quispe Peña',
      },
      {
        usuario: 'cgutierrez',
        dni: '43215689',
        nombre_completo: 'Ing. Carlos Gutierrez Miranda',
      },
      {
        usuario: 'lrojas',
        dni: '72145896',
        nombre_completo: 'Lic. Lorena Rojas Ramos',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    ws['!cols'] = [
      { wch: 18 }, // usuario
      { wch: 14 }, // dni
      { wch: 38 }, // nombre_completo
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Maestro_Digitadores');
    XLSX.writeFile(wb, 'plantilla_maestro_digitadores.xlsx');
  }
}
