/// <reference types="node" />
import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluarMarcaAsistencia, evaluarMarcaFalta } from './reglas-asistencia';

const ahora = new Date('2026-11-16T10:00:00');

test('asistió: se puede marcar el mismo día aunque la hora aún no llegue (llegó temprano)', () => {
    const r = evaluarMarcaAsistencia({ estado: 'RESERVADA', fecha: '2026-11-16', hora: '15:00:00' }, ahora);
    assert.deepEqual(r, { permitido: true, esCorreccion: false });
});

test('asistió: no se puede marcar una cita de un día futuro', () => {
    assert.equal(evaluarMarcaAsistencia({ estado: 'RESERVADA', fecha: '2026-11-17', hora: '08:00:00' }, ahora).permitido, false);
});

test('asistió sobre una FALTA = corrección, solo el mismo día o el siguiente', () => {
    assert.deepEqual(
        evaluarMarcaAsistencia({ estado: 'FALTA', fecha: '2026-11-15', hora: '09:00:00' }, ahora),
        { permitido: true, esCorreccion: true },
    );
    assert.equal(evaluarMarcaAsistencia({ estado: 'FALTA', fecha: '2026-11-14', hora: '09:00:00' }, ahora).permitido, false);
});

test('asistió: no aplica a citas completadas o canceladas', () => {
    assert.equal(evaluarMarcaAsistencia({ estado: 'COMPLETADA', fecha: '2026-11-16', hora: '09:00:00' }, ahora).permitido, false);
    assert.equal(evaluarMarcaAsistencia({ estado: 'CANCELADA', fecha: '2026-11-16', hora: '09:00:00' }, ahora).permitido, false);
});

test('falta: solo cuando la hora de la cita ya llegó', () => {
    assert.equal(evaluarMarcaFalta({ estado: 'RESERVADA', fecha: '2026-11-16', hora: '10:30:00' }, ahora).permitido, false);
    assert.equal(evaluarMarcaFalta({ estado: 'RESERVADA', fecha: '2026-11-16', hora: '10:00:00' }, ahora).permitido, true);
    assert.equal(evaluarMarcaFalta({ estado: 'RESERVADA', fecha: '2026-11-15', hora: '17:30:00' }, ahora).permitido, true);
});

test('falta: no aplica a citas ya cerradas', () => {
    for (const estado of ['FALTA', 'COMPLETADA', 'CANCELADA']) {
        assert.equal(evaluarMarcaFalta({ estado, fecha: '2026-11-15', hora: '09:00:00' }, ahora).permitido, false);
    }
});
