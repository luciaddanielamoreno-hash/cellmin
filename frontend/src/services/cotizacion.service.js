import api from "./api";

export const cotizacionService = {
  get: async () => {
    const response = await api.get("/cotizacion/");
    return response.data;
  },
};
