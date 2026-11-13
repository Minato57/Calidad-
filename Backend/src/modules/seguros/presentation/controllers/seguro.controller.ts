// =================================================================
// CAPA: Presentation / Controllers
// GET  /seguros/consulta?dni=XXXXXXXX[&forzar=1]
// GET  /seguros/captcha
// POST /seguros/verificar-captcha
// GET  /seguros/digito-verificador?dni=XXXXXXXX
// =================================================================
import { Request, Response } from 'express';
import { AppDataSource } from '../../../../config/datasource';
import { SeguroService, calcularDigitoVerificador } from '../../application/services/seguro.service';

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

    captcha = async (_req: Request, res: Response) => {
        const data = await this.service.obtenerCaptcha();
        return res.json(data);
    };

    verificarCaptcha = async (req: Request, res: Response) => {
        try {
            const { dni, digitoVerificador, fechaNacimiento, codigoCaptcha, token } = req.body || {};
            const seguro = await this.service.verificarConCaptcha({
                dni: String(dni || '').trim(),
                digitoVerificador: String(digitoVerificador || '').trim(),
                fechaNacimiento: String(fechaNacimiento || '').trim(),
                codigoCaptcha: String(codigoCaptcha || '').trim(),
                token: token ? String(token).trim() : undefined,
            });
            return res.json({ ok: true, seguro });
        } catch (err: any) {
            return res.status(err.status || 400).json({
                ok: false,
                mensaje: err.message || 'Error al validar con el portal del SIS',
            });
        }
    };

    digitoVerificador = (req: Request, res: Response) => {
        const dni = String(req.query.dni || '').trim();
        const digito = calcularDigitoVerificador(dni);
        return res.json({ ok: true, dni, digito });
    };
}
