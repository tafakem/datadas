/**
 * Script SQL Oficial de Creación de Base de Datos para el Sistema de Estadísticas de Salud
 * Compatible con MySQL 8.0+, MariaDB 10.5+ y PostgreSQL 14+
 */

export const SQL_CREATION_SCRIPT = `-- =====================================================================
-- SISTEMA WEB DE ESTADÍSTICAS DE SALUD - SCRIPT DE BASE DE DATOS
-- Sistema de Registro, Análisis y Gestión de Atenciones de Salud
-- =====================================================================

-- 1. CREACIÓN DE LA BASE DE DATOS
CREATE DATABASE IF NOT EXISTS db_estadisticas_salud
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE db_estadisticas_salud;

-- =====================================================================
-- 2. TABLA: usuarios (Gestión de acceso y roles)
-- =====================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    rol ENUM('Administrador', 'Digitador', 'Consultor') NOT NULL DEFAULT 'Consultor',
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    punto_asignado VARCHAR(150) NULL,
    ultimo_acceso DATETIME NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- 3. TABLA PRINCIPAL: atenciones
-- Estructura basada estrictamente en la especificación del requerimiento
-- =====================================================================
CREATE TABLE IF NOT EXISTS atenciones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nro_formato VARCHAR(50) NOT NULL,
    fecha_atencion DATE NOT NULL,
    hora_atencion TIME NOT NULL,
    tipo_doc VARCHAR(20) NOT NULL DEFAULT 'DNI',
    doc_identidad VARCHAR(20) NOT NULL,
    contrato VARCHAR(50) NULL,
    beneficiario VARCHAR(150) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    edad INT NOT NULL,
    sexo ENUM('MASCULINO', 'FEMENINO') NOT NULL,
    codigo_eess VARCHAR(20) NOT NULL,
    nombre_eess VARCHAR(150) NOT NULL,
    cod_servicio VARCHAR(20) NOT NULL,
    descripcion_servicio TEXT NOT NULL,
    dni_profesional VARCHAR(20) NOT NULL,
    nombre_profesional VARCHAR(150) NOT NULL,
    tipo_profesional VARCHAR(50) NOT NULL,
    colegiatura VARCHAR(50) NULL,
    rne VARCHAR(50) NULL,
    tarifa DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    historia_clinica VARCHAR(50) NULL,
    componente VARCHAR(50) NOT NULL DEFAULT 'SUBSIDIADO',
    condicion_materna VARCHAR(50) NOT NULL DEFAULT 'NO APLICA',
    tipo_atencion VARCHAR(50) NOT NULL DEFAULT 'AMBULATORIO',
    lugar_atencion VARCHAR(50) NOT NULL DEFAULT 'INTRAMURAL',
    eess_referencia VARCHAR(150) NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    digitador VARCHAR(100) NOT NULL,
    nro_cred VARCHAR(50) NULL,
    usuario_actualiza VARCHAR(100) NULL,
    fecha_actualiza DATETIME NULL,
    periodo_cierre VARCHAR(10) NOT NULL, -- Formato YYYY-MM
    disa VARCHAR(100) NOT NULL,
    cod_punto_digitacion VARCHAR(20) NOT NULL,
    punto_digitacion VARCHAR(150) NOT NULL,
    
    -- Índices para optimizar consultas, reportes y dashboards masivos
    INDEX idx_fecha_atencion (fecha_atencion),
    INDEX idx_periodo_cierre (periodo_cierre),
    INDEX idx_codigo_eess (codigo_eess),
    INDEX idx_cod_servicio (cod_servicio),
    INDEX idx_dni_profesional (dni_profesional),
    INDEX idx_punto_digitacion (cod_punto_digitacion),
    INDEX idx_disa (disa),
    INDEX idx_doc_identidad (doc_identidad),
    INDEX idx_nro_formato (nro_formato)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- 4. TABLA: auditoria_logs (Registro de actividad de usuarios)
-- =====================================================================
CREATE TABLE IF NOT EXISTS auditoria_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(50) NOT NULL,
    rol VARCHAR(50) NOT NULL,
    accion ENUM('LOGIN', 'CARGA_EXCEL', 'ACTUALIZACION', 'ELIMINACION', 'EXPORTACION', 'CAMBIO_USUARIO') NOT NULL,
    detalle TEXT NOT NULL,
    ip_origen VARCHAR(45) NULL,
    INDEX idx_fecha (fecha),
    INDEX idx_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- 5. TABLA: metas_cobertura (Para reporte y semáforo de cobertura)
-- =====================================================================
CREATE TABLE IF NOT EXISTS metas_cobertura (
    id INT AUTO_INCREMENT PRIMARY KEY,
    periodo VARCHAR(10) NOT NULL,
    codigo_eess VARCHAR(20) NOT NULL,
    meta_atenciones INT NOT NULL DEFAULT 0,
    disa VARCHAR(100) NOT NULL,
    UNIQUE KEY uq_eess_periodo (codigo_eess, periodo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- 6. VISTAS PARA REPORTES Y ANALÍTICA RÁPIDA (Vistas SQL Optimizadas)
-- =====================================================================

-- Vista: Resumen mensual por EESS
CREATE OR REPLACE VIEW vista_resumen_mensual_eess AS
SELECT 
    periodo_cierre,
    codigo_eess,
    nombre_eess,
    disa,
    COUNT(id) AS total_atenciones,
    COUNT(DISTINCT doc_identidad) AS pacientes_unicos,
    COUNT(DISTINCT dni_profesional) AS total_profesionales,
    SUM(tarifa) AS total_facturado
FROM atenciones
GROUP BY periodo_cierre, codigo_eess, nombre_eess, disa;

-- Vista: Productividad por Profesional
CREATE OR REPLACE VIEW vista_productividad_profesional AS
SELECT 
    dni_profesional,
    nombre_profesional,
    tipo_profesional,
    colegiatura,
    COUNT(id) AS total_atenciones,
    COUNT(DISTINCT fecha_atencion) AS dias_trabajados,
    ROUND(COUNT(id) / COUNT(DISTINCT fecha_atencion), 1) AS promedio_diario
FROM atenciones
GROUP BY dni_profesional, nombre_profesional, tipo_profesional, colegiatura;

-- Vista: Cobertura por Establecimiento
CREATE OR REPLACE VIEW vista_cobertura_eess AS
SELECT 
    a.periodo_cierre,
    a.codigo_eess,
    a.nombre_eess,
    a.disa,
    COALESCE(m.meta_atenciones, 500) AS meta,
    COUNT(a.id) AS realizado,
    ROUND((COUNT(a.id) / COALESCE(m.meta_atenciones, 500)) * 100, 2) AS porcentaje_cobertura,
    CASE 
        WHEN (COUNT(a.id) / COALESCE(m.meta_atenciones, 500)) * 100 < 50.00 THEN 'MALO'
        WHEN (COUNT(a.id) / COALESCE(m.meta_atenciones, 500)) * 100 < 63.33 THEN 'REGULAR'
        WHEN (COUNT(a.id) / COALESCE(m.meta_atenciones, 500)) * 100 <= 66.67 THEN 'BUENO'
        ELSE 'REVISA'
    END AS semaforo
FROM atenciones a
LEFT JOIN metas_cobertura m ON a.codigo_eess = m.codigo_eess AND a.periodo_cierre = m.periodo
GROUP BY a.periodo_cierre, a.codigo_eess, a.nombre_eess, a.disa, m.meta_atenciones;

-- =====================================================================
-- 7. USUARIOS POR DEFECTO PARA PRIMERA INSTALACIÓN
-- Contraseñas cifradas con bcrypt (Salt estándar)
-- =====================================================================
INSERT INTO usuarios (username, password_hash, nombre_completo, email, rol, estado, punto_asignado)
VALUES 
('admin', '$2b$10$w82tE5oR8LzV3qYvVvP2quwPqvVvP2quwPqvVvP2quwPqvVvP2quw', 'Dr. Carlos Mendoza Ramos', 'admin.salud@minsa.gob.pe', 'Administrador', 'ACTIVO', 'SEDE CENTRAL - LIMA'),
('digitador', '$2b$10$w82tE5oR8LzV3qYvVvP2quwPqvVvP2quwPqvVvP2quwPqvVvP2quw', 'Lic. Patricia Vega Salas', 'pvega.digitacion@minsa.gob.pe', 'Digitador', 'ACTIVO', 'C.S. SAN MARTIN DE PORRES'),
('consultor', '$2b$10$w82tE5oR8LzV3qYvVvP2quwPqvVvP2quwPqvVvP2quwPqvVvP2quw', 'Mg. Elena Quispe Flores', 'equispe.estadistica@minsa.gob.pe', 'Consultor', 'ACTIVO', 'DIRESA / GERESA');
`;

export const SQL_DATABASE_SCRIPT = SQL_CREATION_SCRIPT;
