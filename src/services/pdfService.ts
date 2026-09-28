import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Atencion } from '../types/health';

export interface PdfEstadisticaOptions {
  titulo: string;
  subtitulo?: string;
  headers: string[];
  rows: (string | number)[][];
  resumenKpis?: { label: string; valor: string | number }[];
  orientation?: 'portrait' | 'landscape';
  filename?: string;
}

export class PdfService {
  /**
   * Generates a generic, institutional statistical PDF report with KPI cards and data table
   */
  static generateEstadisticaPdf({
    titulo,
    subtitulo = 'MINSA - Sistema Web de Estadísticas de Salud',
    headers,
    rows,
    resumenKpis = [],
    orientation = 'landscape',
    filename,
  }: PdfEstadisticaOptions): void {
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const totalPagesExp = '{total_pages_count_string}';
    const now = new Date();
    const fechaHora = now.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 38;

    // Draw KPI Summary cards on the first page if provided
    if (resumenKpis.length > 0) {
      const cardCount = Math.min(resumenKpis.length, 5);
      const margin = 14;
      const totalWidth = pageWidth - margin * 2;
      const cardSpacing = 3;
      const cardWidth = (totalWidth - cardSpacing * (cardCount - 1)) / cardCount;
      const cardHeight = 13;

      resumenKpis.slice(0, cardCount).forEach((kpi, idx) => {
        const x = margin + idx * (cardWidth + cardSpacing);
        doc.setFillColor(241, 245, 249); // Slate-100
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'F');
        doc.setDrawColor(203, 213, 225); // Slate-300
        doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'S');

        // KPI Label
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(String(kpi.label).toUpperCase().substring(0, 24), x + 2.5, currentY + 4.5);

        // KPI Value
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(String(kpi.valor), x + 2.5, currentY + 10.5);
      });

      currentY += cardHeight + 4;
    }

    // Render Data Table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: currentY,
      margin: { top: 38, bottom: 18, left: 14, right: 14 },
      styles: {
        fontSize: headers.length > 8 ? 6.5 : 7.5,
        cellPadding: 2,
        overflow: 'linebreak',
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [15, 44, 89], // Deep navy blue
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: headers.length > 8 ? 7 : 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didDrawPage: data => {
        // Institutional Header
        doc.setFillColor(15, 44, 89);
        doc.rect(14, 8, pageWidth - 28, 24, 'F');

        // Emerald medical symbol badge
        doc.setFillColor(16, 185, 129);
        doc.circle(22, 20, 5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('+', 20.5, 21.5);

        // Title
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(titulo, 31, 16);

        // Subtitle & Metadata
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(subtitulo, 31, 21);
        doc.text(`Fecha de Emisión: ${fechaHora}  |  Registros: ${rows.length} filas evaluadas`, 31, 26);

        // Footer
        const str = `Página ${data.pageNumber} de ${totalPagesExp}`;
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 7);
        doc.text(
          'MINSA - Reporte Estadístico Oficial Asistencial y de Digitación',
          pageWidth - 110,
          pageHeight - 7
        );
      },
    });

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages(totalPagesExp);
    }

    const safeFilename = filename || `${titulo.replace(/[^a-zA-Z0-9_-]/g, '_')}_${now.toISOString().substring(0, 10)}.pdf`;
    doc.save(safeFilename);
  }

  /**
   * Generates a professional multi-page PDF report with header, footer, logo, and table data
   */
  static generateReporteGeneral(
    atenciones: Atencion[],
    filtrosTexto = 'Todos los registros',
    titulo = 'REPORTE GENERAL DE ATENCIONES DE SALUD'
  ): void {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const totalPagesExp = '{total_pages_count_string}';
    const now = new Date();
    const fechaHora = now.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Prepare table columns and rows
    const tableColumns = [
      { header: 'N° Formato', dataKey: 'nro_formato' },
      { header: 'Fecha', dataKey: 'fecha_atencion' },
      { header: 'Paciente', dataKey: 'beneficiario' },
      { header: 'Doc. Id.', dataKey: 'doc_identidad' },
      { header: 'Edad', dataKey: 'edad' },
      { header: 'Sexo', dataKey: 'sexo' },
      { header: 'Establecimiento (EESS)', dataKey: 'nombre_eess' },
      { header: 'Servicio', dataKey: 'descripcion_servicio' },
      { header: 'Profesional', dataKey: 'nombre_profesional' },
      { header: 'Tipo', dataKey: 'tipo_profesional' },
      { header: 'Tarifa', dataKey: 'tarifa' },
    ];

    const tableRows = atenciones.map(a => ({
      nro_formato: a.nro_formato,
      fecha_atencion: a.fecha_atencion,
      beneficiario: a.beneficiario.length > 20 ? a.beneficiario.substring(0, 19) + '…' : a.beneficiario,
      doc_identidad: a.doc_identidad,
      edad: a.edad.toString(),
      sexo: a.sexo === 'FEMENINO' ? 'F' : 'M',
      nombre_eess: a.nombre_eess.length > 22 ? a.nombre_eess.substring(0, 21) + '…' : a.nombre_eess,
      descripcion_servicio: a.descripcion_servicio.length > 22 ? a.descripcion_servicio.substring(0, 21) + '…' : a.descripcion_servicio,
      nombre_profesional: a.nombre_profesional.length > 18 ? a.nombre_profesional.substring(0, 17) + '…' : a.nombre_profesional,
      tipo_profesional: a.tipo_profesional,
      tarifa: `S/ ${Number(a.tarifa).toFixed(2)}`,
    }));

    autoTable(doc, {
      columns: tableColumns,
      body: tableRows,
      startY: 40,
      margin: { top: 40, bottom: 20, left: 14, right: 14 },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [15, 44, 89], // Dark Blue institutional
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didDrawPage: (data) => {
        // Institutional Header
        doc.setFillColor(15, 44, 89);
        doc.rect(14, 10, doc.internal.pageSize.getWidth() - 28, 25, 'F');

        // Logo symbol representation
        doc.setFillColor(16, 185, 129); // Emerald Green
        doc.circle(23, 22.5, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('+', 21.5, 24);

        // Header Title
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(titulo, 34, 19);

        // Subtitle
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Filtros: ${filtrosTexto}  |  Total Registros: ${atenciones.length}`, 34, 25);
        doc.text(`Generado: ${fechaHora}  |  Sistema de Información Estadística de Salud (MINSA)`, 34, 30);

        // Footer with Page Number
        const str = `Página ${data.pageNumber} de ${totalPagesExp}`;
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 8);
        doc.text('MINSA / Sistema Web de Estadísticas de Salud - Documento Oficial de Consulta', pageSize.getWidth() - 130, pageHeight - 8);
      },
    });

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages(totalPagesExp);
    }

    doc.save(`Reporte_Atenciones_${now.toISOString().substring(0, 10)}.pdf`);
  }

  /**
   * Generates a Productivity & Coverage report
   */
  static generateReporteProductividad(
    dataRows: { profesional: string; tipo: string; atenciones: number; dias: number; promedio: number }[],
    periodo: string
  ): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const totalPagesExp = '{total_pages_count_string}';
    const now = new Date().toLocaleString();

    doc.setFillColor(15, 44, 89);
    doc.rect(14, 12, doc.internal.pageSize.getWidth() - 28, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE PRODUCTIVIDAD POR PROFESIONAL DE SALUD', 20, 22);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período Evaluado: ${periodo}  |  Fecha Emisión: ${now}`, 20, 29);

    const cols = [
      { header: 'Profesional de Salud', dataKey: 'profesional' },
      { header: 'Tipo / Especialidad', dataKey: 'tipo' },
      { header: 'Atenciones', dataKey: 'atenciones' },
      { header: 'Días Lab.', dataKey: 'dias' },
      { header: 'Promedio / Día', dataKey: 'promedio' },
    ];

    autoTable(doc, {
      columns: cols,
      body: dataRows,
      startY: 40,
      margin: { top: 40, bottom: 20, left: 14, right: 14 },
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      didDrawPage: (data) => {
        const str = `Página ${data.pageNumber} de ${totalPagesExp}`;
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(str, 14, doc.internal.pageSize.getHeight() - 10);
      }
    });

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages(totalPagesExp);
    }

    doc.save(`Reporte_Productividad_${periodo}.pdf`);
  }

  /**
   * Generates a comprehensive, formatted individual Professional Record PDF (Ficha Técnica y Estadística)
   */
  static generateFichaProfesionalPdf(data: {
    profesional: {
      nombre: string;
      dni: string;
      tipo: string;
      colegiatura?: string;
      rne?: string;
      totalAtenciones: number;
      diasAsistidos: number;
      totalEess: number;
      totalMeses: number;
      minFecha?: string;
      maxFecha?: string;
      montoTotal?: number;
    };
    produccionMensual: {
      mes: string;
      count: number;
      pct: number;
      dias: number;
      eessCount: number;
    }[];
    eessVsMes?: {
      meses: { key: string; label: string; shortLabel?: string }[];
      filas: {
        nombre: string;
        codigo?: string;
        valores: number[];
        total: number;
        pct: number;
      }[];
      totalesPorMes: number[];
      granTotal: number;
    };
    establecimientos?: {
      nombre: string;
      codigo?: string;
      count: number;
      pct: number;
      dias: number;
      rangoFechas: string;
    }[];
    servicios: {
      nombre: string;
      codigo?: string;
      count: number;
      pct: number;
      tarifaTotal: number;
    }[];
    muestrasAtenciones?: {
      fecha: string;
      nroFormato: string;
      eess: string;
      servicio: string;
      paciente: string;
      docIdentidad: string;
    }[];
  }): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const totalPagesExp = '{total_pages_count_string}';
    const now = new Date();
    const fechaHora = now.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let currentY = 14;

    // Header drawing helper
    const drawHeader = () => {
      doc.setFillColor(15, 44, 89); // Deep institutional navy
      doc.rect(margin, 10, pageWidth - margin * 2, 22, 'F');

      // Medical cross badge
      doc.setFillColor(16, 185, 129); // Emerald
      doc.circle(margin + 8, 21, 4.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('+', margin + 6.8, 22.3);

      // Title & Subtitle
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('FICHA ESTADÍSTICA DEL PROFESIONAL DE SALUD', margin + 16, 18);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text('MINSA • Auditoría de Producción Asistencial, Cobertura Territorial y Cartera de Servicios', margin + 16, 23);
      doc.text(`Fecha de Emisión: ${fechaHora}  |  Expediente de Desempeño`, margin + 16, 28);
    };

    drawHeader();
    currentY = 36;

    // SECTION 1: Professional Information Card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 25, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 25, 2, 2, 'S');

    // Name
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(data.profesional.nombre.toUpperCase(), margin + 4, currentY + 6);

    // Meta details row 1
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`DNI: ${data.profesional.dni}`, margin + 4, currentY + 12);
    doc.text(`TIPO: ${data.profesional.tipo}`, margin + 45, currentY + 12);
    doc.text(`COLEGIATURA: ${data.profesional.colegiatura || 'No registra'}`, margin + 95, currentY + 12);
    doc.text(`RNE: ${data.profesional.rne || 'No registra'}`, margin + 145, currentY + 12);

    // Meta details row 2
    doc.text(`PERÍODO ASISTENCIAL: ${data.profesional.minFecha || '—'}  al  ${data.profesional.maxFecha || '—'}`, margin + 4, currentY + 18);
    const promDiario = data.profesional.diasAsistidos > 0 
      ? (data.profesional.totalAtenciones / data.profesional.diasAsistidos).toFixed(1)
      : '0';
    doc.text(`INTENSIDAD: ${promDiario} atenciones promedio por día laborado`, margin + 95, currentY + 18);

    currentY += 28;

    // SECTION 2: 4 Metric KPI Cards
    const kpiCards = [
      { label: 'TOTAL ATENCIONES', value: String(data.profesional.totalAtenciones), color: [16, 185, 129] },
      { label: 'DÍAS ASISTIDOS', value: `${data.profesional.diasAsistidos} días`, color: [59, 130, 246] },
      { label: 'EESS LABORADOS', value: `${data.profesional.totalEess} centros`, color: [147, 51, 234] },
      { label: 'FACTURACIÓN SIS', value: `S/ ${(data.profesional.montoTotal || 0).toFixed(2)}`, color: [245, 158, 11] },
    ];

    const cardWidth = (pageWidth - margin * 2 - 3 * 3) / 4;
    kpiCards.forEach((kpi, idx) => {
      const x = margin + idx * (cardWidth + 3);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(x, currentY, cardWidth, 13, 1.5, 1.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, currentY, cardWidth, 13, 1.5, 1.5, 'S');

      // Top color indicator bar
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.rect(x, currentY, cardWidth, 1.2, 'F');

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, x + 2.5, currentY + 5);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(kpi.value, x + 2.5, currentY + 10.5);
    });

    currentY += 17;

    // Helper for table section title
    const addSectionHeader = (title: string, yPos: number) => {
      doc.setFillColor(224, 231, 255); // Indigo light
      doc.rect(margin, yPos, 2.5, 5, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(title, margin + 4.5, yPos + 4);
    };

    // 1. Producción Mensual
    addSectionHeader('1. PRODUCCIÓN MENSUAL POR FECHA DE ATENCIÓN', currentY);
    currentY += 6;

    const rowsMeses = data.produccionMensual.map(m => [
      m.mes,
      m.count,
      `${m.pct}%`,
      `${m.dias} días`,
      `${m.eessCount} EESS`,
    ]);

    autoTable(doc, {
      head: [['Mes Clínico de Atención', 'Total Atenciones', '% de Producción', 'Días con Atención', 'EESS Activos']],
      body: rowsMeses,
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 15 },
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 6;

    // Check if new page needed
    if (currentY > pageHeight - 50) {
      doc.addPage();
      drawHeader();
      currentY = 36;
    }

    // 2. Establecimiento de Salud Vs Mes de Atención
    addSectionHeader('2. ESTABLECIMIENTO DE SALUD VS MES DE ATENCIÓN', currentY);
    currentY += 6;

    if (data.eessVsMes && data.eessVsMes.meses.length > 0) {
      const mesesHeaders = data.eessVsMes.meses.map(m => m.shortLabel || m.label);
      const head = [['Establecimiento de Salud (EESS)', 'Cód.', ...mesesHeaders, 'Total', '% Ded.']];

      const body: (string | number)[][] = data.eessVsMes.filas.map(fila => [
        fila.nombre,
        fila.codigo || 'S/C',
        ...fila.valores.map(v => (v > 0 ? v : '—')),
        fila.total,
        `${fila.pct}%`,
      ]);

      // Totals row at the bottom
      body.push([
        'TOTAL GENERAL',
        '',
        ...data.eessVsMes.totalesPorMes,
        data.eessVsMes.granTotal,
        '100%',
      ]);

      const totalCols = head[0].length;

      autoTable(doc, {
        head,
        body,
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 15 },
        styles: {
          fontSize: totalCols > 9 ? 6 : totalCols > 7 ? 6.5 : 7,
          cellPadding: 1.5,
          textColor: [30, 41, 59],
        },
        headStyles: {
          fillColor: [88, 28, 135], // Deep Purple
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: totalCols > 9 ? 6.5 : 7.5,
          halign: 'center',
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left' },
          1: { halign: 'center' },
          [totalCols - 2]: { fontStyle: 'bold', halign: 'right' },
          [totalCols - 1]: { fontStyle: 'bold', halign: 'center' },
        },
        alternateRowStyles: {
          fillColor: [250, 245, 255],
        },
        didParseCell: (hookData) => {
          if (hookData.section === 'body' && hookData.column.index >= 2 && hookData.column.index < totalCols - 1) {
            hookData.cell.styles.halign = 'center';
          }
          if (hookData.section === 'body' && hookData.row.index === body.length - 1) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [243, 232, 255];
            hookData.cell.styles.textColor = [88, 28, 135];
          }
        },
      });
    } else if (data.establecimientos && data.establecimientos.length > 0) {
      const rowsEess = data.establecimientos.map(e => [
        e.nombre,
        e.codigo || 'S/C',
        e.count,
        `${e.pct}%`,
        `${e.dias} días`,
        e.rangoFechas,
      ]);

      autoTable(doc, {
        head: [['Establecimiento de Salud (EESS)', 'Cód. EESS', 'Atenciones', '% Dedicación', 'Días Lab.', 'Rango Fechas']],
        body: rowsEess,
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 15 },
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [88, 28, 135], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 }, // Deep Purple
        alternateRowStyles: { fillColor: [250, 245, 255] },
      });
    }

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 6;

    // Check if new page needed
    if (currentY > pageHeight - 50) {
      doc.addPage();
      drawHeader();
      currentY = 36;
    }

    // 3. Cartera de Servicios Clínicos
    addSectionHeader('3. CARTERA DE SERVICIOS CLÍNICOS REALIZADOS', currentY);
    currentY += 6;

    const rowsServicios = data.servicios.map(s => [
      s.nombre,
      s.codigo || '—',
      s.count,
      `${s.pct}%`,
      `S/ ${s.tarifaTotal.toFixed(2)}`,
    ]);

    autoTable(doc, {
      head: [['Descripción del Servicio Clínico', 'Código', 'Atenciones Realizadas', '% de Cartera', 'Facturado Estimado']],
      body: rowsServicios,
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 15 },
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [3, 105, 161], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 }, // Sky Blue
      alternateRowStyles: { fillColor: [240, 249, 255] },
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 6;

    // 4. Muestra de Atenciones si existen
    if (data.muestrasAtenciones && data.muestrasAtenciones.length > 0) {
      if (currentY > pageHeight - 45) {
        doc.addPage();
        drawHeader();
        currentY = 36;
      }

      addSectionHeader('4. MUESTRA CRONOLÓGICA DE ATENCIONES REGISTRADAS', currentY);
      currentY += 6;

      const rowsMuestras = data.muestrasAtenciones.slice(0, 50).map(m => [
        m.fecha,
        m.nroFormato,
        m.eess.substring(0, 22),
        m.servicio.substring(0, 24),
        m.paciente.substring(0, 22),
        m.docIdentidad,
      ]);

      autoTable(doc, {
        head: [['Fecha', 'N° FUA', 'Establecimiento', 'Servicio Clínico', 'Paciente', 'Doc. Id.']],
        body: rowsMuestras,
        startY: currentY,
        margin: { left: margin, right: margin, bottom: 15 },
        styles: { fontSize: 6.5, cellPadding: 1.2 },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
    }

    // Add footer to all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Página ${i} de ${totalPagesExp}`,
        margin,
        pageHeight - 6
      );
      doc.text(
        `Expediente Oficial MINSA • Profesional: ${data.profesional.nombre} (${data.profesional.dni})`,
        pageWidth - margin - 85,
        pageHeight - 6
      );
    }

    if (typeof doc.putTotalPages === 'function') {
      doc.putTotalPages(totalPagesExp);
    }

    const cleanName = data.profesional.nombre.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    doc.save(`Ficha_Profesional_${data.profesional.dni}_${cleanName}.pdf`);
  }
}

