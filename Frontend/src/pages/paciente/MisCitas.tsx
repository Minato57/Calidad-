// =================================================================
// Mis Citas — Historial del paciente con filtros y paginación.
// =================================================================
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';
import { BadgeEstadoCita } from '../../components/common/Badge';

import { useTranslation } from '../../i18n';
import { citasApi } from '../../api/citasApi';
import { CitaConDetalles, EstadoCita } from '../../types';
import { formatearFecha, formatearHora, diasDesdeHoy } from '../../utils/formatters';

type Filtro = 'TODAS' | EstadoCita;

const POR_PAGINA = 6;

export const MisCitas = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [citas, setCitas]       = useState<CitaConDetalles[]>([]);
    const [cargando, setCargando] = useState(true);
    const [cancelandoId, setCancelandoId] = useState<number | null>(null);

    // Filtros
    const [filtro, setFiltro]         = useState<Filtro>('TODAS');
    const [filtroEsp, setFiltroEsp]   = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    // Paginación
    const [pagina, setPagina] = useState(1);

    // Modales
    const [citaAConfirmar, setCitaAConfirmar] = useState<number | null>(null);
    const [resultado, setResultado] = useState<{ mensaje: string; bloqueada: boolean; sancionada: boolean } | null>(null);

    const cargar = async () => {
        try {
            const data = await citasApi.misCitas();
            setCitas(data);
        } catch (e) {
            console.error('Error cargando citas:', e);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    // Cada vez que cambia un filtro, volvemos a la página 1
    useEffect(() => { setPagina(1); }, [filtro, filtroEsp, fechaDesde, fechaHasta]);

    const confirmarCancelacion = async () => {
        if (citaAConfirmar === null) return;
        const idCita = citaAConfirmar;
        setCitaAConfirmar(null);
        setCancelandoId(idCita);
        try {
            const res: any = await citasApi.cancelar(idCita);
            await cargar();
            setResultado({
                mensaje: res.mensaje ?? t.citaCancelada,
                bloqueada: !!res.cuentaBloqueada,
                sancionada: !!res.sancionada,
            });
        } catch {
            setResultado({ mensaje: 'No se pudo cancelar la cita', bloqueada: false, sancionada: false });
        } finally {
            setCancelandoId(null);
        }
    };

    // Especialidades presentes en las citas (para el dropdown)
    const especialidadesUnicas = useMemo(() => {
        const set = new Set<string>();
        citas.forEach(c => { if (c.especialidad) set.add(c.especialidad); });
        return Array.from(set).sort();
    }, [citas]);

    // Filtrado
    const filtradas = useMemo(() => {
        return citas.filter(c => {
            if (filtro === 'RESERVADA') {
                if (c.estado !== 'RESERVADA' && c.estado !== 'CONFIRMADA' && c.estado !== 'RECORDATORIO') return false;
            } else if (filtro !== 'TODAS') {
                if (c.estado !== filtro) return false;
            }
            if (filtroEsp && c.especialidad !== filtroEsp) return false;
            if (fechaDesde && (!c.fecha || c.fecha < fechaDesde)) return false;
            if (fechaHasta && (!c.fecha || c.fecha > fechaHasta)) return false;
            return true;
        });
    }, [citas, filtro, filtroEsp, fechaDesde, fechaHasta]);

    // Paginación
    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
    const paginaSegura = Math.min(pagina, totalPaginas);
    const visibles = filtradas.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

    const limpiarFiltros = () => {
        setFiltro('TODAS'); setFiltroEsp(''); setFechaDesde(''); setFechaHasta('');
    };

    const hayFiltrosActivos = filtro !== 'TODAS' || !!filtroEsp || !!fechaDesde || !!fechaHasta;

    const filtros: { id: Filtro; label: string }[] = [
        { id: 'TODAS', label: t.filtroTodas },
        { id: 'RESERVADA', label: t.filtroProximas },
        { id: 'COMPLETADA', label: t.filtroCompletadas },
        { id: 'FALTA', label: t.filtroFaltas },
        { id: 'CANCELADA', label: t.filtroCanceladas },
    ];

    const esCancelable = (estado: EstadoCita) =>
        ['RESERVADA', 'CONFIRMADA', 'RECORDATORIO'].includes(estado);

    return (
        <div className="min-h-screen bg-smoke">
            <Header />

            <main id="contenido-principal" className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-ink">{t.misCitasTitulo}</h1>
                        <p className="text-sm text-mute mt-1">{t.misCitasSub}</p>
                    </div>
                    <Boton onClick={() => navigate('/paciente/reservar')}>+ {t.agendarNuevaCita}</Boton>
                </div>

                {/* Filtros por estado */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {filtros.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFiltro(f.id)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer
                                ${filtro === f.id ? 'bg-sky-main text-white shadow-card' : 'bg-white text-mute hover:bg-sky-soft hover:text-sky-deep'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Filtros por especialidad y fechas */}
                <Card className="p-4 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                        <div>
                            <label className="block text-xs font-bold text-mute mb-1">{t.especialidad}</label>
                            <select
                                value={filtroEsp}
                                onChange={(e) => setFiltroEsp(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-ink-soft bg-white focus:outline-none focus:border-sky-main"
                            >
                                <option value="">{t.todas}</option>
                                {especialidadesUnicas.map(esp => (
                                    <option key={esp} value={esp}>{esp}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-mute mb-1">{t.desde}</label>
                            <input
                                type="date"
                                value={fechaDesde}
                                onChange={(e) => setFechaDesde(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-ink-soft bg-white focus:outline-none focus:border-sky-main"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-mute mb-1">{t.hasta}</label>
                            <input
                                type="date"
                                value={fechaHasta}
                                onChange={(e) => setFechaHasta(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-ink-soft bg-white focus:outline-none focus:border-sky-main"
                            />
                        </div>
                        <Boton variante="secondary" onClick={limpiarFiltros} disabled={!hayFiltrosActivos}>
                            Limpiar
                        </Boton>
                    </div>
                </Card>

                {cargando && (
                    <Card className="p-8 text-center"><p className="text-mute text-sm">{t.cargandoInformacion}</p></Card>
                )}

                {!cargando && filtradas.length === 0 && (
                    <Card className="p-12 text-center">
                        <p className="text-mute text-sm mb-4">
                            {t.sinCitasRegistradas}
                        </p>
                        {hayFiltrosActivos
                            ? <Boton variante="secondary" onClick={limpiarFiltros}>{t.quitarFiltros}</Boton>
                            : <Boton onClick={() => navigate('/paciente/reservar')}>{t.agendarMiPrimeraCita}</Boton>
                        }
                    </Card>
                )}

                {!cargando && filtradas.length > 0 && (
                    <>
                        <p className="text-xs text-mute mb-3">
                            {filtradas.length} {t.misCitas.toLowerCase()}
                        </p>

                        <div className="space-y-3">
                            {visibles.map(cita => (
                                <Card
                                    key={cita.id_cita}
                                    bordeLateral={
                                        cita.estado === 'COMPLETADA' ? 'success' :
                                        cita.estado === 'FALTA' || cita.estado === 'CANCELADA' ? 'danger' : 'sky'
                                    }
                                    className="p-5"
                                >
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex-1 min-w-[200px]">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-ink text-base">
                                                    {cita.especialidad ?? t.especialidad}
                                                </h3>
                                                <BadgeEstadoCita estado={cita.estado} />
                                            </div>
                                            {cita.medico_nombres && (
                                                <p className="text-sm text-mute">
                                                    Dr. {cita.medico_nombres} {cita.medico_apellidos}
                                                </p>
                                            )}
                                            {cita.es_para_menor && cita.dependiente_nombres && (
                                                <p className="text-sm text-sky-main font-bold mt-0.5">
                                                    {t.paciente}: {cita.dependiente_nombres} {cita.dependiente_apellidos}
                                                    {cita.dependiente_parentesco && (
                                                        <span className="text-mute font-normal">
                                                            {' '}({cita.dependiente_parentesco})
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                        </div>

                                        <div className="text-right min-w-[160px]">
                                            <p className="text-sm font-bold text-ink-soft">
                                                {formatearFecha(cita.fecha ?? '')}
                                            </p>
                                            <p className="text-xs text-mute">
                                                {formatearHora(cita.hora ?? '')}
                                                {esCancelable(cita.estado) && cita.fecha && (
                                                    <span className="ml-2 text-sky-main font-bold">
                                                        · {diasDesdeHoy(cita.fecha)}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {cita.motivo && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <p className="text-xs text-mute">
                                                <span className="font-bold">{t.motivo}:</span> {cita.motivo}
                                            </p>
                                        </div>
                                    )}

                                    {esCancelable(cita.estado) && (
                                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                                            <Boton
                                                tamano="sm"
                                                variante="danger"
                                                disabled={cancelandoId === cita.id_cita}
                                                onClick={() => setCitaAConfirmar(cita.id_cita)}
                                            >
                                                {cancelandoId === cita.id_cita ? t.cancelandoCita : t.cancelarCita}
                                            </Boton>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>

                        {/* Paginación */}
                        {totalPaginas > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
                                <Boton
                                    tamano="sm"
                                    variante="secondary"
                                    disabled={paginaSegura === 1}
                                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                                >
                                    ←
                                </Boton>
                                <span className="text-xs text-mute font-semibold px-2">
                                    {paginaSegura} / {totalPaginas}
                                </span>
                                <Boton
                                    tamano="sm"
                                    variante="secondary"
                                    disabled={paginaSegura === totalPaginas}
                                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                                >
                                    →
                                </Boton>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* MODAL DE CONFIRMACIÓN */}
            {citaAConfirmar !== null && (
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
                            <Boton variante="secondary" fullWidth onClick={() => setCitaAConfirmar(null)}>
                                {t.noMantener}
                            </Boton>
                            <Boton variante="danger" fullWidth onClick={confirmarCancelacion}>
                                {t.siCancelar}
                            </Boton>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE RESULTADO */}
            {resultado !== null && (
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
                        <Boton fullWidth onClick={() => setResultado(null)}>{t.entendido}</Boton>
                    </div>
                </div>
            )}
        </div>
    );
};
