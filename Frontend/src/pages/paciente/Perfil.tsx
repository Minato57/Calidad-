// =================================================================
// Perfil del Paciente.
// Muestra datos personales + contadores estadísticos.
// =================================================================
import { useCallback, useEffect, useState } from 'react';

import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { ModalVerificarSIS } from '../../components/paciente/ModalVerificarSIS';
import { TarjetaSeguro } from '../../components/paciente/TarjetaSeguro';

import { useAuth } from '../../auth/useAuth';
import { useTranslation } from '../../i18n';
import { citasApi } from '../../api/citasApi';
import { pagosApi, segurosApi } from '../../api/pagosApi';
import { ContadoresPaciente, PersonaSeguro, SaldoPaciente } from '../../types';
import { formatearFechaIso, obtenerIniciales } from '../../utils/formatters';

export const Perfil = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [contadores, setContadores] = useState<ContadoresPaciente | null>(null);

    // Seguro SIS del titular y sus familiares
    const [personas, setPersonas]       = useState<PersonaSeguro[] | null>(null);
    const [errorSIS, setErrorSIS]       = useState<string | null>(null);
    const [verificando, setVerificando] = useState<PersonaSeguro | null>(null);

    // Saldos a favor (pagos no usados o de citas canceladas)
    const [saldos, setSaldos] = useState<SaldoPaciente[]>([]);

    const cargarSeguros = useCallback(async () => {
        try {
            setPersonas(await segurosApi.misEstados());
            setErrorSIS(null);
        } catch {
            setErrorSIS('No pudimos cargar el estado del SIS.');
        }
        try {
            setSaldos(await pagosApi.saldos());
        } catch {
            setSaldos([]);
        }
    }, []);

    useEffect(() => {
        void (async () => {
            try {
                const data = await citasApi.contadores();
                setContadores(data);
            } catch (e) {
                console.error('Error cargando contadores:', e);
            }
        })();
        void cargarSeguros();
    }, [cargarSeguros]);

    return (
        <div className="min-h-screen bg-smoke">
            <Header />

            <main id="contenido-principal" className="max-w-5xl mx-auto px-6 py-8">
                {/* Header del perfil */}
                <Card className="p-8 mb-6">
                    <div className="flex items-center gap-6">
                        {/* Avatar grande */}
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-main to-sky-deep flex items-center justify-center text-white text-3xl font-bold shadow-cta">
                            {user ? obtenerIniciales(user.nombres, user.apellidos) : '?'}
                        </div>

                        <div className="flex-1">
                            <h1 className="text-3xl font-extrabold text-blue-deep">
                                {user?.nombres} {user?.apellidos}
                            </h1>
                            <p className="text-sm text-mute mt-1">{user?.correo}</p>
                            <span className="inline-block mt-2 px-3 py-1 bg-sky-soft text-sky-deep text-xs font-bold rounded-full">
                                {t.pacienteRol}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* ====== Estadísticas ====== */}
                <h2 className="text-xs font-bold text-sky-deep tracking-widest mb-3">
                    📊 {t.estadisticasTusCitas}
                </h2>

                {!contadores && (
                    <Card className="p-8 text-center">
                        <p className="text-mute text-sm">{t.cargandoEstadisticas}</p>
                    </Card>
                )}

                {contadores && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <Card className="p-6">
                            <p className="text-[11px] font-bold text-mute tracking-widest uppercase mb-2">
                                {t.totalCitas}
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="text-4xl font-extrabold text-blue-deep">
                                    {contadores.total}
                                </span>
                                <div className="w-10 h-10 rounded-full bg-sky-soft flex items-center justify-center text-lg">
                                    📅
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <p className="text-[11px] font-bold text-mute tracking-widest uppercase mb-2">
                                {t.completadas}
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="text-4xl font-extrabold text-success">
                                    {contadores.completadas}
                                </span>
                                <div className="w-10 h-10 rounded-full bg-success-soft flex items-center justify-center text-success text-lg font-bold">
                                    ✓
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <p className="text-[11px] font-bold text-mute tracking-widest uppercase mb-2">
                                {t.filtroProximas}
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="text-4xl font-extrabold text-sky-main">
                                    {contadores.proximas}
                                </span>
                                <div className="w-10 h-10 rounded-full bg-sky-soft flex items-center justify-center text-lg">
                                    ⏰
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <p className="text-[11px] font-bold text-mute tracking-widest uppercase mb-2">
                                {t.faltas}
                            </p>
                            <div className="flex items-center justify-between">
                                <span className="text-4xl font-extrabold text-danger">
                                    {contadores.faltas}
                                </span>
                                <div className="w-10 h-10 rounded-full bg-danger-soft flex items-center justify-center text-danger text-lg font-bold">
                                    ⚠
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ====== Datos personales ====== */}
                <h2 className="text-xs font-bold text-sky-deep tracking-widest mb-3 mt-8">
                    👤 {t.datosPersonales}
                </h2>

                <Card className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DatoCampo label={t.nombres} valor={user?.nombres ?? '-'} />
                        <DatoCampo label={t.apellidos} valor={user?.apellidos ?? '-'} />
                        <DatoCampo label={t.correoElectronico} valor={user?.correo ?? '-'} />
                        <DatoCampo label={t.rol} valor={user?.rol ?? '-'} />
                    </div>

                    <p className="text-xs text-mute mt-6 italic">
                        {t.avisoEditarDatos}
                    </p>
                </Card>

                {/* ====== Seguro Integral de Salud (SIS) ====== */}
                <h2 className="text-xs font-bold text-sky-deep tracking-widest mb-3 mt-8">
                    🏛️ SEGURO INTEGRAL DE SALUD (SIS)
                </h2>
                <Card className="p-6 space-y-4">
                    <p className="text-xs text-mute">
                        Con SIS activo tus citas son gratuitas. La verificación con SIS vale 90 días (te avisaremos por correo antes de que venza).
                        Si no tienes SIS y luego lo renuevas, pulsa «Recalibrar».
                    </p>
                    {errorSIS && <p className="text-xs text-danger font-semibold">⚠ {errorSIS}</p>}
                    {!personas && !errorSIS && <p className="text-sm text-mute">Cargando...</p>}
                    {personas?.map(p => (
                        <div key={p.id_usuario}>
                            <p className="text-sm font-bold text-ink mb-1">
                                {p.nombres} {p.apellidos}
                                <span className="ml-2 text-[11px] font-semibold text-mute">
                                    {p.es_titular ? 'Titular' : (p.parentesco ?? 'Familiar')} · DNI {p.dni ?? '—'}
                                </span>
                            </p>
                            {p.seguro ? (
                                <TarjetaSeguro seguro={p.seguro} onVerificar={() => setVerificando(p)} />
                            ) : (
                                <p className="text-xs text-mute">Sin DNI registrado: no es posible verificar el SIS.</p>
                            )}
                        </div>
                    ))}
                </Card>

                {/* ====== Saldo a favor ====== */}
                {saldos.length > 0 && (
                    <>
                        <h2 className="text-xs font-bold text-sky-deep tracking-widest mb-3 mt-8">
                            💳 SALDO A FAVOR
                        </h2>
                        <Card className="p-6 space-y-2">
                            <p className="text-xs text-mute">
                                Pagos que no se usaron o cuyas citas fueron canceladas. Se aplican automáticamente
                                en la próxima reserva del mismo paciente.
                            </p>
                            {saldos.map(s => (
                                <div key={s.id_pago} className="flex items-center justify-between rounded-lg border border-success bg-green-50 px-4 py-2">
                                    <span className="text-sm text-ink-soft">
                                        <strong>{s.paciente || `DNI ${s.dni}`}</strong> · pago del {formatearFechaIso(s.creado_en)}
                                    </span>
                                    <span className="text-sm font-bold text-success">S/ {s.monto.toFixed(2)}</span>
                                </div>
                            ))}
                        </Card>
                    </>
                )}
            </main>

            {verificando?.dni && (
                <ModalVerificarSIS
                    dni={verificando.dni}
                    nombrePaciente={verificando.es_titular ? undefined : `${verificando.nombres} ${verificando.apellidos}`}
                    abierto
                    onCerrar={() => setVerificando(null)}
                    onVerificado={() => void cargarSeguros()}
                />
            )}
        </div>
    );
};

const DatoCampo = ({ label, valor }: { label: string; valor: string }) => (
    <div>
        <p className="text-[11px] font-bold text-mute uppercase tracking-widest mb-1">
            {label}
        </p>
        <p className="text-sm text-ink-soft font-semibold">{valor}</p>
    </div>
);
