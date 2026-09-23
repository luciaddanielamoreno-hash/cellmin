import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportarExcel = (
  datos,
  nombreArchivo = "exportacion",
  nombreHoja = "Datos",
) => {
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const data = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(data, `${nombreArchivo}.xlsx`);
};

export const exportarListaPrecios = (productos, categorias) => {
  const datos = [];

  productos.forEach((producto) => {
    if (producto.tiene_variantes) {
      producto.variantes.forEach((variante) => {
        datos.push({
          Producto: producto.nombre,
          Variante: variante.nombre,
          Precio: variante.precio_venta,
        });
      });
    } else {
      datos.push({
        Producto: producto.nombre,
        Variante: "-",
        Precio: producto.precio_venta,
      });
    }
  });

  exportarExcel(
    datos,
    `lista-precios-${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}`,
    "Lista de Precios",
  );
};
