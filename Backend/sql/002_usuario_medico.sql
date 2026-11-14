-- =================================================================
-- Usuario de prueba con rol MEDICO (contraseña: admin123)
-- Es idempotente: se puede ejecutar varias veces sin duplicar.
-- Ejecutar sobre la base ya creada con 001_medicos_seguros_pagos.sql
--   medico@carenest.pe  → MEDICO (Dr. Carlos Lopez, Medicina General)
-- =================================================================

INSERT INTO `usuarios`
  (correo, contrasena, rol, dni, nombres, apellidos, telefono, fecha_nacimiento, direccion, genero)
SELECT 'medico@carenest.pe',
       '$2b$10$.TAwn4G3R.fzAZachB9bqux7uL/h310urEuJngYs.pIzqLTQnLNMe',
       'MEDICO', '00000003', 'Carlos', 'Lopez', '977777777', NULL, NULL, 'Masculino'
WHERE NOT EXISTS (SELECT 1 FROM `usuarios` WHERE correo = 'medico@carenest.pe');

INSERT INTO `medico_usuario` (id_medico, id_usuario, cmp)
SELECT m.id_medico, u.id_usuario, 'CMP-00001'
FROM `medicos` m
INNER JOIN `usuarios` u ON u.correo = 'medico@carenest.pe'
WHERE m.nombres = 'Carlos' AND m.apellidos = 'Lopez'
  AND NOT EXISTS (SELECT 1 FROM `medico_usuario` mu WHERE mu.id_usuario = u.id_usuario);

