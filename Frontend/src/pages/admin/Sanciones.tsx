// =================================================================
// Vista ADMIN — Configuración de sanciones (sliders).
// =================================================================
import { useEffect, useState } from 'react';

import { HeaderAdmin } from '../../components/layout/HeaderAdmin';
import { Sidebar } from '../../components/layout/Sidebar';
import { Card } from '../../components/common/Card';
import { Boton } from '../../components/common/Boton';

import { useTranslation } from '../../i18n';
import { adminApi } from '../../api/adminApi';

export const Sanciones = () => {
    const { t } = useTranslation();
    const [limite, setLimite]     = useState(3);
    const [dias, setDias]         = useState(15);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [msg, setMsg]           = useState<string | null>(null);

    useEffect(() => {
        void (async () => {
            try {
                const s = await adminApi.obtenerSanciones();
                setLimite(s.limite_inasistencias ?? 3);
                setDias(s.dias_suspension ?? 15);
            } catch (e) {
                console.error(e);
            } finally {
                setCargando(false);
            }
        })();
    }, []);

    const guardar = async () => {
        setGuardando(true);
        setMsg(null);
        try {
            const res = await adminApi.configurarSanciones({ limite_inasistencias: limite, dias_suspension: dias });
            setMsg(res.ok ? '✓ Cambios guardados correctamente' : res.mensaje);
        } catch {
            setMsg('Error al guardar');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="min-h-screen bg-smoke">
            <HeaderAdmin />
            <div className="flex">
                <Sidebar />
                <main id="contenido-principal" className="flex-1 p-8 max-w-3xl">
                    <h1 className="text-3xl font-extrabold text-ink mb-1">{t.configurarSanciones}</h1>
                    <p className="text-sm text-mute mb-6">{t.configurarSancionesSub}</p>

                    {cargando ? <Card className="p-8 text-center text-mute text-sm">Cargando...</Card> : (
                        <div className="space-y-6">
                            {/* Slider límite */}
                            <Card bordeLateral="sky" className="p-6">
                                <h2 className="text-base font-bold text-blue-deep mb-1">{t.limiteInasistencias}</h2>
                                <p className="text-xs text-mute mb-5">{t.limiteInasistenciasSub}</p>
                                <input type="range" min={3} max={10} value={limite}
                                    onChange={(e) => setLimite(Number(e.target.value))}
                                    className="w-full accent-sky-main" />
                                <div className="flex justify-between text-xs text-mute mt-1">
                                    <span>3</span>
                                    <span className="text-2xl font-extrabold text-sky-deep">{limite}</span>
                                    <span>10</span>
                                </div>
                            </Card>

                            {/* Slider días */}
                            <Card bordeLateral="sky" className="p-6">
                                <h2 className="text-base font-bold text-blue-deep mb-1">{t.diasSuspension}</h2>
                                <p className="text-xs text-mute mb-5">{t.diasSuspensionSub}</p>
                                <input type="range" min={1} max={30} value={dias}
                                    onChange={(e) => setDias(Number(e.target.value))}
                                    className="w-full accent-sky-main" />
                                <div className="flex justify-between text-xs text-mute mt-1">
                                    <span>1</span>
                                    <span className="text-2xl font-extrabold text-sky-deep">{dias} {t.dias}</span>
                                    <span>30</span>
                                </div>
                            </Card>

                            {msg && <p className={`text-sm font-semibold ${msg.startsWith('✓') ? 'text-success' : 'text-danger'}`}>{msg}</p>}

                            <div className="flex justify-end">
                                <Boton onClick={guardar} disabled={guardando}>
                                    {guardando ? 'Guardando...' : `💾 ${t.guardarCambios}`}
                                </Boton>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};