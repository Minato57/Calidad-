// Ejecuta la inicialización de la base de datos, sincronización y archivos .sql
// Uso: npm run migrate
import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/datasource';

dotenv.config();

async function main() {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = Number(process.env.DB_PORT) || 3306;
    const dbUser = process.env.DB_USER || 'root';
    const dbPassword = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'citasmedicassangenaro';

    console.log(`Conectando al servidor MySQL en ${dbHost}:${dbPort}...`);
    const serverConn = await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
    });

    console.log(`Verificando/creando base de datos '${dbName}'...`);
    await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await serverConn.end();

    console.log(`Inicializando TypeORM DataSource para '${dbName}'...`);
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

    console.log('Sincronizando entidades base de TypeORM...');
    await AppDataSource.synchronize();
    console.log('Entidades TypeORM sincronizadas correctamente.');

    // Ejecutar archivos .sql de la carpeta /sql
    const sqlConn = await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        multipleStatements: true,
    });

    const dir = path.join(__dirname, '..', '..', 'sql');
    if (fs.existsSync(dir)) {
        const archivos = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
        for (const f of archivos) {
            const sql = fs.readFileSync(path.join(dir, f), 'utf8');
            await sqlConn.query(sql);
            console.log(`OK migración: ${f}`);
        }
    }

    // Semilla básica: Administrador y configuración si no existen
    const [adminExist]: any = await sqlConn.query("SELECT id_usuario FROM usuarios WHERE rol = 'ADMIN' LIMIT 1");
    if (!adminExist || adminExist.length === 0) {
        console.log('Creando usuario Administrador inicial...');
        const passHash = await bcrypt.hash('Admin1234!', 10);
        await sqlConn.query(
            `INSERT INTO usuarios (correo, contrasena, rol, dni, nombres, apellidos, telefono, activo) 
             VALUES (?, ?, 'ADMIN', '00000000', 'Administrador', 'CareNest', '999999999', 1)`,
            ['admin@sangenaro.gob.pe', passHash]
        );
        console.log('Admin creado: correo admin@sangenaro.gob.pe | clave Admin1234!');
    }

    // Semilla básica de especialidades si no existen
    const [espExist]: any = await sqlConn.query("SELECT id_especialidad FROM especialidades LIMIT 1");
    if (!espExist || espExist.length === 0) {
        console.log('Insertando especialidades iniciales...');
        await sqlConn.query(`
            INSERT INTO especialidades (nombre, descripcion, estado, requiere_datos_menor) VALUES
            ('Medicina General', 'Atención integral del adulto y la familia', 'ACTIVA', 0),
            ('Pediatría', 'Atención médica especializada para niños y adolescentes', 'ACTIVA', 1),
            ('Ginecología y Obstetricia', 'Salud de la mujer, control prenatal y reproductivo', 'ACTIVA', 0),
            ('Odontología', 'Salud bucal, prevención y tratamiento dental', 'ACTIVA', 0);
        `);
        console.log('Especialidades iniciales insertadas.');
    }

    await sqlConn.end();
    await AppDataSource.destroy();

    console.log('¡Migración y configuración completadas exitosamente!');
}

main().catch((err: any) => {
    console.error('Error en migración:', err?.message || err?.code || err);
    if (err?.errors) err.errors.forEach((e: any) => console.error(' -', e.code, e.address, e.port));
    process.exit(1);
});
