// =================================================================
// ODS 10 – Inclusión: menú de accesibilidad
// - Tamaño de texto ajustable
// - Modo de alto contraste
// - Enlace "Saltar al contenido" para teclado/lector de pantalla
// Las preferencias se guardan en localStorage.
// =================================================================
import { useEffect, useState } from 'react';

const KEY_TAM = 'a11y_tam_texto';
const KEY_CONTRASTE = 'a11y_alto_contraste';
const TAMANOS = [100, 112, 125, 150];

export const AccesibilidadMenu = () => {
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
            <a href="#contenido-principal" className="skip-link">Saltar al contenido</a>

            <div className="fixed bottom-4 right-4 z-50">
                {abierto && (
                    <div
                        role="dialog"
                        aria-label="Opciones de accesibilidad"
                        className="mb-2 w-64 rounded-xl bg-white p-4 shadow-xl border border-gray-200"
                    >
                        <p className="text-sm font-extrabold text-ink mb-3">Accesibilidad</p>

                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-ink-soft">Tamaño de texto ({tam}%)</span>
                            <div className="flex gap-1">
                                <button type="button" aria-label="Reducir texto" onClick={() => cambiarTam(-1)}
                                    disabled={tam === TAMANOS[0]}
                                    className="w-8 h-8 rounded border border-gray-300 font-bold disabled:opacity-40">A-</button>
                                <button type="button" aria-label="Aumentar texto" onClick={() => cambiarTam(1)}
                                    disabled={tam === TAMANOS[TAMANOS.length - 1]}
                                    className="w-8 h-8 rounded border border-gray-300 font-bold disabled:opacity-40">A+</button>
                            </div>
                        </div>

                        <label className="flex items-center justify-between text-sm text-ink-soft cursor-pointer">
                            Alto contraste
                            <input type="checkbox" checked={contraste} onChange={(e) => setContraste(e.target.checked)}
                                className="w-5 h-5" />
                        </label>

                        <button type="button" onClick={() => { setTam(100); setContraste(false); }}
                            className="mt-3 text-xs text-sky-main underline">Restablecer</button>
                    </div>
                )}

                <button
                    type="button"
                    aria-label="Abrir opciones de accesibilidad"
                    aria-expanded={abierto}
                    onClick={() => setAbierto(v => !v)}
                    className="w-12 h-12 rounded-full bg-sky-main text-white text-xl shadow-lg"
                >
                    ♿
                </button>
            </div>
        </>
    );
};
