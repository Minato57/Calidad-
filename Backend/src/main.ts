// =================================================================
// PUNTO DE ENTRADA del backend.
// =================================================================
import 'reflect-metadata';

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { AppDataSource } from './config/datasource';
import { getJwtSecret } from './config/security';

// Rutas por módulo
import authRoutes          from './modules/usuarios/presentation/routes/auth.routes';
import citaRoutes          from './modules/citas/presentation/routes/cita.routes';
import adminRoutes         from './modules/administracion/presentation/routes/admin.routes';
import asistenciaRoutes    from './modules/asistencias/presentation/routes/asistencia.routes';
import notificacionRoutes  from './modules/notificaciones/presentation/routes/notificacion.routes';
import { iniciarCronDisponibilidad } from './shared/cron/disponibilidad.cron';
import familiarRoutes from './modules/usuarios/presentation/routes/familiar.routes';
import correoRemitenteRoutes from './modules/notificaciones/presentation/routes/correo-remitente.routes';
import medicoRoutes  from './modules/medicos/presentation/routes/medico.routes';
import seguroRoutes  from './modules/seguros/presentation/routes/seguro.routes';
import pagoRoutes    from './modules/pagos/presentation/routes/pago.routes';

// Cron jobs
import { iniciarCronRecordatorios } from './shared/cron/recordatorios.cron';
import { errorHandler } from './shared/middlewares/error.handler';
import { iniciarCronCorreos } from './shared/cron/correos.cron';

dotenv.config();

try {
    getJwtSecret();
} catch (error) {
    const mensaje = error instanceof Error ? error.message : 'JWT_SECRET no es valido.';
    console.error('[CONFIGURACION INSEGURA] ' + mensaje);
    process.exit(1);
}

const app = express();

// Seguridad: Ocultar información del framework (SonarQube typescript:S5689)
app.disable('x-powered-by');

// Middlewares globales - CORS seguro (SonarQube typescript:S5122)
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        // Permitir solicitudes sin origin (como apps móviles, curl o cron interno) o si coincide con allowedOrigins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Origen no permitido por política CORS'));
        }
    },
    credentials: true,
}));
app.use(express.json());

// Montaje de rutas
app.use('/auth',           authRoutes);
app.use('/citas',          citaRoutes);
app.use('/admin',          adminRoutes);
app.use('/admision',       asistenciaRoutes);
app.use('/notificaciones', notificacionRoutes);
app.use('/usuarios',       familiarRoutes);
app.use('/notificaciones', correoRemitenteRoutes);
app.use('/medico',         medicoRoutes);
app.use('/seguros',        seguroRoutes);
app.use('/pagos',          pagoRoutes);

// Healthcheck
app.get('/', (_req, res) => {
    res.json({ ok: true, mensaje: 'API CareNest funcionando' });
});

// Manejador de errores GLOBAL — va al FINAL, después de todas las rutas.
app.use(errorHandler);
// Inicializar BD, arrancar cron y servidor
const PORT = Number(process.env.PORT) || 3000;

AppDataSource.initialize()
    .then(async () => {
        console.log('Conexión a MySQL establecida');

        // Auto-verificar usuario de pruebas para rol MEDICO (para Cypress/QA)
        try {
            const rows = await AppDataSource.query("SELECT id_usuario FROM usuarios WHERE correo = 'medico@carenest.pe' LIMIT 1");
            const bcryptMod = await import('bcrypt');
            const hash = await bcryptMod.hash('admin123', 10);
            if (!rows || rows.length === 0) {
                await AppDataSource.query(`
                    INSERT INTO usuarios (correo, contrasena, rol, dni, nombres, apellidos, telefono, genero, activo)
                    VALUES ('medico@carenest.pe', ?, 'MEDICO', '00000003', 'Carlos', 'Lopez', '977777777', 'Masculino', 1)
                `, [hash]);
                console.log('✓ Usuario de pruebas medico@carenest.pe creado');
            } else {
                await AppDataSource.query(
                    "UPDATE usuarios SET contrasena = ?, rol = 'MEDICO', activo = 1 WHERE correo = 'medico@carenest.pe'",
                    [hash]
                );
            }

            const user = await AppDataSource.query("SELECT id_usuario FROM usuarios WHERE correo = 'medico@carenest.pe' LIMIT 1");
            if (user && user.length > 0) {
                const idUsuario = user[0].id_usuario;
                const medicos = await AppDataSource.query("SELECT id_medico FROM medicos WHERE nombres = 'Carlos' AND apellidos = 'Lopez' LIMIT 1");
                if (medicos && medicos.length > 0) {
                    await AppDataSource.query(`
                        INSERT INTO medico_usuario (id_medico, id_usuario, cmp)
                        VALUES (?, ?, 'CMP-00001')
                        ON DUPLICATE KEY UPDATE id_usuario = VALUES(id_usuario), cmp = VALUES(cmp)
                    `, [medicos[0].id_medico, idUsuario]);
                }
            }
        } catch (e) {
            console.warn('Nota: verificación automática de médico omitida:', (e as any)?.message);
        }

        // ⭐ Activar cron de recordatorios de citas 24h antes
        iniciarCronRecordatorios();
        iniciarCronDisponibilidad();
        iniciarCronCorreos();
        app.listen(PORT, () => {
            console.log(`Servidor escuchando en http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Error al conectar a la base de datos:', error);
    });