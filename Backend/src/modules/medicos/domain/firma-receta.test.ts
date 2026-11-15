/// <reference types="node" />
import test from 'node:test';
import assert from 'node:assert/strict';

import { firmarAtencion, instanteDeEmision } from './firma-receta';

const datos = {
    id_cita: 10, id_medico: 2, diagnostico: 'Faringitis', receta: 'Paracetamol 500 mg', indicaciones: null,
    emitido: new Date('2026-11-15T15:30:12.000Z'),
};

test('la firma es reproducible: con los mismos datos guardados se obtiene el mismo código', () => {
    const a = firmarAtencion('secreto', datos);
    const b = firmarAtencion('secreto', { ...datos, emitido: new Date(datos.emitido.getTime()) });
    assert.equal(a, b);
    assert.match(a, /^[A-F0-9]{16}$/);
});

test('si cambia el diagnóstico, la receta o la fecha, el código ya no coincide', () => {
    const original = firmarAtencion('secreto', datos);
    assert.notEqual(firmarAtencion('secreto', { ...datos, diagnostico: 'Otra cosa' }), original);
    assert.notEqual(firmarAtencion('secreto', { ...datos, receta: 'Otra receta' }), original);
    assert.notEqual(firmarAtencion('secreto', { ...datos, emitido: new Date('2026-11-15T15:30:13.000Z') }), original);
});

test('el instante de emisión se trunca a segundos (DATETIME de MySQL no guarda milisegundos)', () => {
    const t = instanteDeEmision(new Date('2026-11-15T15:30:12.987Z'));
    assert.equal(t.toISOString(), '2026-11-15T15:30:12.000Z');
});
