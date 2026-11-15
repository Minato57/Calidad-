// =================================================================
// Endpoints de seguro (SIS) y pagos (Mercado Pago)
// =================================================================
import { apiClient } from './axios';
import { CheckoutPago, PersonaSeguro, RequisitoPago, SaldoPaciente, SeguroInfo } from '../types';

export const pagosApi = {
    // ¿El paciente (o su familiar) tiene SIS? ¿Debe pagar?
    requisito: async (idDependiente?: number): Promise<RequisitoPago> => {
        const response = await apiClient.get('/pagos/requisito', {
            params: idDependiente ? { id_dependiente: idDependiente } : {},
        });
        return response.data;
    },

    // Saldos a favor del titular y sus familiares
    saldos: async (): Promise<SaldoPaciente[]> => {
        const response = await apiClient.get('/pagos/saldos');
        return response.data.saldos ?? [];
    },

    // Crea el pago y devuelve la URL de Mercado Pago (init_point)
    crearCheckout: async (data: { id_dependiente?: number; descripcion?: string }): Promise<CheckoutPago> => {
        const response = await apiClient.post('/pagos/checkout', data);
        return response.data;
    },

    // Estado real del pago al volver de Mercado Pago
    verificar: async (idPago: number, paymentId?: string): Promise<{ ok: boolean; estado?: string; usado?: boolean; mensaje?: string }> => {
        const response = await apiClient.get(`/pagos/${idPago}/verificar`, {
            params: paymentId ? { payment_id: paymentId } : {},
        });
        return response.data;
    },
};

export const segurosApi = {
    consultar: async (dni: string): Promise<SeguroInfo> => {
        const response = await apiClient.get('/seguros/consulta', { params: { dni } });
        return response.data.seguro;
    },
    // Titular + familiares con el estado del SIS de cada uno (Mi Perfil).
    misEstados: async (): Promise<PersonaSeguro[]> => {
        const response = await apiClient.get('/seguros/mis-estados');
        return response.data.personas ?? [];
    },
    // Paso 1: abre la verificación en el portal del SIS (Captcha + token).
    // Si el portal no responde, el backend devuelve 503 (no hay modo de respaldo silencioso).
    iniciarVerificacion: async (dni: string): Promise<SesionVerificacionSIS> => {
        const response = await apiClient.get('/seguros/captcha', { params: { dni } });
        return response.data;
    },
    // Paso 2: consulta el portal con el Captcha resuelto por el usuario.
    verificarCaptcha: async (data: {
        dni: string;
        fechaNacimiento: string;
        codigoCaptcha: string;
        token?: string;
    }): Promise<{ ok: boolean; seguro: SeguroInfo; mensaje?: string }> => {
        const response = await apiClient.post('/seguros/verificar-captcha', data);
        return response.data;
    },
};

export interface SesionVerificacionSIS {
    ok: boolean;
    simulado: boolean;               // true solo en modo DEMO del backend (sin portal ni Captcha)
    token: string;
    captchaImage: string;
    fechaNacimiento: string | null;  // la registrada en el sistema, para precargar el formulario
}
