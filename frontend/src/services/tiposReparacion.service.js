import api from "./api";

export const tiposReparacionService = {
  getAll: async () => {
    const response = await api.get("/repair-types/");
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/repair-types/", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/repair-types/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/repair-types/${id}`);
    return response.data;
  },
};
