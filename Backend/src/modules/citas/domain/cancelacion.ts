// =================================================================
// CAPA: Domain
// Reglas de cancelación de una cita por parte del paciente.
//   - Una cita que ya empezó o pasó NO se puede cancelar.
//   - Cancelar con menos de 24 h de anticipación cuenta como
//     cancelación de último momento (sanción).
//   - Periodo de gracia: si la cita se reservó hace menos de
//     MINUTOS_GRACIA_CANCELACION, cancelarla no sanciona (corrige un
//     error al reservar una cita para el mismo día o el siguiente).
// =================================================================
export const HORAS_MINIMAS_SIN_SANCION = 24;
export const MINUTOS_GRACIA_CANCELACION = 60;

export interface EvaluacionCancelacion {
    permitida: boolean;
    sancionable: boolean;
    motivo?: string;
}

export function evaluarCancelacion(datos: { inicioCita: Date; reservadaEn: Date; ahora: Date }): EvaluacionCancelacion {
    const { inicioCita, reservadaEn, ahora } = datos;

    if (ahora.getTime() >= inicioCita.getTime()) {
        return { permitida: false, sancionable: false, motivo: 'No puedes cancelar una cita que ya pasó o está en curso.' };
    }

    const horasDeAnticipacion = (inicioCita.getTime() - ahora.getTime()) / 3_600_000;
    const minutosDesdeReserva = (ahora.getTime() - reservadaEn.getTime()) / 60_000;
    const enGracia = minutosDesdeReserva >= 0 && minutosDesdeReserva < MINUTOS_GRACIA_CANCELACION;

    return { permitida: true, sancionable: horasDeAnticipacion < HORAS_MINIMAS_SIN_SANCION && !enGracia };
}
