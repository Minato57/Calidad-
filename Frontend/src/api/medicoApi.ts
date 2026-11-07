// =================================================================
// Endpoints del panel del MÉDICO (rol MEDICO)
// =================================================================
import { apiClient } from './axios';
import { CitaMedico, PerfilMedico } from '../types';

export interface AtencionPayload {
    diagnostico: string;
    receta?: string;
    indicaciones?: string;
    correo_destino?: string;
}

export const medicoApi = {
    // GET /medico/citas-hoy?fecha=YYYY-MM-DD
    citasDelDia: async (fecha?: string): Promise<{ ok: boolean; fecha: string; total: number; medico: PerfilMedico; citas: CitaMedico[]; mensaje?: string }> => {
        const response = await apiClient.get('/medico/citas-hoy', { params: fecha ? { fecha } : {} });
        return response.data;
    },

    // POST /medico/citas/:id/atencion
    registrarAtencion: async (
        idCita: number,
        data: AtencionPayload,
    ): Promise<{ ok: boolean; mensaje: string; codigo_verificacion?: string; correo_enviado?: boolean }> => {
        const response = await apiClient.post(`/medico/citas/${idCita}/atencion`, data);
        return response.data;
    },
};
