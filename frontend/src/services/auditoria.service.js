import api from "./api";

export const auditoriaService = {
  getAll: async (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.modulo) params.append("modulo", filtros.modulo);
    if (filtros.accion) params.append("accion", filtros.accion);
    if (filtros.usuario_id) params.append("usuario_id", filtros.usuario_id);
    if (filtros.limit) params.append("limit", filtros.limit);
    const response = await api.get(`/audit/?${params.toString()}`);
    return response.data;
  },
};
