-- =================================================================
-- CARENEST — Base de datos completa DESDE CERO (versión FINAL)
-- Centro de Salud San Genaro de Villa
-- Sistema de gestión de citas médicas, médicos, seguros (SIS) y pagos
--
-- Incluye YA integrado todo:
--   * Rol FAMILIAR en usuarios + auto-referencia id_tutor + parentesco
--   * correo / contrasena nullables (el familiar no inicia sesión)
--   * Fase 3 (disponibilidad programada en especialidades y médicos)
--   * Sanciones por inasistencias Y por cancelaciones
--   * especialidades.requiere_datos_menor
--   * citas.id_dependiente -> usuarios(id_usuario)
--   * notificaciones.correo_enviado (envío por email)
--   * tabla correos_remitentes (cuentas desde las que se envían correos)
--   * modulo de medicos (medico_usuario, atenciones)
--   * modulo de seguros SIS (seguros_consultas)
--   * modulo de pagos Mercado Pago (pagos)
--
-- Ejecutar en un query nuevo de MySQL Workbench. No requiere base previa
-- ni ningún ALTER adicional: todo está ya incorporado aquí.
-- =================================================================

DROP DATABASE IF EXISTS `citasmedicassangenaro`;
CREATE DATABASE `citasmedicassangenaro`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE `citasmedicassangenaro`;

-- =================================================================
-- 1) USUARIOS  (pacientes, staff y familiares con rol FAMILIAR)
-- =================================================================
CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `correo` varchar(100) DEFAULT NULL,                 -- NULL: el FAMILIAR no inicia sesión
  `contrasena` varchar(255) DEFAULT NULL,             -- NULL: el FAMILIAR no inicia sesión
  `rol` enum('PACIENTE','ADMIN','ADMISION','MEDICO','FAMILIAR') NOT NULL,
  `id_tutor` int DEFAULT NULL,                        -- Auto-referencia: tutor (paciente) del familiar
  `dni` varchar(8) DEFAULT NULL,
  `nombres` varchar(100) DEFAULT NULL,
  `apellidos` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `genero` enum('Masculino','Femenino','Otros') DEFAULT NULL,
  `parentesco` varchar(50) DEFAULT NULL,              -- Solo aplica a rol FAMILIAR
  `inasistencias` tinyint unsigned DEFAULT 0,
  `cancelaciones` tinyint unsigned NOT NULL DEFAULT 0,
  `cuenta_bloqueada` tinyint(1) DEFAULT 0,
  `fecha_bloqueo` date DEFAULT NULL,
  `intentos_fallidos` tinyint unsigned DEFAULT 0,
  `activo` tinyint(1) DEFAULT 1,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo` (`correo`),
  UNIQUE KEY `dni` (`dni`),
  KEY `fk_usuarios_tutor` (`id_tutor`),
  CONSTRAINT `fk_usuarios_tutor` FOREIGN KEY (`id_tutor`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 2) ESPECIALIDADES  (Fase 3 + requiere_datos_menor)
-- =================================================================
CREATE TABLE `especialidades` (
  `id_especialidad` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `estado` enum('ACTIVA','INACTIVA') DEFAULT 'ACTIVA',
  `requiere_datos_menor` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_inhabilitacion` date DEFAULT NULL,
  `fecha_habilitacion` date DEFAULT NULL,
  `aviso_habilitacion_enviado` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_especialidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 3) MEDICOS  (Fase 3)
-- =================================================================
CREATE TABLE `medicos` (
  `id_medico` int NOT NULL AUTO_INCREMENT,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `id_especialidad` int NOT NULL,
  `estado` enum('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  `fecha_inhabilitacion` date DEFAULT NULL,
  `fecha_habilitacion` date DEFAULT NULL,
  `aviso_habilitacion_enviado` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_medico`),
  KEY `id_especialidad` (`id_especialidad`),
  CONSTRAINT `medicos_ibfk_1` FOREIGN KEY (`id_especialidad`)
    REFERENCES `especialidades` (`id_especialidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 4) HORARIOS  (se crean al vuelo al reservar — Enfoque A1)
-- =================================================================
CREATE TABLE `horarios` (
  `id_horario` int NOT NULL AUTO_INCREMENT,
  `id_medico` int NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `tipo_visita` enum('PRESENCIAL','VIRTUAL') DEFAULT 'PRESENCIAL',
  `disponible` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id_horario`),
  UNIQUE KEY `uk_medico_fecha_hora` (`id_medico`,`fecha`,`hora`),
  CONSTRAINT `horarios_ibfk_1` FOREIGN KEY (`id_medico`)
    REFERENCES `medicos` (`id_medico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 5) FECHAS BLOQUEADAS
-- =================================================================
CREATE TABLE `fechas_bloqueadas` (
  `id_bloqueo` int NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `motivo` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id_bloqueo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 6) CITAS  (id_dependiente -> usuarios, rol FAMILIAR)
-- =================================================================
CREATE TABLE `citas` (
  `id_cita` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `id_horario` int NOT NULL,
  `id_dependiente` int DEFAULT NULL,                  -- id_usuario del familiar (rol FAMILIAR)
  `motivo` text,
  `notas` text,
  `estado` enum('RESERVADA','CONFIRMADA','RECORDATORIO','COMPLETADA','CANCELADA','FALTA') DEFAULT 'RESERVADA',
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cita`),
  UNIQUE KEY `id_horario` (`id_horario`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_dependiente` (`id_dependiente`),
  CONSTRAINT `citas_ibfk_1` FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `citas_ibfk_2` FOREIGN KEY (`id_horario`)
    REFERENCES `horarios` (`id_horario`),
  CONSTRAINT `citas_fk_familiar` FOREIGN KEY (`id_dependiente`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 7) HISTORIAL DE ASISTENCIA
-- =================================================================
CREATE TABLE `historial_asistencia` (
  `id_historial` int NOT NULL AUTO_INCREMENT,
  `id_cita` int NOT NULL,
  `id_usuario` int NOT NULL,
  `estado` enum('COMPLETADA','FALTA') NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_historial`),
  KEY `id_cita` (`id_cita`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `historial_ibfk_1` FOREIGN KEY (`id_cita`)
    REFERENCES `citas` (`id_cita`),
  CONSTRAINT `historial_ibfk_2` FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 8) NOTIFICACIONES  (con correo_enviado ya incluido)
-- =================================================================
CREATE TABLE `notificaciones` (
  `id_notificacion` int NOT NULL AUTO_INCREMENT,
  `id_cita` int DEFAULT NULL,
  `id_usuario` int NOT NULL,
  `tipo` enum('RECORDATORIO','CANCELACION','BLOQUEO_CUENTA') NOT NULL,
  `mensaje` text NOT NULL,
  `enviado` tinyint(1) DEFAULT 0,                     -- mostrada en la app (buzón)
  `correo_enviado` tinyint(1) NOT NULL DEFAULT 0,     -- enviada por email (independiente de 'enviado')
  `leida` tinyint(1) DEFAULT 0,
  `fecha_programada` datetime DEFAULT NULL,
  `fecha_envio` datetime DEFAULT NULL,
  PRIMARY KEY (`id_notificacion`),
  KEY `id_cita` (`id_cita`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `notificaciones_ibfk_1` FOREIGN KEY (`id_cita`)
    REFERENCES `citas` (`id_cita`),
  CONSTRAINT `notificaciones_ibfk_2` FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 9) CONFIGURACION DEL SISTEMA
-- =================================================================
CREATE TABLE `configuracion_sistema` (
  `id_config` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(100) NOT NULL,
  `valor` varchar(255) NOT NULL,
  `descripcion` text,
  PRIMARY KEY (`id_config`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 10) SESIONES
-- =================================================================
CREATE TABLE `sesiones` (
  `id_sesion` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `token` varchar(500) DEFAULT NULL,
  `fecha_inicio` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_expiracion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_sesion`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `sesiones_ibfk_1` FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 11) CORREOS REMITENTES  (cuentas desde las que se envían los correos)
-- =================================================================
CREATE TABLE `correos_remitentes` (
  `id_remitente`     int NOT NULL AUTO_INCREMENT,
  `correo`           varchar(150) NOT NULL,              -- cuenta que envía (ej. clinica@gmail.com)
  `app_password`     varchar(255) NOT NULL,              -- contraseña de aplicación (texto plano)
  `nombre_remitente` varchar(150) DEFAULT NULL,          -- nombre visible en el "De:" (opcional)
  `host`             varchar(150) DEFAULT NULL,          -- opcional; si es NULL => Gmail
  `puerto`           int DEFAULT NULL,                   -- opcional; si es NULL => 587
  `activo`           tinyint(1) NOT NULL DEFAULT 1,      -- si participa o no en el envío
  `prioridad`        int NOT NULL DEFAULT 0,             -- orden de failover (menor = se intenta primero)
  `fecha_registro`   datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_remitente`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 12) MEDICO USUARIO  (Vincula cuenta de usuario MEDICO con medicos)
-- =================================================================
CREATE TABLE IF NOT EXISTS `medico_usuario` (
  `id_medico`   INT          NOT NULL,
  `id_usuario`  INT          NOT NULL,
  `cmp`         VARCHAR(20)  NULL COMMENT 'Colegio Medico del Peru',
  `creado_en`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_medico`),
  UNIQUE KEY `uq_medico_usuario_usuario` (`id_usuario`),
  CONSTRAINT `fk_medico_usuario_medico` FOREIGN KEY (`id_medico`)
    REFERENCES `medicos` (`id_medico`),
  CONSTRAINT `fk_medico_usuario_usuario` FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 13) ATENCIONES MEDICAS  (Diagnóstico + receta firmada)
-- =================================================================
CREATE TABLE IF NOT EXISTS `atenciones` (
  `id_atencion`          INT          NOT NULL AUTO_INCREMENT,
  `id_cita`              INT          NOT NULL,
  `id_medico`            INT          NOT NULL,
  `diagnostico`          TEXT         NOT NULL,
  `receta`               TEXT         NULL,
  `indicaciones`         TEXT         NULL,
  `codigo_verificacion`  VARCHAR(32)  NOT NULL COMMENT 'Firma digital (HMAC) para verificar la receta',
  `correo_destino`       VARCHAR(100) NULL,
  `correo_enviado`       TINYINT(1)   NOT NULL DEFAULT 0,
  `fecha_atencion`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_atencion`),
  UNIQUE KEY `uq_atencion_cita` (`id_cita`),
  UNIQUE KEY `uq_atencion_codigo` (`codigo_verificacion`),
  CONSTRAINT `fk_atencion_cita` FOREIGN KEY (`id_cita`)
    REFERENCES `citas` (`id_cita`),
  CONSTRAINT `fk_atencion_medico` FOREIGN KEY (`id_medico`)
    REFERENCES `medicos` (`id_medico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 14) SEGUROS CONSULTAS  (Caché y persistencia de verificación SIS)
-- =================================================================
CREATE TABLE IF NOT EXISTS `seguros_consultas` (
  `dni`            CHAR(8)      NOT NULL,
  `tipo`           VARCHAR(20)  NOT NULL COMMENT 'SIS | NINGUNO | DESCONOCIDO',
  `asegurado`      TINYINT(1)   NOT NULL DEFAULT 0,
  `fuente`         VARCHAR(20)  NOT NULL COMMENT 'SIS_SCRAPER | SIMULADO',
  `verificado`     TINYINT(1)   NOT NULL DEFAULT 0,
  `detalle`        VARCHAR(255) NULL,
  `consultado_en`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dni`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 15) PAGOS  (Mercado Pago Checkout Pro)
-- =================================================================
CREATE TABLE IF NOT EXISTS `pagos` (
  `id_pago`          INT            NOT NULL AUTO_INCREMENT,
  `id_usuario`       INT            NOT NULL,
  `id_cita`          INT            NULL,
  `dni_paciente`     CHAR(8)        NULL,
  `monto`            DECIMAL(10,2)  NOT NULL DEFAULT 0,
  `moneda`           CHAR(3)        NOT NULL DEFAULT 'PEN',
  `estado`           VARCHAR(12)    NOT NULL DEFAULT 'PENDIENTE' COMMENT 'PENDIENTE | APROBADO | RECHAZADO | EXONERADO',
  `descripcion`      VARCHAR(200)   NULL,
  `mp_preference_id` VARCHAR(80)    NULL,
  `mp_payment_id`    VARCHAR(40)    NULL,
  `creado_en`        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_pago`),
  KEY `idx_pagos_usuario` (`id_usuario`),
  KEY `idx_pagos_cita` (`id_cita`),
  CONSTRAINT `fk_pagos_usuario` FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- =================================================================
-- DATOS INICIALES (SEED)
-- =================================================================

-- ---------- USUARIOS (contraseña de todos: admin123) ----------
INSERT INTO `usuarios`
  (correo, contrasena, rol, dni, nombres, apellidos, telefono, fecha_nacimiento, direccion, genero)
VALUES
('admin@carenest.pe',     '$2b$10$.TAwn4G3R.fzAZachB9bqux7uL/h310urEuJngYs.pIzqLTQnLNMe', 'ADMIN',    '00000001', 'Director', 'Principal', '999999999', NULL,         NULL,                 NULL),
('admision@carenest.pe',  '$2b$10$.TAwn4G3R.fzAZachB9bqux7uL/h310urEuJngYs.pIzqLTQnLNMe', 'ADMISION', '00000002', 'Ana',      'Ventanilla','988888888', NULL,         NULL,                 NULL),
('juan@gmail.com',        '$2b$10$.TAwn4G3R.fzAZachB9bqux7uL/h310urEuJngYs.pIzqLTQnLNMe', 'PACIENTE', '76543210', 'Juan',     'Perez',     '987654321', '2003-04-15', 'Av. Los Olivos 123', 'Masculino'),
('jhair@gmail.com',       '$2b$10$.TAwn4G3R.fzAZachB9bqux7uL/h310urEuJngYs.pIzqLTQnLNMe', 'PACIENTE', '70905745', 'Jhair Fabian', 'Suarez Infantes', '987654322', '2000-01-01', 'San Genaro', 'Masculino');

-- ---------- ESPECIALIDADES ----------
INSERT INTO `especialidades` (nombre, descripcion, estado) VALUES
('Medicina General', 'Atención médica integral a los pacientes', 'ACTIVA'),
('Pediatria',        'Atención integral a niños y adolescentes', 'ACTIVA'),
('Psicologia',       'Evaluación, diagnóstico y orientación psicológica', 'ACTIVA'),
('Obstetricia',      'Control prenatal y planificación familiar', 'ACTIVA'),
('Enfermeria',       'Toma de signos vitales y triaje', 'ACTIVA');

-- Pediatría exige datos del menor (su id es 2)
UPDATE especialidades SET requiere_datos_menor = 1 WHERE id_especialidad = 2;

-- ---------- MEDICOS (uno por especialidad) ----------
INSERT INTO `medicos` (nombres, apellidos, id_especialidad) VALUES
('Carlos', 'Lopez',     1),   -- Medicina General
('Maria',  'Gonzales',  2),   -- Pediatria
('Lucia',  'Ramirez',   3),   -- Psicologia
('Rosa',   'Fernandez', 4),   -- Obstetricia
('Pedro',  'Sanchez',   5);   -- Enfermeria

-- ---------- CONFIGURACION DEL SISTEMA ----------
INSERT INTO `configuracion_sistema` (clave, valor, descripcion) VALUES
('limite_inasistencias',          '3',  'Número máximo de inasistencias consecutivas antes del bloqueo automático'),
('dias_suspension',               '15', 'Días de suspensión al superar el límite de inasistencias'),
('limite_cancelaciones',          '3',  'Número máximo de cancelaciones de último momento antes del bloqueo'),
('dias_suspension_cancelaciones', '15', 'Días de suspensión al superar el límite de cancelaciones');

-- ---------- CORREOS REMITENTES ----------
-- Cuenta desde la que se envían las notificaciones por correo.
-- IMPORTANTE: reemplaza 'xxxx xxxx xxxx xxxx' por la contraseña de aplicación real de Gmail
-- (se genera en la cuenta de Google: Verificación en 2 pasos > Contraseñas de aplicación).
INSERT INTO `correos_remitentes` (correo, app_password, nombre_remitente, activo, prioridad) VALUES
('mpea.suarezjhair@gmail.com', 'xxxx xxxx xxxx xxxx', 'Centro de Salud San Genaro de Villa', 1, 0);

-- ---------- SEGUROS VERIFICADOS (SEED) ----------
-- Datos reales del portal SIS verificados (DNI 70905745 activo)
INSERT INTO `seguros_consultas` (dni, tipo, asegurado, fuente, verificado, detalle, consultado_en) VALUES
('70905745', 'SIS', 1, 'SIS_SCRAPER', 1, 'TITULAR - ACTIVO (SUAREZ INFANTES JHAIR FABIAN)', NOW()),
('76543210', 'NINGUNO', 0, 'SIS_SCRAPER', 1, 'NO ASEGURADO AL SIS (JUAN PEREZ)', NOW())
ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), asegurado = VALUES(asegurado), verificado = VALUES(verificado), detalle = VALUES(detalle);

-- =================================================================
-- FIN DEL SCRIPT
--
-- Usuarios de prueba (contraseña: admin123):
--   admin@carenest.pe     → ADMIN
--   admision@carenest.pe  → ADMISION
--   juan@gmail.com        → PACIENTE (Sin SIS -> paga S/ 20 con Mercado Pago)
--   medico@carenest.pe    → MEDICO (crear con 002_usuario_medico.sql)
--   jhair@gmail.com       → PACIENTE (Con SIS ACTIVO -> Cita Gratuita)
--
-- Los horarios y citas comienzan vacíos (se crean al reservar).
-- El remitente de correo queda cargado; solo falta poner su app_password real.
-- =================================================================