import api from "./api";

export const comprasService = {
  getAll: async () => {
    const response = await api.get("/purchases");
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/purchases", data);
    return response.data;
  },

  cancelar: async (id) => {
    const response = await api.put(`/purchases/${id}/cancelar`);
    return response.data;
  },
};
