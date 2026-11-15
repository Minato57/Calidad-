// =================================================================
// CAPA: Infrastructure / Repositories
// Implementación de IHorarioRepository usando TypeORM.
//
// CAMBIO (Enfoque A1): además de los métodos originales, agrega
// la capacidad de buscar/crear un horario puntual al momento de
// reservar (los horarios ya no están pre-cargados en la BD).
//
// IMPORTANTE: la fecha se maneja como STRING "YYYY-MM-DD" para
// evitar el desfase de un día que causaba new Date() al convertir
// a UTC en zonas horarias negativas (Perú UTC-5).
// =================================================================
import { Repository } from 'typeorm';

import { AppDataSource } from '../../../../config/datasource';
import { HorarioModel } from '../models/horario.model';
import { IHorarioRepository } from '../../domain/repositories/IHorarioRepository';
import { Horario } from '../../domain/entities/horario.entity';
import { HorarioMapping } from '../mapping/horario.mapping';
import { Tx, ErrorNegocio, esConflictoConcurrente } from '../../../../shared/db/transaccion';

export class HorarioRepository implements IHorarioRepository {
    private repo: Repository<HorarioModel>;

    constructor() {
        this.repo = AppDataSource.getRepository(HorarioModel);
    }

    async findById(id: number): Promise<Horario | null> {
        const model = await this.repo.findOne({
            where: { id_horario: id },
        });
        if (!model) return null;
        return HorarioMapping.toDomain(model);
    }

    // ============================================================
    // Toma un horario (médico+fecha+hora) para una reserva, DENTRO
    // de la transacción de la reserva. Devuelve su id_horario.
    //
    //  - Si el horario no existe se crea (ya ocupado).
    //  - Si existe y TODAS sus citas están canceladas, se reutiliza
    //    (permite volver a reservar un horario que fue cancelado).
    //  - Si tiene una cita no cancelada → ErrorNegocio (ocupado).
    //
    // La fila se bloquea con FOR UPDATE y el UNIQUE(id_medico,fecha,hora)
    // protege la creación, así dos reservas simultáneas no toman el mismo
    // horario. La fecha viaja como string para evitar desfases de zona horaria.
    // ============================================================
    async tomarHorario(tx: Tx, idMedico: number, fecha: string, hora: string): Promise<number> {
        const ocupado = new ErrorNegocio('Ese horario ya fue reservado, selecciona otro.');
        try {
            const filas = await tx.query(
                `SELECT id_horario FROM horarios WHERE id_medico = ? AND fecha = ? AND hora = ? FOR UPDATE`,
                [idMedico, fecha, hora],
            );
            if (filas.length > 0) {
                const idHorario = Number(filas[0].id_horario);
                const [{ activas }] = await tx.query(
                    `SELECT COUNT(*) AS activas FROM citas WHERE id_horario = ? AND estado <> 'CANCELADA'`,
                    [idHorario],
                );
                if (Number(activas) > 0) throw ocupado;
                await tx.query(`UPDATE horarios SET disponible = 0 WHERE id_horario = ?`, [idHorario]);
                return idHorario;
            }
            const ins = await tx.query(
                `INSERT INTO horarios (id_medico, fecha, hora, tipo_visita, disponible) VALUES (?, ?, ?, 'PRESENCIAL', 0)`,
                [idMedico, fecha, hora],
            );
            return Number(ins.insertId);
        } catch (err: any) {
            // Otra reserva tomó el mismo horario a la vez (UNIQUE o bloqueo mutuo).
            if (esConflictoConcurrente(err)) throw ocupado;
            throw err;
        }
    }
}