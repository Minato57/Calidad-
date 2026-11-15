// =================================================================
// CAPA: Infrastructure / Models
// Model TypeORM mapeado a la tabla "citas" en MySQL.
// =================================================================
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';
import { ESTADOS_CITA, EstadoCita } from '../../domain/entities/cita.entity';

@Entity('citas')
export class CitaModel {
    @PrimaryGeneratedColumn()
    id_cita!: number;

    @Column()
    id_usuario!: number;

    @Column()
    id_horario!: number;

    @Column({ nullable: true })
    id_dependiente!: number;

    @Column({ type: 'text', nullable: true })
    motivo!: string;

    @Column({ type: 'text', nullable: true })
    notas!: string;

    @Column({
        type: 'enum',
        enum: [...ESTADOS_CITA],
        default: 'RESERVADA',
    })
    estado!: EstadoCita;

    @CreateDateColumn()
    fecha_registro!: Date;
}