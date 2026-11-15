// =================================================================
// Transacciones de base de datos.
// `Tx` es el contexto transaccional que se pasa a los repositorios
// para que varias escrituras se confirmen o se deshagan juntas.
// =================================================================
import { EntityManager } from 'typeorm';
import { AppDataSource } from '../../config/datasource';

export type Tx = EntityManager;

export function enTransaccion<T>(trabajo: (tx: Tx) => Promise<T>): Promise<T> {
    return AppDataSource.transaction(trabajo);
}

/** Error de negocio esperado dentro de una transacción (provoca rollback y se responde al usuario). */
export class ErrorNegocio extends Error {
    constructor(mensaje: string, public readonly status = 409, public readonly extra: Record<string, unknown> = {}) {
        super(mensaje);
        this.name = 'ErrorNegocio';
    }
}

/** Errores de MySQL que indican que otra operación tomó el mismo recurso a la vez. */
export function esConflictoConcurrente(err: any): boolean {
    return err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062
        || err?.code === 'ER_LOCK_DEADLOCK' || err?.errno === 1213;
}
