// =================================================================
// ODS 10 – Inclusión: menú de accesibilidad e idiomas
// - Tamaño de texto ajustable
// - Modo de alto contraste
// - Soporte multi-idioma: Español, Inglés, Quechua y Aimara
// - Enlace "Saltar al contenido" para teclado/lector de pantalla
// Las preferencias se guardan en localStorage.
// =================================================================
import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n';

const KEY_TAM = 'a11y_tam_texto';
const KEY_CONTRASTE = 'a11y_alto_contraste';
const TAMANOS = [100, 112, 125, 150];

export const AccesibilidadMenu = () => {
    const { idioma, setIdioma, t, idiomas } = useTranslation();
    const [abierto, setAbierto] = useState(false);
    const [tam, setTam] = useState<number>(() => Number(localStorage.getItem(KEY_TAM)) || 100);
    const [contraste, setContraste] = useState<boolean>(() => localStorage.getItem(KEY_CONTRASTE) === '1');

    useEffect(() => {
        document.documentElement.style.fontSize = `${tam}%`;
        localStorage.setItem(KEY_TAM, String(tam));
    }, [tam]);

    useEffect(() => {
        document.documentElement.classList.toggle('alto-contraste', contraste);
        localStorage.setItem(KEY_CONTRASTE, contraste ? '1' : '0');
    }, [contraste]);

    const cambiarTam = (dir: 1 | -1) => {
        const i = TAMANOS.indexOf(tam);
        const j = Math.min(TAMANOS.length - 1, Math.max(0, (i < 0 ? 0 : i) + dir));
        setTam(TAMANOS[j]);
    };

    return (
        <>
            <a href="#contenido-principal" className="skip-link">{t.saltarContenido}</a>

            <div className="fixed top-1/2 -translate-y-1/2 right-4 z-50 flex items-center gap-3">
                {abierto && (
                    <div
                        role="dialog"
                        aria-label={t.accesibilidad}
                        className="w-80 rounded-2xl bg-white p-5 shadow-2xl border border-gray-200"
                    >
                        <p className="text-base font-extrabold text-ink mb-3">{t.accesibilidad}</p>

                        {/* Selector de idioma (Español, Inglés, Quechua, Aimara) */}
                        <div className="mb-4 pb-3 border-b border-gray-100">
                            <span className="block text-xs font-bold text-mute uppercase tracking-wider mb-2">
                                {t.idioma} / Language
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                {idiomas.map((item) => (
                                    <button
                                        key={item.codigo}
                                        type="button"
                                        onClick={() => setIdioma(item.codigo)}
                                        className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                            idioma === item.codigo
                                                ? 'bg-sky-soft text-sky-deep border-sky-main shadow-sm'
                                                : 'bg-white text-ink-soft border-gray-200 hover:bg-smoke hover:border-gray-300'
                                        }`}
                                        aria-pressed={idioma === item.codigo}
                                    >
                                        <span className="text-base">{item.icono}</span>
                                        <span className="truncate">{item.nombreNativo}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tamaño de texto */}
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-ink-soft">{t.tamanoTexto} ({tam}%)</span>
                            <div className="flex gap-1">
                                <button type="button" aria-label="Reducir texto" onClick={() => cambiarTam(-1)}
                                    disabled={tam === TAMANOS[0]}
                                    className="w-9 h-9 rounded-lg border border-gray-300 font-bold hover:bg-gray-50 disabled:opacity-40 transition-colors">A-</button>
                                <button type="button" aria-label="Aumentar texto" onClick={() => cambiarTam(1)}
                                    disabled={tam === TAMANOS[TAMANOS.length - 1]}
                                    className="w-9 h-9 rounded-lg border border-gray-300 font-bold hover:bg-gray-50 disabled:opacity-40 transition-colors">A+</button>
                            </div>
                        </div>

                        {/* Alto contraste */}
                        <label className="flex items-center justify-between text-sm font-medium text-ink-soft cursor-pointer py-1">
                            {t.altoContraste}
                            <input type="checkbox" checked={contraste} onChange={(e) => setContraste(e.target.checked)}
                                className="w-5 h-5 accent-sky-main rounded cursor-pointer" />
                        </label>

                        {/* Restablecer */}
                        <button type="button" onClick={() => { setTam(100); setContraste(false); setIdioma('es'); }}
                            className="mt-3 text-xs font-semibold text-sky-main hover:underline">{t.restablecer}</button>
                    </div>
                )}

                <button
                    type="button"
                    aria-label={t.accesibilidad}
                    aria-expanded={abierto}
                    onClick={() => setAbierto(v => !v)}
                    className="w-16 h-16 rounded-full bg-sky-main hover:bg-sky-main/90 text-white text-3xl shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-sky-main/40 cursor-pointer"
                >
                    ♿
                </button>
            </div>
        </>
    );
};
