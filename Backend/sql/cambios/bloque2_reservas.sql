-- =================================================================
-- BLOQUE 2 — Reserva, cancelación y cancelación masiva
-- Ejecutar UNA VEZ sobre una base EXISTENTE (creada con una versión
-- anterior de 001_medicos_seguros_pagos.sql). Si recreas la base con el
-- 001 actual, NO hace falta. Ejecuta antes bloque1_sis.sql.
-- =================================================================
USE `citasmedicassangenaro`;

-- 1) Volver a reservar un horario cancelado:
--    citas.id_horario deja de ser UNIQUE. Primero se crea el índice normal
--    (lo necesita la FK citas_ibfk_2) y luego se elimina el UNIQUE.
ALTER TABLE `citas` ADD INDEX `idx_citas_horario` (`id_horario`);
ALTER TABLE `citas` DROP INDEX `id_horario`;

-- 2) Cancelación masiva: columnas que el sistema usa y no existían
ALTER TABLE `fechas_bloqueadas`
  ADD COLUMN `id_especialidad` INT NULL AFTER `fecha`,
  ADD COLUMN `creado_por` INT NULL AFTER `motivo`,
  ADD COLUMN `fecha_registro` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER `creado_por`,
  MODIFY `motivo` VARCHAR(300) NULL,
  ADD UNIQUE KEY `uk_fecha_especialidad` (`fecha`, `id_especialidad`),
  ADD CONSTRAINT `fk_bloqueo_especialidad` FOREIGN KEY (`id_especialidad`)
    REFERENCES `especialidades` (`id_especialidad`),
  ADD CONSTRAINT `fk_bloqueo_usuario` FOREIGN KEY (`creado_por`)
    REFERENCES `usuarios` (`id_usuario`);
