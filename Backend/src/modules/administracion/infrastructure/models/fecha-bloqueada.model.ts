// =================================================================
// CAPA: Infrastructure / Models
// Model TypeORM mapeado a la tabla "fechas_bloqueadas" en MySQL.
// Registra los días bloqueados por cancelaciones masivas o
// inhabilitaciones de especialidad.
// =================================================================
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('fechas_bloqueadas')
export class FechaBloqueadaModel {
    @PrimaryGeneratedColumn()
    id_bloqueo!: number;

    // String "YYYY-MM-DD" (no Date) para evitar el desfase de un día por zona horaria.
    @Column({ type: 'date' })
    fecha!: string;

    // NULL = la fecha está bloqueada para todas las especialidades
    @Column({ nullable: true })
    id_especialidad!: number;

    @Column({ nullable: true })
    motivo!: string;

    @Column({ nullable: true })
    creado_por!: number;

    @CreateDateColumn()
    fecha_registro!: Date;
}