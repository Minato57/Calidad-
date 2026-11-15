/// <reference types="node" />
import test from 'node:test';
import assert from 'node:assert/strict';

import { LimitadorIntentos } from './limitador-intentos';

test('bloquea al llegar al máximo de fallos dentro de la ventana', () => {
    let ahora = 0;
    const lim = new LimitadorIntentos(5, 10 * 60_000, () => ahora);
    for (let i = 0; i < 4; i++) lim.registrarFallo(7);
    assert.equal(lim.minutosBloqueo(7), 0);
    lim.registrarFallo(7);
    assert.equal(lim.minutosBloqueo(7), 10);
    // otro usuario no se ve afectado
    assert.equal(lim.minutosBloqueo(8), 0);
});

test('se libera cuando el fallo más antiguo sale de la ventana', () => {
    let ahora = 0;
    const lim = new LimitadorIntentos(5, 10 * 60_000, () => ahora);
    for (let i = 0; i < 5; i++) { lim.registrarFallo(1); ahora += 60_000; }
    // fallos en t=0..4 min; ahora t=5 min → libre en t=10 min (5 min restantes)
    assert.equal(lim.minutosBloqueo(1), 5);
    ahora = 10 * 60_000 + 1;
    assert.equal(lim.minutosBloqueo(1), 0);
});

test('un acierto limpia los fallos', () => {
    const lim = new LimitadorIntentos(2, 60_000, () => 0);
    lim.registrarFallo(3);
    lim.registrarFallo(3);
    assert.ok(lim.minutosBloqueo(3) > 0);
    lim.limpiar(3);
    assert.equal(lim.minutosBloqueo(3), 0);
});
