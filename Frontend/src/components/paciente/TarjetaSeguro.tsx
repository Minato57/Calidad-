// =================================================================
// Estado del SIS de una persona (titular o familiar) + botón para
// verificar / recalibrar. Se usa en la reserva y en Mi Perfil.
// =================================================================
import { SeguroInfo } from '../../types';
import { formatearFechaIso } from '../../utils/formatters';

interface TarjetaSeguroProps {
    seguro: SeguroInfo;
    onVerificar: () => void;
    deshabilitado?: boolean;
}

const ESTILOS = {
    CON_SIS:       { borde: 'border-success bg-green-50',          texto: 'text-success' },
    SIN_SIS:       { borde: 'border-warning bg-warning-soft',      texto: 'text-warning' },
    VENCIDO:       { borde: 'border-warning bg-warning-soft',      texto: 'text-warning' },
    SIN_VERIFICAR: { borde: 'border-sky-main/40 bg-sky-soft',      texto: 'text-sky-deep' },
} as const;

export const TarjetaSeguro = ({ seguro, onVerificar, deshabilitado }: TarjetaSeguroProps) => {
    const estilo = ESTILOS[seguro.estado];
    const demo = seguro.fuente === 'SIMULADO' && seguro.verificado;

    let titulo: string;
    let subtitulo: string | null = null;
    let boton: string;
    switch (seguro.estado) {
        case 'CON_SIS':
            titulo = '✓ SIS activo — citas gratuitas';
            subtitulo = seguro.vence_en ? `Verificación vigente hasta el ${formatearFechaIso(seguro.vence_en)}` : null;
            boton = '↻ Recalibrar';
            break;
        case 'SIN_SIS':
            titulo = 'Sin SIS activo';
            subtitulo = seguro.consultado_en ? `Verificado en el portal del SIS el ${formatearFechaIso(seguro.consultado_en)}` : null;
            boton = '↻ Recalibrar';
            break;
        case 'VENCIDO':
            titulo = 'Verificación del SIS vencida';
            subtitulo = 'Vuelve a verificar para mantener tus citas gratuitas.';
            boton = '🔍 Verificar de nuevo';
            break;
        default:
            titulo = 'SIS sin verificar';
            subtitulo = 'Verifica si cuentas con SIS para que tu cita sea gratuita.';
            boton = '🔍 Verificar en SIS';
    }

    const bloqueadoHoy = !seguro.puede_recalibrar && !!seguro.recalibrar_desde;

    return (
        <div role="status" className={`rounded-lg p-4 border ${estilo.borde}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className={`text-sm font-bold ${estilo.texto}`}>
                        {titulo}
                        {demo && <span className="ml-2 text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full align-middle">MODO DEMO</span>}
                    </p>
                    {seguro.detalle && seguro.estado !== 'SIN_VERIFICAR' && seguro.estado !== 'VENCIDO' && (
                        <p className="text-xs text-ink-soft mt-0.5">{seguro.detalle}</p>
                    )}
                    {subtitulo && <p className="text-[11px] text-mute mt-0.5">{subtitulo}</p>}
                </div>
                <button
                    type="button"
                    onClick={onVerificar}
                    disabled={deshabilitado || bloqueadoHoy}
                    className="shrink-0 text-xs bg-white text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {boton}
                </button>
            </div>
            {bloqueadoHoy && seguro.recalibrar_desde && (
                <p className="text-[11px] text-mute mt-2">
                    Ya se verificó hoy. Podrás recalibrar desde el {formatearFechaIso(seguro.recalibrar_desde)}.
                </p>
            )}
        </div>
    );
};
