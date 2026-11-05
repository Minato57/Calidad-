// =================================================================
// Vista del MÉDICO — Pacientes del día.
// Permite registrar diagnóstico + receta; el paciente la recibe por
// correo con la firma digital del médico.
// =================================================================
import { FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

import { HeaderAdmin } from '../../components/layout/HeaderAdmin';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';
import { Badge } from '../../components/common/Badge';

import { medicoApi } from '../../api/medicoApi';
import { CitaMedico, PerfilMedico } from '../../types';
import { useTranslation } from '../../i18n';
import { formatearFecha, formatearHora, obtenerIniciales } from '../../utils/formatters';

const hoyLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const calcularEdad = (fechaNac: string | null): string => {
    if (!fechaNac) return '';
    const n = new Date(fechaNac + 'T00:00:00');
    const h = new Date();
    let e = h.getFullYear() - n.getFullYear();
    if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--;
    return e >= 0 ? `${e} años` : '';
};

export const MisPacientes = () => {
    const { t } = useTranslation();
    const hoy = hoyLocal();
    const [fecha, setFecha]       = useState(hoy);
    const [citas, setCitas]       = useState<CitaMedico[]>([]);
    const [medico, setMedico]     = useState<PerfilMedico | null>(null);
    const [cargando, setCargando] = useState(true);
    const [errorCarga, setErrorCarga] = useState<string | null>(null);
    const [aviso, setAviso]       = useState<{ tipo: 'ok' | 'warn'; texto: string } | null>(null);

    const [atendiendo, setAtendiendo] = useState<CitaMedico | null>(null);

    const cargar = async (f: string) => {
        setCargando(true);
        setErrorCarga(null);
        try {
            const data = await medicoApi.citasDelDia(f);
            setCitas(data.citas ?? []);
            setMedico(data.medico ?? null);
        } catch (err) {
            setCitas([]);
            setErrorCarga(
                axios.isAxiosError(err) && err.response?.data?.mensaje
                    ? err.response.data.mensaje
                    : 'No se pudieron cargar tus pacientes',
            );
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(fecha); }, [fecha]);

    const atendidos  = useMemo(() => citas.filter(c => c.atendida).length, [citas]);
    const pendientes = useMemo(() => citas.filter(c => !c.atendida && c.estado !== 'FALTA').length, [citas]);

    return (
        <div className="min-h-screen bg-smoke">
            <HeaderAdmin />

            <main id="contenido-principal" className="max-w-5xl mx-auto px-6 py-8">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-ink">{t.misPacientes}</h1>
                        <p className="text-sm text-mute mt-1 capitalize">{formatearFecha(fecha)}</p>
                        {medico && (
                            <p className="text-xs text-sky-deep font-semibold mt-1">
                                Dr(a). {medico.nombres} {medico.apellidos} · {medico.especialidad}
                                {medico.cmp ? ` · CMP ${medico.cmp}` : ''}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Stat label={t.pendientes.toUpperCase()} valor={pendientes} color="text-sky-main" />
                        <Stat label={t.atendidos.toUpperCase()} valor={atendidos} color="text-success" />
                    </div>
                </div>

                <Card className="p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-3">
                        <label htmlFor="fecha-medico" className="text-sm font-semibold text-ink-soft">{t.fecha}:</label>
                        <input
                            id="fecha-medico" type="date" value={fecha}
                            onChange={(e) => setFecha(e.target.value || hoy)}
                            className="px-4 py-2 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none"
                        />
                        <Boton tamano="sm" variante="secondary" onClick={() => setFecha(hoy)}>Hoy</Boton>
                    </div>
                </Card>

                {aviso && (
                    <div role="status" className={`rounded-lg p-3 mb-4 text-sm font-semibold border ${aviso.tipo === 'ok' ? 'bg-green-50 border-success text-success' : 'bg-warning-soft border-warning text-warning'}`}>
                        {aviso.texto}
                    </div>
                )}

                {cargando ? (
                    <Card className="p-8 text-center"><p className="text-mute text-sm">Cargando pacientes...</p></Card>
                ) : errorCarga ? (
                    <Card className="p-8 text-center"><p role="alert" className="text-danger text-sm font-semibold">{errorCarga}</p></Card>
                ) : citas.length === 0 ? (
                    <Card className="p-12 text-center"><p className="text-mute text-sm">{t.noPacientesDia}</p></Card>
                ) : (
                    <ul className="space-y-3">
                        {citas.map(c => (
                            <li key={c.id_cita}>
                                <Card bordeLateral={c.atendida ? 'success' : c.estado === 'FALTA' ? 'danger' : 'sky'} className="p-5">
                                    <div className="flex flex-wrap items-start gap-4">
                                        <div className="text-center min-w-[70px]">
                                            <p className="text-lg font-extrabold text-sky-deep">{formatearHora(c.hora)}</p>
                                        </div>

                                        <div className="flex items-start gap-3 flex-1 min-w-[240px]">
                                            <div className="w-10 h-10 rounded-full bg-sky-soft flex items-center justify-center text-xs font-bold text-sky-deep shrink-0">
                                                {obtenerIniciales(c.paciente_nombres, c.paciente_apellidos)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-ink text-sm">
                                                    {c.paciente_nombres} {c.paciente_apellidos}
                                                    {c.es_familiar && <span className="ml-2 align-middle"><Badge variante="sky">{c.parentesco ?? 'Familiar'}</Badge></span>}
                                                </p>
                                                <p className="text-xs text-mute">
                                                    DNI {c.paciente_dni}{calcularEdad(c.fecha_nacimiento) ? ` · ${calcularEdad(c.fecha_nacimiento)}` : ''}
                                                </p>
                                                {c.es_familiar && <p className="text-[11px] text-mute">Reservó: {c.titular_nombre}</p>}
                                                {c.motivo && <p className="text-xs text-ink-soft mt-2"><strong>Motivo:</strong> {c.motivo}</p>}
                                                {c.notas && <p className="text-xs text-ink-soft"><strong>Notas:</strong> {c.notas}</p>}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2 min-w-[150px]">
                                            {c.seguro && (
                                                <Badge variante={c.seguro.tiene_seguro ? 'success' : 'gray'}>
                                                    {c.seguro.tiene_seguro ? 'SIS' : 'Sin seguro'}
                                                </Badge>
                                            )}
                                            {c.atendida ? (
                                                <>
                                                    <Badge variante="success">{t.atendidos}</Badge>
                                                    <span className="text-[11px] text-mute">
                                                        {c.correo_enviado ? 'Receta enviada por correo' : 'Correo no enviado'}
                                                    </span>
                                                </>
                                            ) : c.estado === 'FALTA' ? (
                                                <Badge variante="danger">No asistió</Badge>
                                            ) : (
                                                <Boton tamano="sm" onClick={() => { setAviso(null); setAtendiendo(c); }}>
                                                    Atender
                                                </Boton>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </li>
                        ))}
                    </ul>
                )}
            </main>

            {atendiendo && (
                <ModalAtencion
                    cita={atendiendo}
                    onCerrar={() => setAtendiendo(null)}
                    onGuardada={async (res) => {
                        setAtendiendo(null);
                        setAviso({ tipo: res.correo_enviado ? 'ok' : 'warn', texto: res.mensaje });
                        await cargar(fecha);
                    }}
                />
            )}
        </div>
    );
};

// ---------------------------------------------------------------
const ModalAtencion = ({ cita, onCerrar, onGuardada }: {
    cita: CitaMedico;
    onCerrar: () => void;
    onGuardada: (r: { mensaje: string; correo_enviado?: boolean }) => void;
}) => {
    const { t } = useTranslation();
    const [diagnostico, setDiagnostico]   = useState('');
    const [receta, setReceta]             = useState('');
    const [indicaciones, setIndicaciones] = useState('');
    const [enviando, setEnviando]         = useState(false);
    const [error, setError]               = useState<string | null>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !enviando) onCerrar(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [enviando, onCerrar]);

    const enviar = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setEnviando(true);
        try {
            const res = await medicoApi.registrarAtencion(cita.id_cita, {
                diagnostico: diagnostico.trim(),
                receta: receta.trim() || undefined,
                indicaciones: indicaciones.trim() || undefined,
            });
            if (res.ok) onGuardada(res);
            else setError(res.mensaje);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.detalle?.[0]?.errores?.[0] ?? err.response?.data?.mensaje ?? 'No se pudo registrar la atención');
            } else {
                setError('Error inesperado');
            }
        } finally {
            setEnviando(false);
        }
    };

    const campo = 'w-full px-4 py-3 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none resize-none';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !enviando) onCerrar(); }}>
            <div role="dialog" aria-modal="true" aria-labelledby="titulo-atencion" className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                <h2 id="titulo-atencion" className="text-xl font-extrabold text-blue-deep">{t.guardarAtencion}</h2>
                <p className="text-sm text-mute mb-4">
                    {cita.paciente_nombres} {cita.paciente_apellidos} · DNI {cita.paciente_dni}
                </p>

                <form onSubmit={enviar} className="space-y-4">
                    <div>
                        <label htmlFor="diagnostico" className="block text-xs font-semibold text-ink-soft mb-2">{t.diagnostico} *</label>
                        <textarea id="diagnostico" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)}
                            rows={3} required maxLength={2000} autoFocus className={campo} />
                    </div>
                    <div>
                        <label htmlFor="receta" className="block text-xs font-semibold text-ink-soft mb-2">{t.receta}</label>
                        <textarea id="receta" value={receta} onChange={(e) => setReceta(e.target.value)}
                            rows={4} maxLength={3000} placeholder="Ej: Paracetamol 500 mg, 1 tableta cada 8 horas por 3 días" className={campo} />
                    </div>
                    <div>
                        <label htmlFor="indicaciones" className="block text-xs font-semibold text-ink-soft mb-2">Indicaciones</label>
                        <textarea id="indicaciones" value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)}
                            rows={2} maxLength={2000} className={campo} />
                    </div>

                    <p className="text-[11px] text-mute">
                        {cita.tiene_correo
                            ? 'Al guardar, se enviará la receta al correo del paciente con tu firma digital.'
                            : 'El paciente no tiene correo registrado: la atención se guardará sin envío.'}
                    </p>
                    {error && <p role="alert" className="text-xs text-danger font-semibold">{error}</p>}

                    <div className="flex gap-3 justify-end">
                        <Boton type="button" variante="secondary" onClick={onCerrar} disabled={enviando}>{t.cancelar}</Boton>
                        <Boton type="submit" disabled={enviando || !diagnostico.trim()}>
                            {enviando ? 'Guardando...' : 'Guardar y enviar receta'}
                        </Boton>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Stat = ({ label, valor, color }: { label: string; valor: number; color: string }) => (
    <Card className="px-5 py-3 text-center">
        <p className="text-[10px] font-bold text-mute tracking-wider">{label}</p>
        <p className={`text-2xl font-extrabold ${color}`}>{valor}</p>
    </Card>
);
