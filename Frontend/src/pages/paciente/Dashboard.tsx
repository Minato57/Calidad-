// =================================================================
// Dashboard del Paciente.
// =================================================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Header } from '../../components/layout/Header';
import { Boton } from '../../components/common/Boton';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import {
    ModalConfirmarCancelacion,
    ModalResultadoCancelacion,
    ResultadoCancelacion,
} from '../../components/common/ModalesCancelacion';

import { useAuth } from '../../auth/useAuth';
import { useTranslation } from '../../i18n';
import { citasApi } from '../../api/citasApi';
import { CitaConDetalles } from '../../types';
import {
    formatearFecha,
    formatearHora,
    diasDesdeHoy,
    obtenerIniciales,
} from '../../utils/formatters';

export const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useTranslation();

    const [proximaCita, setProximaCita] = useState<CitaConDetalles | null>(null);
    const [cargando, setCargando]       = useState(true);
    const [cancelando, setCancelando]   = useState(false);

    // Modales (igual que en Mis Citas)
    const [confirmarAbierto, setConfirmarAbierto] = useState(false);
    const [resultado, setResultado] = useState<ResultadoCancelacion | null>(null);

    const cargarCitas = async () => {
        try {
            const citas = await citasApi.misCitas();
            const futuras = citas
                .filter(c => c.estado === 'RESERVADA' || c.estado === 'CONFIRMADA' || c.estado === 'RECORDATORIO')
                .sort((a, b) => {
                    const fa = new Date(`${a.fecha}T${a.hora}`).getTime();
                    const fb = new Date(`${b.fecha}T${b.hora}`).getTime();
                    return fa - fb;
                });
            setProximaCita(futuras[0] ?? null);
        } catch (e) {
            console.error('Error cargando citas:', e);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        void cargarCitas();
    }, []);

    const confirmarCancelacion = async () => {
        if (!proximaCita) return;
        setConfirmarAbierto(false);
        setCancelando(true);
        try {
            const res: any = await citasApi.cancelar(proximaCita.id_cita);
            await cargarCitas();
            setResultado({
                mensaje: res.mensaje ?? t.citaCancelada,
                bloqueada: !!res.cuentaBloqueada,
                sancionada: !!res.sancionada,
            });
        } catch {
            setResultado({ mensaje: 'No se pudo cancelar la cita', bloqueada: false, sancionada: false });
        } finally {
            setCancelando(false);
        }
    };

    const now = new Date();
    const diaNombre = t.diasSemana[now.getDay()];
    const diaNum = now.getDate();
    const mesNombre = t.meses[now.getMonth()];
    const hoy = `${diaNombre}, ${diaNum} de ${mesNombre}`;

    return (
        <div className="min-h-screen bg-smoke">
            <Header />

            <main id="contenido-principal" className="max-w-7xl mx-auto px-6 py-8">
                {/* Saludo */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-ink">
                        {t.hola}{user?.nombres}! <span>👋</span>
                    </h1>
                    <p className="text-sm text-mute mt-1">
                        {t.cuidamosTuSalud} <span className="text-blue-deep font-bold capitalize">{hoy}</span>
                    </p>
                </div>

                {/* ===== BLOQUE PROTAGONISTA ===== */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-bright via-sky-main to-sky-deep p-10 md:p-12 shadow-cta mb-8">
                    <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white opacity-10 -mr-20 -mt-20" />
                    <div className="absolute bottom-0 right-32 w-40 h-40 rounded-full bg-white opacity-5" />
                    <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white opacity-10" />

                    <div className="relative z-10 max-w-3xl">
                        <p className="text-xs font-bold text-white opacity-90 tracking-[0.3em] mb-4">
                            {t.reservaEnSegundos}
                        </p>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-3">
                            {t.necesitasAtencionMedica}
                        </h2>
                        <p className="text-base text-white opacity-95 mb-8">
                            {t.agendaConEspecialista}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => navigate('/paciente/reservar')}
                                className="inline-flex items-center gap-2 px-7 py-4 bg-white hover:bg-smoke rounded-xl shadow-lg font-extrabold text-sky-deep transition-all cursor-pointer"
                            >
                                <span className="text-xl">+</span>
                                <span>{t.agendarNuevaCita}</span>
                                <span>→</span>
                            </button>
                            <span className="inline-flex items-center gap-1 px-4 py-2 bg-white/15 backdrop-blur rounded-full text-white text-xs font-semibold">
                                ⚡ {t.enUnMinuto}
                            </span>
                            <span className="inline-flex items-center gap-1 px-4 py-2 bg-white/15 backdrop-blur rounded-full text-white text-xs font-semibold">
                                📋 {t.multiplesEspecialidades}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ===== PRÓXIMA CITA ===== */}
                {!cargando && (
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xs font-bold text-sky-deep tracking-widest">
                                ⏰ {t.proximaCita}
                            </h3>
                            {proximaCita && proximaCita.fecha && (
                                <Badge variante="success" conPunto>
                                    {diasDesdeHoy(proximaCita.fecha).toUpperCase()}
                                </Badge>
                            )}
                        </div>

                        {proximaCita ? (
                            <Card bordeLateral="sky" className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                    {/* IZQUIERDA */}
                                    <div className="md:col-span-4">
                                        <h4 className="text-xl font-extrabold text-blue-deep mb-3">
                                            {(proximaCita.especialidad ? (t.especialidadesTraducidas[proximaCita.especialidad]?.nombre ?? proximaCita.especialidad) : t.especialidad)}
                                        </h4>

                                        {proximaCita.medico_nombres && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-7 h-7 rounded-full bg-sky-soft flex items-center justify-center text-[11px] font-bold text-sky-deep">
                                                    {obtenerIniciales(proximaCita.medico_nombres, proximaCita.medico_apellidos ?? '')}
                                                </div>
                                                <p className="text-sm font-semibold text-ink-soft">
                                                    Dr. {proximaCita.medico_nombres} {proximaCita.medico_apellidos}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-soft rounded-full text-xs font-bold text-sky-deep">
                                                📅 {formatearFecha(proximaCita.fecha ?? '')}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-soft rounded-full text-xs font-bold text-sky-deep">
                                                ⏰ {formatearHora(proximaCita.hora ?? '')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* CENTRO: timeline */}
                                    <div className="md:col-span-5 md:border-l md:border-r md:border-gray-100 md:px-6">
                                        <p className="text-[10px] font-bold text-mute tracking-widest mb-5">
                                            {t.estadoProceso}
                                        </p>
                                        <Timeline
                                            reservadaLabel={t.estadoReservada.toUpperCase()}
                                            recordatorioLabel={t.estadoRecordatorio.toUpperCase()}
                                            visitaLabel={t.visita}
                                        />
                                    </div>

                                    {/* DERECHA */}
                                    <div className="md:col-span-3 space-y-2">
                                        <Boton fullWidth onClick={() => navigate('/paciente/mis-citas')}>
                                            {t.verDetalle}
                                        </Boton>
                                        <Boton
                                            fullWidth
                                            variante="danger"
                                            disabled={cancelando}
                                            onClick={() => setConfirmarAbierto(true)}
                                        >
                                            {cancelando ? t.cancelandoCita : t.cancelarCita}
                                        </Boton>
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <Card className="p-8 text-center">
                                <p className="text-mute text-sm mb-4">{t.noTienesCitasProximas}</p>
                                <Boton onClick={() => navigate('/paciente/reservar')}>
                                    {t.agendarMiPrimeraCita}
                                </Boton>
                            </Card>
                        )}
                    </div>
                )}

                {cargando && (
                    <Card className="p-8 text-center">
                        <p className="text-mute text-sm">{t.cargandoInformacion}</p>
                    </Card>
                )}
            </main>

            {/* MODALES DE CANCELACIÓN */}
            <ModalConfirmarCancelacion
                abierto={confirmarAbierto}
                onCerrar={() => setConfirmarAbierto(false)}
                onConfirmar={confirmarCancelacion}
            />

            <ModalResultadoCancelacion
                resultado={resultado}
                onCerrar={() => setResultado(null)}
            />
        </div>
    );
};

const Timeline = ({ reservadaLabel, recordatorioLabel, visitaLabel }: {
    reservadaLabel: string;
    recordatorioLabel: string;
    visitaLabel: string;
}) => (
    <div className="flex items-start justify-between">
        <div className="flex flex-col items-center flex-1">
            <div className="relative">
                <div className="w-7 h-7 rounded-full bg-success flex items-center justify-center text-white text-xs font-bold">✓</div>
                <div className="absolute inset-0 rounded-full border-2 border-success opacity-30 animate-pulse-ring" />
            </div>
            <span className="text-[10px] font-bold text-success mt-2">{reservadaLabel}</span>
        </div>
        <div className="flex-1 h-0.5 bg-sky-main mt-3.5" />
        <div className="flex flex-col items-center flex-1">
            <div className="relative">
                <div className="w-7 h-7 rounded-full bg-sky-main" />
                <div className="absolute inset-0 rounded-full border-2 border-sky-main opacity-40 animate-pulse-ring" />
            </div>
            <span className="text-[10px] font-bold text-sky-main mt-2">{recordatorioLabel}</span>
        </div>
        <div className="flex-1 h-0.5 mt-3.5 border-t-2 border-dashed border-gray-300" />
        <div className="flex flex-col items-center flex-1">
            <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-300" />
            <span className="text-[10px] font-bold text-mute mt-2">{visitaLabel}</span>
        </div>
    </div>
);
