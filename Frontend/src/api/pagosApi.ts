// =================================================================
// Endpoints de seguro (SIS) y pagos (Mercado Pago)
// =================================================================
import { apiClient } from './axios';
import { CheckoutPago, RequisitoPago, SeguroInfo } from '../types';

export const pagosApi = {
    // ¿El paciente (o su familiar) tiene SIS? ¿Debe pagar?
    requisito: async (idDependiente?: number): Promise<RequisitoPago> => {
        const response = await apiClient.get('/pagos/requisito', {
            params: idDependiente ? { id_dependiente: idDependiente } : {},
        });
        return response.data;
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
};
