// =================================================================
// PUNTO DE ENTRADA del backend.
// =================================================================
import 'reflect-metadata';

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { AppDataSource } from './config/datasource';

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

const app = express();

// Middlewares globales
app.use(cors());
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
    .then(() => {
        console.log('Conexión a MySQL establecida');

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