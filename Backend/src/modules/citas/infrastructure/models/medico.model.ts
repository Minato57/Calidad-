// =================================================================
// CAPA: Infrastructure / Models
// Model TypeORM mapeado a la tabla "medicos" en MySQL.
// =================================================================
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
} from 'typeorm';

@Entity('medicos')
export class MedicoModel {
    @PrimaryGeneratedColumn()
    id_medico!: number;

    @Column()
    nombres!: string;

    @Column()
    apellidos!: string;

    @Column()
    id_especialidad!: number;

    // ----- Fase 3: estado y disponibilidad programada -----
    @Column({
        type: 'enum',
        enum: ['ACTIVO', 'INACTIVO'],
        default: 'ACTIVO',
    })
    estado!: 'ACTIVO' | 'INACTIVO';

    @Column({ type: 'date', nullable: true })
    fecha_inhabilitacion!: string | null;

    @Column({ type: 'date', nullable: true })
    fecha_habilitacion!: string | null;

    @Column({ type: 'tinyint', default: 0 })
    aviso_habilitacion_enviado!: number;
}