import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Atencion } from '../types/health';

export class PdfService {
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
}
