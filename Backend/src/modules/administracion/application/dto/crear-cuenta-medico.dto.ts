// =================================================================
// DTO de entrada para POST /admin/medico-cuenta
// Crea la cuenta de acceso (rol MEDICO) de un médico ya registrado.
// =================================================================
import {
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsPositive,
    IsString,
    Length,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CrearCuentaMedicoDTO {
    @IsNotEmpty({ message: 'El médico es obligatorio' })
    @IsInt()
    @IsPositive()
    id_medico!: number;

    @IsNotEmpty({ message: 'El correo es obligatorio' })
    @IsEmail({}, { message: 'El correo debe tener un formato válido' })
    correo!: string;

    @IsNotEmpty({ message: 'La contraseña es obligatoria' })
    @IsString()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    @MaxLength(100)
    contrasena!: string;

    @IsNotEmpty({ message: 'El DNI es obligatorio' })
    @Length(8, 8, { message: 'El DNI debe tener exactamente 8 dígitos' })
    @Matches(/^\d+$/, { message: 'El DNI debe contener solo números' })
    dni!: string;

    @IsNotEmpty({ message: 'El teléfono es obligatorio' })
    @IsString()
    @MaxLength(20)
    telefono!: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    cmp?: string;
}
