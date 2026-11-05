// =================================================================
// Vista ADMIN — Gestión de especialidades y médicos (con Fase 3).
// =================================================================
import { useEffect, useState, FormEvent } from 'react';

import { HeaderAdmin } from '../../components/layout/HeaderAdmin';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { ModalProgramar } from '../../components/admin/ModalProgramar';

import { useTranslation } from '../../i18n';
import { adminApi } from '../../api/adminApi';
import { Especialidad, Medico } from '../../types';

type ObjetoProgramar =
    | { tipo: 'especialidad'; id: number; nombre: string; fechaInhab: string | null; fechaHab: string | null }
    | { tipo: 'medico'; id: number; nombre: string; fechaInhab: string | null; fechaHab: string | null }
    | null;

export const Especialidades = () => {
    const { t } = useTranslation();
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [medicos, setMedicos]               = useState<Medico[]>([]);
    const [cargando, setCargando]             = useState(true);

    const [nombreEsp, setNombreEsp] = useState('');
    const [descEsp, setDescEsp]     = useState('');
    const [msgEsp, setMsgEsp]       = useState<string | null>(null);
    const [requiereMenor, setRequiereMenor] = useState(false);

    const [nombresMed, setNombresMed]     = useState('');
    const [apellidosMed, setApellidosMed] = useState('');
    const [espMed, setEspMed]             = useState<number>(0);
    const [msgMed, setMsgMed]             = useState<string | null>(null);

    // Cuenta de acceso del médico (opcional al crearlo)
    const [conCuenta, setConCuenta] = useState(false);
    const [medCorreo, setMedCorreo] = useState('');
    const [medPass, setMedPass]     = useState('');
    const [medDni, setMedDni]       = useState('');
    const [medTel, setMedTel]       = useState('');
    const [medCmp, setMedCmp]       = useState('');

    // Crear acceso para un médico ya registrado
    const [cuentaPara, setCuentaPara] = useState<Medico | null>(null);
    const [cCorreo, setCCorreo] = useState('');
    const [cPass, setCPass]     = useState('');
    const [cDni, setCDni]       = useState('');
    const [cTel, setCTel]       = useState('');
    const [cCmp, setCCmp]       = useState('');
    const [msgCuenta, setMsgCuenta] = useState<string | null>(null);

    // Modal de programación
    const [programar, setProgramar] = useState<ObjetoProgramar>(null);

    // Estado del botón de revisión manual
    const [revisando, setRevisando] = useState(false);

    const cargar = async () => {
        setCargando(true);
        try {
            const [esp, meds] = await Promise.all([
                adminApi.listarEspecialidades(),
                adminApi.listarMedicos(),
            ]);
            setEspecialidades(esp);
            setMedicos(meds);
        } catch (e) {
            console.error(e);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const crearEspecialidad = async (e: FormEvent) => {
        e.preventDefault();
        setMsgEsp(null);
        try {
            const res = await adminApi.crearEspecialidad({ nombre: nombreEsp.trim(), descripcion: descEsp.trim(), requiere_datos_menor: requiereMenor });
            if (res.ok) { setNombreEsp(''); setDescEsp(''); setRequiereMenor(false); setMsgEsp('✓ Especialidad creada'); await cargar(); }
            else setMsgEsp(res.mensaje);
        } catch { setMsgEsp('Error al crear la especialidad'); }
    };

    const crearMedico = async (e: FormEvent) => {
        e.preventDefault();
        setMsgMed(null);
        if (!espMed) { setMsgMed('Selecciona una especialidad'); return; }
        try {
            const res = await adminApi.crearMedico({
                nombres: nombresMed.trim(), apellidos: apellidosMed.trim(), id_especialidad: espMed,
                ...(conCuenta ? { correo: medCorreo.trim(), contrasena: medPass, dni: medDni.trim(), telefono: medTel.trim(), cmp: medCmp.trim() || undefined } : {}),
            });
            if (res.ok) { setConCuenta(false); setMedCorreo(''); setMedPass(''); setMedDni(''); setMedTel(''); setMedCmp(''); }
            if (res.ok) { setNombresMed(''); setApellidosMed(''); setEspMed(0); setMsgMed('✓ Médico registrado'); await cargar(); }
            else setMsgMed(res.mensaje);
        } catch { setMsgMed('Error al registrar el médico'); }
    };

    const crearAcceso = async (e: FormEvent) => {
        e.preventDefault();
        if (!cuentaPara) return;
        setMsgCuenta(null);
        try {
            const res = await adminApi.crearCuentaMedico({
                id_medico: cuentaPara.id_medico, correo: cCorreo.trim(), contrasena: cPass,
                dni: cDni.trim(), telefono: cTel.trim(), cmp: cCmp.trim() || undefined,
            });
            if (res.ok) {
                setCuentaPara(null); setCCorreo(''); setCPass(''); setCDni(''); setCTel(''); setCCmp('');
                await cargar();
            } else {
                setMsgCuenta(res.mensaje);
            }
        } catch (err: any) {
            setMsgCuenta(err?.response?.data?.detalle?.[0]?.errores?.[0] ?? err?.response?.data?.mensaje ?? 'Error al crear el acceso');
        }
    };

    const confirmarProgramacion = async (accion: 'INHABILITAR' | 'HABILITAR', fecha: string) => {
        if (!programar) return;
        if (programar.tipo === 'especialidad') {
            await adminApi.programarEspecialidad({ id: programar.id, accion, fecha });
        } else {
            await adminApi.programarMedico({ id: programar.id, accion, fecha });
        }
        setProgramar(null);
        await cargar();
    };

    const cancelarProgramacion = async (cual: 'INHABILITAR' | 'HABILITAR') => {
        if (!programar) return;
        if (programar.tipo === 'especialidad') {
            await adminApi.cancelarProgramacionEspecialidad(programar.id, cual);
        } else {
            await adminApi.cancelarProgramacionMedico(programar.id, cual);
        }
        setProgramar(null);
        await cargar();
    };

    const ejecutarRevision = async () => {
        setRevisando(true);
        try {
            const res = await adminApi.ejecutarRevision();
            alert(`Revisión ejecutada:\n- Citas canceladas: ${res.citasCanceladas}\n- Avisos enviados: ${res.avisosEnviados}`);
            await cargar();
        } catch {
            alert('No se pudo ejecutar la revisión');
        } finally {
            setRevisando(false);
        }
    };

    const activas = especialidades.filter(e => e.estado === 'ACTIVA');

    return (
        <div className="min-h-screen bg-smoke">
            <HeaderAdmin />
            <div className="flex">
                <Sidebar />
                <main id="contenido-principal" className="flex-1 p-8 max-w-5xl">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-extrabold text-ink mb-1">{t.especialidadesTitulo}</h1>
                            <p className="text-sm text-mute">{t.especialidadesSubDetalle}</p>
                        </div>
                        <Boton variante="secondary" onClick={ejecutarRevision} disabled={revisando}>
                            {revisando ? t.ejecutandoRevision : t.ejecutarRevisionAhora}
                        </Boton>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Crear especialidad */}
                        <Card className="p-6">
                            <h2 className="text-lg font-bold text-blue-deep mb-4">{t.nuevaEspecialidad}</h2>
                            <form onSubmit={crearEspecialidad} className="space-y-3">
                                <Input label={t.nombre} value={nombreEsp} onChange={(e) => setNombreEsp(e.target.value)} placeholder="Cardiología" required />
                                <Input label={t.descripcion} value={descEsp} onChange={(e) => setDescEsp(e.target.value)} placeholder="Atención del corazón" required />
                                <label className="flex items-center gap-2 cursor-pointer py-1">
                                    <input
                                        type="checkbox"
                                        checked={requiereMenor}
                                        onChange={(e) => setRequiereMenor(e.target.checked)}
                                        className="w-4 h-4 accent-sky-main"
                                    />
                                    <span className="text-xs text-ink-soft font-semibold">
                                        Requiere datos del menor (ej. Pediatría)
                                    </span>
                                </label>
                                {msgEsp && <p className={`text-xs font-semibold ${msgEsp.startsWith('✓') ? 'text-success' : 'text-danger'}`}>{msgEsp}</p>}
                                <Boton type="submit" fullWidth>{t.crearEspecialidad}</Boton>
                            </form>
                        </Card>

                        {/* Crear médico */}
                        <Card className="p-6">
                            <h2 className="text-lg font-bold text-blue-deep mb-4">{t.nuevoMedico}</h2>
                            <form onSubmit={crearMedico} className="space-y-3">
                                <Input label={t.nombres} value={nombresMed} onChange={(e) => setNombresMed(e.target.value)} placeholder="Andrea" required />
                                <Input label={t.apellidos} value={apellidosMed} onChange={(e) => setApellidosMed(e.target.value)} placeholder="Torres" required />
                                <div>
                                    <label className="block text-xs font-semibold text-ink-soft mb-2">{t.especialidad}</label>
                                    <select value={espMed} onChange={(e) => setEspMed(Number(e.target.value))}
                                        className="w-full px-4 py-3 text-sm bg-white rounded-lg border border-gray-200 focus:border-sky-main outline-none">
                                        <option value={0}>{t.seleccionaPuntos}</option>
                                        {activas.map(e => <option key={e.id_especialidad} value={e.id_especialidad}>{e.nombre}</option>)}
                                    </select>
                                </div>
                                <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft cursor-pointer">
                                    <input type="checkbox" checked={conCuenta} onChange={(e) => setConCuenta(e.target.checked)} />
                                    {t.crearCuentaAccesoMedico}
                                </label>
                                {conCuenta && (
                                    <div className="space-y-3 border-l-2 border-sky-main pl-3">
                                        <Input label={t.correoElectronico} type="email" value={medCorreo} onChange={(e) => setMedCorreo(e.target.value)} placeholder="medico@centro.pe" required />
                                        <Input label="Contraseña" type="password" value={medPass} onChange={(e) => setMedPass(e.target.value)} placeholder="Mínimo 6 caracteres" required />
                                        <Input label="DNI" value={medDni} onChange={(e) => setMedDni(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="8 dígitos" required />
                                        <Input label="Teléfono" value={medTel} onChange={(e) => setMedTel(e.target.value)} placeholder="987654321" required />
                                        <Input label="CMP (Colegio Médico del Perú)" value={medCmp} onChange={(e) => setMedCmp(e.target.value)} placeholder="Aparece en la firma de la receta" />
                                    </div>
                                )}
                                {msgMed && <p className={`text-xs font-semibold ${msgMed.startsWith('✓') ? 'text-success' : 'text-danger'}`}>{msgMed}</p>}
                                <Boton type="submit" fullWidth>{t.registrarMedico}</Boton>
                            </form>
                        </Card>
                    </div>

                    {/* Lista especialidades */}
                    <h2 className="text-lg font-bold text-ink mt-8 mb-3">{t.especialidadesRegistradas}</h2>
                    {cargando ? <Card className="p-6 text-center text-mute text-sm">Cargando...</Card> : (
                        <div className="space-y-2 mb-8">
                            {especialidades.map(e => (
                                <Card key={e.id_especialidad} className="p-4 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-ink text-sm">{e.nombre}</h3>
                                            <Badge variante={e.estado === 'ACTIVA' ? 'success' : 'gray'}>{e.estado}</Badge>
                                            {e.fecha_inhabilitacion && <span className="text-[10px] text-danger font-semibold">⏸ inhab. {e.fecha_inhabilitacion}</span>}
                                            {e.fecha_habilitacion && <span className="text-[10px] text-success font-semibold">▶ hab. {e.fecha_habilitacion}</span>}
                                        </div>
                                        <p className="text-xs text-mute mt-0.5">{e.descripcion}</p>
                                    </div>
                                    <Boton tamano="sm" variante="secondary" onClick={() => setProgramar({ tipo: 'especialidad', id: e.id_especialidad, nombre: e.nombre, fechaInhab: e.fecha_inhabilitacion ?? null, fechaHab: e.fecha_habilitacion ?? null })}>
                                        Programar
                                    </Boton>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Lista médicos */}
                    <h2 className="text-lg font-bold text-ink mb-3">{t.medicosRegistrados}</h2>
                    <div className="space-y-2">
                        {medicos.map(m => (
                            <Card key={m.id_medico} className="p-4 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-ink text-sm">Dr. {m.nombres} {m.apellidos}</h3>
                                        {m.estado === 'INACTIVO' && <Badge variante="gray">INACTIVO</Badge>}
                                        {m.fecha_inhabilitacion && <span className="text-[10px] text-danger font-semibold">⏸ inhab. {m.fecha_inhabilitacion}</span>}
                                        {m.fecha_habilitacion && <span className="text-[10px] text-success font-semibold">▶ hab. {m.fecha_habilitacion}</span>}
                                    </div>
                                    <p className="text-xs text-mute">{m.especialidad}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {m.tiene_cuenta
                                        ? <Badge variante="success">Con acceso{m.cmp ? ` · CMP ${m.cmp}` : ''}</Badge>
                                        : <Boton tamano="sm" variante="secondary" onClick={() => { setCuentaPara(m); setMsgCuenta(null); }}>{t.crearAcceso}</Boton>}
                                <Boton tamano="sm" variante="secondary" onClick={() => setProgramar({ tipo: 'medico', id: m.id_medico, nombre: `Dr. ${m.nombres} ${m.apellidos}`, fechaInhab: m.fecha_inhabilitacion ?? null, fechaHab: m.fecha_habilitacion ?? null })}>
                                    Programar
                                </Boton>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {cuentaPara && (
                        <Card className="p-6 mt-4 border-2 border-sky-main">
                            <h2 className="text-lg font-bold text-blue-deep mb-1">Crear acceso — Dr. {cuentaPara.nombres} {cuentaPara.apellidos}</h2>
                            <p className="text-xs text-mute mb-4">El médico podrá iniciar sesión y ver sus pacientes del día.</p>
                            <form onSubmit={crearAcceso} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input label="Correo" type="email" value={cCorreo} onChange={(e) => setCCorreo(e.target.value)} required />
                                <Input label="Contraseña" type="password" value={cPass} onChange={(e) => setCPass(e.target.value)} placeholder="Mínimo 6 caracteres" required />
                                <Input label="DNI" value={cDni} onChange={(e) => setCDni(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="8 dígitos" required />
                                <Input label="Teléfono" value={cTel} onChange={(e) => setCTel(e.target.value)} required />
                                <Input label="CMP (opcional)" value={cCmp} onChange={(e) => setCCmp(e.target.value)} />
                                <div className="md:col-span-2">
                                    {msgCuenta && <p role="alert" className="text-xs font-semibold text-danger mb-2">{msgCuenta}</p>}
                                    <div className="flex gap-2">
                                        <Boton type="button" variante="secondary" onClick={() => setCuentaPara(null)}>{t.cancelar}</Boton>
                                        <Boton type="submit">{t.crearAcceso}</Boton>
                                    </div>
                                </div>
                            </form>
                        </Card>
                    )}
                </main>
            </div>

            {/* Modal de programación */}
            <ModalProgramar
                abierto={!!programar}
                titulo={programar?.nombre ?? ''}
                fechaInhabActual={programar?.fechaInhab ?? null}
                fechaHabActual={programar?.fechaHab ?? null}
                onCerrar={() => setProgramar(null)}
                onConfirmar={confirmarProgramacion}
                onCancelarProgramacion={cancelarProgramacion}
            />
        </div>
    );
};