// =================================================================
// CAPA: Infrastructure / Repositories — Panel del médico (SQL directo)
// Las tablas medico_usuario y atenciones se crean con
// Backend/sql/001_medicos_seguros_pagos.sql
// =================================================================
import { AppDataSource } from '../../../../config/datasource';

function fechaLocalStr(fecha: any): string {
    if (fecha instanceof Date) {
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    }
    return String(fecha).slice(0, 10);
}

export interface PerfilMedico {
    id_medico: number;
    cmp: string | null;
    nombres: string;
    apellidos: string;
    especialidad: string;
}

export class MedicoPanelRepository {
    async perfilPorUsuario(idUsuario: number): Promise<PerfilMedico | null> {
        const rows = await AppDataSource.query(
            `SELECT m.id_medico, mu.cmp, m.nombres, m.apellidos, e.nombre AS especialidad
             FROM medico_usuario mu
             INNER JOIN medicos m ON m.id_medico = mu.id_medico
             INNER JOIN especialidades e ON e.id_especialidad = m.id_especialidad
             WHERE mu.id_usuario = ? LIMIT 1`,
            [idUsuario],
        );
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
            id_medico: Number(r.id_medico), cmp: r.cmp ?? null,
            nombres: r.nombres, apellidos: r.apellidos, especialidad: r.especialidad,
        };
    }

    async citasDelDia(idMedico: number, fecha: string) {
        const rows = await AppDataSource.query(
            `SELECT c.id_cita, c.estado, c.motivo, c.notas, h.fecha, h.hora,
                    c.id_dependiente,
                    COALESCE(f.nombres,   t.nombres)   AS paciente_nombres,
                    COALESCE(f.apellidos, t.apellidos) AS paciente_apellidos,
                    COALESCE(f.dni,       t.dni)       AS paciente_dni,
                    COALESCE(f.fecha_nacimiento, t.fecha_nacimiento) AS fecha_nacimiento,
                    f.parentesco AS parentesco,
                    t.nombres AS titular_nombres, t.apellidos AS titular_apellidos,
                    t.correo AS titular_correo,
                    a.id_atencion, a.correo_enviado, a.codigo_verificacion
             FROM citas c
             INNER JOIN horarios h ON h.id_horario = c.id_horario
             INNER JOIN usuarios t ON t.id_usuario = c.id_usuario
             LEFT  JOIN usuarios f ON f.id_usuario = c.id_dependiente
             LEFT  JOIN atenciones a ON a.id_cita = c.id_cita
             WHERE h.id_medico = ? AND h.fecha = ? AND c.estado <> 'CANCELADA'
             ORDER BY h.hora ASC`,
            [idMedico, fecha],
        );
        return rows.map((r: any) => ({
            id_cita: Number(r.id_cita),
            estado: r.estado,
            motivo: r.motivo ?? null,
            notas: r.notas ?? null,
            fecha: fechaLocalStr(r.fecha),
            hora: r.hora,
            es_familiar: !!r.id_dependiente,
            parentesco: r.parentesco ?? null,
            paciente_nombres: r.paciente_nombres ?? '',
            paciente_apellidos: r.paciente_apellidos ?? '',
            paciente_dni: r.paciente_dni ?? '',
            fecha_nacimiento: r.fecha_nacimiento ? fechaLocalStr(r.fecha_nacimiento) : null,
            titular_nombre: `${r.titular_nombres ?? ''} ${r.titular_apellidos ?? ''}`.trim(),
            tiene_correo: !!r.titular_correo,
            atendida: !!r.id_atencion,
            correo_enviado: !!r.correo_enviado,
            codigo_verificacion: r.codigo_verificacion ?? null,
        }));
    }

    /** Cita del médico con los datos necesarios para emitir la receta. */
    async citaParaAtencion(idCita: number, idMedico: number) {
        const rows = await AppDataSource.query(
            `SELECT c.id_cita, c.estado, h.fecha, h.hora,
                    COALESCE(f.nombres,   t.nombres)   AS paciente_nombres,
                    COALESCE(f.apellidos, t.apellidos) AS paciente_apellidos,
                    COALESCE(f.dni,       t.dni)       AS paciente_dni,
                    t.nombres AS titular_nombres, t.correo AS titular_correo,
                    a.id_atencion
             FROM citas c
             INNER JOIN horarios h ON h.id_horario = c.id_horario
             INNER JOIN usuarios t ON t.id_usuario = c.id_usuario
             LEFT  JOIN usuarios f ON f.id_usuario = c.id_dependiente
             LEFT  JOIN atenciones a ON a.id_cita = c.id_cita
             WHERE c.id_cita = ? AND h.id_medico = ? LIMIT 1`,
            [idCita, idMedico],
        );
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
            id_cita: Number(r.id_cita),
            estado: String(r.estado),
            fecha: fechaLocalStr(r.fecha),
            hora: String(r.hora),
            paciente: `${r.paciente_nombres ?? ''} ${r.paciente_apellidos ?? ''}`.trim(),
            paciente_dni: r.paciente_dni ?? '',
            titular_nombres: r.titular_nombres ?? '',
            correo: (r.titular_correo as string | null) ?? null,
            ya_atendida: !!r.id_atencion,
        };
    }

    /** Guarda la atención y marca la cita como COMPLETADA en una sola transacción. */
    async guardarAtencion(data: {
        id_cita: number; id_medico: number; diagnostico: string;
        receta: string | null; indicaciones: string | null;
        codigo: string; correo: string | null;
    }): Promise<number> {
        return await AppDataSource.transaction(async (m) => {
            const ins = await m.query(
                `INSERT INTO atenciones (id_cita, id_medico, diagnostico, receta, indicaciones, codigo_verificacion, correo_destino)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [data.id_cita, data.id_medico, data.diagnostico, data.receta, data.indicaciones, data.codigo, data.correo],
            );
            await m.query(`UPDATE citas SET estado = 'COMPLETADA' WHERE id_cita = ?`, [data.id_cita]);
            return Number(ins.insertId);
        });
    }

    async marcarCorreoEnviado(idAtencion: number) {
        await AppDataSource.query(`UPDATE atenciones SET correo_enviado = 1 WHERE id_atencion = ?`, [idAtencion]);
    }

    async verificarCodigo(codigo: string) {
        const rows = await AppDataSource.query(
            `SELECT a.fecha_atencion, m.nombres, m.apellidos, mu.cmp, e.nombre AS especialidad
             FROM atenciones a
             INNER JOIN medicos m ON m.id_medico = a.id_medico
             INNER JOIN especialidades e ON e.id_especialidad = m.id_especialidad
             LEFT  JOIN medico_usuario mu ON mu.id_medico = m.id_medico
             WHERE a.codigo_verificacion = ? LIMIT 1`,
            [codigo],
        );
        if (rows.length === 0) return null;
        const r = rows[0];
        return {
            medico: `${r.nombres} ${r.apellidos}`,
            cmp: r.cmp ?? null,
            especialidad: r.especialidad,
            fecha_atencion: new Date(r.fecha_atencion).toISOString(),
        };
    }
}
