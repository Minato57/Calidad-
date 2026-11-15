// =================================================================
// CAPA: Application / Services
// Pagos de consulta con Mercado Pago (Checkout Pro) vía API REST.
//
// Regla de negocio:
//   - Paciente (o familiar) con SIS activo y VERIFICADO en el portal
//                                     → cita gratuita (pago EXONERADO).
//   - Sin SIS o sin verificación vigente
//                                     → debe existir un pago APROBADO
//                                       antes de confirmar la reserva.
//
// Variables de entorno:
//   MP_ACCESS_TOKEN        token de Mercado Pago (TEST-... en pruebas).
//                          Si falta: modo SIMULADO (solo fuera de producción).
//   FRONTEND_URL           URL pública del frontend (default http://localhost:5173)
//   BACKEND_PUBLIC_URL     URL pública del backend para el webhook (opcional)
//   TARIFA_CONSULTA_PEN    monto de la consulta (default 20)
//   PAGOS_HABILITADOS      'false' desactiva el cobro
// =================================================================
import { AppDataSource } from '../../../../config/datasource';
import { SeguroService, ResultadoSeguro } from '../../../seguros/application/services/seguro.service';
import { cubiertoPorSIS } from '../../../seguros/domain/sis-protocolo';
import { Tx, ErrorNegocio } from '../../../../shared/db/transaccion';
import { motivoNoUsable } from '../../domain/saldo';

const MP_API = 'https://api.mercadopago.com';

export interface SaldoAFavor {
    id_pago: number;
    monto: number;
    creado_en: string;
}

export interface EvaluacionCobro {
    dni: string;
    seguro: ResultadoSeguro;
    requiere_pago: boolean;        // true = debe pagar dinero nuevo en Mercado Pago
    saldo: SaldoAFavor | null;     // pago previo reutilizable de ESTE paciente
    usa_saldo: boolean;            // la cita se cubrirá con el saldo a favor
    monto: number;
    moneda: 'PEN';
}

export interface ResultadoValidacionCobro {
    ok: boolean;
    mensaje?: string;
    requiere_pago?: boolean;
    exonerado?: boolean;
    id_pago?: number;
    dni?: string;
}

// Pago + estado de la cita a la que está aplicado (si hay)
const SQL_PAGO_CON_CITA = `
    SELECT p.*, c.estado AS estado_cita
    FROM pagos p
    LEFT JOIN citas c ON c.id_cita = p.id_cita`;

export class PagoService {
    private seguroService = new SeguroService();

    private get habilitado(): boolean {
        return process.env.PAGOS_HABILITADOS !== 'false';
    }
    private get tarifa(): number {
        return Number(process.env.TARIFA_CONSULTA_PEN) || 20;
    }
    private get frontendUrl(): string {
        return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    }
    private get tokenMP(): string | null {
        return process.env.MP_ACCESS_TOKEN || null;
    }
    private get simulado(): boolean {
        return !this.tokenMP && process.env.NODE_ENV !== 'production';
    }

    // ------------------------------------------------------------
    // DNI del paciente efectivo (titular o su familiar).
    // ------------------------------------------------------------
    private async dniPaciente(idUsuario: number, idDependiente?: number): Promise<string | null> {
        if (idDependiente) {
            const rows = await AppDataSource.query(
                `SELECT dni FROM usuarios WHERE id_usuario = ? AND id_tutor = ? LIMIT 1`,
                [idDependiente, idUsuario],
            );
            return rows[0]?.dni ? String(rows[0].dni) : null;
        }
        const rows = await AppDataSource.query(`SELECT dni FROM usuarios WHERE id_usuario = ? LIMIT 1`, [idUsuario]);
        return rows[0]?.dni ? String(rows[0].dni) : null;
    }

    // ------------------------------------------------------------
    // ¿Debe pagar? (consulta/valida el seguro del paciente efectivo)
    // ------------------------------------------------------------
    async evaluar(idUsuario: number, idDependiente?: number): Promise<EvaluacionCobro> {
        const dni = await this.dniPaciente(idUsuario, idDependiente);
        if (!dni) {
            throw Object.assign(new Error('No se encontró el DNI del paciente'), { status: 400 });
        }
        const seguro = await this.seguroService.consultar(dni);
        // Solo exonera un SIS activo Y verificado; un estado sin verificar exige pago.
        const cubierto = cubiertoPorSIS(seguro);
        const saldo = await this.saldoDisponible(idUsuario, dni);
        const cobrar = this.habilitado && !cubierto;
        return {
            dni, seguro, saldo,
            usa_saldo: cobrar && !!saldo,
            requiere_pago: cobrar && !saldo,
            monto: this.tarifa, moneda: 'PEN',
        };
    }

    // ------------------------------------------------------------
    // Saldo a favor: el pago aprobado más antiguo de ESTE paciente que
    // no esté aplicado a una cita vigente (ver domain/saldo.ts).
    // ------------------------------------------------------------
    async saldoDisponible(idUsuario: number, dni: string): Promise<SaldoAFavor | null> {
        const rows = await AppDataSource.query(
            `${SQL_PAGO_CON_CITA}
             WHERE p.id_usuario = ? AND p.dni_paciente = ? AND p.estado = 'APROBADO'
             ORDER BY p.creado_en ASC`,
            [idUsuario, dni],
        );
        const usable = rows.find((r: any) => motivoNoUsable(r, dni, this.tarifa) === null);
        return usable
            ? { id_pago: Number(usable.id_pago), monto: Number(usable.monto), creado_en: new Date(usable.creado_en).toISOString() }
            : null;
    }

    /** Saldos a favor del titular y sus familiares (Mi Perfil). */
    async saldosDelPaciente(idUsuario: number) {
        const rows = await AppDataSource.query(
            `SELECT p.id_pago, p.monto, p.dni_paciente, p.creado_en, p.estado, p.id_cita, c.estado AS estado_cita,
                    u.nombres, u.apellidos
             FROM pagos p
             LEFT JOIN citas c    ON c.id_cita = p.id_cita
             LEFT JOIN usuarios u ON u.dni = p.dni_paciente
             WHERE p.id_usuario = ? AND p.estado = 'APROBADO'
             ORDER BY p.creado_en ASC`,
            [idUsuario],
        );
        return rows
            .filter((r: any) => motivoNoUsable(r, String(r.dni_paciente ?? '').trim(), 0) === null)
            .map((r: any) => ({
                id_pago: Number(r.id_pago),
                monto: Number(r.monto),
                dni: String(r.dni_paciente),
                paciente: `${r.nombres ?? ''} ${r.apellidos ?? ''}`.trim(),
                creado_en: new Date(r.creado_en).toISOString(),
            }));
    }

    /** Monto pagado (aprobado) aplicado a una cita, o null si no tuvo pago. */
    async montoPagadoDeCita(idCita: number): Promise<number | null> {
        const rows = await AppDataSource.query(
            `SELECT monto FROM pagos WHERE id_cita = ? AND estado = 'APROBADO' LIMIT 1`, [idCita],
        );
        return rows.length > 0 ? Number(rows[0].monto) : null;
    }

    // ------------------------------------------------------------
    // Crea el pago PENDIENTE y la preferencia de Mercado Pago.
    // ------------------------------------------------------------
    async crearCheckout(idUsuario: number, data: { id_dependiente?: number; descripcion?: string }) {
        const ev = await this.evaluar(idUsuario, data.id_dependiente);
        if (!ev.requiere_pago) {
            const mensaje = ev.usa_saldo
                ? 'Tienes saldo a favor: la cita se cubrirá con tu pago anterior'
                : 'Esta cita no requiere pago';
            return { ok: true, requiere_pago: false, mensaje, evaluacion: ev };
        }

        const descripcion = (data.descripcion || 'Consulta médica').slice(0, 200);
        const ins = await AppDataSource.query(
            `INSERT INTO pagos (id_usuario, dni_paciente, monto, moneda, estado, descripcion)
             VALUES (?, ?, ?, 'PEN', 'PENDIENTE', ?)`,
            [idUsuario, ev.dni, ev.monto, descripcion],
        );
        const idPago: number = Number(ins.insertId);

        // ----- Modo simulado (sin token de Mercado Pago, solo desarrollo) -----
        if (this.simulado) {
            await AppDataSource.query(`UPDATE pagos SET mp_preference_id = 'SIMULADO' WHERE id_pago = ?`, [idPago]);
            return {
                ok: true, requiere_pago: true, simulado: true, id_pago: idPago,
                monto: ev.monto, moneda: ev.moneda,
                init_point: `${this.frontendUrl}/paciente/reservar?pago=ok&id_pago=${idPago}`,
            };
        }
        if (!this.tokenMP) {
            return { ok: false, mensaje: 'Pasarela de pagos no configurada (MP_ACCESS_TOKEN)' };
        }

        // ----- Mercado Pago: Checkout Pro -----
        const back = (estado: string) => `${this.frontendUrl}/paciente/reservar?pago=${estado}&id_pago=${idPago}`;
        const body: any = {
            items: [{
                id: `consulta-${idPago}`,
                title: descripcion,
                quantity: 1,
                unit_price: ev.monto,
                currency_id: 'PEN',
            }],
            external_reference: String(idPago),
            back_urls: { success: back('ok'), failure: back('error'), pending: back('pendiente') },
            statement_descriptor: 'CENTRO SAN GENARO',
        };
        // auto_return exige back_urls públicas (https); en localhost se omite.
        if (this.frontendUrl.startsWith('https://')) body.auto_return = 'approved';
        if (process.env.BACKEND_PUBLIC_URL) {
            body.notification_url = `${process.env.BACKEND_PUBLIC_URL.replace(/\/$/, '')}/pagos/webhook`;
        }

        const resp = await fetch(`${MP_API}/checkout/preferences`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.tokenMP}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
        });
        const pref: any = await resp.json().catch(() => ({}));
        if (!resp.ok || !pref.init_point) {
            const sanitizedPref = JSON.stringify(pref).replace(/[\r\n]/g, '');
            console.error('[PAGOS] Error al crear preferencia MP:', resp.status, sanitizedPref);
            await AppDataSource.query(`UPDATE pagos SET estado = 'RECHAZADO' WHERE id_pago = ?`, [idPago]);
            return { ok: false, mensaje: 'No se pudo iniciar el pago con Mercado Pago' };
        }

        await AppDataSource.query(`UPDATE pagos SET mp_preference_id = ? WHERE id_pago = ?`, [pref.id, idPago]);
        const esSandbox = !!pref.sandbox_init_point && (process.env.NODE_ENV !== 'production' || this.tokenMP.startsWith('TEST-'));
        return {
            ok: true, requiere_pago: true, simulado: false, id_pago: idPago,
            monto: ev.monto, moneda: ev.moneda,
            init_point: esSandbox ? pref.sandbox_init_point : pref.init_point,
        };
    }

    // ------------------------------------------------------------
    // Consulta el estado real del pago (al volver de Mercado Pago).
    // ------------------------------------------------------------
    async verificar(idUsuario: number, idPago: number, paymentId?: string) {
        const rows = await AppDataSource.query(
            `${SQL_PAGO_CON_CITA} WHERE p.id_pago = ? AND p.id_usuario = ? LIMIT 1`,
            [idPago, idUsuario],
        );
        const pago = rows[0];
        if (!pago) return { ok: false, mensaje: 'Pago no encontrado' };
        if (pago.estado === 'APROBADO' || pago.estado === 'EXONERADO') {
            // "usado" = aplicado a una cita vigente (si la cita se canceló, vuelve a ser saldo a favor)
            return { ok: true, estado: pago.estado, usado: !!pago.id_cita && pago.estado_cita !== 'CANCELADA' };
        }

        if (this.simulado && pago.mp_preference_id === 'SIMULADO') {
            await AppDataSource.query(`UPDATE pagos SET estado = 'APROBADO', mp_payment_id = 'SIMULADO' WHERE id_pago = ?`, [idPago]);
            return { ok: true, estado: 'APROBADO', usado: false, simulado: true };
        }

        const estado = await this.consultarEstadoMP(idPago, paymentId);
        return { ok: true, estado, usado: false };
    }

    // ------------------------------------------------------------
    // Webhook de Mercado Pago (público; se re-consulta a la API de MP,
    // así que no se confía en el contenido del request).
    // ------------------------------------------------------------
    async procesarWebhook(paymentId: string | undefined) {
        if (!paymentId || !this.tokenMP) return;
        const pago = await this.obtenerPagoMP(paymentId);
        if (!pago) return;
        const idPago = Number(pago.external_reference);
        if (!idPago) return;
        await this.actualizarDesdeMP(idPago, pago);
    }

    private async obtenerPagoMP(paymentId: string): Promise<any | null> {
        const resp = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
            headers: { 'Authorization': `Bearer ${this.tokenMP}` },
            signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok) return null;
        return resp.json();
    }

    private async consultarEstadoMP(idPago: number, paymentId?: string): Promise<string> {
        if (!this.tokenMP) return 'PENDIENTE';
        let pagoMP: any | null = null;

        if (paymentId) {
            pagoMP = await this.obtenerPagoMP(paymentId);
            // Evita que se use el pago de otra operación.
            if (pagoMP && Number(pagoMP.external_reference) !== idPago) pagoMP = null;
        } else {
            const resp = await fetch(
                `${MP_API}/v1/payments/search?external_reference=${idPago}&sort=date_created&criteria=desc`,
                { headers: { 'Authorization': `Bearer ${this.tokenMP}` }, signal: AbortSignal.timeout(10000) },
            );
            if (resp.ok) {
                const json: any = await resp.json();
                pagoMP = json.results?.[0] ?? null;
            }
        }
        if (!pagoMP) return 'PENDIENTE';
        return this.actualizarDesdeMP(idPago, pagoMP);
    }

    private async actualizarDesdeMP(idPago: number, pagoMP: any): Promise<string> {
        const mapa: Record<string, string> = {
            approved: 'APROBADO', rejected: 'RECHAZADO', cancelled: 'RECHAZADO', refunded: 'RECHAZADO',
        };
        const estado = mapa[pagoMP.status] ?? 'PENDIENTE';
        // Solo se aprueba si el monto cobrado cubre la tarifa registrada.
        if (estado === 'APROBADO') {
            const rows = await AppDataSource.query(`SELECT monto FROM pagos WHERE id_pago = ?`, [idPago]);
            if (rows[0] && Number(pagoMP.transaction_amount) + 0.001 < Number(rows[0].monto)) {
                return 'PENDIENTE';
            }
        }
        await AppDataSource.query(
            `UPDATE pagos SET estado = ?, mp_payment_id = ? WHERE id_pago = ? AND estado <> 'EXONERADO'`,
            [estado, String(pagoMP.id), idPago],
        );
        return estado;
    }

    // ------------------------------------------------------------
    // Usado por CitaService al reservar.
    // ------------------------------------------------------------
    async validarParaReserva(
        idUsuario: number,
        idDependiente: number | undefined,
        idPago: number | undefined,
    ): Promise<ResultadoValidacionCobro> {
        if (!this.habilitado) return { ok: true, requiere_pago: false };

        const ev = await this.evaluar(idUsuario, idDependiente);
        if (cubiertoPorSIS(ev.seguro)) {
            return { ok: true, requiere_pago: false, exonerado: true, dni: ev.dni };
        }

        // Pago indicado por el frontend (al volver de Mercado Pago): debe servir para ESTE paciente.
        if (idPago) {
            const rows = await AppDataSource.query(
                `${SQL_PAGO_CON_CITA} WHERE p.id_pago = ? AND p.id_usuario = ? LIMIT 1`,
                [idPago, idUsuario],
            );
            const motivo = rows[0] ? motivoNoUsable(rows[0], ev.dni, ev.monto) : 'Pago no encontrado.';
            if (motivo) return { ok: false, requiere_pago: true, mensaje: motivo };
            return { ok: true, requiere_pago: true, id_pago: idPago, dni: ev.dni };
        }

        // Sin pago indicado: se usa el saldo a favor del paciente, si tiene
        // (cubre también el caso de recargar la página al volver de Mercado Pago).
        if (ev.saldo) {
            return { ok: true, requiere_pago: true, id_pago: ev.saldo.id_pago, dni: ev.dni };
        }

        const motivo = ev.seguro.verificado
            ? 'El paciente no cuenta con SIS activo.'
            : 'No hay una verificación vigente del SIS para el paciente.';
        return {
            ok: false, requiere_pago: true,
            mensaje: `${motivo} Verifica el SIS o paga S/ ${ev.monto.toFixed(2)} para confirmar la cita.`,
        };
    }

    /**
     * Vincula el cobro con la cita creada (consume el pago o registra la exoneración).
     * Se ejecuta dentro de la transacción de la reserva: si el pago ya fue usado
     * por otra reserva simultánea, lanza ErrorNegocio y la reserva se deshace.
     */
    async confirmarCobro(cobro: ResultadoValidacionCobro, idUsuario: number, idCita: number, tx: Tx) {
        if (cobro.id_pago) {
            // Solo si sigue siendo saldo usable de este paciente (sin cita o con su cita cancelada).
            // Si dos reservas lo usan a la vez, la segunda no actualiza nada y se deshace.
            const res = await tx.query(
                `UPDATE pagos p
                 LEFT JOIN citas c ON c.id_cita = p.id_cita
                 SET p.id_cita = ?
                 WHERE p.id_pago = ? AND p.id_usuario = ? AND p.estado = 'APROBADO'
                   AND p.dni_paciente = ? AND (p.id_cita IS NULL OR c.estado = 'CANCELADA')`,
                [idCita, cobro.id_pago, idUsuario, cobro.dni ?? ''],
            );
            if (Number(res?.affectedRows ?? 0) === 0) {
                throw new ErrorNegocio('El pago no está aprobado o ya fue utilizado.', 402, { requiere_pago: true });
            }
        } else if (cobro.exonerado) {
            await tx.query(
                `INSERT INTO pagos (id_usuario, id_cita, dni_paciente, monto, moneda, estado, descripcion)
                 VALUES (?, ?, ?, 0, 'PEN', 'EXONERADO', 'Cubierto por SIS')`,
                [idUsuario, idCita, cobro.dni ?? null],
            );
        }
    }
}
