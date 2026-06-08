// components/BotonExportar.jsx
import { useState } from "react";
import { supabase } from "../config/supabase";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function BotonExportar({ filtros }) {
  const [exportando, setExportando] = useState(false);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [cantidadRegistros, setCantidadRegistros] = useState(0);

  const formatearFecha = (fechaString) => {
    if (!fechaString) return "";
    const [year, month, day] = fechaString.split("-");
    return `${day}/${month}/${year}`;
  };

  const getFechaArchivo = () => {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}_${String(ahora.getHours()).padStart(2, "0")}-${String(ahora.getMinutes()).padStart(2, "0")}`;
  };

  const descargarArchivo = (blob, nombreArchivo) => {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Función para obtener el nombre de la tarjeta por ID
  const obtenerNombreTarjeta = async (tarjetaId) => {
    if (!tarjetaId) return null;
    const { data, error } = await supabase
      .from("tarjetas_credito")
      .select("nombre, ultimos_digitos")
      .eq("id", tarjetaId)
      .single();
    if (error || !data) return null;
    return `${data.nombre} •••• ${data.ultimos_digitos}`;
  };

  // Función para enriquecer los datos con el nombre de la tarjeta
  const enriquecerDatosConTarjeta = async (datosFiltrados) => {
    const datosEnriquecidos = [];

    for (const gasto of datosFiltrados) {
      let nombreTarjeta = "";
      if (gasto.tarjeta_credito_id) {
        const tarjetaInfo = await obtenerNombreTarjeta(
          gasto.tarjeta_credito_id,
        );
        nombreTarjeta = tarjetaInfo || `ID: ${gasto.tarjeta_credito_id}`;
      }

      datosEnriquecidos.push({
        Fecha: formatearFecha(gasto.fecha),
        Descripción: gasto.descripcion,
        Categoría: gasto.categoria,
        "Forma de Pago": gasto.forma_pago || "Efectivo",
        Monto: gasto.monto,
        Tarjeta: nombreTarjeta,
        ...(gasto.tipo_gasto === "credito_cuota" && {
          Cuota: `${gasto.cuota_actual || ""}/${gasto.total_cuotas || ""}`,
        }),
      });
    }

    return datosEnriquecidos;
  };

  const exportarCSV = (datos, totalRegistros) => {
    const csv = Papa.unparse(datos, {
      quotes: true,
      delimiter: ";",
    });

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const fechaArchivo = getFechaArchivo();
    const nombreArchivo = `gastos_${fechaArchivo}.csv`;

    descargarArchivo(blob, nombreArchivo);
    alert(`✅ Exportados ${totalRegistros} gastos a CSV correctamente`);
  };

  const exportarExcel = (datos, totalRegistros, total) => {
    const datosConTotal = [
      ...datos,
      {
        Fecha: "",
        Descripción: "",
        Categoría: "",
        "Forma de Pago": "TOTAL",
        Monto: total,
        Tarjeta: "",
        Cuota: "",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(datosConTotal);

    ws["!cols"] = [
      { wch: 12 }, // Fecha
      { wch: 40 }, // Descripción
      { wch: 15 }, // Categoría
      { wch: 20 }, // Forma de Pago
      { wch: 15 }, // Monto
      { wch: 25 }, // Tarjeta
      { wch: 12 }, // Cuota
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gastos");

    const fechaArchivo = getFechaArchivo();
    const nombreArchivo = `gastos_${fechaArchivo}.xlsx`;

    XLSX.writeFile(wb, nombreArchivo);
    alert(`✅ Exportados ${totalRegistros} gastos a Excel correctamente`);
  };

  const exportarPDF = (datos, totalRegistros, total) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("Reporte de Gastos", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const fechaActual = new Date().toLocaleDateString("es-AR");
    doc.text(`Generado: ${fechaActual}`, 14, 30);

    doc.setFontSize(9);
    let filtroY = 38;

    if (filtros.categoria && filtros.categoria !== "todos") {
      doc.text(`Filtro categoría: ${filtros.categoria}`, 14, filtroY);
      filtroY += 5;
    }
    if (filtros.formaPago && filtros.formaPago !== "todas") {
      doc.text(`Filtro forma de pago: ${filtros.formaPago}`, 14, filtroY);
      filtroY += 5;
    }

    if (filtros.tiempo === "todos") {
      doc.text(`Período: Mes actual`, 14, filtroY);
      filtroY += 5;
    } else if (filtros.tiempo === "semana" && filtros.semanaSeleccionada) {
      doc.text(`Período: Semana ${filtros.semanaSeleccionada}`, 14, filtroY);
      filtroY += 5;
    } else if (filtros.tiempo === "mes" && filtros.mesSeleccionado) {
      const [año, mes] = filtros.mesSeleccionado.split("-");
      const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
      const nombreMes = fecha.toLocaleString("es", {
        month: "long",
        year: "numeric",
      });
      doc.text(`Período: ${nombreMes}`, 14, filtroY);
      filtroY += 5;
    } else if (
      filtros.tiempo === "personalizado" &&
      filtros.fechaInicio &&
      filtros.fechaFin
    ) {
      doc.text(
        `Período: ${formatearFecha(filtros.fechaInicio)} al ${formatearFecha(filtros.fechaFin)}`,
        14,
        filtroY,
      );
      filtroY += 5;
    }

    const tableData = datos.map((gasto) => [
      gasto.Fecha,
      gasto.Descripción.length > 35
        ? gasto.Descripción.substring(0, 32) + "..."
        : gasto.Descripción,
      gasto.Categoría,
      gasto["Forma de Pago"],
      `$${gasto.Monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
      gasto.Tarjeta || "-",
      gasto.Cuota || "-",
    ]);

    autoTable(doc, {
      startY: filtroY + 5,
      head: [
        [
          "Fecha",
          "Descripción",
          "Categoría",
          "Forma de Pago",
          "Monto",
          "Tarjeta",
          "Cuota",
        ],
      ],
      body: tableData,
      foot: [
        [
          "",
          "",
          "",
          "",
          `$${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
          "",
          "",
        ],
      ],
      theme: "striped",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 9,
        fontStyle: "bold",
        halign: "center",
      },
      footStyles: {
        fillColor: [220, 220, 220],
        textColor: 40,
        fontSize: 9,
        fontStyle: "bold",
        halign: "right",
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 20, halign: "center" },
        1: { cellWidth: 50 },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 30, halign: "center" },
        4: { cellWidth: 25, halign: "right" },
        5: { cellWidth: 35 },
        6: { cellWidth: 15, halign: "center" },
      },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount} - Total de registros: ${totalRegistros}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" },
        );
      },
    });

    const fechaArchivo = getFechaArchivo();
    const nombreArchivo = `gastos_${fechaArchivo}.pdf`;
    doc.save(nombreArchivo);
    alert(`✅ Exportados ${totalRegistros} gastos a PDF correctamente`);
  };

  const exportarJSON = (datos, totalRegistros, total) => {
    const jsonData = {
      metadata: {
        fechaExportacion: new Date().toISOString(),
        totalRegistros: totalRegistros,
        filtrosAplicados: {
          categoria: filtros.categoria,
          formaPago: filtros.formaPago,
          tiempo: filtros.tiempo,
          semanaSeleccionada: filtros.semanaSeleccionada,
          mesSeleccionado: filtros.mesSeleccionado,
          fechaInicio: filtros.fechaInicio,
          fechaFin: filtros.fechaFin,
        },
      },
      gastos: datos,
      resumen: {
        totalGastos: total,
        cantidadRegistros: totalRegistros,
      },
    };

    const jsonStr = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const fechaArchivo = getFechaArchivo();
    const nombreArchivo = `gastos_${fechaArchivo}.json`;

    descargarArchivo(blob, nombreArchivo);
    alert(`✅ Exportados ${totalRegistros} gastos a JSON correctamente`);
  };

  const getMesActual = () => {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  };

  const getSemana = (fecha) => {
    const date = new Date(fecha);
    const inicio = new Date(date.getFullYear(), 0, 1);
    const dias = Math.floor((date - inicio) / (24 * 60 * 60 * 1000));
    return Math.ceil((dias + inicio.getDay() + 1) / 7);
  };

  const cargarDatosParaExportar = async (formato) => {
    setExportando(true);
    setMostrarMenu(false);

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
        alert("Error al cargar los datos para exportar");
        setExportando(false);
        return;
      }

      if (!data || data.length === 0) {
        alert("No hay datos para exportar");
        setExportando(false);
        return;
      }

      let datosFiltrados = [...data];
      const mesActual = getMesActual();

      if (filtros.tiempo === "todos") {
        datosFiltrados = datosFiltrados.filter((gasto) => {
          const fechaGasto = gasto.fecha;
          const añoGasto = fechaGasto.substring(0, 4);
          const mesGasto = fechaGasto.substring(5, 7);
          return `${añoGasto}-${mesGasto}` === mesActual;
        });
      } else if (filtros.tiempo === "semana" && filtros.semanaSeleccionada) {
        const [año, semanaNum] = filtros.semanaSeleccionada.split("-Semana ");
        datosFiltrados = datosFiltrados.filter((gasto) => {
          const fecha = new Date(gasto.fecha);
          const semana = getSemana(fecha);
          return (
            fecha.getFullYear() === parseInt(año) &&
            semana === parseInt(semanaNum)
          );
        });
      } else if (filtros.tiempo === "mes" && filtros.mesSeleccionado) {
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

      if (datosFiltrados.length === 0) {
        alert("No hay datos para exportar con los filtros seleccionados");
        setExportando(false);
        return;
      }

      // Enriquecer datos con nombre de tarjeta
      const datosEnriquecidos = await enriquecerDatosConTarjeta(datosFiltrados);
      const total = datosFiltrados.reduce((sum, gasto) => sum + gasto.monto, 0);
      const totalRegistros = datosFiltrados.length;

      switch (formato) {
        case "csv":
          exportarCSV(datosEnriquecidos, totalRegistros);
          break;
        case "excel":
          exportarExcel(datosEnriquecidos, totalRegistros, total);
          break;
        case "pdf":
          exportarPDF(datosEnriquecidos, totalRegistros, total);
          break;
        case "json":
          exportarJSON(datosEnriquecidos, totalRegistros, total);
          break;
        default:
          exportarCSV(datosEnriquecidos, totalRegistros);
      }
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("Error al exportar los datos: " + error.message);
    } finally {
      setExportando(false);
    }
  };

  const contarRegistros = async () => {
    try {
      let query = supabase.from("gastos").select("*");

      if (filtros.categoria && filtros.categoria !== "todos") {
        query = query.eq("categoria", filtros.categoria);
      }
      if (filtros.formaPago && filtros.formaPago !== "todas") {
        query = query.eq("forma_pago", filtros.formaPago);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error al contar registros:", error);
        return;
      }

      if (!data) {
        setCantidadRegistros(0);
        return;
      }

      let datosFiltrados = [...data];
      const mesActual = getMesActual();

      if (filtros.tiempo === "todos") {
        datosFiltrados = datosFiltrados.filter((gasto) => {
          const fechaGasto = gasto.fecha;
          const añoGasto = fechaGasto.substring(0, 4);
          const mesGasto = fechaGasto.substring(5, 7);
          return `${añoGasto}-${mesGasto}` === mesActual;
        });
      } else if (filtros.tiempo === "semana" && filtros.semanaSeleccionada) {
        const [año, semanaNum] = filtros.semanaSeleccionada.split("-Semana ");
        datosFiltrados = datosFiltrados.filter((gasto) => {
          const fecha = new Date(gasto.fecha);
          const semana = getSemana(fecha);
          return (
            fecha.getFullYear() === parseInt(año) &&
            semana === parseInt(semanaNum)
          );
        });
      } else if (filtros.tiempo === "mes" && filtros.mesSeleccionado) {
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

      setCantidadRegistros(datosFiltrados.length);
    } catch (error) {
      console.error("Error al contar registros:", error);
    }
  };

  const abrirMenu = () => {
    setMostrarMenu(true);
    contarRegistros();
  };

  const formatos = [
    {
      id: "csv",
      nombre: "CSV",
      icon: "📄",
      description: "Compatible con Excel y Google Sheets",
      color: "green",
    },
    {
      id: "excel",
      nombre: "Excel",
      icon: "📊",
      description: "Formato nativo de Excel (.xlsx)",
      color: "blue",
    },
    {
      id: "pdf",
      nombre: "PDF",
      icon: "📑",
      description: "Documento formateado para impresión",
      color: "red",
    },
    {
      id: "json",
      nombre: "JSON",
      icon: "🔧",
      description: "Para desarrolladores y APIs",
      color: "purple",
    },
  ];

  const getFiltroTexto = () => {
    if (filtros.tiempo === "todos") return "Mes actual";
    if (filtros.tiempo === "semana" && filtros.semanaSeleccionada)
      return `Semana ${filtros.semanaSeleccionada}`;
    if (filtros.tiempo === "mes" && filtros.mesSeleccionado) {
      const [año, mes] = filtros.mesSeleccionado.split("-");
      const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
      return fecha.toLocaleString("es", { month: "long", year: "numeric" });
    }
    if (
      filtros.tiempo === "personalizado" &&
      filtros.fechaInicio &&
      filtros.fechaFin
    ) {
      return `${formatearFecha(filtros.fechaInicio)} al ${formatearFecha(filtros.fechaFin)}`;
    }
    return "Todos los períodos";
  };

  return (
    <div className="relative">
      <button
        onClick={abrirMenu}
        disabled={exportando}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition flex items-center gap-2 text-sm w-full sm:w-auto justify-center dark:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
        {exportando ? "Exportando..." : "Exportar"}
        <svg
          className={`w-4 h-4 transition-transform ${mostrarMenu ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {mostrarMenu && !exportando && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMostrarMenu(false)}
          />

          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-20 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Seleccionar formato de exportación
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                <p>📊 {cantidadRegistros} registros encontrados</p>
                <p className="text-blue-600 dark:text-blue-400">
                  🔍 Filtro activo: {getFiltroTexto()}
                </p>
                {filtros.categoria && filtros.categoria !== "todos" && (
                  <p>🏷️ Categoría: {filtros.categoria}</p>
                )}
                {filtros.formaPago && filtros.formaPago !== "todas" && (
                  <p>💳 Forma de pago: {filtros.formaPago}</p>
                )}
              </div>
            </div>

            <div className="p-2">
              {formatos.map((formato) => (
                <button
                  key={formato.id}
                  onClick={() => cargarDatosParaExportar(formato.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700 group"
                >
                  <span className="text-2xl">{formato.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-800 dark:text-white">
                      {formato.nombre}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formato.description}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Exportar
                  </span>
                </button>
              ))}
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setMostrarMenu(false)}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
