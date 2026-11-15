-- =================================================================
-- BLOQUE 1 — Verificación del SIS
-- Ejecutar UNA VEZ sobre una base EXISTENTE (creada con una versión
-- anterior de 001_medicos_seguros_pagos.sql). Si recreas la base con el
-- 001 actual, NO hace falta: ya incluye estos cambios.
-- (Esta carpeta no la lee scripts/migrate.ts.)
-- =================================================================
USE `citasmedicassangenaro`;

-- 1) Aviso por correo 7 días antes de que venza un SIS activo (vigencia 90 días)
ALTER TABLE `seguros_consultas`
  ADD COLUMN `aviso_vencimiento_enviado` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT 'Correo de aviso 7 días antes del vencimiento';

-- 2) Nuevo tipo de notificación para los avisos del SIS
ALTER TABLE `notificaciones`
  MODIFY `tipo` ENUM('RECORDATORIO','CANCELACION','BLOQUEO_CUENTA','SEGURO') NOT NULL;

-- 3) Las filas de seguro que no vienen de una consulta real al portal pasan a
--    ser de DEMO: en modo portal se ignoran y el paciente debe verificarse.
--    (Las de la semilla anterior decían SIS_SCRAPER sin haber consultado el portal.)
UPDATE `seguros_consultas` SET `fuente` = 'SIMULADO'
WHERE `detalle` LIKE 'TITULAR - ACTIVO (%' OR `detalle` LIKE 'NO ASEGURADO AL SIS (%';
