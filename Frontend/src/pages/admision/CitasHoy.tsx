// =================================================================
// Vista de ADMISIÓN — Citas del día con marcado de asistencia.
// =================================================================
import { useEffect, useMemo, useState } from 'react';

import { HeaderAdmin } from '../../components/layout/HeaderAdmin';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';
import { BadgeEstadoCita } from '../../components/common/Badge';

import { useTranslation } from '../../i18n';
import { admisionApi } from '../../api/admisionApi';
import { CitaDelDia } from '../../types';
import { formatearFecha, formatearHora, obtenerIniciales, citaYaInicio } from '../../utils/formatters';
import { mensajeErrorApi } from '../../utils/errores';

const POR_PAGINA = 8;

const fechaLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fechaLocalHoy = () => fechaLocal(new Date());
const fechaLocalAyer = () => { const d = new Date(); d.setDate(d.getDate() - 1); return fechaLocal(d); };

// Mismas reglas que el backend (reglas-asistencia.ts):
//  - "Asistió": desde el día de la cita (puede llegar temprano), nunca un día futuro.
//  - "Falta": solo cuando la hora de la cita ya llegó.
//  - Una FALTA se puede corregir a "Asistió" el mismo día o el siguiente.
const accionesDe = (c: CitaDelDia) => {
    const pendiente = c.cita.estado === 'RESERVADA';
    return {
        asistio:  pendiente && c.fecha <= fechaLocalHoy(),
        falta:    pendiente && citaYaInicio(c.fecha, c.hora),
        corregir: c.cita.estado === 'FALTA' && c.fecha >= fechaLocalAyer(),
    };
};

export const CitasHoy = () => {
    const { t } = useTranslation();
    // Fecha LOCAL (toISOString usa UTC: después de las 7 pm en Perú mostraría mañana)
    const hoy = fechaLocalHoy();
    const [fecha, setFecha]       = useState(hoy);
    const [citas, setCitas]       = useState<CitaDelDia[]>([]);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState<number | null>(null);
    const [filtroEsp, setFiltroEsp] = useState('');
    const [pagina, setPagina] = useState(1);

    const cargar = async (f: string) => {
        setCargando(true);
        try {
            const data = await admisionApi.citasDelDia(f);
            setCitas(data.citas ?? []);
        } catch (e) {
            console.error('Error cargando citas del día:', e);
            setCitas([]);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        void cargar(fecha);
    }, [fecha]);

    // Al cambiar fecha o especialidad, volvemos a la página 1
    useEffect(() => { setPagina(1); }, [fecha, filtroEsp]);

    const handleAsistio = async (idCita: number) => {
        setProcesando(idCita);
        try {
            const res = await admisionApi.marcarAsistio(idCita);
            if (res.ok) await cargar(fecha);
            else alert(res.mensaje);
        } catch (err) {
            alert(mensajeErrorApi(err, 'No se pudo marcar la asistencia'));
            await cargar(fecha);
        } finally {
            setProcesando(null);
        }
    };

    const handleFalta = async (idCita: number) => {
        if (!window.confirm('¿Registrar la inasistencia? Se sumará una falta al paciente y podría suspenderse su cuenta.')) return;
        setProcesando(idCita);
        try {
            const res = await admisionApi.marcarFalta(idCita);
            if (res.ok) await cargar(fecha);
            else alert(res.mensaje);
        } catch (err) {
            alert(mensajeErrorApi(err, 'No se pudo marcar la falta'));
            await cargar(fecha);
        } finally {
            setProcesando(null);
        }
    };

    // Corrige una falta marcada por error (mismo día o siguiente): se retira la sanción
    const handleCorregir = async (idCita: number) => {
        if (!window.confirm('¿Corregir a "Asistió"? Se retirará la inasistencia y, si la cuenta se suspendió solo por faltas, se reactivará.')) return;
        setProcesando(idCita);
        try {
            const res = await admisionApi.marcarAsistio(idCita);
            alert(res.mensaje);
            await cargar(fecha);
        } catch (err) {
            alert(mensajeErrorApi(err, 'No se pudo corregir la falta'));
            await cargar(fecha);
        } finally {
            setProcesando(null);
        }
    };

    // Especialidades presentes en las citas del día (para el dropdown)
    const especialidadesUnicas = useMemo(
        () => (Array.from(new Set(citas.map(c => c.especialidad).filter(Boolean))) as string[])
            .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })),
        [citas],
    );

    // Filtro por especialidad
    const filtradas = useMemo(
        () => (filtroEsp ? citas.filter(c => c.especialidad === filtroEsp) : citas),
        [citas, filtroEsp],
    );

    // Paginación
    const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
    const paginaSegura = Math.min(pagina, totalPaginas);
    const visibles = filtradas.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

    // Contadores rápidos (sobre lo filtrado, para que cuadren con lo que se ve)
    const asistieron = filtradas.filter(c => c.cita.estado === 'COMPLETADA').length;
    const faltaron   = filtradas.filter(c => c.cita.estado === 'FALTA').length;
    const pendientes = filtradas.filter(c => c.cita.estado === 'RESERVADA').length;

    return (
        <div className="min-h-screen bg-smoke">
            <HeaderAdmin />

            <main id="contenido-principal" className="max-w-7xl mx-auto px-6 py-8">
                {/* Título + stats */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-ink">{t.reportesCitas}</h1>
                        <p className="text-sm text-mute mt-1 capitalize">{formatearFecha(fecha)}</p>
                    </div>
                    <div className="flex gap-3">
                        <StatMini label={t.completadas} valor={asistieron} color="text-success" />
                        <StatMini label={t.faltas} valor={faltaron} color="text-danger" />
                        <StatMini label={t.estadoReservada.toUpperCase()} valor={pendientes} color="text-sky-main" />
                    </div>
                </div>

                {/* Filtros: fecha + especialidad */}
                <Card className="p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <label htmlFor="filtro-fecha" className="text-sm font-semibold text-ink-soft">{t.fecha}:</label>
                        <input
                            id="filtro-fecha"
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="px-4 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none"
                        />
                        <Boton tamano="sm" variante="secondary" onClick={() => setFecha(hoy)}>Hoy</Boton>

                        <label htmlFor="filtro-especialidad" className="text-sm font-semibold text-ink-soft ml-2">{t.especialidad}:</label>
                        <select
                            id="filtro-especialidad"
                            value={filtroEsp}
                            onChange={(e) => setFiltroEsp(e.target.value)}
                            className="px-4 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none"
                        >
                            <option value="">{t.todas}</option>
                            {especialidadesUnicas.map(esp => (
                                <option key={esp} value={esp}>{esp}</option>
                            ))}
                        </select>
                    </div>
                </Card>

                {/* Tabla */}
                {cargando ? (
                    <Card className="p-8 text-center"><p className="text-mute text-sm">{t.cargandoInformacion}</p></Card>
                ) : filtradas.length === 0 ? (
                    <Card className="p-12 text-center"><p className="text-mute text-sm">{t.noCitasFiltros}</p></Card>
                ) : (
                    <div className="space-y-3">
                        {visibles.map(c => {
                            const acciones = accionesDe(c);
                            return (
                                <Card
                                    key={c.cita.id_cita}
                                    bordeLateral={
                                        c.cita.estado === 'COMPLETADA' ? 'success' :
                                        c.cita.estado === 'FALTA' ? 'danger' : 'sky'
                                    }
                                    className="p-5"
                                >
                                    <div className="flex flex-wrap items-center gap-4">
                                        {/* Hora */}
                                        <div className="text-center min-w-[70px]">
                                            <p className="text-lg font-extrabold text-sky-deep">{formatearHora(c.hora)}</p>
                                        </div>

                                        {/* Paciente */}
                                        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                                            <div className="w-10 h-10 rounded-full bg-sky-soft flex items-center justify-center text-xs font-bold text-sky-deep">
                                                {obtenerIniciales(c.paciente_nombres, c.paciente_apellidos)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-ink text-sm">{c.paciente_nombres} {c.paciente_apellidos}</p>
                                                <p className="text-xs text-mute">DNI {c.paciente_dni}</p>
                                            </div>
                                        </div>

                                        {/* Especialidad */}
                                        <div className="min-w-[160px]">
                                            <p className="text-sm font-semibold text-ink-soft">{c.especialidad}</p>
                                            <p className="text-xs text-mute">Dr. {c.medico_nombres} {c.medico_apellidos}</p>
                                        </div>

                                        {/* Estado */}
                                        <div className="min-w-[110px]">
                                            <BadgeEstadoCita estado={c.cita.estado} />
                                        </div>

                                        {/* Acciones */}
                                        <div className="flex gap-2 items-center">
                                            {acciones.asistio && (
                                                <Boton
                                                    tamano="sm"
                                                    variante="success"
                                                    disabled={procesando === c.cita.id_cita}
                                                    onClick={() => handleAsistio(c.cita.id_cita)}
                                                >
                                                    ✓ Asistió
                                                </Boton>
                                            )}
                                            {acciones.falta && (
                                                <Boton
                                                    tamano="sm"
                                                    variante="danger"
                                                    disabled={procesando === c.cita.id_cita}
                                                    onClick={() => handleFalta(c.cita.id_cita)}
                                                >
                                                    ✗ Falta
                                                </Boton>
                                            )}
                                            {acciones.corregir && (
                                                <Boton
                                                    tamano="sm"
                                                    variante="secondary"
                                                    disabled={procesando === c.cita.id_cita}
                                                    onClick={() => handleCorregir(c.cita.id_cita)}
                                                >
                                                    ↺ Corregir: asistió
                                                </Boton>
                                            )}
                                            {c.cita.estado === 'RESERVADA' && !acciones.asistio && (
                                                <span className="text-xs text-mute italic">— cita de un día futuro —</span>
                                            )}
                                            {c.cita.estado === 'RESERVADA' && acciones.asistio && !acciones.falta && (
                                                <span className="text-[11px] text-mute italic">Falta: disponible a la hora de la cita</span>
                                            )}
                                            {c.cita.estado !== 'RESERVADA' && !acciones.corregir && (
                                                <span className="text-xs text-mute italic">— ya registrado —</span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Controles de paginación */}
                {!cargando && totalPaginas > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-6">
                        <Boton
                            variante="secondary"
                            tamano="sm"
                            disabled={paginaSegura <= 1}
                            onClick={() => setPagina(p => Math.max(1, p - 1))}
                        >
                            ←
                        </Boton>
                        <span className="text-sm font-semibold text-mute">
                            Página {paginaSegura} de {totalPaginas}
                        </span>
                        <Boton
                            variante="secondary"
                            tamano="sm"
                            disabled={paginaSegura >= totalPaginas}
                            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                        >
                            →
                        </Boton>
                    </div>
                )}
            </main>
        </div>
    );
};

const StatMini = ({ label, valor, color }: { label: string; valor: number; color: string }) => (
    <Card className="px-5 py-3 text-center">
        <p className="text-[10px] font-bold text-mute tracking-wider">{label}</p>
        <p className={`text-2xl font-extrabold ${color}`}>{valor}</p>
    </Card>
);
