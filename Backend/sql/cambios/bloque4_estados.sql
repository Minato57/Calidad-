-- =================================================================
-- BLOQUE 4 — Estados de la cita y notificaciones de sanción
-- Ejecutar UNA VEZ sobre una base EXISTENTE, después de bloque1 y bloque2.
-- Si recreas la base con el 001 actual, NO hace falta.
-- =================================================================
USE `citasmedicassangenaro`;

-- 1) La cita ya no usa CONFIRMADA ni RECORDATORIO (el recordatorio es solo
--    una notificación). Las que estuvieran así siguen pendientes: RESERVADA.
UPDATE `citas` SET `estado` = 'RESERVADA' WHERE `estado` IN ('CONFIRMADA', 'RECORDATORIO');
ALTER TABLE `citas`
  MODIFY `estado` ENUM('RESERVADA','COMPLETADA','CANCELADA','FALTA') DEFAULT 'RESERVADA';

-- 2) Nuevo tipo de notificación: SANCION (inasistencia o cancelación tardía registrada)
ALTER TABLE `notificaciones`
  MODIFY `tipo` ENUM('RECORDATORIO','CANCELACION','SANCION','BLOQUEO_CUENTA','SEGURO') NOT NULL;

-- 3) Avisos de sanción antiguos guardados como RECORDATORIO pasan a su tipo correcto
UPDATE `notificaciones` SET `tipo` = 'BLOQUEO_CUENTA'
WHERE `tipo` = 'RECORDATORIO' AND `mensaje` LIKE 'Tu cuenta ha sido suspendida%';
UPDATE `notificaciones` SET `tipo` = 'SANCION'
WHERE `tipo` = 'RECORDATORIO' AND (`mensaje` LIKE 'Registramos una inasistencia%' OR `mensaje` LIKE 'Registramos una cancelación de último momento%');
