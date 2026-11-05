// =================================================================
// Badge de estado reutilizable
// =================================================================
import { ReactNode } from 'react';
import { EstadoCita } from '../../types';
import { useTranslation } from '../../i18n';

interface BadgeProps {
    children: ReactNode;
    variante?: 'sky' | 'success' | 'danger' | 'warning' | 'gray';
    conPunto?: boolean;
}

export const Badge = ({ children, variante = 'sky', conPunto = false }: BadgeProps) => {
    const { t } = useTranslation();

    const variantes = {
        sky:     'bg-sky-soft text-sky-deep',
        success: 'bg-success-soft text-success-deep',
        danger:  'bg-danger-soft text-danger',
        warning: 'bg-warning-soft text-warning',
        gray:    'bg-gray-100 text-mute',
    };

    const puntoColor = {
        sky:     'bg-sky-main',
        success: 'bg-success',
        danger:  'bg-danger',
        warning: 'bg-warning',
        gray:    'bg-mute',
    };

    let textoFinal = children;
    if (typeof children === 'string') {
        const trimmed = children.trim();
        const upper = trimmed.toUpperCase();

        if (upper === 'ACTIVO' || upper === 'ACTIVA') {
            textoFinal = t.activo.toUpperCase();
        } else if (upper === 'INACTIVO' || upper === 'INACTIVA') {
            textoFinal = t.inactivo.toUpperCase();
        } else if (upper === 'ATENDIDO' || upper === 'ATENDIDA') {
            textoFinal = t.atendidos;
        } else if (upper === 'NO ASISTIÓ' || upper === 'NO ASISTIO') {
            textoFinal = t.estadoFalta;
        } else if (upper === 'SIN SEGURO') {
            textoFinal = t.sinSeguro;
        } else if (upper === 'FAMILIAR') {
            textoFinal = t.familiar;
        } else if (upper === 'MENOR') {
            textoFinal = t.menor;
        } else if (trimmed.startsWith('Con acceso')) {
            textoFinal = trimmed.replace('Con acceso', t.conAcceso);
        } else if (upper === 'HOY') {
            textoFinal = t.hoy;
        } else if (upper === 'MAÑANA') {
            textoFinal = t.manana;
        } else if (upper.startsWith('EN ') && upper.endsWith(' DÍAS')) {
            const num = upper.replace(/\D/g, '');
            textoFinal = t.enDias.replace('{d}', num);
        } else if (upper.startsWith('HACE ') && upper.endsWith(' DÍAS')) {
            const num = upper.replace(/\D/g, '');
            textoFinal = t.haceDias.replace('{d}', num);
        }
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${variantes[variante]}`}>
            {conPunto && (
                <span className={`w-1.5 h-1.5 rounded-full ${puntoColor[variante]}`} />
            )}
            {textoFinal}
        </span>
    );
};

/**
 * Helper: convierte un estado de cita a su badge correspondiente
 */
export const BadgeEstadoCita = ({ estado }: { estado: EstadoCita }) => {
    const { t } = useTranslation();
    const config = {
        RESERVADA:  { variante: 'sky' as const,     texto: t.estadoReservada.toUpperCase(),  conPunto: true },
        CONFIRMADA: { variante: 'sky' as const,     texto: t.estadoConfirmada.toUpperCase(), conPunto: true },
        EN_CURSO:   { variante: 'warning' as const, texto: t.estadoEnCurso.toUpperCase(),    conPunto: true },
        COMPLETADA: { variante: 'success' as const, texto: `✓ ${t.estadoCompletada.toUpperCase()}`, conPunto: false },
        FALTA:      { variante: 'danger' as const,  texto: `✕ ${t.estadoFalta.toUpperCase()}`,       conPunto: false },
        CANCELADA:  { variante: 'gray' as const,    texto: t.estadoCancelada.toUpperCase(),  conPunto: false },
    };
    const c = (config as Record<string, any>)[estado] ?? config.RESERVADA;

    return <Badge variante={c.variante} conPunto={c.conPunto}>{c.texto}</Badge>;
};
