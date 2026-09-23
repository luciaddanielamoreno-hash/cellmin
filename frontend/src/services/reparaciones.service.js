import api from "./api";

export const reparacionesService = {
  getAll: async () => {
    const response = await api.get("/repairs");
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/repairs/${id}`);
    return response.data;
  },

  getPendientes: async () => {
    const response = await api.get("/repairs/pendientes");
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/repairs", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/repairs/${id}`, data);
    return response.data;
  },

  agregarPago: async (id, data) => {
    const response = await api.post(`/repairs/${id}/pago`, data);
    return response.data;
  },

  getByCliente: async (clienteId) => {
    const response = await api.get(`/repairs/cliente/${clienteId}`);
    return response.data;
  },
  cancelar: async (id) => {
    const response = await api.put(`/repairs/${id}/cancelar`);
    return response.data;
  },
};
