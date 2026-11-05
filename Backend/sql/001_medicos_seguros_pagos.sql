-- =================================================================
-- Migración 001: módulo de médicos, validación de seguro (SIS) y pagos.
-- SOLO crea tablas nuevas (no modifica ninguna existente).
-- Es idempotente: se puede ejecutar varias veces.
-- Ejecutar con:  npm run migrate   (desde la carpeta Backend)
-- =================================================================

-- Vincula una cuenta de usuario (rol MEDICO) con su registro en `medicos`.
CREATE TABLE IF NOT EXISTS medico_usuario (
    id_medico   INT          NOT NULL,
    id_usuario  INT          NOT NULL,
    cmp         VARCHAR(20)  NULL COMMENT 'Colegio Medico del Peru',
    creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_medico),
    UNIQUE KEY uq_medico_usuario_usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Atención médica: diagnóstico + receta emitida por el médico para una cita.
CREATE TABLE IF NOT EXISTS atenciones (
    id_atencion          INT          NOT NULL AUTO_INCREMENT,
    id_cita              INT          NOT NULL,
    id_medico            INT          NOT NULL,
    diagnostico          TEXT         NOT NULL,
    receta               TEXT         NULL,
    indicaciones         TEXT         NULL,
    codigo_verificacion  VARCHAR(32)  NOT NULL COMMENT 'Firma digital (HMAC) para verificar la receta',
    correo_destino       VARCHAR(100) NULL,
    correo_enviado       TINYINT(1)   NOT NULL DEFAULT 0,
    fecha_atencion       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_atencion),
    UNIQUE KEY uq_atencion_cita (id_cita),
    UNIQUE KEY uq_atencion_codigo (codigo_verificacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Caché de la consulta de seguro por DNI (evita consultar el portal en cada reserva).
CREATE TABLE IF NOT EXISTS seguros_consultas (
    dni            CHAR(8)      NOT NULL,
    tipo           VARCHAR(20)  NOT NULL COMMENT 'SIS | NINGUNO | DESCONOCIDO',
    asegurado      TINYINT(1)   NOT NULL DEFAULT 0,
    fuente         VARCHAR(20)  NOT NULL COMMENT 'SIS_SCRAPER | SIMULADO',
    verificado     TINYINT(1)   NOT NULL DEFAULT 0,
    detalle        VARCHAR(255) NULL,
    consultado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (dni)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pagos de consulta (Mercado Pago). Un pago APROBADO se consume al reservar.
CREATE TABLE IF NOT EXISTS pagos (
    id_pago          INT            NOT NULL AUTO_INCREMENT,
    id_usuario       INT            NOT NULL,
    id_cita          INT            NULL,
    dni_paciente     CHAR(8)        NULL,
    monto            DECIMAL(10,2)  NOT NULL DEFAULT 0,
    moneda           CHAR(3)        NOT NULL DEFAULT 'PEN',
    estado           VARCHAR(12)    NOT NULL DEFAULT 'PENDIENTE' COMMENT 'PENDIENTE | APROBADO | RECHAZADO | EXONERADO',
    descripcion      VARCHAR(200)   NULL,
    mp_preference_id VARCHAR(80)    NULL,
    mp_payment_id    VARCHAR(40)    NULL,
    creado_en        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_pago),
    KEY idx_pagos_usuario (id_usuario),
    KEY idx_pagos_cita (id_cita)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
