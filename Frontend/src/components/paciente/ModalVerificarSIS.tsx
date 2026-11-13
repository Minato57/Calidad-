// =================================================================
// Modal de Verificación en Línea del SIS (Seguro Integral de Salud)
// Réplica del formulario oficial cel.sis.gob.pe con resolución de Captcha
// =================================================================
import { useState, useEffect } from 'react';
import { Boton } from '../common/Boton';
import { segurosApi } from '../../api/pagosApi';
import { SeguroInfo } from '../../types';

interface ModalVerificarSISProps {
    dni: string;
    abierto: boolean;
    onCerrar: () => void;
    onVerificado: (seguro: SeguroInfo) => void;
}

export const ModalVerificarSIS = ({ dni, abierto, onCerrar, onVerificado }: ModalVerificarSISProps) => {
    const [digitoVeri, setDigitoVeri] = useState('');
    const [fechaNac, setFechaNac]     = useState('2000-01-01');
    const [codigoCaptcha, setCodigoCaptcha] = useState('');
    const [token, setToken]           = useState('');
    const [captchaImg, setCaptchaImg] = useState('');
    const [cargandoCaptcha, setCargandoCaptcha] = useState(false);
    const [validando, setValidando]   = useState(false);
    const [error, setError]           = useState<string | null>(null);

    // Cargar Captcha y token al abrir
    const cargarCaptcha = async () => {
        setCargandoCaptcha(true);
        setError(null);
        setCodigoCaptcha('');
        try {
            const res = await segurosApi.obtenerCaptcha();
            if (res.ok && res.captchaImage) {
                setCaptchaImg(res.captchaImage);
                setToken(res.token);
            } else {
                setToken('FALLBACK_TOKEN');
            }
        } catch {
            setToken('FALLBACK_TOKEN');
        } finally {
            setCargandoCaptcha(false);
        }
    };

    // Auto-calcular dígito de verificación
    useEffect(() => {
        if (!abierto || !dni) return;
        void (async () => {
            try {
                const dig = await segurosApi.calcularDigito(dni);
                if (dig) setDigitoVeri(dig);
            } catch {
                // ignorar
            }
        })();
        void cargarCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abierto, dni]);

    if (!abierto) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!codigoCaptcha.trim()) {
            setError('Ingresa el código de la imagen (Captcha)');
            return;
        }

        setValidando(true);
        try {
            const res = await segurosApi.verificarCaptcha({
                dni,
                digitoVerificador: digitoVeri.trim(),
                fechaNacimiento: fechaNac,
                codigoCaptcha: codigoCaptcha.trim(),
                token: token || undefined,
            });

            if (res.ok && res.seguro) {
                onVerificado(res.seguro);
                onCerrar();
            } else {
                setError(res.mensaje || 'No se pudo verificar el seguro.');
                void cargarCaptcha();
            }
        } catch (err: any) {
            const msg = err?.response?.data?.mensaje || err?.message || 'Error al conectar con el SIS';
            setError(msg);
            void cargarCaptcha();
        } finally {
            setValidando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
                {/* Header institucional */}
                <div className="bg-gradient-to-r from-blue-700 to-sky-600 px-6 py-4 text-white flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span>🏛️</span> Verificación de Asegurado SIS
                        </h3>
                        <p className="text-xs text-sky-100">Consulta directa en línea (cel.sis.gob.pe)</p>
                    </div>
                    <button onClick={onCerrar} className="text-white/80 hover:text-white text-xl font-bold p-1">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-xs text-mute">
                        Para verificar tu afiliación gratuita al SIS, ingresa los datos de tu documento tal como figuran en el portal oficial del Estado:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-ink-soft mb-1">
                                Número de DNI (*)
                            </label>
                            <input
                                type="text"
                                value={dni}
                                readOnly
                                className="w-full px-3 py-2 text-sm bg-gray-100 font-bold text-ink rounded-lg border border-gray-200 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-ink-soft mb-1">
                                Díg. Verif. (*)
                            </label>
                            <input
                                type="text"
                                maxLength={1}
                                value={digitoVeri}
                                onChange={(e) => setDigitoVeri(e.target.value.toUpperCase())}
                                placeholder="0"
                                required
                                className="w-full text-center px-3 py-2 text-sm font-bold bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-ink-soft mb-1">
                            Fecha de Nacimiento (*)
                        </label>
                        <input
                            type="date"
                            value={fechaNac}
                            onChange={(e) => setFechaNac(e.target.value)}
                            required
                            className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none"
                        />
                    </div>

                    {/* Sección Captcha */}
                    <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-sky-deep">
                                Código de seguridad (Captcha) (*)
                            </label>
                            <button
                                type="button"
                                onClick={cargarCaptcha}
                                disabled={cargandoCaptcha}
                                className="text-xs text-sky-main hover:underline flex items-center gap-1 font-semibold"
                            >
                                ↻ Actualizar código
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-44 h-16 bg-white border border-gray-300 rounded-lg flex items-center justify-center overflow-hidden shadow-inner">
                                {cargandoCaptcha ? (
                                    <span className="text-xs text-mute animate-pulse">Cargando captcha...</span>
                                ) : captchaImg ? (
                                    <img src={captchaImg} alt="Captcha SIS" className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-xs text-mute font-mono tracking-widest font-bold">Px642</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={codigoCaptcha}
                                    onChange={(e) => setCodigoCaptcha(e.target.value)}
                                    placeholder="Ingresa el código"
                                    maxLength={8}
                                    required
                                    autoFocus
                                    className="w-full px-3 py-2.5 text-base tracking-widest font-bold uppercase text-center bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-danger-soft border border-danger-border rounded-lg p-3">
                            <p className="text-xs text-danger font-semibold">⚠ {error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Boton type="button" variante="secondary" onClick={onCerrar} disabled={validando}>
                            Cancelar
                        </Boton>
                        <Boton type="submit" disabled={validando || !codigoCaptcha.trim()} fullWidth>
                            {validando ? 'Consultando portal del SIS...' : '🔍 Verificar en el SIS'}
                        </Boton>
                    </div>
                </form>
            </div>
        </div>
    );
};

