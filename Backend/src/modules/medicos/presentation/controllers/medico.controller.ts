import { Request, Response } from 'express';
import { MedicoService } from '../../application/services/medico.service';
import { AtencionDTO } from '../../application/dto/atencion.dto';

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const hoyLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export class MedicoController {
    private service = new MedicoService();

    // GET /medico/perfil
    perfil = async (req: Request, res: Response) => {
        const r = await this.service.perfil(req.jwt!.id);
        return res.status(r.ok ? 200 : 403).json(r);
    };

    // GET /medico/citas-hoy?fecha=YYYY-MM-DD
    citasDelDia = async (req: Request, res: Response) => {
        const fecha = req.query.fecha ? String(req.query.fecha) : hoyLocal();
        if (!RE_FECHA.test(fecha)) {
            return res.status(400).json({ ok: false, mensaje: 'La fecha no es válida' });
        }
        const r = await this.service.citasDelDia(req.jwt!.id, fecha);
        return res.status(r.ok ? 200 : 403).json(r);
    };

    // POST /medico/citas/:id/atencion
    atender = async (req: Request, res: Response) => {
        const idCita = Number(req.params.id);
        if (!idCita) return res.status(400).json({ ok: false, mensaje: 'ID de cita inválido' });
        const r = await this.service.atenderCita(req.jwt!.id, idCita, req.dto as AtencionDTO);
        const { status, ...body } = r as any;
        return res.status(status ?? 200).json(body);
    };

    // GET /medico/verificar/:codigo  (público)
    verificar = async (req: Request, res: Response) => {
        const codigo = String(req.params.codigo || '');
        if (!/^[A-Fa-f0-9]{16}$/.test(codigo)) {
            return res.status(400).json({ ok: false, mensaje: 'Código inválido' });
        }
        return res.json(await this.service.verificarReceta(codigo));
    };
}
