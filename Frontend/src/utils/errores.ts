import axios from 'axios';

/** Mensaje del backend ({ mensaje }) si existe; si no, el mensaje por defecto. */
export const mensajeErrorApi = (err: unknown, porDefecto: string): string =>
    (axios.isAxiosError(err) ? err.response?.data?.mensaje : null) || porDefecto;
