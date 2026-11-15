// =================================================================
// CAPA: Domain
// Reglas para que admisión marque asistencia o falta.
//
// Ciclo de una cita: RESERVADA → COMPLETADA (asistió) | FALTA | CANCELADA
//   - "Asistió": desde el día de la cita (puede llegar temprano), nunca
//     en un día futuro. Sobre una FALTA es una CORRECCIÓN, permitida el
//     mismo día de la cita o el siguiente.
//   - "Falta": solo cuando la hora de la cita ya llegó.
// =================================================================
export const DIAS_PARA_CORREGIR_FALTA = 1;

export interface CitaParaMarcar {
    estado: string;
    fecha: string;   // YYYY-MM-DD
    hora: string;    // HH:MM:SS
}

export interface EvaluacionMarca {
    permitido: boolean;
    esCorreccion?: boolean;
    motivo?: string;
}

function fechaLocal(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sumarDias(fecha: string, dias: number): string {
    const d = new Date(`${fecha}T00:00:00`);
    d.setDate(d.getDate() + dias);
    return fechaLocal(d);
}

export function evaluarMarcaAsistencia(cita: CitaParaMarcar, ahora: Date): EvaluacionMarca {
    const hoy = fechaLocal(ahora);
    if (cita.fecha > hoy) {
        return { permitido: false, motivo: 'No se puede marcar asistencia de una cita de un día futuro' };
    }
    if (cita.estado === 'RESERVADA') return { permitido: true, esCorreccion: false };
    if (cita.estado === 'FALTA') {
        if (hoy > sumarDias(cita.fecha, DIAS_PARA_CORREGIR_FALTA)) {
            return { permitido: false, motivo: 'Solo se puede corregir una falta el mismo día de la cita o el día siguiente' };
        }
        return { permitido: true, esCorreccion: true };
    }
    if (cita.estado === 'COMPLETADA') return { permitido: false, motivo: 'La cita ya fue marcada como completada' };
    return { permitido: false, motivo: `No se puede marcar asistencia de una cita en estado ${cita.estado}` };
}

export function evaluarMarcaFalta(cita: CitaParaMarcar, ahora: Date): EvaluacionMarca {
    if (cita.estado === 'FALTA') return { permitido: false, motivo: 'La cita ya fue marcada como inasistencia' };
    if (cita.estado !== 'RESERVADA') {
        return { permitido: false, motivo: `No se puede marcar inasistencia de una cita en estado ${cita.estado}` };
    }
    const inicio = new Date(`${cita.fecha}T${cita.hora}`);
    if (ahora.getTime() < inicio.getTime()) {
        return { permitido: false, motivo: 'La cita aún no empieza: no se puede marcar como falta' };
    }
    return { permitido: true };
}
