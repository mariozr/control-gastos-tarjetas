import { useEffect, useState } from "react";
import { supabase } from "../config/supabase";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
];

export default function GraficosEstadisticos({ onError }) {
  const [gastosPorCategoria, setGastosPorCategoria] = useState([]);
  const [gastosPorMes, setGastosPorMes] = useState([]);
  const [gastosPorFormaPago, setGastosPorFormaPago] = useState([]);
  const [gastosPorMesFormaPago, setGastosPorMesFormaPago] = useState([]);
  const [formasPagoUnicas, setFormasPagoUnicas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipoGrafico, setTipoGrafico] = useState("categoria");
  const [filtroMes, setFiltroMes] = useState("todos");
  const [mesesDisponibles, setMesesDisponibles] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Cerrar dropdown al cambiar de gráfico o filtro
  useEffect(() => {
    setMostrarDetalle(false);
  }, [tipoGrafico, filtroMes, mesSeleccionado]);

  useEffect(() => {
    cargarDatosEstadisticos();
  }, [filtroMes, mesSeleccionado]);

  const cargarDatosEstadisticos = async () => {
    setLoading(true);

    // Solo incluir gastos que representan dinero real gastado
    // Excluir compras a crédito (son solo informativas)
    let query = supabase
      .from("gastos")
      .select("*")
      .in("tipo_gasto", ["simple", "credito_cuota"]) // Solo lo que realmente se paga
      .order("fecha", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Error:", error);
      onError("Error al cargar datos para gráficos: " + error.message);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setGastosPorCategoria([]);
      setGastosPorMes([]);
      setGastosPorFormaPago([]);
      setGastosPorMesFormaPago([]);
      setMesesDisponibles([]);
      setLoading(false);
      return;
    }

    // Obtener meses disponibles para el filtro
    const mesesSet = new Set();
    data.forEach((gasto) => {
      const fechaGasto = gasto.fecha;
      const añoGasto = fechaGasto.substring(0, 4);
      const mesGasto = fechaGasto.substring(5, 7);
      const mesKey = `${añoGasto}-${mesGasto}`;
      mesesSet.add(mesKey);
    });
    const mesesArray = Array.from(mesesSet).sort();
    setMesesDisponibles(mesesArray);

    // Filtrar datos por mes si es necesario
    let datosFiltrados = data;

    if (filtroMes === "mesActual") {
      const ahora = new Date();
      const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
      datosFiltrados = data.filter((gasto) => {
        const fechaGasto = gasto.fecha;
        const añoGasto = fechaGasto.substring(0, 4);
        const mesGasto = fechaGasto.substring(5, 7);
        return `${añoGasto}-${mesGasto}` === mesActual;
      });
    } else if (filtroMes === "mesAnterior") {
      const ahora = new Date();
      const mesAnterior = new Date(
        ahora.getFullYear(),
        ahora.getMonth() - 1,
        1,
      );
      const mesKey = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, "0")}`;
      datosFiltrados = data.filter((gasto) => {
        const fechaGasto = gasto.fecha;
        const añoGasto = fechaGasto.substring(0, 4);
        const mesGasto = fechaGasto.substring(5, 7);
        return `${añoGasto}-${mesGasto}` === mesKey;
      });
    } else if (filtroMes === "especifico" && mesSeleccionado) {
      datosFiltrados = data.filter((gasto) => {
        const fechaGasto = gasto.fecha;
        const añoGasto = fechaGasto.substring(0, 4);
        const mesGasto = fechaGasto.substring(5, 7);
        return `${añoGasto}-${mesGasto}` === mesSeleccionado;
      });
    }

    // Procesar datos por categoría
    const categorias = {};
    datosFiltrados.forEach((gasto) => {
      const nombreCategoria = gasto.categoria || "Sin categoría";
      if (categorias[nombreCategoria]) {
        categorias[nombreCategoria] += gasto.monto;
      } else {
        categorias[nombreCategoria] = gasto.monto;
      }
    });

    const datosCategorias = Object.keys(categorias).map((categoria) => ({
      name: categoria,
      value: categorias[categoria],
    }));

    setGastosPorCategoria(datosCategorias);

    // Procesar datos por mes
    const meses = {};
    data.forEach((gasto) => {
      const fechaGasto = gasto.fecha;
      const añoGasto = fechaGasto.substring(0, 4);
      const mesGasto = fechaGasto.substring(5, 7);
      const mesKey = `${añoGasto}-${mesGasto}`;
      const fecha = new Date(parseInt(añoGasto), parseInt(mesGasto) - 1, 1);
      const mesNombre = fecha.toLocaleString("es", {
        month: "short",
        year: "numeric",
      });

      if (meses[mesKey]) {
        meses[mesKey].total += gasto.monto;
        meses[mesKey].nombre = mesNombre;
      } else {
        meses[mesKey] = {
          total: gasto.monto,
          nombre: mesNombre,
        };
      }
    });

    const datosMeses = Object.keys(meses).map((mesKey) => ({
      name: meses[mesKey].nombre,
      total: meses[mesKey].total,
    }));

    setGastosPorMes(datosMeses);

    // Procesar datos por forma de pago
    const formasPago = {};
    datosFiltrados.forEach((gasto) => {
      const nombreFormaPago = gasto.forma_pago || "Efectivo";
      if (formasPago[nombreFormaPago]) {
        formasPago[nombreFormaPago] += gasto.monto;
      } else {
        formasPago[nombreFormaPago] = gasto.monto;
      }
    });

    const datosFormasPago = Object.keys(formasPago).map((formaPago) => ({
      name: formaPago,
      value: formasPago[formaPago],
    }));

    setGastosPorFormaPago(datosFormasPago);

    // Procesar datos por mes y forma de pago
    const mesesFormaPago = {};
    const formasPagoSet = new Set();

    data.forEach((gasto) => {
      const fechaGasto = gasto.fecha;
      const añoGasto = fechaGasto.substring(0, 4);
      const mesGasto = fechaGasto.substring(5, 7);
      const mesKey = `${añoGasto}-${mesGasto}`;
      const fecha = new Date(parseInt(añoGasto), parseInt(mesGasto) - 1, 1);
      const mesNombre = fecha.toLocaleString("es", {
        month: "short",
        year: "numeric",
      });
      const formaPago = gasto.forma_pago || "Efectivo";

      formasPagoSet.add(formaPago);

      if (!mesesFormaPago[mesKey]) {
        mesesFormaPago[mesKey] = {
          nombre: mesNombre,
          [formaPago]: gasto.monto,
        };
      } else {
        if (mesesFormaPago[mesKey][formaPago]) {
          mesesFormaPago[mesKey][formaPago] += gasto.monto;
        } else {
          mesesFormaPago[mesKey][formaPago] = gasto.monto;
        }
      }
    });

    const datosMesFormaPago = Object.values(mesesFormaPago);
    setGastosPorMesFormaPago(datosMesFormaPago);
    setFormasPagoUnicas(Array.from(formasPagoSet).sort());

    setLoading(false);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const renderLegendDropdown = (data, title) => {
    if (!data || data.length === 0) return null;

    return (
      <div className="mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={() => setMostrarDetalle(!mostrarDetalle)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition dark:bg-gray-600 dark:text-gray-400 dark:hover:bg-gray-600"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            📊 Ver detalles de {title}
          </span>
          <svg
            className={`w-5 h-5 text-gray-500 dark:text-gray-300 transition-transform ${mostrarDetalle ? "rotate-180" : ""}`}
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

        {mostrarDetalle && (
          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
            {data.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg dark:bg-gray-600 dark:text-gray-400"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span
                    className="text-sm text-gray-700 truncate dark:text-gray-300"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </div>
                <span className="font-semibold text-gray-800 ml-2 flex-shrink-0 dark:text-gray-300">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const getNombreMes = (mesKey) => {
    if (!mesKey) return "";
    const [año, mes] = mesKey.split("-");
    const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
    return fecha.toLocaleString("es", { month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md dark:bg-gray-200 dark:text-gray-700 dark:focus:ring-blue-500">
        <p className="text-center text-gray-500 dark:text-gray-400 dark:focus:ring-blue-500">
          Cargando estadísticas...
        </p>
      </div>
    );
  }

  if (gastosPorCategoria.length === 0 && filtroMes !== "todos") {
    return (
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md dark:bg-gray-200 dark:text-gray-700 dark:focus:ring-blue-500">
        <p className="text-center text-gray-500 text-sm md:text-base dark:text-gray-400 dark:focus:ring-blue-500">
          No hay gastos en el período seleccionado.
        </p>
      </div>
    );
  }

  if (gastosPorCategoria.length === 0) {
    return (
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md dark:bg-gray-200 dark:text-gray-700 dark:focus:ring-blue-500">
        <p className="text-center text-gray-500 text-sm md:text-base dark:text-gray-400 dark:focus:ring-blue-500">
          No hay suficientes datos para mostrar gráficos. Agrega algunos gastos
          primero.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md mb-6 transition-colors duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
          Estadísticas
        </h2>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select
            value={filtroMes}
            onChange={(e) => {
              setFiltroMes(e.target.value);
              if (e.target.value !== "especifico") {
                setMesSeleccionado("");
              }
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:focus:ring-blue-500"
          >
            <option value="todos">Todos los períodos</option>
            <option value="mesActual">Mes actual</option>
            <option value="mesAnterior">Mes anterior</option>
            {mesesDisponibles.length > 0 && (
              <option value="especifico">Mes específico...</option>
            )}
          </select>

          {filtroMes === "especifico" && (
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:focus:ring-blue-500"
            >
              <option value="">Seleccionar mes</option>
              {mesesDisponibles.map((mesKey) => (
                <option key={mesKey} value={mesKey}>
                  {getNombreMes(mesKey)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto w-full pb-1 mb-6">
        <button
          onClick={() => setTipoGrafico("categoria")}
          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md transition text-xs md:text-sm whitespace-nowrap ${
            tipoGrafico === "categoria"
              ? "bg-blue-600 text-white dark:bg-gray-400 dark:text-gray-200 dark:hover:bg-gray-600"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          Por Categoría
        </button>
        <button
          onClick={() => setTipoGrafico("mes")}
          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md transition text-xs md:text-sm whitespace-nowrap ${
            tipoGrafico === "mes"
              ? "bg-blue-600 text-white dark:bg-gray-400 dark:text-gray-200 dark:hover:bg-gray-600"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          Por Mes
        </button>
        <button
          onClick={() => setTipoGrafico("formaPago")}
          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md transition text-xs md:text-sm whitespace-nowrap ${
            tipoGrafico === "formaPago"
              ? "bg-blue-600 text-white dark:bg-gray-400 dark:text-gray-200 dark:hover:bg-gray-600"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          Por Forma de Pago
        </button>
        <button
          onClick={() => setTipoGrafico("tendenciaFormaPago")}
          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md transition text-xs md:text-sm whitespace-nowrap ${
            tipoGrafico === "tendenciaFormaPago"
              ? "bg-blue-600 text-white dark:bg-gray-400 dark:text-gray-200 dark:hover:bg-gray-600"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          Tendencia por Pago
        </button>
      </div>

      {filtroMes !== "todos" && (
        <div className="mb-4 p-2 bg-blue-50 rounded-lg text-sm text-blue-700 dark:bg-blue-900 dark:text-blue-200">
          📊 Mostrando datos de:{" "}
          <strong>
            {filtroMes === "mesActual" && "este mes"}
            {filtroMes === "mesAnterior" && "el mes anterior"}
            {filtroMes === "especifico" &&
              mesSeleccionado &&
              getNombreMes(mesSeleccionado)}
          </strong>
          {filtroMes !== "especifico" && (
            <button
              onClick={() => setFiltroMes("todos")}
              className="ml-2 text-blue-500 hover:text-blue-700 underline dark:text-gray-400 dark:hover:text-blue-600"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      )}

      {/* Gráfico por Categoría */}
      {tipoGrafico === "categoria" && (
        <div>
          <div className="h-64 sm:h-80 md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gastosPorCategoria}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={
                    !isMobile
                      ? ({ percent }) => `${(percent * 100).toFixed(0)}%`
                      : false
                  }
                  outerRadius={isMobile ? 80 : 120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {gastosPorCategoria.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={formatCurrency} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {isMobile ? (
            renderLegendDropdown(gastosPorCategoria, "categorías")
          ) : (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
              {gastosPorCategoria.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 text-sm"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-600 truncate dark:text-gray-300">
                    {item.name}:
                  </span>
                  <span className="font-semibold dark:text-gray-300">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gráfico por Mes */}
      {tipoGrafico === "mes" && (
        <div className="h-64 sm:h-80 md:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gastosPorMes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={isMobile ? 60 : 80}
                tick={{ fontSize: isMobile ? 10 : 12 }}
              />
              <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
              <Tooltip formatter={formatCurrency} />
              <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
              <Bar dataKey="total" fill="#8884d8" name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico por Forma de Pago */}
      {tipoGrafico === "formaPago" && (
        <div>
          <div className="h-64 sm:h-80 md:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gastosPorFormaPago}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={
                    !isMobile
                      ? ({ percent }) => `${(percent * 100).toFixed(0)}%`
                      : false
                  }
                  outerRadius={isMobile ? 80 : 120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {gastosPorFormaPago.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={formatCurrency} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {isMobile &&
            renderLegendDropdown(gastosPorFormaPago, "formas de pago")}
        </div>
      )}

      {/* Gráfico de Tendencia por Forma de Pago */}
      {tipoGrafico === "tendenciaFormaPago" && (
        <div className="h-64 sm:h-80 md:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gastosPorMesFormaPago}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="nombre"
                angle={-45}
                textAnchor="end"
                height={isMobile ? 60 : 80}
                tick={{ fontSize: isMobile ? 10 : 12 }}
              />
              <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
              <Tooltip formatter={formatCurrency} />
              <Legend
                wrapperStyle={{ fontSize: isMobile ? 10 : 12 }}
                layout={isMobile ? "horizontal" : "horizontal"}
                verticalAlign="bottom"
              />
              {formasPagoUnicas.map((fp, index) => (
                <Bar
                  key={fp}
                  dataKey={fp}
                  stackId="a"
                  fill={COLORS[index % COLORS.length]}
                  name={fp}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Resumen responsive */}
      <div className="mt-6 p-3 md:p-4 bg-gray-50 rounded-lg dark:bg-gray-700">
        <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base dark:text-gray-300">
          Resumen
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
              Total de gastos
            </p>
            <p className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-300">
              {formatCurrency(
                gastosPorCategoria.reduce((sum, item) => sum + item.value, 0),
              )}
            </p>
          </div>
          <div>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
              Categoría con más gastos
            </p>
            <p
              className="text-sm md:text-xl font-bold text-gray-800 truncate dark:text-gray-300"
              title={
                gastosPorCategoria.length > 0 &&
                gastosPorCategoria.reduce(
                  (max, item) => (item.value > max.value ? item : max),
                  gastosPorCategoria[0],
                ).name
              }
            >
              {gastosPorCategoria.length > 0 &&
                gastosPorCategoria.reduce(
                  (max, item) => (item.value > max.value ? item : max),
                  gastosPorCategoria[0],
                ).name}
            </p>
          </div>
          <div>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
              Forma de pago más usada
            </p>
            <p
              className="text-sm md:text-xl font-bold text-gray-800 truncate dark:text-gray-300"
              title={
                gastosPorFormaPago.length > 0 &&
                gastosPorFormaPago.reduce(
                  (max, item) => (item.value > max.value ? item : max),
                  gastosPorFormaPago[0],
                ).name
              }
            >
              {gastosPorFormaPago.length > 0 &&
                gastosPorFormaPago.reduce(
                  (max, item) => (item.value > max.value ? item : max),
                  gastosPorFormaPago[0],
                ).name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
