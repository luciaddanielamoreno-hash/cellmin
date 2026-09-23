import api from "./api";

export const reportesService = {
  getDashboard: async () => {
    const response = await api.get("/reports/dashboard");
    return response.data;
  },

  getVentas: async (periodo) => {
    const response = await api.get(`/reports/ventas?periodo=${periodo}`);
    return response.data;
  },

  getProductosVendidos: async () => {
    const response = await api.get("/reports/productos-vendidos");
    return response.data;
  },

  getRentabilidad: async (periodo) => {
    const response = await api.get(`/reports/rentabilidad?periodo=${periodo}`);
    return response.data;
  },

  getReparaciones: async () => {
    const response = await api.get("/reports/reparaciones");
    return response.data;
  },

  getStockBajo: async () => {
    const response = await api.get("/reports/stock-bajo");
    return response.data;
  },
  getVentas: async (periodo, desde = null, hasta = null) => {
    let url = `/reports/ventas?periodo=${periodo}`;
    if (desde) url += `&desde=${desde}`;
    if (hasta) url += `&hasta=${hasta}`;
    const response = await api.get(url);
    return response.data;
  },

  getRentabilidad: async (periodo, desde = null, hasta = null) => {
    let url = `/reports/rentabilidad?periodo=${periodo}`;
    if (desde) url += `&desde=${desde}`;
    if (hasta) url += `&hasta=${hasta}`;
    const response = await api.get(url);
    return response.data;
  },
};
