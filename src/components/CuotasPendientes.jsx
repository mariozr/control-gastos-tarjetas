// components/CuotasPendientes.jsx
import { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { formatearMonto } from "../utils/formatearMonto";

export default function CuotasPendientes({ onError }) {
  const [cuotas, setCuotas] = useState([]);
  const [cuotasFiltradas, setCuotasFiltradas] = useState([]);
  const [totalPendiente, setTotalPendiente] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tarjetas, setTarjetas] = useState([]);
  const [filtroTarjeta, setFiltroTarjeta] = useState("todas");
  const [resumenPorTarjeta, setResumenPorTarjeta] = useState({});

  useEffect(() => {
    cargarTarjetas();
    cargarCuotasPendientes();
  }, []);

  useEffect(() => {
    aplicarFiltro();
  }, [filtroTarjeta, cuotas]);

  const cargarTarjetas = async () => {
    const { data, error } = await supabase
      .from("tarjetas_credito")
      .select("id, nombre, ultimos_digitos, color")
      .eq("activa", true)
      .order("favorita", { ascending: false })
      .order("nombre");

    if (!error && data) {
      setTarjetas(data);
    }
  };

  const cargarCuotasPendientes = async () => {
    setLoading(true);
    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("gastos")
      .select(
        `
        *,
        tarjetas_credito (
          id,
          nombre,
          ultimos_digitos,
          color
        )
      `,
      )
      .eq("tipo_gasto", "credito_cuota")
      .gte("fecha", hoy)
      .order("fecha", { ascending: true });

    if (error) {
      if (onError)
        onError("Error al cargar cuotas pendientes: " + error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setCuotas(data);

      // Calcular resumen por tarjeta
      const resumen = {};
      data.forEach((cuota) => {
        const tarjetaId = cuota.tarjeta_credito_id;
        if (tarjetaId) {
          if (!resumen[tarjetaId]) {
            resumen[tarjetaId] = {
              total: 0,
              cantidad: 0,
              nombre: cuota.tarjetas_credito?.nombre || "Sin identificar",
              ultimos_digitos: cuota.tarjetas_credito?.ultimos_digitos || "",
              color: cuota.tarjetas_credito?.color || "#6B7280",
            };
          }
          resumen[tarjetaId].total += cuota.monto;
          resumen[tarjetaId].cantidad++;
        } else {
          if (!resumen["sin-tarjeta"]) {
            resumen["sin-tarjeta"] = {
              total: 0,
              cantidad: 0,
              nombre: "Sin tarjeta asignada",
              ultimos_digitos: "",
              color: "#9CA3AF",
            };
          }
          resumen["sin-tarjeta"].total += cuota.monto;
          resumen["sin-tarjeta"].cantidad++;
        }
      });
      setResumenPorTarjeta(resumen);
    }
    setLoading(false);
  };

  const aplicarFiltro = () => {
    if (filtroTarjeta === "todas") {
      setCuotasFiltradas(cuotas);
      const total = cuotas.reduce((sum, cuota) => sum + cuota.monto, 0);
      setTotalPendiente(total);
    } else if (filtroTarjeta === "sin-tarjeta") {
      const filtradas = cuotas.filter((cuota) => !cuota.tarjeta_credito_id);
      setCuotasFiltradas(filtradas);
      const total = filtradas.reduce((sum, cuota) => sum + cuota.monto, 0);
      setTotalPendiente(total);
    } else {
      const filtradas = cuotas.filter(
        (cuota) => cuota.tarjeta_credito_id === parseInt(filtroTarjeta),
      );
      setCuotasFiltradas(filtradas);
      const total = filtradas.reduce((sum, cuota) => sum + cuota.monto, 0);
      setTotalPendiente(total);
    }
  };

  const getDiasRestantes = (fecha) => {
    const fechaVencimiento = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diffTime = fechaVencimiento - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatearFecha = (fechaString) => {
    if (!fechaString) return "";
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const obtenerNombreTarjeta = (cuota) => {
    if (!cuota.tarjeta_credito_id) return null;
    return cuota.tarjetas_credito;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (cuotas.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <span className="text-5xl mb-4 block">🎉</span>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            No hay cuotas pendientes
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            ¡Todas tus cuotas están al día!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              ⏰ Cuotas Pendientes de Pago
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {cuotasFiltradas.length} cuotas
              </span>
            </h3>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/80">Total pendiente</p>
            <p className="text-xl font-bold text-white">
              {formatearMonto(totalPendiente)}
            </p>
          </div>
        </div>
      </div>

      {/* Filtro por tarjeta */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          💳 Filtrar por tarjeta
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroTarjeta("todas")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filtroTarjeta === "todas"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Todas
          </button>

          {tarjetas.map((tarjeta) => {
            const resumen = resumenPorTarjeta[tarjeta.id];
            return (
              <button
                key={tarjeta.id}
                onClick={() => setFiltroTarjeta(tarjeta.id.toString())}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  filtroTarjeta === tarjeta.id.toString()
                    ? "text-white shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                }`}
                style={{
                  backgroundColor:
                    filtroTarjeta === tarjeta.id.toString()
                      ? tarjeta.color
                      : undefined,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: tarjeta.color }}
                />
                {tarjeta.nombre}
                <span className="text-xs opacity-75">
                  •••• {tarjeta.ultimos_digitos}
                </span>
                {resumen && (
                  <span className="text-xs ml-1 px-1.5 py-0.5 rounded-full bg-white/20">
                    ${resumen.total.toFixed(0)}
                  </span>
                )}
              </button>
            );
          })}

          {resumenPorTarjeta["sin-tarjeta"] && (
            <button
              onClick={() => setFiltroTarjeta("sin-tarjeta")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                filtroTarjeta === "sin-tarjeta"
                  ? "bg-gray-600 text-white shadow-md"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              Sin tarjeta
              <span className="text-xs ml-1 px-1.5 py-0.5 rounded-full bg-white/20">
                ${resumenPorTarjeta["sin-tarjeta"].total.toFixed(0)}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Lista de cuotas pendientes */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {cuotasFiltradas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No hay cuotas pendientes para esta tarjeta
            </p>
          </div>
        ) : (
          cuotasFiltradas.map((cuota) => {
            const diasRestantes = getDiasRestantes(cuota.fecha);
            const esUrgente = diasRestantes <= 5 && diasRestantes >= 0;
            const tarjetaInfo = obtenerNombreTarjeta(cuota);

            return (
              <div
                key={cuota.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {cuota.descripcion}
                      </span>

                      {/* Badge de tarjeta */}
                      {tarjetaInfo && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${tarjetaInfo.color}20`,
                            color: tarjetaInfo.color,
                          }}
                        >
                          💳 {tarjetaInfo.nombre} ••••{" "}
                          {tarjetaInfo.ultimos_digitos}
                        </span>
                      )}

                      {!tarjetaInfo &&
                        cuota.forma_pago === "Tarjeta de Crédito" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            💳 Sin tarjeta asignada
                          </span>
                        )}

                      {esUrgente && diasRestantes >= 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 animate-pulse">
                          ⚠️ Urgente
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Vence: {formatearFecha(cuota.fecha)}
                      {diasRestantes > 0 && (
                        <span
                          className={`ml-2 text-xs ${
                            diasRestantes <= 5
                              ? "text-red-500 font-semibold"
                              : ""
                          }`}
                        >
                          (en {diasRestantes} días)
                        </span>
                      )}
                      {diasRestantes === 0 && (
                        <span className="ml-2 text-xs text-red-500 font-semibold">
                          (Vence hoy)
                        </span>
                      )}
                      {diasRestantes < 0 && (
                        <span className="ml-2 text-xs text-red-600 font-semibold">
                          (Vencida hace {Math.abs(diasRestantes)} días)
                        </span>
                      )}
                    </div>

                    {/* Información de la compra original */}
                    {cuota.fecha_compra && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Compra original: {formatearFecha(cuota.fecha_compra)}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {formatearMonto(cuota.monto)}
                    </p>
                    {cuota.cuota_actual && cuota.total_cuotas && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Cuota {cuota.cuota_actual}/{cuota.total_cuotas}
                      </p>
                    )}
                  </div>
                </div>

                {/* Barra de progreso para la tarjeta específica (si tiene varias cuotas) */}
                {tarjetaInfo && resumenPorTarjeta[cuota.tarjeta_credito_id] && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Total pendiente en esta tarjeta</span>
                      <span>
                        {formatearMonto(
                          resumenPorTarjeta[cuota.tarjeta_credito_id].total,
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div
                        className="h-1 rounded-full transition-all"
                        style={{
                          width: `${(cuota.monto / resumenPorTarjeta[cuota.tarjeta_credito_id].total) * 100}%`,
                          backgroundColor: tarjetaInfo.color,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer con resumen por tarjeta */}
      {Object.keys(resumenPorTarjeta).length > 1 &&
        filtroTarjeta === "todas" && (
          <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              📊 Resumen por tarjeta:
            </p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(resumenPorTarjeta).map(([id, data]) => (
                <div key={id} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: data.color }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {data.nombre}:
                  </span>
                  <span className="text-xs font-semibold text-gray-800 dark:text-white">
                    {formatearMonto(data.total)}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({data.cantidad} cuotas)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Botón actualizar */}
      <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button
          onClick={() => {
            cargarCuotasPendientes();
            cargarTarjetas();
          }}
          className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Actualizar
        </button>
      </div>
    </div>
  );
}
