// components/ResumenCreditos.jsx
import { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { formatearMonto } from "../utils/formatearMonto";

export default function ResumenCreditos() {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandirCompra, setExpandirCompra] = useState(null);

  useEffect(() => {
    cargarComprasCredito();
  }, []);

  const cargarComprasCredito = async () => {
    setLoading(true);

    // Cargar compras principales (tipo_gasto = 'credito_compra')
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
      .eq("tipo_gasto", "credito_compra")
      .order("fecha_compra", { ascending: false });

    if (error) {
      console.error("Error al cargar compras a crédito:", error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setCompras([]);
      setLoading(false);
      return;
    }

    // Para cada compra, calcular cuántas cuotas ya se pagaron
    const comprasConInfo = await Promise.all(
      data.map(async (compra) => {
        // Obtener todas las cuotas de esta compra
        const { data: cuotas } = await supabase
          .from("gastos")
          .select("id, fecha, monto, cuota_actual")
          .eq("gasto_original_id", compra.id)
          .eq("tipo_gasto", "credito_cuota")
          .order("cuota_actual", { ascending: true });

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const cuotasPagadas =
          cuotas?.filter((c) => new Date(c.fecha) < hoy) || [];
        const cuotasPendientes =
          cuotas?.filter((c) => new Date(c.fecha) >= hoy) || [];
        const cuotasPagadasCount = cuotasPagadas.length;
        const cuotasRestantes =
          (compra.total_cuotas || cuotas?.length || 0) - cuotasPagadasCount;

        const montoCuota =
          compra.monto_cuota ||
          (compra.monto_con_interes || compra.monto) / compra.total_cuotas;
        const montoRestante = cuotasRestantes * montoCuota;
        const progreso =
          (cuotasPagadasCount / (compra.total_cuotas || 1)) * 100;

        // Próxima cuota a pagar
        const proximaCuota = cuotasPendientes[0];

        return {
          ...compra,
          cuotas: cuotas || [],
          cuotasPagadas: cuotasPagadasCount,
          cuotasRestantes,
          montoRestante,
          montoCuota,
          progreso,
          proximaCuota,
        };
      }),
    );

    setCompras(comprasConInfo);
    setLoading(false);
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

  const toggleExpandir = (id) => {
    if (expandirCompra === id) {
      setExpandirCompra(null);
    } else {
      setExpandirCompra(id);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (compras.length === 0) {
    return null;
  }

  // Calcular totales
  const totalRestante = compras.reduce(
    (sum, compra) => sum + compra.montoRestante,
    0,
  );
  const totalCuotasPendientes = compras.reduce(
    (sum, compra) => sum + compra.cuotasRestantes,
    0,
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            🏦 Compras a Crédito Activas
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {compras.length} compras
            </span>
          </h3>
          <div className="text-right">
            <p className="text-xs text-white/80">Total pendiente</p>
            <p className="text-xl font-bold text-white">
              {formatearMonto(totalRestante)}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de compras */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {compras.map((compra) => (
          <div
            key={compra.id}
            className="p-4 hover:bg-gray-50 dark:hover:bg-blue-950 transition"
          >
            {/* Cabecera de la compra - siempre visible */}
            <div
              className="cursor-pointer"
              onClick={() => toggleExpandir(compra.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {compra.descripcion}
                    </span>
                    {compra.tarjetas_credito && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${compra.tarjetas_credito.color}20`,
                          color: compra.tarjetas_credito.color,
                        }}
                      >
                        💳 {compra.tarjetas_credito.nombre} ••••{" "}
                        {compra.tarjetas_credito.ultimos_digitos}
                      </span>
                    )}
                    {compra.tiene_interes && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
                        ⚡{" "}
                        {compra.tipo_interes === "porcentaje"
                          ? `${compra.valor_interes}% interés`
                          : `+$${compra.valor_interes} interés`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    📅 Compra: {formatearFecha(compra.fecha_compra)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total:{" "}
                    {formatearMonto(compra.monto_con_interes || compra.monto)}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>
                      {compra.cuotasPagadas}/{compra.total_cuotas} cuotas
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${expandirCompra === compra.id ? "rotate-180" : ""}`}
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
                  </div>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progreso de pago</span>
                  <span>{Math.round(compra.progreso)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${compra.progreso}%`,
                      background: `linear-gradient(90deg, #10B981, ${compra.tarjetas_credito?.color || "#3B82F6"})`,
                    }}
                  />
                </div>
              </div>

              {/* Resumen rápido */}
              <div className="flex justify-between mt-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Valor por cuota
                  </p>
                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    {formatearMonto(compra.montoCuota)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Cuotas restantes
                  </p>
                  <p className="font-semibold text-orange-600 dark:text-orange-400">
                    {compra.cuotasRestantes}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Monto pendiente
                  </p>
                  <p className="font-bold text-red-600 dark:text-red-400">
                    {formatearMonto(compra.montoRestante)}
                  </p>
                </div>
              </div>
            </div>

            {/* Detalle expandido - calendario de cuotas */}
            {expandirCompra === compra.id &&
              compra.cuotas &&
              compra.cuotas.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📅 Calendario de pagos:
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {compra.cuotas.map((cuota, index) => {
                      const fechaCuota = new Date(cuota.fecha);
                      const hoy = new Date();
                      hoy.setHours(0, 0, 0, 0);
                      const esPagada = fechaCuota < hoy;
                      const esProxima = !esPagada && index === 0;
                      const mesNombre = fechaCuota.toLocaleDateString("es-AR", {
                        month: "long",
                        year: "numeric",
                      });

                      return (
                        <div
                          key={cuota.id}
                          className={`flex justify-between items-center p-2 rounded-lg ${
                            esPagada
                              ? "bg-green-50 dark:bg-green-900/20"
                              : esProxima
                                ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                                : "bg-gray-50 dark:bg-gray-700/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-medium ${
                                esPagada
                                  ? "text-green-600 dark:text-green-400"
                                  : esProxima
                                    ? "text-yellow-700 dark:text-yellow-400"
                                    : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              Cuota {cuota.cuota_actual}/{compra.total_cuotas}
                            </span>
                            <span className="text-xs text-gray-500">
                              {mesNombre}
                            </span>
                            {esPagada && (
                              <span className="text-xs text-green-600 dark:text-green-400">
                                ✓ Pagada
                              </span>
                            )}
                            {esProxima && (
                              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                ⏰ Próxima
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-semibold ${
                                esPagada
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {formatearMonto(cuota.monto)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Próximo vencimiento */}
                  {compra.proximaCuota && (
                    <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                      <p className="text-xs text-yellow-800 dark:text-yellow-300 flex items-center gap-1">
                        ⚠️ Próximo vencimiento:{" "}
                        {formatearFecha(compra.proximaCuota.fecha)}
                        <span className="font-semibold">
                          {formatearMonto(compra.proximaCuota.monto)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
          </div>
        ))}
      </div>

      {/* Footer con resumen */}
      <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                Total compras:
              </span>
              <span className="font-semibold ml-1 text-gray-800 dark:text-white">
                {compras.length}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">
                Cuotas pendientes:
              </span>
              <span className="font-semibold ml-1 text-orange-600 dark:text-orange-400">
                {totalCuotasPendientes}
              </span>
            </div>
          </div>
          <button
            onClick={cargarComprasCredito}
            className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
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
    </div>
  );
}
