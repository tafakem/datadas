import React, { useState } from 'react';
import { 
  BookOpen, 
  Database, 
  Terminal, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  Server, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { SQL_DATABASE_SCRIPT } from '../db/sqlScript';
import { ExcelService } from '../services/excelService';

export const SystemDocumentation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sql' | 'instalacion' | 'manual_usuario' | 'diccionario'>('sql');
  const [copied, setCopied] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_DATABASE_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SQL_DATABASE_SCRIPT], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema_estadisticas_salud.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <span>Documentación Técnica, Manuales y Script SQL</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Entregables del sistema: DDL SQL de base de datos, manual de instalación, guía de usuario y diccionario de campos
          </p>
        </div>

        <button
          onClick={() => ExcelService.downloadSampleTemplate()}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Descargar Plantilla Excel (.xlsx)</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('sql')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'sql'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>1. Script SQL de Base de Datos</span>
        </button>

        <button
          onClick={() => setActiveTab('instalacion')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'instalacion'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>2. Manual de Instalación y Configuración</span>
        </button>

        <button
          onClick={() => setActiveTab('manual_usuario')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'manual_usuario'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>3. Manual de Usuario (Carga de Datos)</span>
        </button>

        <button
          onClick={() => setActiveTab('diccionario')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'diccionario'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>4. Diccionario de Datos (36 Campos)</span>
        </button>
      </div>

      {/* Tab 1: Script SQL */}
      {activeTab === 'sql' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-slate-200">schema_estadisticas_salud.sql (MySQL 8.0+ / MariaDB)</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopySql}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1 border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar SQL'}</span>
              </button>

              <button
                onClick={handleDownloadSql}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar .sql</span>
              </button>
            </div>
          </div>

          <pre className="p-4 text-[11px] font-mono bg-slate-950 text-slate-300 overflow-x-auto max-h-[600px] leading-relaxed">
            <code>{SQL_DATABASE_SCRIPT}</code>
          </pre>
        </div>
      )}

      {/* Tab 2: Manual de Instalación */}
      {activeTab === 'instalacion' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 text-xs text-slate-700 leading-relaxed">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <Server className="w-5 h-5 text-blue-600" />
              <span>Guía de Despliegue en Servidores de Producción</span>
            </h3>
            <p className="text-slate-500 mt-1">Requisitos de hardware, motor de base de datos MySQL y despliegue del frontend/backend.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm mb-2">Requisitos Mínimos</h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                <li><strong className="text-slate-800">Servidor:</strong> 2 vCPU, 4 GB RAM, 40 GB SSD.</li>
                <li><strong className="text-slate-800">SO:</strong> Ubuntu Server 22.04 LTS / Debian 12 / Rocky Linux.</li>
                <li><strong className="text-slate-800">Motor BD:</strong> MySQL 8.0+ o MariaDB 10.6+ con InnoDB habilitado.</li>
                <li><strong className="text-slate-800">Runtime:</strong> Node.js v20+ LTS o Servidor Web Nginx/Apache.</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm mb-2">Seguridad y Hardening</h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-600">
                <li>Certificado SSL/TLS con Let's Encrypt o certificado institucional.</li>
                <li>Hash de contraseñas con bcrypt (cost factor 10+).</li>
                <li>Consultas preparadas obligatorias (PDO / Prepared Statements contra SQL Injection).</li>
                <li>Permisos granulares RBAC para Administrador, Digitador y Consultor.</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Paso 1: Creación de la Base de Datos</h4>
            <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px]">
              mysql -u root -p &lt; schema_estadisticas_salud.sql
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-2">Paso 2: Compilación y Despliegue de la Aplicación</h4>
            <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] space-y-1">
              <div className="text-slate-500"># Instalar dependencias</div>
              <div>npm install</div>
              <div className="text-slate-500 mt-2"># Compilar optimizado para producción</div>
              <div>npm run build</div>
              <div className="text-slate-500 mt-2"># Los archivos generados en /dist se sirven vía Nginx o Apache</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Manual de Usuario */}
      {activeTab === 'manual_usuario' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 text-xs text-slate-700 leading-relaxed">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <span>Manual de Usuario: Flujo de Carga y Validación de Archivos Excel</span>
            </h3>
            <p className="text-slate-500 mt-1">Procedimiento estandarizado para los digitadores y estadísticos de salud.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">1</div>
              <div>
                <strong className="text-slate-900 block font-bold">Descarga de la Plantilla</strong>
                <span>Haga clic en el botón superior <em>"Descargar Plantilla Oficial (.xlsx)"</em> para obtener el archivo con el encabezado institucional correspondiente a los 36 campos requeridos.</span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">2</div>
              <div>
                <strong className="text-slate-900 block font-bold">Llenado y Formato de Fechas</strong>
                <span>Asegúrese de que los formatos de fecha sigan el estándar <code>AAAA-MM-DD</code> y las horas <code>HH:MM:SS</code>. La columna <code>nro_formato</code> debe ser única por atención para evitar colisiones.</span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">3</div>
              <div>
                <strong className="text-slate-900 block font-bold">Subida y Vista Previa</strong>
                <span>Acceda al módulo <strong>Cargar Datos</strong>, arrastre el archivo Excel y examine la tabla de validación preliminar. Si existen formatos duplicados, el sistema le advertirá si desea actualizarlos (Upsert).</span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">4</div>
              <div>
                <strong className="text-slate-900 block font-bold">Confirmación y Auditoría</strong>
                <span>Presione <strong>"Confirmar y Guardar"</strong>. El sistema registrará el evento en la bitácora de auditoría indicando su usuario, cantidad de filas cargadas y fecha/hora exacta.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Diccionario de Datos */}
      {activeTab === 'diccionario' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Estructura Detallada de la Tabla atenciones (36 Campos Oficiales)</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Campo SQL</th>
                  <th className="py-2.5 px-3">Tipo de Dato</th>
                  <th className="py-2.5 px-3">Restricción</th>
                  <th className="py-2.5 px-4">Descripción Funcional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {[
                  { n: 1, c: 'id', t: 'BIGINT', r: 'PRIMARY KEY AUTO_INCREMENT', d: 'Identificador único correlativo interno' },
                  { n: 2, c: 'nro_formato', t: 'VARCHAR(50)', r: 'NOT NULL UNIQUE', d: 'Número de formato único de la FUA' },
                  { n: 3, c: 'fecha_atencion', t: 'DATE', r: 'NOT NULL INDEX', d: 'Fecha efectiva de la atención médica' },
                  { n: 4, c: 'hora_atencion', t: 'TIME', r: 'NULL', d: 'Hora de inicio de la prestación' },
                  { n: 5, c: 'tipo_doc', t: 'VARCHAR(20)', r: 'DEFAULT \'DNI\'', d: 'Tipo de documento del asegurado' },
                  { n: 6, c: 'doc_identidad', t: 'VARCHAR(25)', r: 'NOT NULL INDEX', d: 'Número de documento de identidad' },
                  { n: 7, c: 'contrato', t: 'VARCHAR(50)', r: 'NULL', d: 'Número de contrato o póliza de afiliación' },
                  { n: 8, c: 'beneficiario', t: 'VARCHAR(150)', r: 'NOT NULL', d: 'Apellidos y nombres del paciente' },
                  { n: 9, c: 'fecha_nacimiento', t: 'DATE', r: 'NULL', d: 'Fecha de nacimiento del paciente' },
                  { n: 10, c: 'edad', t: 'INT', r: 'NOT NULL INDEX', d: 'Edad biológica en años al momento de atención' },
                  { n: 11, c: 'sexo', t: 'ENUM', r: '\'MASCULINO\', \'FEMENINO\'', d: 'Sexo biológico del asegurado' },
                  { n: 12, c: 'codigo_eess', t: 'VARCHAR(20)', r: 'NOT NULL INDEX', d: 'Código RENAES del establecimiento de salud' },
                  { n: 13, c: 'nombre_eess', t: 'VARCHAR(150)', r: 'NOT NULL INDEX', d: 'Nombre del establecimiento de salud' },
                  { n: 14, c: 'cod_servicio', t: 'VARCHAR(20)', r: 'NOT NULL INDEX', d: 'Código prestacional o de servicio de salud' },
                  { n: 15, c: 'descripcion_servicio', t: 'TEXT', r: 'NOT NULL', d: 'Descripción detallada de la prestación' },
                  { n: 16, c: 'dni_profesional', t: 'VARCHAR(25)', r: 'NOT NULL INDEX', d: 'Documento de identidad del profesional' },
                  { n: 17, c: 'nombre_profesional', t: 'VARCHAR(150)', r: 'NOT NULL', d: 'Nombres y apellidos del médico / enfermera' },
                  { n: 18, c: 'tipo_profesional', t: 'VARCHAR(50)', r: 'NOT NULL INDEX', d: 'Profesión (Médico General, Enfermera, etc.)' },
                  { n: 19, c: 'colegiatura', t: 'VARCHAR(50)', r: 'NULL', d: 'Número de colegiatura profesional (CMP, CEP)' },
                  { n: 20, c: 'rne', t: 'VARCHAR(50)', r: 'NULL', d: 'Registro Nacional de Especialista' },
                  { n: 21, c: 'tarifa', t: 'DECIMAL(10,2)', r: 'DEFAULT 0.00', d: 'Monto tarifario de la prestación en Soles' },
                  { n: 22, c: 'historia_clinica', t: 'VARCHAR(50)', r: 'NULL', d: 'Número de historia clínica física o digital' },
                  { n: 23, c: 'componente', t: 'VARCHAR(50)', r: 'DEFAULT \'SUBSIDIADO\'', d: 'Componente del seguro de salud' },
                  { n: 24, c: 'condicion_materna', t: 'VARCHAR(50)', r: 'INDEX', d: 'GESTANTE, PUERPERA, NO GESTANTE, NO APLICA' },
                  { n: 25, c: 'tipo_atencion', t: 'VARCHAR(50)', r: 'DEFAULT \'AMBULATORIO\'', d: 'AMBULATORIO, HOSPITALIZADO, EMERGENCIA' },
                  { n: 26, c: 'lugar_atencion', t: 'VARCHAR(50)', r: 'DEFAULT \'INTRAMURAL\'', d: 'INTRAMURAL o EXTRAMURAL' },
                  { n: 27, c: 'eess_referencia', t: 'VARCHAR(150)', r: 'NULL', d: 'Establecimiento de referencia / contrarreferencia' },
                  { n: 28, c: 'fecha_registro', t: 'DATETIME', r: 'DEFAULT CURRENT_TIMESTAMP', d: 'Fecha y hora de digitación en el sistema' },
                  { n: 29, c: 'digitador', t: 'VARCHAR(100)', r: 'NOT NULL', d: 'Usuario o personal que ingresó la FUA' },
                  { n: 30, c: 'nro_cred', t: 'VARCHAR(50)', r: 'NULL', d: 'Número de control CRED en niños menores' },
                  { n: 31, c: 'usuario_actualiza', t: 'VARCHAR(100)', r: 'NULL', d: 'Último usuario que modificó el registro' },
                  { n: 32, c: 'fecha_actualiza', t: 'DATETIME', r: 'NULL ON UPDATE CURRENT_TIMESTAMP', d: 'Fecha y hora de la última modificación' },
                  { n: 33, c: 'periodo_cierre', t: 'VARCHAR(10)', r: 'NOT NULL INDEX', d: 'Período contable o de cierre (ej. 2026-03)' },
                  { n: 34, c: 'disa', t: 'VARCHAR(100)', r: 'NOT NULL INDEX', d: 'Dirección de Salud / DIRESA / GERESA' },
                  { n: 35, c: 'cod_punto_digitacion', t: 'VARCHAR(20)', r: 'NOT NULL', d: 'Código del punto de digitación' },
                  { n: 36, c: 'punto_digitacion', t: 'VARCHAR(150)', r: 'NOT NULL INDEX', d: 'Nombre del centro o punto de digitación' },
                ].map(row => (
                  <tr key={row.n} className="hover:bg-slate-50 font-sans">
                    <td className="py-2.5 px-4 font-mono text-slate-400">{row.n}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{row.c}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-purple-700">{row.t}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{row.r}</td>
                    <td className="py-2.5 px-4 text-slate-700">{row.d}</td>
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
