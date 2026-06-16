// components/ListaGastos.jsx
import { useEffect, useState } from "react";
import { supabase } from "../config/supabase";
import { formatearMonto } from "../utils/formatearMonto";
import BotonExportar from "./BotonExportar";

export default function ListaGastos({
  onGastoEliminado,
  onGastoEditado,
  onError,
}) {
  const [gastos, setGastos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalMensual, setTotalMensual] = useState(0);
  const [totalConsumo, setTotalConsumo] = useState(0);
  const [totalConsumoMensual, setTotalConsumoMensual] = useState(0);
  const [mostrarTotalMensual, setMostrarTotalMensual] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroFormaPago, setFiltroFormaPago] = useState("todas");
  const [filtroTiempo, setFiltroTiempo] = useState("todos");
  const [filtroTarjeta, setFiltroTarjeta] = useState("todas");
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [periodosDisponibles, setPeriodosDisponibles] = useState([]);
  const [fechasDisponibles, setFechasDisponibles] = useState({
    semanas: [],
    meses: [],
  });
  const [semanaSeleccionada, setSemanaSeleccionada] = useState("");
  const [mesSeleccionado, setMesSeleccionado] = useState("");
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [formasPagoDisponibles, setFormasPagoDisponibles] = useState([]);
  const [formasPagoDisponiblesObj, setFormasPagoDisponiblesObj] = useState({});
  const [tarjetasDisponibles, setTarjetasDisponibles] = useState([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [filtrosExportar, setFiltrosExportar] = useState({
    categoria: "todos",
    formaPago: "todas",
    tiempo: "todos",
    mesSeleccionado: "",
    fechaInicio: "",
    fechaFin: "",
  });
  const [isMobile, setIsMobile] = useState(false);

  // Estados para edición
  const [editandoGasto, setEditandoGasto] = useState(null);
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
  const [editando, setEditando] = useState(false);

  const formatearFecha = (fechaString) => {
    if (!fechaString) return "";
    const [year, month, day] = fechaString.split("-");
    return `${day}/${month}/${year}`;
  };

  const getSemana = (fecha) => {
    const date = new Date(fecha);
    const inicio = new Date(date.getFullYear(), 0, 1);
    const dias = Math.floor((date - inicio) / (24 * 60 * 60 * 1000));
    return Math.ceil((dias + inicio.getDay() + 1) / 7);
  };

  const getMesActual = () => {
    const ahora = new Date();
    return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  };

  const obtenerFechasDisponibles = (gastosData) => {
    const semanasSet = new Set();
    const mesesSet = new Set();

    gastosData.forEach((gasto) => {
      const fecha = new Date(gasto.fecha);
      const semana = getSemana(fecha);
      const año = fecha.getFullYear();
      const semanaKey = `${año}-Semana ${semana}`;
      semanasSet.add(semanaKey);

      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      mesesSet.add(mesKey);
    });

    return {
      semanas: Array.from(semanasSet).sort(),
      meses: Array.from(mesesSet).sort(),
    };
  };

  const debeSumarseAlTotal = (gasto) => {
    return (
      gasto.tipo_gasto === "simple" || gasto.tipo_gasto === "credito_cuota"
    );
  };

  const debeSumarseAlTotalConsumo = (gasto) => {
    return (
      gasto.tipo_gasto === "simple" || gasto.tipo_gasto === "credito_compra"
    );
  };

  const getEstiloGasto = (gasto) => {
    if (gasto.tipo_gasto === "credito_compra") {
      return {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        border: "border-blue-200 dark:border-blue-800",
        badge: {
          bg: "bg-blue-100 dark:bg-blue-900",
          text: "text-blue-700 dark:text-blue-300",
          icon: "💳",
          label: "Compra a Crédito",
        },
      };
    } else if (gasto.tipo_gasto === "credito_cuota") {
      return {
        bg: "bg-purple-50 dark:bg-purple-900/20",
        border: "border-purple-200 dark:border-purple-800",
        badge: {
          bg: "bg-purple-100 dark:bg-purple-900",
          text: "text-purple-700 dark:text-purple-300",
          icon: "📅",
          label: `Cuota ${gasto.cuota_actual}/${gasto.total_cuotas}`,
        },
      };
    } else {
      return {
        bg: "bg-white dark:bg-gray-800",
        border: "border-gray-200 dark:border-gray-700",
        badge: null,
      };
    }
  };

  const cargarCategorias = async () => {
    const { data, error } = await supabase
      .from("categorias")
      .select("nombre")
      .order("nombre");

    if (!error && data) {
      setCategoriasDisponibles(data.map((cat) => cat.nombre));
    } else {
      setCategoriasDisponibles([
        "Comida",
        "Transporte",
        "Entretenimiento",
        "Servicios",
        "Salud",
        "Otros",
      ]);
    }
  };

  const cargarFormasPago = async () => {
    const { data, error } = await supabase
      .from("formas_pago")
      .select("*")
      .order("nombre");

    if (!error && data) {
      const nombres = data.map((fp) => fp.nombre);
      setFormasPagoDisponibles(nombres);
      const obj = {};
      data.forEach((fp) => {
        obj[fp.nombre] = { color: fp.color || "#10B981" };
      });
      setFormasPagoDisponiblesObj(obj);
    } else {
      setFormasPagoDisponibles([
        "Efectivo",
        "Tarjeta de Crédito",
        "Tarjeta de Débito",
        "Transferencia",
        "Mercado Pago",
        "Otro",
      ]);
      const objDefault = {
        Efectivo: { color: "#10B981" },
        "Tarjeta de Crédito": { color: "#3B82F6" },
        "Tarjeta de Débito": { color: "#6366F1" },
        Transferencia: { color: "#8B5CF6" },
        "Mercado Pago": { color: "#F59E0B" },
        Otro: { color: "#6B7280" },
      };
      setFormasPagoDisponiblesObj(objDefault);
    }
  };

  const cargarTarjetas = async () => {
    const { data, error } = await supabase
      .from("tarjetas_credito")
      .select("id, nombre, ultimos_digitos, color")
      .eq("activa", true)
      .order("favorita", { ascending: false });

    if (!error && data) {
      setTarjetasDisponibles(data);
    }
  };

  const getColorFormaPago = (formaPagoNombre) => {
    const formaPago = formasPagoDisponiblesObj[formaPagoNombre];
    if (formaPago && formaPago.color) {
      return { bg: `${formaPago.color}20`, text: formaPago.color };
    }
    return { bg: "#E5EBEF", text: "#6B7280" };
  };

  const getTarjetaInfo = (tarjetaId) => {
    return tarjetasDisponibles.find((t) => t.id === tarjetaId);
  };

  const cargarGastos = async () => {
    setLoading(true);

    let query = supabase
      .from("gastos")
      .select("*")
      .order("fecha", { ascending: false });

    if (filtroCategoria !== "todos") {
      query = query.eq("categoria", filtroCategoria);
    }
    if (filtroFormaPago !== "todas") {
      query = query.eq("forma_pago", filtroFormaPago);
    }
    if (filtroTarjeta !== "todas") {
      query = query.eq("tarjeta_credito_id", parseInt(filtroTarjeta));
    }

    const { data, error } = await query;

    if (error) {
      onError("Error al cargar gastos: " + error.message);
      setLoading(false);
      return;
    }

    let todosLosGastos = data || [];

    // Filtro de búsqueda
    let gastosFiltrados = [...todosLosGastos];
    if (busquedaTexto.trim()) {
      const textoBusqueda = busquedaTexto.toLowerCase().trim();
      gastosFiltrados = gastosFiltrados.filter((gasto) => {
        if (gasto.descripcion?.toLowerCase().includes(textoBusqueda))
          return true;
        if (gasto.categoria?.toLowerCase().includes(textoBusqueda)) return true;
        if (gasto.forma_pago?.toLowerCase().includes(textoBusqueda))
          return true;
        if (gasto.monto?.toString().includes(textoBusqueda)) return true;
        const fechaFormateada = formatearFecha(gasto.fecha);
        if (fechaFormateada.includes(textoBusqueda)) return true;
        return false;
      });
    }

    // Filtro de tiempo
    const mesActual = getMesActual();
    let gastosFiltradosPorTiempo = [...gastosFiltrados];

    if (filtroTiempo === "todos") {
      gastosFiltradosPorTiempo = gastosFiltrados.filter((gasto) => {
        const fechaGasto = gasto.fecha;
        const añoGasto = fechaGasto.substring(0, 4);
        const mesGasto = fechaGasto.substring(5, 7);
        return `${añoGasto}-${mesGasto}` === mesActual;
      });
      setMostrarTotalMensual(true);
    } else if (filtroTiempo === "semana" && semanaSeleccionada) {
      const [año, semanaNum] = semanaSeleccionada.split("-Semana ");
      gastosFiltradosPorTiempo = gastosFiltrados.filter((gasto) => {
        const fecha = new Date(gasto.fecha);
        const semana = getSemana(fecha);
        return (
          fecha.getFullYear() === parseInt(año) &&
          semana === parseInt(semanaNum)
        );
      });
      setMostrarTotalMensual(false);
    } else if (filtroTiempo === "mes" && mesSeleccionado) {
      const [año, mes] = mesSeleccionado.split("-");
      gastosFiltradosPorTiempo = gastosFiltrados.filter((gasto) => {
        const fechaGasto = gasto.fecha;
        const añoGasto = fechaGasto.substring(0, 4);
        const mesGasto = fechaGasto.substring(5, 7);
        return añoGasto === año && mesGasto === mes;
      });
      setMostrarTotalMensual(false);
    } else if (filtroTiempo === "personalizado" && fechaInicio && fechaFin) {
      gastosFiltradosPorTiempo = gastosFiltrados.filter((gasto) => {
        const fechaGasto = gasto.fecha;
        return fechaGasto >= fechaInicio && fechaGasto <= fechaFin;
      });
      setMostrarTotalMensual(false);
    }

    // Calcular totales
    let gastosParaTotal = gastosFiltradosPorTiempo.filter((g) =>
      debeSumarseAlTotal(g),
    );
    const sumaTotal = gastosParaTotal.reduce(
      (acc, gasto) => acc + gasto.monto,
      0,
    );

    const gastosMesActual = todosLosGastos.filter((gasto) => {
      const fechaGasto = gasto.fecha;
      const añoGasto = fechaGasto.substring(0, 4);
      const mesGasto = fechaGasto.substring(5, 7);
      return (
        `${añoGasto}-${mesGasto}` === mesActual && debeSumarseAlTotal(gasto)
      );
    });
    const sumaMensual = gastosMesActual.reduce(
      (acc, gasto) => acc + gasto.monto,
      0,
    );
    setTotalMensual(sumaMensual);

    // Calcular totales de consumo
    let gastosParaTotalConsumo = gastosFiltradosPorTiempo.filter((g) =>
      debeSumarseAlTotalConsumo(g),
    );
    const sumaTotalConsumo = gastosParaTotalConsumo.reduce(
      (acc, gasto) => acc + gasto.monto,
      0,
    );

    const gastosMesActualConsumo = todosLosGastos.filter((gasto) => {
      const fechaGasto = gasto.fecha;
      const añoGasto = fechaGasto.substring(0, 4);
      const mesGasto = fechaGasto.substring(5, 7);
      return (
        `${añoGasto}-${mesGasto}` === mesActual && debeSumarseAlTotalConsumo(gasto)
      );
    });
    const sumaMensualConsumo = gastosMesActualConsumo.reduce(
      (acc, gasto) => acc + gasto.monto,
      0,
    );
    setTotalConsumoMensual(sumaMensualConsumo);
    setTotalConsumo(sumaTotalConsumo);

    setTotal(sumaTotal);
    setGastos(gastosFiltradosPorTiempo);

    const fechas = obtenerFechasDisponibles(todosLosGastos);
    setFechasDisponibles(fechas);

    setLoading(false);
  };

  /* Función para obtener periodos únicos de las cuotas */
  const obtenerPeriodosUnicos = (gastos) => {
    const periodos = new Set();
    gastos.forEach((gasto) => {
      if (gasto.periodo_cierre) {
        periodos.add(gasto.periodo_cierre);
      }
    });
    return Array.from(periodos).sort().reverse();
  };

  useEffect(() => {
    cargarCategorias();
    cargarFormasPago();
    cargarTarjetas();
  }, []);

  useEffect(() => {
    cargarGastos();
  }, [
    busquedaTexto,
    filtroCategoria,
    filtroFormaPago,
    filtroTarjeta,
    filtroTiempo,
    semanaSeleccionada,
    mesSeleccionado,
    fechaInicio,
    fechaFin,
  ]);

  useEffect(() => {
    setFiltrosExportar({
      categoria: filtroCategoria,
      formaPago: filtroFormaPago,
      tiempo: filtroTiempo,
      mesSeleccionado: mesSeleccionado,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
    });
  }, [
    filtroCategoria,
    filtroFormaPago,
    filtroTiempo,
    mesSeleccionado,
    fechaInicio,
    fechaFin,
  ]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const eliminarGasto = async (id) => {
    if (confirm("¿Estás seguro de eliminar este gasto?")) {
      const { error } = await supabase.from("gastos").delete().eq("id", id);
      if (error) {
        onError("Error al eliminar: " + error.message);
      } else {
        cargarGastos();
        if (onGastoEliminado) {
          onGastoEliminado();
        }
      }
    }
  };

  const abrirModalEdicion = (gasto) => {
    setEditandoGasto({ ...gasto });
    setMostrarModalEdicion(true);
  };

  const handleEditChange = (e) => {
    setEditandoGasto({
      ...editandoGasto,
      [e.target.name]: e.target.value,
    });
  };

  const guardarEdicion = async () => {
    if (!editandoGasto.descripcion.trim()) {
      onError("Por favor ingresa una descripción");
      return;
    }

    if (parseFloat(editandoGasto.monto) <= 0) {
      onError("Por favor ingresa un monto válido");
      return;
    }

    setEditando(true);

    const { error } = await supabase
      .from("gastos")
      .update({
        descripcion: editandoGasto.descripcion,
        monto: parseFloat(editandoGasto.monto),
        categoria: editandoGasto.categoria,
        forma_pago: editandoGasto.forma_pago,
        fecha: editandoGasto.fecha,
      })
      .eq("id", editandoGasto.id);

    if (error) {
      onError("Error al editar gasto: " + error.message);
    } else {
      setMostrarModalEdicion(false);
      setEditandoGasto(null);
      cargarGastos();
      if (onGastoEditado) {
        onGastoEditado();
      }
    }
    setEditando(false);
  };

  const handleFiltroTiempoChange = (tipo) => {
    setFiltroTiempo(tipo);
    setSemanaSeleccionada("");
    setMesSeleccionado("");
    setFechaInicio("");
    setFechaFin("");
  };

  const limpiarFiltroPersonalizado = () => {
    setFechaInicio("");
    setFechaFin("");
    setFiltroTiempo("todos");
  };

  const limpiarBuscador = () => {
    setBusquedaTexto("");
  };

  const getNombreMes = (mesKey) => {
    if (!mesKey) return "";
    const [año, mes] = mesKey.split("-");
    const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
    return fecha.toLocaleString("es", { month: "long", year: "numeric" });
  };

  const resaltarTexto = (texto) => {
    if (!busquedaTexto.trim()) return texto;
    const regex = new RegExp(
      `(${busquedaTexto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const partes = texto.split(regex);
    return partes.map((parte, i) =>
      regex.test(parte) ? (
        <mark
          key={i}
          className="bg-yellow-200 dark:bg-yellow-800 text-gray-900 dark:text-white px-0.5 rounded"
        >
          {parte}
        </mark>
      ) : (
        parte
      ),
    );
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors duration-200">
        <div className="mb-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Gastos
            </h2>
            <div className="flex flex-wrap md:flex-nowrap gap-6 text-right justify-end w-full md:w-auto">
              <div className="border-r border-gray-200 dark:border-gray-700 pr-6 last:border-0 last:pr-0">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {filtroTiempo === "todos"
                    ? "Total del mes (pagos reales)"
                    : "Total real (filtro)"}
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatearMonto(
                    filtroTiempo === "todos" ? totalMensual : total,
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {filtroTiempo === "todos"
                    ? "Total consumido (sin cuotas anter.)"
                    : "Total consumido (filtro)"}
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatearMonto(
                    filtroTiempo === "todos" ? totalConsumoMensual : totalConsumo,
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <BotonExportar filtros={filtrosExportar} />
          </div>
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
            🔍 Buscar gastos
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por descripción, categoría, forma de pago, monto o fecha..."
              value={busquedaTexto}
              onChange={(e) => setBusquedaTexto(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {busquedaTexto && (
              <button
                onClick={limpiarBuscador}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          {busquedaTexto && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Mostrando {gastos.length} resultado(s) para "{busquedaTexto}"
            </div>
          )}
        </div>

        {/* Leyenda */}
        <div className="mb-4 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">
              Gasto simple
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">
              💰 Compra a crédito (no suma)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">
              📅 Cuota de crédito (sí suma)
            </span>
          </div>
        </div>

        {/* Filtros */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-400">
              Categoría
            </label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="todos">Todas las categorías</option>
              {categoriasDisponibles.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-400">
              Forma de Pago
            </label>
            <select
              value={filtroFormaPago}
              onChange={(e) => setFiltroFormaPago(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="todas">Todas las formas de pago</option>
              {formasPagoDisponibles.map((fp) => (
                <option key={fp} value={fp}>
                  {fp}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Tarjeta */}
          {tarjetasDisponibles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-400">
                💳 Tarjeta de Crédito
              </label>
              <select
                value={filtroTarjeta}
                onChange={(e) => setFiltroTarjeta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="todas">Todas las tarjetas</option>
                {tarjetasDisponibles.map((tarjeta) => (
                  <option key={tarjeta.id} value={tarjeta.id}>
                    {tarjeta.nombre} •••• {tarjeta.ultimos_digitos}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por período según fecha de cierre */}
          {periodosDisponibles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-400">
                📅 Período de cierre
              </label>
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              >
                <option value="todos">Todos los períodos</option>
                {periodosDisponibles.map((periodo) => (
                  <option key={periodo} value={periodo}>
                    {periodo}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
              Período de tiempo
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <button
                onClick={() => handleFiltroTiempoChange("todos")}
                className={`px-3 py-2 rounded-md transition ${
                  filtroTiempo === "todos"
                    ? "bg-blue-600 text-white dark:bg-gray-400 dark:text-gray-200"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Mes actual
              </button>
              <button
                onClick={() => handleFiltroTiempoChange("semana")}
                className={`px-3 py-2 rounded-md transition ${
                  filtroTiempo === "semana"
                    ? "bg-blue-600 text-white dark:bg-gray-400 dark:text-gray-200"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Por Semana
              </button>
              <button
                onClick={() => handleFiltroTiempoChange("mes")}
                className={`px-3 py-2 rounded-md transition ${
                  filtroTiempo === "mes"
                    ? "bg-blue-600 text-white dark:bg-gray-400 dark:text-gray-200"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Por Mes
              </button>
              <button
                onClick={() => handleFiltroTiempoChange("personalizado")}
                className={`px-3 py-2 rounded-md transition ${
                  filtroTiempo === "personalizado"
                    ? "bg-blue-600 text-white dark:bg-gray-400 dark:text-gray-200"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Personalizado
              </button>
            </div>

            {filtroTiempo === "semana" && (
              <select
                value={semanaSeleccionada}
                onChange={(e) => setSemanaSeleccionada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
              >
                <option value="">Seleccionar semana</option>
                {fechasDisponibles.semanas.map((semana) => (
                  <option key={semana} value={semana}>
                    {semana}
                  </option>
                ))}
              </select>
            )}

            {filtroTiempo === "mes" && (
              <select
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
              >
                <option value="">Seleccionar mes</option>
                {fechasDisponibles.meses.map((mesKey) => (
                  <option key={mesKey} value={mesKey}>
                    {getNombreMes(mesKey)}
                  </option>
                ))}
              </select>
            )}

            {filtroTiempo === "personalizado" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-400">
                      Fecha inicio
                    </label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-400">
                      Fecha fin
                    </label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                    />
                  </div>
                </div>
                <button
                  onClick={limpiarFiltroPersonalizado}
                  className="w-full bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600 transition dark:bg-gray-400 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400">
            Cargando...
          </p>
        ) : gastos.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {busquedaTexto
                ? `No se encontraron gastos para "${busquedaTexto}"`
                : "No hay gastos registrados con los filtros seleccionados"}
            </p>
            {busquedaTexto && (
              <button
                onClick={limpiarBuscador}
                className="mt-2 text-sm text-blue-500 hover:text-blue-700"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {gastos.map((gasto) => {
              const colorStyle = getColorFormaPago(
                gasto.forma_pago || "Efectivo",
              );
              const estiloGasto = getEstiloGasto(gasto);
              const tarjetaInfo = gasto.tarjeta_credito_id
                ? getTarjetaInfo(gasto.tarjeta_credito_id)
                : null;

              return (
                <div
                  key={gasto.id}
                  className={`flex justify-between items-center p-3 border rounded-lg transition-colors ${estiloGasto.bg} ${estiloGasto.border} hover:shadow-md`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {resaltarTexto(gasto.descripcion)}
                      </span>
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                        {resaltarTexto(gasto.categoria)}
                      </span>
                      <span
                        className="text-xs px-2 py-1 rounded font-medium"
                        style={{
                          backgroundColor: colorStyle.bg,
                          color: colorStyle.text,
                        }}
                      >
                        💳 {resaltarTexto(gasto.forma_pago || "Efectivo")}
                      </span>

                      {estiloGasto.badge && (
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${estiloGasto.badge.bg} ${estiloGasto.badge.text}`}
                        >
                          {estiloGasto.badge.icon} {estiloGasto.badge.label}
                        </span>
                      )}

                      {tarjetaInfo && (
                        <span
                          className="text-xs px-2 py-1 rounded font-medium"
                          style={{
                            backgroundColor: `${tarjetaInfo.color}20`,
                            color: tarjetaInfo.color,
                          }}
                        >
                          💳 {tarjetaInfo.nombre} ••••{" "}
                          {tarjetaInfo.ultimos_digitos}
                        </span>
                      )}

                      {gasto.tiene_interes &&
                        gasto.tipo_gasto === "credito_compra" && (
                          <span className="text-xs px-2 py-1 rounded bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                            ⚡ Con interés
                          </span>
                        )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatearFecha(gasto.fecha)}
                      {gasto.tipo_gasto === "credito_cuota" &&
                        gasto.fecha_compra && (
                          <span className="ml-2 text-xs">
                            (Compra: {formatearFecha(gasto.fecha_compra)})
                          </span>
                        )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${gasto.tipo_gasto === "credito_compra" ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {formatearMonto(gasto.monto)}
                    </div>
                    {gasto.tipo_gasto === "credito_compra" &&
                      gasto.total_cuotas && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {gasto.total_cuotas} cuotas de{" "}
                          {formatearMonto(
                            gasto.monto_cuota ||
                              gasto.monto / gasto.total_cuotas,
                          )}
                        </div>
                      )}
                    <div className="flex gap-2 justify-end mt-1">
                      <button
                        onClick={() => abrirModalEdicion(gasto)}
                        className="text-blue-500 hover:text-blue-700 text-sm dark:text-blue-400 dark:hover:text-blue-600"
                        title="Editar"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => eliminarGasto(gasto.id)}
                        className="text-red-500 hover:text-red-700 text-sm dark:text-red-400 dark:hover:text-red-600"
                        title="Eliminar"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Edición */}
      {mostrarModalEdicion && editandoGasto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                Editar Gasto
              </h3>
              <button
                onClick={() => {
                  setMostrarModalEdicion(false);
                  setEditandoGasto(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl dark:text-gray-400 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Descripción
                </label>
                <input
                  type="text"
                  name="descripcion"
                  value={editandoGasto.descripcion}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Monto
                </label>
                <input
                  type="number"
                  name="monto"
                  value={editandoGasto.monto}
                  onChange={handleEditChange}
                  step="0.01"
                  min="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Categoría
                </label>
                <select
                  name="categoria"
                  value={editandoGasto.categoria}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {categoriasDisponibles.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Forma de Pago
                </label>
                <select
                  name="forma_pago"
                  value={editandoGasto.forma_pago}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {formasPagoDisponibles.map((fp) => (
                    <option key={fp} value={fp}>
                      {fp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Fecha
                </label>
                <input
                  type="date"
                  name="fecha"
                  value={editandoGasto.fecha}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t dark:border-gray-700">
              <button
                onClick={guardarEdicion}
                disabled={editando}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:bg-blue-300"
              >
                {editando ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                onClick={() => {
                  setMostrarModalEdicion(false);
                  setEditandoGasto(null);
                }}
                className="flex-1 bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
