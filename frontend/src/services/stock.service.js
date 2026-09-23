import api from "./api";

export const stockService = {
  getProductos: async () => {
    const response = await api.get("/stock/productos");
    return response.data;
  },

  getMovimientos: async () => {
    const response = await api.get("/stock");
    return response.data;
  },

  crearMovimiento: async (data) => {
    const response = await api.post("/stock/movimiento", data);
    return response.data;
  },
};
