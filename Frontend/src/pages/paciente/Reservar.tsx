// =================================================================
// Reservar Cita — Wizard de 4 pasos:
//   1. Especialidad → 2. Médico → 3. Fecha → 4. Hora + motivo
//
// Cada médico tiene su propia agenda independiente.
// =================================================================
import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { Header } from '../../components/layout/Header';
import { Boton } from '../../components/common/Boton';
import { Card } from '../../components/common/Card';

import { citasApi } from '../../api/citasApi';
import { pagosApi } from '../../api/pagosApi';
import { Especialidad, Horario, DiaCalendario, MedicoReserva, Dependiente, RequisitoPago } from '../../types';
import { formatearFecha, formatearHora, obtenerIniciales } from '../../utils/formatters';
import { useTranslation } from '../../i18n';

type Paso = 1 | 2 | 3 | 4 | 5; // 5 = éxito

// Reserva en curso mientras el paciente paga en Mercado Pago
const DRAFT_KEY = 'reserva_en_curso';
interface BorradorReserva {
    esp: Especialidad;
    medico: MedicoReserva;
    fecha: string;
    hora: string;
    motivo: string;
    notas: string;
    dep: number | null;
}

export const Reservar = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [paso, setPaso] = useState<Paso>(1);

    const [especialidad, setEspecialidad] = useState<Especialidad | null>(null);
    const [medico, setMedico]             = useState<MedicoReserva | null>(null);
    const [fecha, setFecha]               = useState('');
    const [horaSel, setHoraSel]           = useState<Horario | null>(null);
    const [motivo, setMotivo]             = useState('');
    const [notas, setNotas]               = useState('');
// Datos del menor (solo si la especialidad lo requiere)
    const [dependientes, setDependientes]     = useState<Dependiente[]>([]);
    const [dependienteSel, setDependienteSel] = useState<number | null>(null);
    const [creandoDep, setCreandoDep]         = useState(false);
    const [depNombres, setDepNombres]         = useState('');
    const [depApellidos, setDepApellidos]     = useState('');
    const [depDni, setDepDni]                 = useState('');
    const [depFechaNac, setDepFechaNac]       = useState('');
    const [depParentesco, setDepParentesco]   = useState('');
    const [guardandoDep, setGuardandoDep]     = useState(false);
    const [errorDep, setErrorDep]             = useState<string | null>(null);
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [medicos, setMedicos]               = useState<MedicoReserva[]>([]);
    const [horarios, setHorarios]             = useState<Horario[]>([]);
    const [cargando, setCargando]             = useState(false);
    const [error, setError]                   = useState<string | null>(null);

    // SIS / pago
    const [requisito, setRequisito]     = useState<RequisitoPago | null>(null);
    const [cargandoReq, setCargandoReq] = useState(false);
    const [pagoAprobado, setPagoAprobado] = useState<number | null>(null);
    const retornoProcesado = useRef(false);

    // Cargar especialidades
    useEffect(() => {
        (async () => {
            setCargando(true);
            try {
                const lista = await citasApi.listarEspecialidades();
                setEspecialidades(lista.filter(e => e.estado !== 'INACTIVA'));
            } catch {
                setError('No pudimos cargar las especialidades');
            } finally {
                setCargando(false);
            }
        })();
    }, []);

    // Cargar médicos cuando se elige especialidad
    useEffect(() => {
        if (!especialidad) return;
        (async () => {
            setCargando(true);
            setError(null);
            try {
                const lista = await citasApi.listarMedicos(especialidad.id_especialidad);
                setMedicos(lista);
            } catch {
                setError('No pudimos cargar los médicos');
                setMedicos([]);
            } finally {
                setCargando(false);
            }
        })();
    }, [especialidad]);

    // Cargar horarios cuando hay fecha + médico
    useEffect(() => {
        if (!fecha || !medico) return;
        (async () => {
            setCargando(true);
            setError(null);
            try {
                const lista = await citasApi.listarHorarios(fecha, medico.id_medico);
                setHorarios(lista);
                setHoraSel(null);
            } catch {
                setError('No pudimos cargar los horarios');
                setHorarios([]);
            } finally {
                setCargando(false);
            }
        })();
    }, [fecha, medico]);
    // Cargar dependientes cuando la especialidad requiere datos del menor
    useEffect(() => {
        if (!especialidad?.requiere_datos_menor) return;
        (async () => {
            try {
                const lista = await citasApi.listarDependientes();
                setDependientes(lista);
            } catch {
                setDependientes([]);
            }
        })();
    }, [especialidad]);

    // Al llegar al paso final, consultar si el paciente tiene SIS (cita gratis) o debe pagar
    useEffect(() => {
        if (paso !== 4 || !horaSel || !especialidad) return;
        if (especialidad.requiere_datos_menor && !dependienteSel) { setRequisito(null); return; }
        let activo = true;
        (async () => {
            setCargandoReq(true);
            try {
                const r = await pagosApi.requisito(especialidad.requiere_datos_menor ? dependienteSel ?? undefined : undefined);
                if (activo) setRequisito(r);
            } catch {
                if (activo) setRequisito(null); // si falla, el backend igual valida al reservar
            } finally {
                if (activo) setCargandoReq(false);
            }
        })();
        return () => { activo = false; };
    }, [paso, horaSel, dependienteSel, especialidad]);

    // Retorno desde Mercado Pago: verificar el pago y confirmar la cita
    useEffect(() => {
        const qs = new URLSearchParams(window.location.search);
        const idPagoStr = qs.get('id_pago');
        if (!idPagoStr || retornoProcesado.current) return;
        retornoProcesado.current = true;

        const retorno = qs.get('pago');
        const paymentId = qs.get('payment_id') ?? qs.get('collection_id') ?? undefined;
        window.history.replaceState({}, '', '/paciente/reservar');

        (async () => {
            const raw = sessionStorage.getItem(DRAFT_KEY);
            if (!raw) { setError('No encontramos la reserva en curso. Vuelve a elegir tu horario.'); return; }
            const d: BorradorReserva = JSON.parse(raw);
            const idPago = Number(idPagoStr);

            const volverAlPaso4 = (msg: string) => {
                setEspecialidad(d.esp); setMedico(d.medico); setFecha(d.fecha);
                setMotivo(d.motivo); setNotas(d.notas); setDependienteSel(d.dep);
                setPaso(4); setError(msg);
            };

            setCargando(true);
            try {
                if (retorno === 'error') { volverAlPaso4('El pago fue rechazado o cancelado. Puedes intentarlo de nuevo.'); return; }

                const v = await pagosApi.verificar(idPago, paymentId);
                if (v.estado !== 'APROBADO' && v.estado !== 'EXONERADO') {
                    volverAlPaso4(v.estado === 'PENDIENTE'
                        ? 'Tu pago aún está pendiente de confirmación. Vuelve a intentarlo en unos minutos.'
                        : 'El pago no fue aprobado.');
                    return;
                }
                setPagoAprobado(idPago);

                const res = await citasApi.reservar({
                    fecha: d.fecha, hora: d.hora,
                    id_especialidad: d.esp.id_especialidad, id_medico: d.medico.id_medico,
                    motivo: d.motivo, notas: d.notas || undefined,
                    id_dependiente: d.esp.requiere_datos_menor ? d.dep ?? undefined : undefined,
                    id_pago: idPago,
                });
                if (res.ok) {
                    sessionStorage.removeItem(DRAFT_KEY);
                    setEspecialidad(d.esp); setFecha(d.fecha); setHoraSel({ hora: d.hora } as Horario);
                    setPaso(5);
                    setTimeout(() => navigate('/paciente/inicio'), 2500);
                } else {
                    volverAlPaso4(`Tu pago fue aprobado, pero no se pudo reservar: ${res.mensaje}. Elige otro horario; no se te cobrará de nuevo.`);
                }
            } catch (err: unknown) {
                const msg = axios.isAxiosError(err) ? err.response?.data?.mensaje : null;
                volverAlPaso4(msg ? `Tu pago fue aprobado, pero no se pudo reservar: ${msg}` : 'No se pudo confirmar el pago');
            } finally {
                setCargando(false);
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const guardarDependiente = async () => {
        setErrorDep(null);
        if (!depNombres.trim() || !depApellidos.trim() || !depDni.trim() || !depFechaNac || !depParentesco) {
            setErrorDep('Completa todos los datos del menor');
            return;
        }
        if (!/^\d{8}$/.test(depDni)) {
            setErrorDep('El DNI debe tener 8 dígitos');
            return;
        }
        setGuardandoDep(true);
        try {
            const res = await citasApi.crearDependiente({
                nombres: depNombres.trim(),
                apellidos: depApellidos.trim(),
                dni: depDni,
                fecha_nacimiento: depFechaNac,
                parentesco: depParentesco,
            });
            const lista = await citasApi.listarDependientes();
            setDependientes(lista);
            setDependienteSel(res.id_dependiente);
            setCreandoDep(false);
            setDepNombres(''); setDepApellidos(''); setDepDni(''); setDepFechaNac(''); setDepParentesco('');
        } catch {
            setErrorDep('No se pudo guardar el menor');
        } finally {
            setGuardandoDep(false);
        }
    };

    const handleReservar = async (e: FormEvent) => {
        e.preventDefault();
        if (!horaSel || !especialidad || !medico || !fecha) return;

        setCargando(true);
        setError(null);
        try {
            // Si la especialidad requiere menor, validar que haya uno seleccionado
            if (especialidad.requiere_datos_menor && !dependienteSel) {
                setError('Debes registrar o elegir los datos del menor');
                setCargando(false);
                return;
            }

            // Sin SIS: se redirige a Mercado Pago; la cita se confirma al volver con el pago aprobado.
            if (requisito?.requiere_pago && !pagoAprobado) {
                const borrador: BorradorReserva = {
                    esp: especialidad, medico, fecha, hora: horaSel.hora,
                    motivo: motivo.trim(), notas: notas.trim(),
                    dep: especialidad.requiere_datos_menor ? dependienteSel : null,
                };
                sessionStorage.setItem(DRAFT_KEY, JSON.stringify(borrador));
                const co = await pagosApi.crearCheckout({
                    id_dependiente: borrador.dep ?? undefined,
                    descripcion: `Consulta ${especialidad.nombre} - Dr. ${medico.nombres} ${medico.apellidos}`,
                });
                if (co.ok && co.init_point) {
                    window.location.href = co.init_point;
                    return;
                }
                if (!co.ok) { setError(co.mensaje || 'No se pudo iniciar el pago'); return; }
                // co.ok sin init_point: el paciente tiene SIS, se reserva normalmente
            }

            const res = await citasApi.reservar({
                fecha,
                hora: horaSel.hora,
                id_especialidad: especialidad.id_especialidad,
                id_medico: medico.id_medico,
                motivo: motivo.trim(),
                notas: notas.trim() || undefined,
                id_dependiente: especialidad.requiere_datos_menor ? dependienteSel ?? undefined : undefined,
                id_pago: pagoAprobado ?? undefined,
            });
            if (res.ok) {
                setPaso(5);
                setTimeout(() => navigate('/paciente/inicio'), 2500);
            } else {
                setError(res.mensaje || 'No se pudo reservar');
            }
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.mensaje || 'Error al reservar');
            } else {
                setError('Error inesperado');
            }
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen bg-smoke">
            <Header />
            <main id="contenido-principal" className="max-w-4xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <button onClick={() => navigate('/paciente/inicio')} className="text-sm text-mute hover:text-sky-main mb-2">
                        {t.volverAlInicio}
                    </button>
                    <h1 className="text-3xl font-extrabold text-ink">{t.agendarNuevaCita}</h1>
                    <p className="text-sm text-mute mt-1">{t.agendarNuevaCitaSub}</p>
                </div>

                {paso < 5 && <Stepper pasoActual={paso} />}

                {paso === 1 && (
                    <PasoEspecialidad
                        especialidades={especialidades}
                        cargando={cargando}
                        seleccionada={especialidad}
                        onSeleccionar={(e) => { setEspecialidad(e); setMedico(null); setDependienteSel(null); setPaso(2); }}
                    />
                )}

                {paso === 2 && especialidad && (
                    <PasoMedico
                        especialidad={especialidad}
                        medicos={medicos}
                        cargando={cargando}
                        seleccionado={medico}
                        error={error}
                        onSeleccionar={(m) => { setMedico(m); setPaso(3); }}
                        onAtras={() => setPaso(1)}
                    />
                )}

                {paso === 3 && medico && (
                    <PasoCalendario
                        medico={medico}
                        fechaSel={fecha}
                        onFecha={setFecha}
                        onAtras={() => setPaso(2)}
                        onContinuar={() => setPaso(4)}
                    />
                )}

                {paso === 4 && especialidad && medico && (
                    <PasoHorario
                        especialidad={especialidad}
                        medico={medico}
                        fecha={fecha}
                        horarios={horarios}
                        horaSel={horaSel}
                        cargando={cargando}
                        motivo={motivo}
                        notas={notas}
                        error={error}
                        onSeleccionarHora={setHoraSel}
                        onMotivo={setMotivo}
                        onNotas={setNotas}
                        onAtras={() => setPaso(3)}
                        onConfirmar={handleReservar}
                        dependientes={dependientes}
                        dependienteSel={dependienteSel}
                        onElegirDependiente={setDependienteSel}
                        creandoDep={creandoDep}
                        onToggleCrear={setCreandoDep}
                        depNombres={depNombres} onDepNombres={setDepNombres}
                        depApellidos={depApellidos} onDepApellidos={setDepApellidos}
                        depDni={depDni} onDepDni={setDepDni}
                        depFechaNac={depFechaNac} onDepFechaNac={setDepFechaNac}
                        depParentesco={depParentesco} onDepParentesco={setDepParentesco}
                        guardandoDep={guardandoDep}
                        errorDep={errorDep}
                        onGuardarDep={guardarDependiente}
                        requisito={requisito}
                        cargandoReq={cargandoReq}
                        pagoAprobado={pagoAprobado}
                    />
                )}

                {paso === 5 && especialidad && (
                    <ExitoReserva especialidad={especialidad.nombre} fecha={fecha} hora={horaSel?.hora ?? ''} />
                )}
            </main>
        </div>
    );
};

// ============== STEPPER (4 pasos) ==============
const Stepper = ({ pasoActual }: { pasoActual: number }) => {
    const { t } = useTranslation();
    const pasos = [
        { num: 1, label: t.paso1Especialidad },
        { num: 2, label: t.paso2Medico },
        { num: 3, label: t.paso3Fecha },
        { num: 4, label: t.paso4HoraMotivo },
    ];
    return (
        <div className="flex items-center justify-center gap-2 mb-8">
            {pasos.map((p, i) => {
                const completado = pasoActual > p.num;
                const activo = pasoActual === p.num;
                return (
                    <div key={p.num} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                                ${completado ? 'bg-success text-white' : ''}
                                ${activo ? 'bg-sky-main text-white shadow-cta' : ''}
                                ${!completado && !activo ? 'bg-gray-200 text-mute' : ''}`}>
                                {completado ? '✓' : p.num}
                            </div>
                            <span className={`text-[11px] font-bold mt-2 ${activo ? 'text-sky-main' : 'text-mute'}`}>{p.label}</span>
                        </div>
                        {i < pasos.length - 1 && (
                            <div className={`w-12 h-0.5 mx-2 mb-6 ${pasoActual > p.num ? 'bg-success' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ============== PASO 1: ESPECIALIDAD ==============
const PasoEspecialidad = ({ especialidades, cargando, seleccionada, onSeleccionar }: {
    especialidades: Especialidad[];
    cargando: boolean;
    seleccionada: Especialidad | null;
    onSeleccionar: (e: Especialidad) => void;
}) => {
    const { t } = useTranslation();
    if (cargando) return <Card className="p-12 text-center"><p className="text-mute">Cargando especialidades...</p></Card>;
    return (
        <Card className="p-8">
            <h2 className="text-xl font-extrabold text-blue-deep mb-2">{t.queEspecialidadNecesitas}</h2>
            <p className="text-sm text-mute mb-6">{t.seleccionaOpcionContinuar}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {especialidades.map(e => {
                    const activa = seleccionada?.id_especialidad === e.id_especialidad;
                    return (
                        <button key={e.id_especialidad} onClick={() => onSeleccionar(e)}
                            className={`p-5 rounded-xl border-2 text-left transition-all
                                ${activa ? 'border-sky-main bg-sky-soft shadow-cta' : 'border-gray-200 hover:border-sky-main hover:bg-sky-soft'}`}>
                            <div className="w-10 h-10 rounded-lg bg-sky-soft flex items-center justify-center mb-3"><span className="text-xl">🏥</span></div>
                            <h3 className="font-bold text-ink text-sm mb-1">{e.nombre}</h3>
                            {e.descripcion && <p className="text-xs text-mute line-clamp-2">{e.descripcion}</p>}
                        </button>
                    );
                })}
            </div>
        </Card>
    );
};

// ============== PASO 2: MÉDICO ==============
const PasoMedico = ({ especialidad, medicos, cargando, seleccionado, error, onSeleccionar, onAtras }: {
    especialidad: Especialidad;
    medicos: MedicoReserva[];
    cargando: boolean;
    seleccionado: MedicoReserva | null;
    error: string | null;
    onSeleccionar: (m: MedicoReserva) => void;
    onAtras: () => void;
}) => {
    const { t } = useTranslation();
    return (
    <Card className="p-8">
        <h2 className="text-xl font-extrabold text-blue-deep mb-2">{t.eligeTuMedico}</h2>
        <p className="text-sm text-mute mb-6">
            {t.especialidad}: <span className="font-bold text-sky-deep">{especialidad.nombre}</span>
        </p>

        {cargando ? (
            <p className="text-mute text-sm py-6 text-center">Cargando médicos...</p>
        ) : medicos.length === 0 ? (
            <div className="bg-warning-soft border border-warning rounded-lg p-4 text-center mb-4">
                <p className="text-sm text-warning font-semibold">
                    {t.noMedicosDisponibles}
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {medicos.map(m => {
                    const activo = seleccionado?.id_medico === m.id_medico;
                    return (
                        <button key={m.id_medico} onClick={() => onSeleccionar(m)}
                            className={`p-5 rounded-xl border-2 text-left transition-all flex items-center gap-4
                                ${activo ? 'border-sky-main bg-sky-soft shadow-cta' : 'border-gray-200 hover:border-sky-main hover:bg-sky-soft'}`}>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-main to-sky-deep flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {obtenerIniciales(m.nombres, m.apellidos)}
                            </div>
                            <div>
                                <h3 className="font-bold text-ink text-sm">Dr. {m.nombres} {m.apellidos}</h3>
                                <p className="text-xs text-mute">{especialidad.nombre}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        )}

        {error && <p className="text-xs text-danger font-semibold mt-3">⚠ {error}</p>}

        <div className="flex gap-3 mt-8">
            <Boton variante="secondary" onClick={onAtras}>{t.atras}</Boton>
        </div>
    </Card>
    );
};

// ============== PASO 3: CALENDARIO ==============
const PasoCalendario = ({ medico, fechaSel, onFecha, onAtras, onContinuar }: {
    medico: MedicoReserva;
    fechaSel: string;
    onFecha: (f: string) => void;
    onAtras: () => void;
    onContinuar: () => void;
}) => {
    const { t } = useTranslation();
    const hoy = new Date();
    const [anio, setAnio] = useState(hoy.getFullYear());
    const [mes, setMes]   = useState(hoy.getMonth() + 1);
    const [dias, setDias] = useState<DiaCalendario[]>([]);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        (async () => {
            setCargando(true);
            try {
                const data = await citasApi.obtenerCalendario(anio, mes, medico.id_medico);
                setDias(data);
            } catch {
                setDias([]);
            } finally {
                setCargando(false);
            }
        })();
    }, [anio, mes, medico]);

        const primerDiaSemana = new Date(anio, mes - 1, 1).getDay();
    const diasMap = new Map(dias.map(d => [d.fecha, d]));

    const cambiarMes = (delta: number) => {
        let nuevoMes = mes + delta, nuevoAnio = anio;
        if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
        if (nuevoMes < 1)  { nuevoMes = 12; nuevoAnio--; }
        setMes(nuevoMes); setAnio(nuevoAnio);
    };

    const celdas: (DiaCalendario | null)[] = [];
    for (let i = 0; i < primerDiaSemana; i++) celdas.push(null);
    const totalDias = new Date(anio, mes, 0).getDate();
    for (let d = 1; d <= totalDias; d++) {
        const fechaStr = `${anio}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        celdas.push(diasMap.get(fechaStr) ?? { fecha: fechaStr, total: 0, libres: 0, reservable: false });
    }

    return (
        <Card className="p-8">
            <h2 className="text-xl font-extrabold text-blue-deep mb-2">{t.eligeFechaCita}</h2>
            <p className="text-sm text-mute mb-6">
                {t.medico}: <span className="font-bold text-sky-deep">Dr. {medico.nombres} {medico.apellidos}</span>
            </p>

            <div className="flex items-center justify-between mb-4">
                <button onClick={() => cambiarMes(-1)} className="w-9 h-9 rounded-lg bg-smoke hover:bg-sky-soft text-mute font-bold">‹</button>
                <h3 className="text-base font-bold text-ink">{t.meses[mes - 1]} {anio}</h3>
                <button onClick={() => cambiarMes(1)} className="w-9 h-9 rounded-lg bg-smoke hover:bg-sky-soft text-mute font-bold">›</button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {['D','L','M','M','J','V','S'].map((d, i) => (
                    <div key={i} className="text-center text-[11px] font-bold text-mute py-1">{d}</div>
                ))}
            </div>

            {cargando ? (
                <p className="text-center text-mute py-12 text-sm">Cargando disponibilidad...</p>
            ) : (
                <div className="grid grid-cols-7 gap-1">
                    {celdas.map((celda, i) => {
                        if (!celda) return <div key={i} />;
                        const dia = Number(celda.fecha.split('-')[2]);
                        const seleccionada = fechaSel === celda.fecha;
                        const sinCupo = celda.reservable && celda.libres === 0;

                        if (!celda.reservable) {
                            return <div key={i} className="aspect-square flex items-center justify-center text-sm text-gray-300">{dia}</div>;
                        }
                        return (
                            <button key={i} onClick={() => !sinCupo && onFecha(celda.fecha)} disabled={sinCupo}
                                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all
                                    ${seleccionada ? 'bg-sky-main text-white font-bold shadow-cta' : ''}
                                    ${!seleccionada && !sinCupo ? 'bg-sky-soft text-sky-deep font-semibold hover:bg-sky-bright hover:text-white' : ''}
                                    ${sinCupo ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through' : ''}`}>
                                {dia}
                                {!seleccionada && !sinCupo && <span className="text-[8px] mt-0.5">{celda.libres} libres</span>}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex gap-4 mt-4 text-[11px] text-mute">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-soft inline-block" /> Disponible</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Sin cupo</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-sky-main inline-block" /> Seleccionado</span>
            </div>

            <div className="flex gap-3 mt-8">
                <Boton variante="secondary" onClick={onAtras}>← Atrás</Boton>
                <Boton onClick={onContinuar} disabled={!fechaSel}>{t.continuar}</Boton>
            </div>
        </Card>
    );
};
// ============== PASO 4: HORARIO + MOTIVO ==============
const PARENTESCOS = ['Padre', 'Madre', 'Hermano', 'Hermana', 'Tio', 'Tia', 'Abuelo', 'Abuela', 'Apoderado', 'Otro'];

const PasoHorario = ({
    especialidad, medico, fecha, horarios, horaSel, cargando, motivo, notas, error,
    onSeleccionarHora, onMotivo, onNotas, onAtras, onConfirmar,
    dependientes, dependienteSel, onElegirDependiente,
    creandoDep, onToggleCrear,
    depNombres, onDepNombres, depApellidos, onDepApellidos,
    depDni, onDepDni, depFechaNac, onDepFechaNac, depParentesco, onDepParentesco,
    guardandoDep, errorDep, onGuardarDep, requisito, cargandoReq, pagoAprobado,
}: {
    especialidad: Especialidad;
    medico: MedicoReserva;
    fecha: string;
    horarios: Horario[];
    horaSel: Horario | null;
    cargando: boolean;
    motivo: string;
    notas: string;
    error: string | null;
    onSeleccionarHora: (h: Horario) => void;
    onMotivo: (m: string) => void;
    onNotas: (n: string) => void;
    onAtras: () => void;
    onConfirmar: (e: FormEvent) => void;
    dependientes: Dependiente[];
    dependienteSel: number | null;
    onElegirDependiente: (id: number) => void;
    creandoDep: boolean;
    onToggleCrear: (v: boolean) => void;
    depNombres: string; onDepNombres: (v: string) => void;
    depApellidos: string; onDepApellidos: (v: string) => void;
    depDni: string; onDepDni: (v: string) => void;
    depFechaNac: string; onDepFechaNac: (v: string) => void;
    depParentesco: string; onDepParentesco: (v: string) => void;
    guardandoDep: boolean;
    errorDep: string | null;
    onGuardarDep: () => void;
    requisito: RequisitoPago | null;
    cargandoReq: boolean;
    pagoAprobado: number | null;
}) => {
    const { t } = useTranslation();
    const requiereMenor = !!especialidad.requiere_datos_menor;
    // Si requiere menor, no se puede confirmar sin uno elegido
    const bloqueoMenor = requiereMenor && !dependienteSel;

    return (
    <Card className="p-8">
        <h2 className="text-xl font-extrabold text-blue-deep mb-2">{t.eligeHoraMotivo}</h2>
        <p className="text-sm text-mute mb-2">{especialidad.nombre} · {formatearFecha(fecha)}</p>
        <p className="text-xs text-sky-deep font-semibold mb-6">👨‍⚕️ Dr. {medico.nombres} {medico.apellidos}</p>

        <div className="mb-6">
            <p className="text-xs font-bold text-ink-soft mb-3">{t.horariosDisponibles}</p>
            {cargando && <p className="text-mute text-sm py-6 text-center">Cargando horarios...</p>}
            {!cargando && horarios.length === 0 && (
                <div className="bg-warning-soft border border-warning rounded-lg p-4 text-center">
                    <p className="text-sm text-warning font-semibold">{t.noHorariosFecha}</p>
                </div>
            )}
            {!cargando && horarios.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {horarios.map(h => {
                        const activo = horaSel?.hora === h.hora;
                        const ocupado = !h.disponible;
                        return (
                            <button key={h.hora} onClick={() => !ocupado && onSeleccionarHora(h)} disabled={ocupado}
                                className={`p-3 rounded-lg border-2 text-sm font-bold transition-all
                                    ${activo ? 'border-sky-main bg-sky-main text-white shadow-cta' : ''}
                                    ${!activo && !ocupado ? 'border-gray-200 text-ink-soft hover:border-sky-main hover:bg-sky-soft' : ''}
                                    ${ocupado ? 'border-gray-100 bg-gray-100 text-gray-400 cursor-not-allowed line-through' : ''}`}>
                                {formatearHora(h.hora)}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>

        {horaSel && (
            <form onSubmit={onConfirmar} className="space-y-4 border-t pt-6">
                {/* ===== SECCIÓN DATOS DEL MENOR (solo si la especialidad lo requiere) ===== */}
                {requiereMenor && (
                    <div className="bg-blue-50 border border-sky-main/30 rounded-lg p-4">
                        <p className="text-xs font-bold text-sky-deep mb-1">👶 {t.datosDelMenor}</p>
                        <p className="text-[11px] text-mute mb-3">{t.especialidadParaMenores}</p>

                        {/* Lista de dependientes guardados */}
                        {dependientes.length > 0 && !creandoDep && (
                            <div className="space-y-2 mb-3">
                                {dependientes.map(d => {
                                    const activo = dependienteSel === d.id_dependiente;
                                    return (
                                        <button type="button" key={d.id_dependiente}
                                            onClick={() => onElegirDependiente(d.id_dependiente)}
                                            className={`w-full text-left p-3 rounded-lg border-2 transition-all
                                                ${activo ? 'border-sky-main bg-sky-soft' : 'border-gray-200 hover:border-sky-main bg-white'}`}>
                                            <p className="text-sm font-bold text-ink">{d.nombres} {d.apellidos}</p>
                                            <p className="text-[11px] text-mute">
                                                DNI: {d.dni ?? '—'} · {d.parentesco ?? ''}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Botón para alternar "agregar nuevo" */}
                        {!creandoDep && (
                            <button type="button" onClick={() => onToggleCrear(true)}
                                className="text-xs font-bold text-sky-main hover:text-sky-deep">
                                {t.registrarOtroMenor}
                            </button>
                        )}

                        {/* Formulario de nuevo menor */}
                        {creandoDep && (
                            <div className="space-y-3 bg-white rounded-lg p-3 border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <input value={depNombres} onChange={(e) => onDepNombres(e.target.value)}
                                        placeholder="Nombres" maxLength={100}
                                        className="px-3 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none" />
                                    <input value={depApellidos} onChange={(e) => onDepApellidos(e.target.value)}
                                        placeholder="Apellidos" maxLength={100}
                                        className="px-3 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <input value={depDni} onChange={(e) => onDepDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                        placeholder="DNI (8 dígitos)" maxLength={8}
                                        className="px-3 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none" />
                                    <input type="date" value={depFechaNac} onChange={(e) => onDepFechaNac(e.target.value)}
                                        className="px-3 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none" />
                                </div>
                                <select value={depParentesco} onChange={(e) => onDepParentesco(e.target.value)}
                                    className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none">
                                    <option value="">¿Qué eres del menor?</option>
                                    {PARENTESCOS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                {errorDep && <p className="text-[11px] text-danger font-semibold">⚠ {errorDep}</p>}
                                <div className="flex gap-2">
                                    <Boton type="button" variante="secondary" tamano="sm" onClick={() => onToggleCrear(false)}>Cancelar</Boton>
                                    <Boton type="button" tamano="sm" onClick={onGuardarDep} disabled={guardandoDep}>
                                        {guardandoDep ? 'Guardando...' : 'Guardar menor'}
                                    </Boton>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-2">{t.motivoConsultaReq}</label>
                    <textarea value={motivo} onChange={(e) => onMotivo(e.target.value)}
                        placeholder={t.placeholderMotivo}
                        rows={3} required maxLength={500}
                        className="w-full px-4 py-3 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none resize-none" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-ink-soft mb-2">{t.notasAdicionalesOpc}</label>
                    <textarea value={notas} onChange={(e) => onNotas(e.target.value)}
                        placeholder="Información extra para el médico" rows={2} maxLength={1000}
                        className="w-full px-4 py-3 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none resize-none" />
                </div>
                {/* ===== SIS / PAGO ===== */}
                {cargandoReq && <p className="text-xs text-mute">Verificando seguro del paciente...</p>}
                {!cargandoReq && pagoAprobado && (
                    <div role="status" className="rounded-lg p-4 border border-success bg-green-50">
                        <p className="text-sm font-bold text-success">✓ Pago aprobado</p>
                        <p className="text-xs text-ink-soft">Confirma la reserva para usar tu pago.</p>
                    </div>
                )}
                {!cargandoReq && !pagoAprobado && requisito && (
                    requisito.requiere_pago ? (
                        <div role="status" className="rounded-lg p-4 border border-warning bg-warning-soft">
                            <p className="text-sm font-bold text-warning">El paciente no cuenta con SIS</p>
                            <p className="text-xs text-ink-soft">
                                Debes pagar <strong>S/ {requisito.monto.toFixed(2)}</strong> con Mercado Pago para confirmar la cita.
                            </p>
                            {!requisito.seguro.verificado && (
                                <p className="text-[11px] text-mute mt-1">Estado de seguro no verificado oficialmente (modo demostración).</p>
                            )}
                        </div>
                    ) : (
                        <div role="status" className="rounded-lg p-4 border border-success bg-green-50">
                            <p className="text-sm font-bold text-success">✓ Cuentas con SIS — tu cita es gratuita</p>
                            {!requisito.seguro.verificado && (
                                <p className="text-[11px] text-mute mt-1">Estado de seguro no verificado oficialmente (modo demostración).</p>
                            )}
                        </div>
                    )
                )}

                <div className="bg-sky-soft rounded-lg p-4">
                    <p className="text-xs font-bold text-sky-deep mb-2">{t.resumenCita}</p>
                    <ul className="text-sm text-ink-soft space-y-1">
                        <li>📋 <strong>{t.especialidad}:</strong> {especialidad.nombre}</li>
                        <li>👨‍⚕️ <strong>{t.medico}:</strong> Dr. {medico.nombres} {medico.apellidos}</li>
                        <li>📅 <strong>{t.fecha}:</strong> {formatearFecha(fecha)}</li>
                        <li>⏰ <strong>{t.hora}:</strong> {formatearHora(horaSel.hora)}</li>
                    </ul>
                </div>
                {error && <div className="bg-danger-soft border border-danger-border rounded-lg p-3"><p className="text-xs text-danger font-semibold">⚠ {error}</p></div>}
                {bloqueoMenor && <p className="text-[11px] text-warning font-semibold">⚠ Selecciona o registra los datos del menor para continuar.</p>}
                <div className="flex gap-3">
                    <Boton type="button" variante="secondary" onClick={onAtras}>← Atrás</Boton>
                    <Boton type="submit" disabled={!motivo.trim() || cargando || bloqueoMenor} fullWidth>
                        {cargando
                            ? (requisito?.requiere_pago && !pagoAprobado ? 'Redirigiendo al pago...' : 'Reservando...')
                            : (requisito?.requiere_pago && !pagoAprobado ? `Pagar S/ ${requisito.monto.toFixed(2)} y reservar` : '✓ Confirmar reserva')}
                    </Boton>
                </div>
            </form>
        )}

        {!horaSel && horarios.length > 0 && (
            <div className="flex gap-3 border-t pt-6">
                <Boton variante="secondary" onClick={onAtras}>← Atrás</Boton>
                <p className="flex-1 text-center text-sm text-mute self-center">Selecciona un horario para continuar</p>
            </div>
        )}
    </Card>
    );
};

// ============== ÉXITO ==============
const ExitoReserva = ({ especialidad, fecha, hora }: { especialidad: string; fecha: string; hora: string }) => {
    const { t } = useTranslation();
    return (
    <Card className="p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M5 12 L10 17 L19 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-blue-deep mb-2">{t.citaReservadaExito}</h2>
        <p className="text-sm text-mute mb-6">{t.teEsperamosSanGenaro}</p>
        <div className="inline-block bg-sky-soft rounded-2xl px-6 py-4 mb-6">
            <p className="text-lg font-bold text-sky-deep">{especialidad}</p>
            <p className="text-sm text-ink-soft mt-1">{formatearFecha(fecha)} · {formatearHora(hora)}</p>
        </div>
        <p className="text-xs text-mute">{t.redirigiendoInicio}</p>
    </Card>
    );
};
