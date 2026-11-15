// =================================================================
// Validador class-validator: fecha de nacimiento YYYY-MM-DD real,
// no futura y posterior a 1900. Se usa en el registro del paciente
// y del familiar (la verificación del SIS la necesita).
// =================================================================
import { registerDecorator, ValidationOptions } from 'class-validator';

export function esFechaNacimientoValida(valor: unknown): boolean {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const [a, m, d] = valor.split('-').map(Number);
    const fecha = new Date(a, m - 1, d);
    // Rechaza fechas imposibles como 2024-02-31 (Date las "corre" al mes siguiente)
    if (fecha.getFullYear() !== a || fecha.getMonth() !== m - 1 || fecha.getDate() !== d) return false;
    return a >= 1900 && fecha <= new Date();
}

export function IsFechaNacimiento(opciones?: ValidationOptions) {
    return (objeto: object, propiedad: string) => {
        registerDecorator({
            name: 'isFechaNacimiento',
            target: objeto.constructor,
            propertyName: propiedad,
            options: { message: 'La fecha de nacimiento no es válida', ...opciones },
            validator: { validate: esFechaNacimientoValida },
        });
    };
}
