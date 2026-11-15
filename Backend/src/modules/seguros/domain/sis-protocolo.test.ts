// =================================================================
// Pruebas unitarias del protocolo del portal SIS (funciones puras).
// Ejecutar:  npm test
// =================================================================
/// <reference types="node" />
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    cifrarSIS,
    descifrarSIS,
    calcularDigitoVerificador,
    construirTramaConsulta,
    interpretarRespuestaSIS,
    cubiertoPorSIS,
    nombreCoincide,
    estadoSeguro,
} from './sis-protocolo';

// Respuesta sintética con el mismo formato que arma el portal:
//   cabeceras $ restricciones $ estructura-detalle $ filas
// (cabeceras y filas separadas por "|", columnas por "¬", fila final vacía).
// Filas de 4 columnas: [Fila, Tipo de Seguro, Estado, Fecha de Afiliación]
function respuesta(filas: string[][]): string {
    const cabeceras = ['N°¬40¬V', 'Tipo de Seguro¬200¬V', 'Estado¬100¬V', 'Fecha de Afiliación¬120¬V'].join('|');
    const cuerpo = filas.map(f => f.join('¬')).join('|') + (filas.length > 0 ? '|' : '');
    return [cabeceras, '1¬2¬X', 'DETALLE', cuerpo].join('$');
}

// Respuesta con las columnas REALES del portal (capturas en Contexto/):
//   Fila | Apellidos y Nombres | N° Doc. | N° Afiliación | Tipo de Asegurado | Estado
function respuestaReal(nombre: string, estado: string): string {
    const cabeceras = ['Fila¬40¬V', 'Apellidos y Nombres¬300¬V', 'N° Doc.¬80¬V', 'N° Afiliación¬120¬V', 'Tipo de Asegurado¬90¬V', 'Estado¬90¬V'].join('|');
    const fila = ['1', nombre, 'DNI 12345678', '2-12345678', 'TITULAR', estado].join('¬');
    return [cabeceras, '1¬2¬X', 'DETALLE', fila + '|'].join('$');
}

test('cifrado: coincide con el vector real del portal y es reversible', () => {
    // Vector tomado de Consulta.js del portal: _XyzDC("Dpotvmub0tjhvjfouf") === "Consulta/siguiente"
    assert.equal(descifrarSIS('Dpotvmub0tjhvjfouf'), 'Consulta/siguiente');
    assert.equal(cifrarSIS('Consulta/siguiente'), 'Dpotvmub0tjhvjfouf');
    const trama = '1¬1¬12345678¬1¬¬¬¬1990-05-17¬AB12C';
    assert.equal(descifrarSIS(cifrarSIS(trama)), trama);
});

test('dígito verificador del DNI (algoritmo del portal)', () => {
    assert.equal(calcularDigitoVerificador('12345678'), '1');
    assert.equal(calcularDigitoVerificador('1234567'), '');
    assert.equal(calcularDigitoVerificador('1234567A'), '');
});

test('trama: 9 campos en el orden del formulario y fecha en formato ISO (no DD/MM/YYYY)', () => {
    const trama = construirTramaConsulta({ dni: '12345678', fechaNacimiento: '1990-05-17', codigoCaptcha: ' ab12c ' });
    assert.equal(trama, '1¬1¬12345678¬1¬¬¬¬1990-05-17¬ab12c');
    assert.equal(trama.split('¬').length, 9);
});

test('códigos de error del portal', () => {
    assert.equal(interpretarRespuestaSIS('-1').tipo, 'CAPTCHA_INCORRECTO');
    assert.equal(interpretarRespuestaSIS('-2').tipo, 'CAPTCHA_EXPIRADO');
    assert.equal(interpretarRespuestaSIS('-3').tipo, 'ERROR_PORTAL');
    assert.equal(interpretarRespuestaSIS('-9').tipo, 'ERROR_PORTAL');
});

test('afiliación ACTIVO → asegurado', () => {
    const r = interpretarRespuestaSIS(respuesta([['1', 'SIS GRATUITO', 'ACTIVO', '01/01/2020']]));
    assert.equal(r.tipo, 'RESULTADO');
    assert.equal(r.asegurado, true);
    assert.equal(r.estado, 'ACTIVO');
});

test('REGRESIÓN: INACTIVO no debe leerse como ACTIVO', () => {
    const r = interpretarRespuestaSIS(respuesta([['1', 'SIS INDEPENDIENTE', 'INACTIVO', '01/01/2020']]));
    assert.equal(r.tipo, 'RESULTADO');
    assert.equal(r.asegurado, false);
    assert.equal(r.estado, 'INACTIVO');
});

test('ANULADO → no asegurado; ACTIVO POR LATENCIA → asegurado', () => {
    assert.equal(interpretarRespuestaSIS(respuesta([['1', 'SIS GRATUITO', 'ANULADO', '']])).asegurado, false);
    const latencia = interpretarRespuestaSIS(respuesta([['1', 'SIS MICROEMPRESAS', 'ACTIVO POR LATENCIA', '']]));
    assert.equal(latencia.asegurado, true);
    assert.equal(latencia.estado, 'ACTIVO POR LATENCIA');
});

test('varias afiliaciones: basta una vigente', () => {
    const r = interpretarRespuestaSIS(respuesta([
        ['1', 'SIS INDEPENDIENTE', 'ANULADO', ''],
        ['2', 'SIS GRATUITO', 'ACTIVO', ''],
    ]));
    assert.equal(r.asegurado, true);
    assert.equal(r.estado, 'ACTIVO');
});

test('sin registros → resultado válido, no asegurado', () => {
    const r = interpretarRespuestaSIS(respuesta([]));
    assert.equal(r.tipo, 'RESULTADO');
    assert.equal(r.asegurado, false);
    assert.equal(r.estado, null);
});

test('respuesta que no sigue el formato → NO_RECONOCIDO (nunca se adivina)', () => {
    assert.equal(interpretarRespuestaSIS('').tipo, 'NO_RECONOCIDO');
    assert.equal(interpretarRespuestaSIS('<html>Error 500 ACTIVO</html>').tipo, 'NO_RECONOCIDO');
    // Hay filas pero ninguna trae un estado conocido
    assert.equal(interpretarRespuestaSIS(respuesta([['1', 'SIS GRATUITO', '???', '']])).tipo, 'NO_RECONOCIDO');
});

test('formato real del portal: ACTIVO con nombre y tipo de asegurado', () => {
    const r = interpretarRespuestaSIS(respuestaReal('SUAREZ INFANTES JHAIR FABIAN', 'ACTIVO'));
    assert.equal(r.tipo, 'RESULTADO');
    assert.equal(r.asegurado, true);
    assert.equal(r.estado, 'ACTIVO');
    assert.equal(r.regimen, 'TITULAR');
    assert.equal(r.nombre, 'SUAREZ INFANTES JHAIR FABIAN');
});

test('formato real del portal: CANCELADO → sin SIS', () => {
    const r = interpretarRespuestaSIS(respuestaReal('SILVA ANGASPILCO PIERO MAURICIO', 'CANCELADO'));
    assert.equal(r.tipo, 'RESULTADO');
    assert.equal(r.asegurado, false);
    assert.equal(r.estado, 'CANCELADO');
    assert.equal(r.nombre, 'SILVA ANGASPILCO PIERO MAURICIO');
});

test('nombre: coincide aunque el registro tenga tildes, minúsculas o nombres parciales', () => {
    const portal = 'SUAREZ INFANTES JHAIR FABIAN';
    assert.equal(nombreCoincide({ nombres: 'Jhair Fabián', apellidos: 'Suárez Infantes' }, portal), true);
    assert.equal(nombreCoincide({ nombres: 'jhair', apellidos: 'suarez' }, portal), true);
    assert.equal(nombreCoincide({ nombres: 'María', apellidos: 'Peña de la Cruz' }, 'PEÑA DE LA CRUZ MARIA'), true);
});

test('nombre: NO coincide si es otra persona o faltan nombres/apellidos', () => {
    const portal = 'SUAREZ INFANTES JHAIR FABIAN';
    assert.equal(nombreCoincide({ nombres: 'Juan', apellidos: 'Perez' }, portal), false);
    assert.equal(nombreCoincide({ nombres: 'Jhair', apellidos: 'Perez' }, portal), false);
    assert.equal(nombreCoincide({ nombres: '', apellidos: 'Suarez' }, portal), false);
    assert.equal(nombreCoincide({ nombres: 'Jhair', apellidos: 'Suarez' }, ''), false);
});

test('vigencia: sin fila → SIN_VERIFICAR', () => {
    assert.equal(estadoSeguro(null, { ahora: new Date('2026-11-15T12:00:00'), vigenciaDias: 90, aceptarSimulado: false }).estado, 'SIN_VERIFICAR');
});

test('vigencia: con SIS vale 90 días y luego VENCIDO', () => {
    const fila = { asegurado: 1, verificado: 1, fuente: 'SIS_SCRAPER', consultado_en: new Date('2026-08-01T10:00:00') };
    const op = { vigenciaDias: 90, aceptarSimulado: false };
    const vigente = estadoSeguro(fila, { ...op, ahora: new Date('2026-10-29T09:00:00') });
    assert.equal(vigente.estado, 'CON_SIS');
    assert.equal(vigente.venceEn?.toISOString(), new Date('2026-10-30T10:00:00').toISOString());
    assert.equal(estadoSeguro(fila, { ...op, ahora: new Date('2026-10-30T10:00:01') }).estado, 'VENCIDO');
});

test('vigencia: sin SIS es permanente (hasta recalibrar)', () => {
    const fila = { asegurado: 0, verificado: 1, fuente: 'SIS_SCRAPER', consultado_en: new Date('2020-01-01T00:00:00') };
    const r = estadoSeguro(fila, { ahora: new Date('2026-11-15T12:00:00'), vigenciaDias: 90, aceptarSimulado: false });
    assert.equal(r.estado, 'SIN_SIS');
    assert.equal(r.venceEn, null);
});

test('vigencia: filas SIMULADO solo valen en modo demo', () => {
    const fila = { asegurado: 1, verificado: 1, fuente: 'SIMULADO', consultado_en: new Date('2026-11-14T00:00:00') };
    const ahora = new Date('2026-11-15T12:00:00');
    assert.equal(estadoSeguro(fila, { ahora, vigenciaDias: 90, aceptarSimulado: false }).estado, 'SIN_VERIFICAR');
    assert.equal(estadoSeguro(fila, { ahora, vigenciaDias: 90, aceptarSimulado: true }).estado, 'CON_SIS');
});

test('exoneración: solo con SIS activo Y verificado', () => {
    assert.equal(cubiertoPorSIS({ tiene_seguro: true, verificado: true }), true);
    assert.equal(cubiertoPorSIS({ tiene_seguro: true, verificado: false }), false);
    assert.equal(cubiertoPorSIS({ tiene_seguro: false, verificado: true }), false);
});
