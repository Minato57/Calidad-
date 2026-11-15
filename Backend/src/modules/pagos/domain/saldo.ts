// =================================================================
// CAPA: Domain
// Saldo a favor.
//
// Un pago APROBADO funciona como saldo a favor de UN paciente (su DNI)
// mientras no esté aplicado a una cita vigente:
//   - nunca se usó (id_cita NULL): p. ej. pagó y luego verificó su SIS,
//     o la reserva falló / recargó la página al volver de Mercado Pago;
//   - o su cita fue CANCELADA (por el paciente, cancelación masiva o
//     inhabilitación): el monto no se pierde.
// Una cita COMPLETADA o con FALTA consume el pago definitivamente.
// =================================================================
export interface PagoParaSaldo {
    estado: string;
    dni_paciente: string | null;
    id_cita: number | null;
    estado_cita: string | null;   // estado de la cita vinculada (si hay)
    monto: number | string;
}

/** null si el pago se puede usar para una nueva cita de ese paciente; si no, el motivo. */
export function motivoNoUsable(pago: PagoParaSaldo, dniPaciente: string, tarifa: number): string | null {
    if (pago.estado !== 'APROBADO') return 'El pago no está aprobado.';
    if (String(pago.dni_paciente ?? '').trim() !== dniPaciente) return 'El pago corresponde a otro paciente.';
    if (pago.id_cita !== null && pago.id_cita !== undefined && pago.estado_cita !== 'CANCELADA') {
        return 'El pago ya fue utilizado en otra cita.';
    }
    if (Number(pago.monto) + 0.001 < tarifa) return 'El saldo a favor no cubre la tarifa actual de la consulta.';
    return null;
}
