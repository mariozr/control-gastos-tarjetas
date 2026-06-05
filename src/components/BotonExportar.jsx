import { useState } from "react";
import { supabase } from "../config/supabase";
import Papa from "papaparse";

export default function BotonExportar({ filtros, onError, onSuccess }) {
  const [exportando, setExportando] = useState(false);

  const formatearFecha = (fechaString) => {
    if (!fechaString) return "";
    const [year, month, day] = fechaString.split("-");
    return `${day}/${month}/${year}`;
  };

  const cargarDatosParaExportar = async () => {
    setExportando(true);

    try {
      let query = supabase.from("gastos").select("*").order("fecha", {
        ascending: false,
      });

      if (filtros.categoria && filtros.categoria !== "todos") {
        query = query.eq("categoria", filtros.categoria);
      }

      if (filtros.formaPago && filtros.formaPago !== "todas") {
        query = query.eq("forma_pago", filtros.formaPago);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error al cargar datos:", error);
        onError("Error al cargar los datos para exportar");
        setExportando(false);
        return;
      }

      if (!data || data.length === 0) {
        onError("No hay datos para exportar");
        setExportando(false);
        return;
      }

      let datosFiltrados = [...data];

      if (filtros.tiempo === "mes" && filtros.mesSeleccionado) {
        const [año, mes] = filtros.mesSeleccionado.split("-");
        datosFiltrados = datosFiltrados.filter((gasto) => {
          const fechaGasto = gasto.fecha;
          const añoGasto = fechaGasto.substring(0, 4);
          const mesGasto = fechaGasto.substring(5, 7);
          return añoGasto === año && mesGasto === mes;
        });
      } else if (
        filtros.tiempo === "personalizado" &&
        filtros.fechaInicio &&
        filtros.fechaFin
      ) {
        datosFiltrados = datosFiltrados.filter((gasto) => {
          const fechaGasto = gasto.fecha;
          return (
            fechaGasto >= filtros.fechaInicio && fechaGasto <= filtros.fechaFin
          );
        });
      }

      const datosExportar = datosFiltrados.map((gasto) => ({
        Fecha: formatearFecha(gasto.fecha),
        Descripción: gasto.descripcion,
        Categoría: gasto.categoria,
        "Forma de Pago": gasto.forma_pago || "Efectivo",
        Monto: gasto.monto,
      }));

      const total = datosFiltrados.reduce((sum, gasto) => sum + gasto.monto, 0);

      datosExportar.push({
        Fecha: "",
        Descripción: "",
        Categoría: "",
        "Forma de Pago": "TOTAL",
        Monto: total,
      });

      const csv = Papa.unparse(datosExportar, {
        quotes: true,
        delimiter: ";",
      });

      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });

      const ahora = new Date();
      const fechaArchivo = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}_${String(ahora.getHours()).padStart(2, "0")}-${String(ahora.getMinutes()).padStart(2, "0")}`;
      const nombreArchivo = `gastos_${fechaArchivo}.csv`;

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute("download", nombreArchivo);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`Exportados ${datosFiltrados.length} gastos correctamente`);
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("Error al exportar los datos");
    } finally {
      setExportando(false);
    }
  };

  return (
    <button
      onClick={cargarDatosParaExportar}
      disabled={exportando}
      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition flex items-center gap-2 text-sm w-full sm:w-auto justify-center dark:bg-green-700 dark:hover:bg-green-600"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {exportando ? "Exportando..." : "Exportar a Excel"}
    </button>
  );
}
