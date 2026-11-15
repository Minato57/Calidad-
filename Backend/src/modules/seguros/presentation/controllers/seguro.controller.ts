// =================================================================
// CAPA: Presentation / Controllers
// GET  /seguros/consulta?dni=XXXXXXXX   → estado del SIS de un DNI
// GET  /seguros/mis-estados             → titular + familiares con su estado (Mi Perfil)
// GET  /seguros/captcha?dni=XXXXXXXX    → inicia la verificación (Captcha + token)
// POST /seguros/verificar-captcha       → consulta el portal con el Captcha resuelto
//
// Un PACIENTE solo puede operar sobre su propio DNI o el de sus familiares.
// =================================================================
import { Request, Response } from 'express';
import { SeguroService } from '../../application/services/seguro.service';

const MSG_DNI = 'El DNI debe tener 8 dígitos';
const MSG_AJENO = 'Solo puedes consultar tu DNI o el de tus familiares';

export class SeguroController {
    private service = new SeguroService();

    // Valida formato y pertenencia del DNI. Devuelve null si ya respondió con error.
    private async dniAutorizado(req: Request, res: Response, valor: unknown): Promise<string | null> {
        const dni = String(valor || '').trim();
        if (!/^\d{8}$/.test(dni)) {
            res.status(400).json({ ok: false, mensaje: MSG_DNI });
            return null;
        }
        if (!(await this.service.puedeGestionarDni(req.jwt!, dni))) {
            res.status(403).json({ ok: false, mensaje: MSG_AJENO });
            return null;
        }
        return dni;
    }

    private responderError(res: Response, err: any) {
        const status = typeof err?.status === 'number' ? err.status : 500;
        if (!err?.status) console.error('[SIS] Error no controlado:', err);
        return res.status(status).json({
            ok: false,
            codigo: err?.codigo,
            mensaje: err?.status ? err.message : 'No se pudo completar la verificación del SIS',
        });
    }

    consultar = async (req: Request, res: Response) => {
        const dni = await this.dniAutorizado(req, res, req.query.dni);
        if (!dni) return;
        const seguro = await this.service.consultar(dni);
        return res.json({ ok: true, seguro });
    };

    misEstados = async (req: Request, res: Response) => {
        const personas = await this.service.estadosDelPaciente(req.jwt!.id);
        return res.json({ ok: true, personas });
    };

    captcha = async (req: Request, res: Response) => {
        try {
            const dni = await this.dniAutorizado(req, res, req.query.dni);
            if (!dni) return;
            return res.json(await this.service.iniciarVerificacion(dni, req.jwt!.id));
        } catch (err: any) {
            return this.responderError(res, err);
        }
    };

    verificarCaptcha = async (req: Request, res: Response) => {
        try {
            const { fechaNacimiento, codigoCaptcha, token } = req.body || {};
            const dni = await this.dniAutorizado(req, res, req.body?.dni);
            if (!dni) return;
            const seguro = await this.service.verificarConCaptcha({
                dni,
                fechaNacimiento: String(fechaNacimiento || '').trim(),
                codigoCaptcha: String(codigoCaptcha || '').trim(),
                token: token ? String(token).trim() : undefined,
            }, req.jwt!.id);
            return res.json({ ok: true, seguro });
        } catch (err: any) {
            return this.responderError(res, err);
        }
    };
}
