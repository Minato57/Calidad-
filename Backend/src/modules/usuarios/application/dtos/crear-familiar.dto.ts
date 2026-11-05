import {
    IsNotEmpty,
    IsString,
    Length,
    Matches,
    MaxLength,
    IsIn,
    IsOptional,
} from 'class-validator';

export class CrearFamiliarDTO {
    @IsNotEmpty({ message: 'Los nombres del familiar son obligatorios' })
    @IsString()
    @MaxLength(100)
    nombres!: string;

    @IsNotEmpty({ message: 'Los apellidos del familiar son obligatorios' })
    @IsString()
    @MaxLength(100)
    apellidos!: string;

    @IsNotEmpty({ message: 'El DNI del familiar es obligatorio' })
    @Length(8, 8, { message: 'El DNI debe tener exactamente 8 dígitos' })
    @Matches(/^\d+$/, { message: 'El DNI debe contener solo números' })
    dni!: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato YYYY-MM-DD' })
    fecha_nacimiento?: string;

    @IsNotEmpty({ message: 'El parentesco es obligatorio' })
    @IsIn(['Padre', 'Madre', 'Hermano', 'Hermana', 'Tio', 'Tia', 'Abuelo', 'Abuela', 'Apoderado', 'Otro'], {
        message: 'Parentesco inválido',
    })
    parentesco!: string;
}