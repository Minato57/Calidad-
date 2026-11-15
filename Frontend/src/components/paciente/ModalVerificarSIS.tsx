// =================================================================
// Modal de Verificación en Línea del SIS (Seguro Integral de Salud)
//
// El backend abre la consulta en el portal oficial (cel.sis.gob.pe) y
// entrega el Captcha; el usuario lo resuelve y el backend consulta el
// portal. Cada intento usa un Captcha nuevo; los demás datos se conservan.
// Si el portal no responde se informa y el paciente puede pagar y
// volver a intentarlo después.
// =================================================================
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Boton } from '../common/Boton';
import { segurosApi } from '../../api/pagosApi';
import { SeguroInfo } from '../../types';
import { formatearFechaIso, hoyLocal } from '../../utils/formatters';

interface ModalVerificarSISProps {
    dni: string;
    nombrePaciente?: string;   // para el título cuando es un familiar
    abierto: boolean;
    onCerrar: () => void;
    onVerificado: (seguro: SeguroInfo) => void;
}

interface ErrorApi { mensaje: string; codigo?: string }

const leerError = (err: unknown, porDefecto: string): ErrorApi => {
    if (axios.isAxiosError(err)) {
        return { mensaje: err.response?.data?.mensaje || porDefecto, codigo: err.response?.data?.codigo };
    }
    return { mensaje: porDefecto };
};

// Errores que impiden intentar ahora (no tiene sentido mostrar el Captcha)
const BLOQUEANTES = ['PORTAL_NO_DISPONIBLE', 'LIMITE_INTENTOS', 'LIMITE_DIARIO'];

export const ModalVerificarSIS = ({ dni, nombrePaciente, abierto, onCerrar, onVerificado }: ModalVerificarSISProps) => {
    const [fechaNac, setFechaNac]     = useState('');
    const [codigoCaptcha, setCodigoCaptcha] = useState('');
    const [token, setToken]           = useState('');
    const [captchaImg, setCaptchaImg] = useState('');
    const [simulado, setSimulado]     = useState(false);
    const [cargandoCaptcha, setCargandoCaptcha] = useState(false);
    const [bloqueo, setBloqueo]       = useState<ErrorApi | null>(null);
    const [validando, setValidando]   = useState(false);
    const [error, setError]           = useState<ErrorApi | null>(null);
    const [resultado, setResultado]   = useState<SeguroInfo | null>(null);

    // Pide al backend una sesión nueva del portal (token + Captcha).
    // Solo se limpia el código del Captcha: la fecha se conserva.
    const cargarCaptcha = useCallback(async (conservarError = false) => {
        setCargandoCaptcha(true);
        if (!conservarError) setError(null);
        setCodigoCaptcha('');
        try {
            const res = await segurosApi.iniciarVerificacion(dni);
            setSimulado(res.simulado);
            setToken(res.token);
            setCaptchaImg(res.captchaImage);
            setBloqueo(null);
            setFechaNac((actual) => actual || res.fechaNacimiento || '');
        } catch (err) {
            setToken('');
            setCaptchaImg('');
            const e = leerError(err, 'No se pudo conectar con el portal del SIS. Intenta más tarde.');
            if (e.codigo && BLOQUEANTES.includes(e.codigo)) setBloqueo(e);
            else setError(e);
        } finally {
            setCargandoCaptcha(false);
        }
    }, [dni]);

    useEffect(() => {
        if (!abierto) return;
        setResultado(null);
        setError(null);
        setBloqueo(null);
        setFechaNac('');
        if (/^\d{8}$/.test(dni)) void cargarCaptcha();
    }, [abierto, dni, cargarCaptcha]);

    if (!abierto) return null;

    const dniValido = /^\d{8}$/.test(dni);
    const listoParaEnviar = dniValido && !bloqueo && !!fechaNac
        && (simulado || (!!token && codigoCaptcha.trim().length > 0));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!listoParaEnviar) return;
        setError(null);
        setValidando(true);
        try {
            const res = await segurosApi.verificarCaptcha({
                dni,
                fechaNacimiento: fechaNac,
                codigoCaptcha: codigoCaptcha.trim(),
                token: token || undefined,
            });
            setResultado(res.seguro);
            onVerificado(res.seguro);
        } catch (err) {
            const ex = leerError(err, 'No se pudo completar la verificación con el SIS.');
            if (ex.codigo && BLOQUEANTES.includes(ex.codigo)) {
                setBloqueo(ex);
            } else {
                setError(ex);
                // El Captcha del portal es de un solo uso: se pide uno nuevo conservando el mensaje.
                void cargarCaptcha(true);
            }
        } finally {
            setValidando(false);
        }
    };

    const titulo = nombrePaciente ? `Verificación del SIS · ${nombrePaciente}` : 'Verificación de Asegurado SIS';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
            <div role="dialog" aria-modal="true" aria-labelledby="titulo-modal-sis"
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
                {/* Header institucional */}
                <div className="bg-gradient-to-r from-blue-700 to-sky-600 px-6 py-4 text-white flex items-center justify-between">
                    <div>
                        <h3 id="titulo-modal-sis" className="text-lg font-bold flex items-center gap-2">
                            <span>🏛️</span> {titulo}
                        </h3>
                        <p className="text-xs text-sky-100">
                            {simulado ? 'MODO DEMO — no se consulta el portal oficial' : 'Consulta en línea al portal oficial (cel.sis.gob.pe)'}
                        </p>
                    </div>
                    <button onClick={onCerrar} aria-label="Cerrar" className="text-white/80 hover:text-white text-xl font-bold p-1">
                        ✕
                    </button>
                </div>

                {resultado ? (
                    // ===== Resultado de la verificación =====
                    <div className="p-6 space-y-4">
                        {resultado.tiene_seguro ? (
                            <div role="status" className="rounded-lg p-4 border border-success bg-green-50">
                                <p className="text-sm font-bold text-success">✓ SIS activo — la cita es gratuita</p>
                                {resultado.detalle && <p className="text-xs text-green-800 mt-1">{resultado.detalle}</p>}
                                {resultado.vence_en && (
                                    <p className="text-[11px] text-green-800 mt-1">
                                        Verificación vigente hasta el {formatearFechaIso(resultado.vence_en)}. Te avisaremos por correo antes de que venza.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div role="status" className="rounded-lg p-4 border border-warning bg-warning-soft">
                                <p className="text-sm font-bold text-warning">No tiene SIS activo (DNI {dni})</p>
                                {resultado.detalle && <p className="text-xs text-ink-soft mt-1">{resultado.detalle}</p>}
                                <p className="text-xs text-ink-soft mt-2">
                                    Puedes continuar con el pago de la consulta. Si más adelante renuevas tu SIS, usa «Recalibrar» en la reserva o en Mi Perfil.
                                </p>
                            </div>
                        )}
                        <Boton type="button" onClick={onCerrar} fullWidth>Continuar</Boton>
                    </div>
                ) : bloqueo ? (
                    // ===== No se puede verificar ahora (portal caído o límite) =====
                    <div className="p-6 space-y-4">
                        <div role="alert" className="rounded-lg p-4 border border-warning bg-warning-soft">
                            <p className="text-sm font-bold text-warning">
                                {bloqueo.codigo === 'PORTAL_NO_DISPONIBLE' ? 'Portal del SIS no disponible' : 'No es posible verificar en este momento'}
                            </p>
                            <p className="text-xs text-ink-soft mt-1">{bloqueo.mensaje}</p>
                            {bloqueo.codigo === 'PORTAL_NO_DISPONIBLE' && (
                                <p className="text-xs text-ink-soft mt-2">
                                    Si la atención es urgente puedes pagar la consulta ahora y volver a verificar tu SIS más tarde.
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            {bloqueo.codigo === 'PORTAL_NO_DISPONIBLE' && (
                                <Boton type="button" variante="secondary" disabled={cargandoCaptcha} onClick={() => void cargarCaptcha()}>
                                    {cargandoCaptcha ? 'Reintentando...' : '↻ Reintentar'}
                                </Boton>
                            )}
                            <Boton type="button" onClick={onCerrar} fullWidth>Entendido</Boton>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <p className="text-xs text-mute">
                            Confirma los datos del documento tal como figuran en el DNI. Si te equivocas, solo se renovará el código de la imagen; los demás datos se mantienen.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="sis-dni" className="block text-xs font-semibold text-ink-soft mb-1">
                                    Número de DNI
                                </label>
                                <input
                                    id="sis-dni"
                                    type="text"
                                    value={dni}
                                    readOnly
                                    className="w-full px-3 py-2 text-sm bg-gray-100 font-bold text-ink rounded-lg border border-gray-200 outline-none"
                                />
                            </div>
                            <div>
                                <label htmlFor="sis-fecha" className="block text-xs font-semibold text-ink-soft mb-1">
                                    Fecha de nacimiento (*)
                                </label>
                                <input
                                    id="sis-fecha"
                                    type="date"
                                    value={fechaNac}
                                    min="1920-01-01"
                                    max={hoyLocal()}
                                    onChange={(e) => setFechaNac(e.target.value)}
                                    required
                                    className={`w-full px-3 py-2 text-sm bg-white rounded-lg border outline-none focus:border-sky-main ${error?.codigo === 'FECHA' ? 'border-danger' : 'border-gray-200'}`}
                                />
                            </div>
                        </div>

                        {!dniValido && (
                            <div className="bg-danger-soft border border-danger-border rounded-lg p-3">
                                <p className="text-xs text-danger font-semibold">⚠ El paciente no tiene un DNI válido registrado; no es posible consultar el SIS.</p>
                            </div>
                        )}

                        {/* Sección Captcha (no aplica en modo demo) */}
                        {dniValido && !simulado && (
                            <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-100 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="sis-captcha" className="text-xs font-bold text-sky-deep">
                                        Código de seguridad (Captcha) (*)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => void cargarCaptcha()}
                                        disabled={cargandoCaptcha || validando}
                                        className="text-xs text-sky-main hover:underline flex items-center gap-1 font-semibold disabled:opacity-50"
                                    >
                                        ↻ Actualizar código
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-44 h-16 bg-white border border-gray-300 rounded-lg flex items-center justify-center overflow-hidden shadow-inner">
                                        {cargandoCaptcha ? (
                                            <span className="text-xs text-mute animate-pulse">Cargando captcha...</span>
                                        ) : captchaImg ? (
                                            <img src={captchaImg} alt="Código de seguridad del portal SIS" className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-[11px] text-mute text-center px-2">Sin código</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            id="sis-captcha"
                                            type="text"
                                            value={codigoCaptcha}
                                            onChange={(e) => setCodigoCaptcha(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                                            placeholder="Ingresa el código"
                                            maxLength={5}
                                            autoComplete="off"
                                            disabled={!captchaImg}
                                            required
                                            autoFocus
                                            className={`w-full px-3 py-2.5 text-base tracking-widest font-bold text-center bg-white rounded-lg border outline-none focus:border-sky-main disabled:bg-gray-100 ${error?.codigo === 'CAPTCHA' ? 'border-danger' : 'border-gray-200'}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div role="alert" className="bg-danger-soft border border-danger-border rounded-lg p-3">
                                <p className="text-xs text-danger font-semibold">⚠ {error.mensaje}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Boton type="button" variante="secondary" onClick={onCerrar} disabled={validando}>
                                Cancelar
                            </Boton>
                            <Boton type="submit" disabled={validando || !listoParaEnviar} fullWidth>
                                {validando ? 'Consultando portal del SIS...' : '🔍 Verificar en el SIS'}
                            </Boton>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
