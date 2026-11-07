import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AtencionDTO {
    @IsNotEmpty({ message: 'El diagnóstico es obligatorio' })
    @IsString()
    @MaxLength(2000, { message: 'El diagnóstico no puede superar 2000 caracteres' })
    diagnostico!: string;

    @IsOptional()
    @IsString()
    @MaxLength(3000, { message: 'La receta no puede superar 3000 caracteres' })
    receta?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000, { message: 'Las indicaciones no pueden superar 2000 caracteres' })
    indicaciones?: string;

    @IsOptional()
    @IsEmail({}, { message: 'El correo de destino no tiene un formato válido' })
    @MaxLength(150, { message: 'El correo no puede superar 150 caracteres' })
    correo_destino?: string;
}
