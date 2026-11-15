// =================================================================
// CAPA: Infrastructure / Repositories
// Sesiones activas (tabla `sesiones`).
//
// Cada login crea una sesión con un identificador aleatorio (jti) que
// viaja dentro del JWT. En la columna `token` se guarda ese jti, NO el
// JWT. Un token solo es válido si su sesión existe y no expiró, así el
// logout lo revoca de inmediato (antes seguía sirviendo hasta expirar).
// =================================================================
import { randomUUID } from 'crypto';
import { AppDataSource } from '../../../../config/datasource';

export const DURACION_SESION_HORAS = 24;   // igual que la expiración del JWT ('1d')

export class SesionRepository {
    /** Crea la sesión y devuelve su identificador (jti). */
    async crear(idUsuario: number): Promise<string> {
        const jti = randomUUID();
        // Limpieza: sesiones vencidas de este usuario
        await AppDataSource.query(
            `DELETE FROM sesiones WHERE id_usuario = ? AND fecha_expiracion <= NOW()`, [idUsuario],
        );
        await AppDataSource.query(
            `INSERT INTO sesiones (id_usuario, token, fecha_expiracion)
             VALUES (?, ?, NOW() + INTERVAL ? HOUR)`,
            [idUsuario, jti, DURACION_SESION_HORAS],
        );
        return jti;
    }

    async estaActiva(idUsuario: number, jti: string): Promise<boolean> {
        const rows = await AppDataSource.query(
            `SELECT 1 FROM sesiones WHERE id_usuario = ? AND token = ? AND fecha_expiracion > NOW() LIMIT 1`,
            [idUsuario, jti],
        );
        return rows.length > 0;
    }

    async revocar(idUsuario: number, jti: string): Promise<void> {
        await AppDataSource.query(`DELETE FROM sesiones WHERE id_usuario = ? AND token = ?`, [idUsuario, jti]);
    }
}
