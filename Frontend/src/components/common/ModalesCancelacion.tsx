import { Boton } from './Boton';
import { useTranslation } from '../../i18n';

export interface ResultadoCancelacion {
    mensaje: string;
    bloqueada: boolean;
    sancionada: boolean;
}

interface ModalConfirmarCancelacionProps {
    abierto: boolean;
    onCerrar: () => void;
    onConfirmar: () => void;
}

export const ModalConfirmarCancelacion = ({
    abierto,
    onCerrar,
    onConfirmar,
}: ModalConfirmarCancelacionProps) => {
    const { t } = useTranslation();
    if (!abierto) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-dropdown w-full max-w-sm p-6">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-warning-soft flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-lg font-bold text-ink text-center mb-2">{t.cancelarEstaCita}</h3>
                <p className="text-sm text-mute text-center mb-2">
                    {t.avisoCancelacionTardia}
                </p>
                <p className="text-xs text-warning text-center mb-5 font-semibold">
                    {t.avisoSuspensionCuenta}
                </p>
                <div className="flex gap-3">
                    <Boton variante="secondary" fullWidth onClick={onCerrar}>
                        {t.noMantener}
                    </Boton>
                    <Boton variante="danger" fullWidth onClick={onConfirmar}>
                        {t.siCancelar}
                    </Boton>
                </div>
            </div>
        </div>
    );
};

interface ModalResultadoCancelacionProps {
    resultado: ResultadoCancelacion | null;
    onCerrar: () => void;
}

export const ModalResultadoCancelacion = ({
    resultado,
    onCerrar,
}: ModalResultadoCancelacionProps) => {
    const { t } = useTranslation();
    if (!resultado) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-dropdown w-full max-w-sm p-6">
                <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center
                    ${resultado.bloqueada ? 'bg-danger-soft' : resultado.sancionada ? 'bg-warning-soft' : 'bg-success-soft'}`}>
                    <span className="text-2xl">{resultado.bloqueada ? '🔒' : resultado.sancionada ? '⚠️' : '✓'}</span>
                </div>
                <h3 className="text-lg font-bold text-ink text-center mb-2">
                    {resultado.bloqueada ? t.cuentaSuspendida : t.citaCancelada}
                </h3>
                <p className="text-sm text-mute text-center mb-5">{resultado.mensaje}</p>
                <Boton fullWidth onClick={onCerrar}>{t.entendido}</Boton>
            </div>
        </div>
    );
};
