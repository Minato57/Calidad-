// =================================================================
// CAPA: Presentation / Controllers
// GET /seguros/consulta?dni=XXXXXXXX[&forzar=1]
// Un PACIENTE solo puede consultar su propio DNI o el de sus familiares.
// =================================================================
import { Request, Response } from 'express';
import { AppDataSource } from '../../../../config/datasource';
import { SeguroService } from '../../application/services/seguro.service';

export class SeguroController {
    private service = new SeguroService();

    consultar = async (req: Request, res: Response) => {
        const dni = String(req.query.dni || '').trim();
        if (!/^\d{8}$/.test(dni)) {
            return res.status(400).json({ ok: false, mensaje: 'El DNI debe tener 8 dígitos' });
        }

        if (req.jwt!.rol === 'PACIENTE') {
            const idUsuario = req.jwt!.id;
            const rows = await AppDataSource.query(
                `SELECT id_usuario FROM usuarios WHERE dni = ? AND (id_usuario = ? OR id_tutor = ?) LIMIT 1`,
                [dni, idUsuario, idUsuario],
            );
            if (rows.length === 0) {
                return res.status(403).json({ ok: false, mensaje: 'Solo puedes consultar tu DNI o el de tus familiares' });
            }
        }

        const forzar = req.query.forzar === '1' && req.jwt!.rol !== 'PACIENTE';
        const seguro = await this.service.consultar(dni, forzar);
        return res.json({ ok: true, seguro });
    };
}
