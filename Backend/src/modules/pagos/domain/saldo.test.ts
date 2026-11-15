/// <reference types="node" />
import test from 'node:test';
import assert from 'node:assert/strict';

import { motivoNoUsable } from './saldo';

const base = { estado: 'APROBADO', dni_paciente: '12345678', id_cita: null, estado_cita: null, monto: 20 };

test('pago aprobado sin cita, del mismo paciente y que cubre la tarifa → usable', () => {
    assert.equal(motivoNoUsable(base, '12345678', 20), null);
});

test('pago cuya cita fue CANCELADA → vuelve a ser saldo a favor', () => {
    assert.equal(motivoNoUsable({ ...base, id_cita: 9, estado_cita: 'CANCELADA' }, '12345678', 20), null);
});

test('pago aplicado a una cita activa, completada o con falta → no usable', () => {
    for (const estado_cita of ['RESERVADA', 'COMPLETADA', 'FALTA']) {
        assert.notEqual(motivoNoUsable({ ...base, id_cita: 9, estado_cita }, '12345678', 20), null);
    }
});

test('pago de OTRO paciente (otro DNI) → no usable', () => {
    assert.match(motivoNoUsable(base, '87654321', 20)!, /otro paciente/);
});

test('pago no aprobado → no usable', () => {
    for (const estado of ['PENDIENTE', 'RECHAZADO', 'EXONERADO']) {
        assert.notEqual(motivoNoUsable({ ...base, estado }, '12345678', 20), null);
    }
});

test('si la tarifa subió y el saldo no la cubre → no usable', () => {
    assert.match(motivoNoUsable({ ...base, monto: 15 }, '12345678', 20)!, /no cubre/);
});
