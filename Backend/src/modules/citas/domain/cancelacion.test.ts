/// <reference types="node" />
import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluarCancelacion, MINUTOS_GRACIA_CANCELACION } from './cancelacion';

const cita = new Date('2026-11-20T10:00:00');
const reservadaHaceDias = new Date('2026-11-10T09:00:00');

test('no se puede cancelar una cita que ya empezó o pasó', () => {
    const r = evaluarCancelacion({ inicioCita: cita, reservadaEn: reservadaHaceDias, ahora: new Date('2026-11-20T10:00:00') });
    assert.equal(r.permitida, false);
    assert.equal(evaluarCancelacion({ inicioCita: cita, reservadaEn: reservadaHaceDias, ahora: new Date('2026-11-21T08:00:00') }).permitida, false);
});

test('con 24 h o más de anticipación: se cancela sin sanción', () => {
    const r = evaluarCancelacion({ inicioCita: cita, reservadaEn: reservadaHaceDias, ahora: new Date('2026-11-19T10:00:00') });
    assert.equal(r.permitida, true);
    assert.equal(r.sancionable, false);
});

test('con menos de 24 h de anticipación: se sanciona', () => {
    const r = evaluarCancelacion({ inicioCita: cita, reservadaEn: reservadaHaceDias, ahora: new Date('2026-11-19T10:00:01') });
    assert.equal(r.permitida, true);
    assert.equal(r.sancionable, true);
});

test('periodo de gracia: si se reservó hace poco, cancelar no sanciona aunque falten < 24 h', () => {
    const ahora = new Date('2026-11-20T06:00:00');
    const reciente = new Date(ahora.getTime() - (MINUTOS_GRACIA_CANCELACION - 1) * 60_000);
    assert.equal(evaluarCancelacion({ inicioCita: cita, reservadaEn: reciente, ahora }).sancionable, false);

    const fueraDeGracia = new Date(ahora.getTime() - (MINUTOS_GRACIA_CANCELACION + 1) * 60_000);
    assert.equal(evaluarCancelacion({ inicioCita: cita, reservadaEn: fueraDeGracia, ahora }).sancionable, true);
});
