import api from "./api";

export const cajaService = {
  getActual: async () => {
    const response = await api.get("/cash/actual");
    return response.data;
  },

  abrir: async (data) => {
    const response = await api.post("/cash/abrir", data);
    return response.data;
  },

  cerrar: async (data) => {
    const response = await api.post("/cash/cerrar", data);
    return response.data;
  },

  agregarMovimiento: async (data) => {
    const response = await api.post("/cash/movimiento", data);
    return response.data;
  },

  getHistorial: async () => {
    const response = await api.get("/cash/historial");
    return response.data;
  },
};
