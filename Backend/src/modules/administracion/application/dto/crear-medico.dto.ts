// =================================================================
// CAPA: Application / DTOs
// DTO de entrada para POST /admin/medico.
// =================================================================
import {
    IsNotEmpty,
    IsString,
    IsInt,
    IsPositive,
    IsEmail,
    IsOptional,
    Length,
    Matches,
    MinLength,
    MaxLength,
    ValidateIf,
} from 'class-validator';

export class CrearMedicoDTO {
    @IsNotEmpty({ message: 'El nombre del médico es obligatorio' })
    @IsString()
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(100)
    nombres!: string;

    @IsNotEmpty({ message: 'El apellido del médico es obligatorio' })
    @IsString()
    @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
    @MaxLength(100)
    apellidos!: string;

    @IsNotEmpty({ message: 'La especialidad es obligatoria' })
    @IsInt({ message: 'El id_especialidad debe ser un entero' })
    @IsPositive({ message: 'El id_especialidad debe ser positivo' })
    id_especialidad!: number;

    // ----- Cuenta de acceso (opcional): si se envía el correo, se crea el usuario MEDICO -----
    @IsOptional()
    @IsEmail({}, { message: 'El correo debe tener un formato válido' })
    correo?: string;

    @ValidateIf((o) => !!o.correo)
    @IsString()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    @MaxLength(100)
    contrasena?: string;

    @ValidateIf((o) => !!o.correo)
    @Length(8, 8, { message: 'El DNI debe tener exactamente 8 dígitos' })
    @Matches(/^\d+$/, { message: 'El DNI debe contener solo números' })
    dni?: string;

    @ValidateIf((o) => !!o.correo)
    @IsString()
    @MaxLength(20)
    telefono?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    cmp?: string;
}