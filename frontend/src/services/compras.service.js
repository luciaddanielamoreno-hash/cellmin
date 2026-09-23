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
};
