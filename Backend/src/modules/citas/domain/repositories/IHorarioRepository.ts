// =================================================================
// CAPA: Domain / Repositories
// Contrato del repositorio de horarios.
// =================================================================
import { Horario } from '../entities/horario.entity';
import { Tx } from '../../../../shared/db/transaccion';

export interface IHorarioRepository {
    findById(id: number): Promise<Horario | null>;

    /** Toma (crea o reutiliza si solo tiene citas canceladas) el horario dentro de la transacción de la reserva. */
    tomarHorario(tx: Tx, idMedico: number, fecha: string, hora: string): Promise<number>;
}