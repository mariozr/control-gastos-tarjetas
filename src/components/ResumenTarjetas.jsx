// components/ResumenTarjetas.jsx
import { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { formatearMonto } from "../utils/formatearMonto";

export default function ResumenTarjetas() {
  const [tarjetas, setTarjetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gastosPorTarjeta, setGastosPorTarjeta] = useState({});

  useEffect(() => {
    cargarResumenTarjetas();
  }, []);

  const cargarResumenTarjetas = async () => {
    setLoading(true);

    // Cargar tarjetas
    const { data: tarjetasData, error: tarjetasError } = await supabase
      .from("tarjetas_credito")
      .select("*, entidades(nombre, color, logo)")
      .eq("activa", true)
      .order("favorita", { ascending: false })
      .order("nombre");

    if (tarjetasError) {
      console.error("Error al cargar tarjetas:", tarjetasError);
      setLoading(false);
      return;
    }

    if (!tarjetasData || tarjetasData.length === 0) {
      setLoading(false);
      return;
    }

    // Para cada tarjeta, calcular gastos pendientes del mes actual
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;

    const tarjetasConInfo = await Promise.all(
      tarjetasData.map(async (tarjeta) => {
        // Gastos del mes actual (cuotas a pagar este mes)
        const { data: gastosMes } = await supabase
          .from("gastos")
          .select("monto, fecha, descripcion, cuota_actual, total_cuotas")
          .eq("tarjeta_credito_id", tarjeta.id)
          .eq("tipo_gasto", "credito_cuota")
          .gte("fecha", `${mesActual}-01`)
          .lte("fecha", `${mesActual}-31`);

        // Próximas cuotas (próximos 30 días)
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + 30);
        const fechaLimiteStr = fechaLimite.toISOString().split("T")[0];

        const { data: proximasCuotas } = await supabase
          .from("gastos")
          .select("monto, fecha, descripcion, cuota_actual, total_cuotas")
          .eq("tarjeta_credito_id", tarjeta.id)
          .eq("tipo_gasto", "credito_cuota")
          .gt("fecha", `${mesActual}-31`)
          .lte("fecha", fechaLimiteStr)
          .order("fecha", { ascending: true });

        const totalMes = gastosMes?.reduce((sum, g) => sum + g.monto, 0) || 0;
        const totalProximo =
          proximasCuotas?.reduce((sum, g) => sum + g.monto, 0) || 0;

        // Calcular porcentaje de uso del límite
        let porcentajeUso = 0;
        let colorProgreso = "bg-green-500";
        if (tarjeta.limite && tarjeta.saldo_actual) {
          porcentajeUso = (tarjeta.saldo_actual / tarjeta.limite) * 100;
          if (porcentajeUso > 90) colorProgreso = "bg-red-500";
          else if (porcentajeUso > 70) colorProgreso = "bg-yellow-500";
          else colorProgreso = "bg-green-500";
        }

        return {
          ...tarjeta,
          totalMes,
          totalProximo,
          gastosMes: gastosMes || [],
          proximasCuotas: proximasCuotas || [],
          porcentajeUso,
          colorProgreso,
        };
      }),
    );

    setTarjetas(tarjetasConInfo);
    setLoading(false);
  };

  const getPeriodoActual = (diaCierre) => {
    const hoy = new Date();
    const diaActual = hoy.getDate();

    if (diaActual >= diaCierre) {
      // Estamos en un nuevo período que cierra el próximo mes
      let mesCierre = hoy.getMonth() + 2;
      let añoCierre = hoy.getFullYear();
      if (mesCierre > 12) {
        mesCierre = 1;
        añoCierre++;
      }
      return `${añoCierre}-${String(mesCierre).padStart(2, "0")}`;
    } else {
      // El período actual cierra este mes
      return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg p-4 bg-gray-100 dark:bg-gray-800 animate-pulse h-32"></div>
        <div className="rounded-lg p-4 bg-gray-100 dark:bg-gray-800 animate-pulse h-32"></div>
      </div>
    );
  }

  if (tarjetas.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
        💳 Mis Tarjetas de Crédito
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tarjetas.map((tarjeta) => (
          <div
            key={tarjeta.id}
            className="rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
            style={{
              background: `linear-gradient(135deg, ${tarjeta.color || "#3B82F6"}15, ${tarjeta.color || "#3B82F6"}05)`,
              borderLeft: `4px solid ${tarjeta.color || "#3B82F6"}`,
            }}
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: tarjeta.color || "#3B82F6" }}
                    >
                      {tarjeta.nombre.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-white">
                        {tarjeta.nombre}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {tarjeta.entidades?.nombre} ••••{" "}
                        {tarjeta.ultimos_digitos}
                      </p>
                    </div>
                  </div>
                </div>
                {tarjeta.favorita && (
                  <span
                    className="text-yellow-500 text-sm"
                    title="Tarjeta favorita"
                  >
                    ⭐ Favorita
                  </span>
                )}
              </div>

              {/* Saldo actual */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    Saldo actual:
                  </span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {formatearMonto(tarjeta.saldo_actual || 0)}
                  </span>
                </div>

                {tarjeta.limite && (
                  <>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Límite disponible:</span>
                      <span>
                        {formatearMonto(
                          tarjeta.limite - (tarjeta.saldo_actual || 0),
                        )}{" "}
                        / {formatearMonto(tarjeta.limite)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${tarjeta.colorProgreso}`}
                        style={{
                          width: `${Math.min(tarjeta.porcentajeUso, 100)}%`,
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Gastos del mes */}
              {tarjeta.totalMes > 0 && (
                <div className="mb-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      📅 Este mes:
                    </span>
                    <span className="font-semibold text-orange-600">
                      {formatearMonto(tarjeta.totalMes)}
                    </span>
                  </div>
                  {tarjeta.gastosMes.length > 0 && (
                    <div className="text-xs text-gray-500 space-y-1 max-h-24 overflow-y-auto">
                      {tarjeta.gastosMes.slice(0, 3).map((gasto, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate">{gasto.descripcion}</span>
                          <span>{formatearMonto(gasto.monto)}</span>
                        </div>
                      ))}
                      {tarjeta.gastosMes.length > 3 && (
                        <div className="text-center text-gray-400">
                          +{tarjeta.gastosMes.length - 3} más
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Próximas cuotas */}
              {tarjeta.totalProximo > 0 && (
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      ⏰ Próximos 30 días:
                    </span>
                    <span className="font-semibold text-yellow-600">
                      {formatearMonto(tarjeta.totalProximo)}
                    </span>
                  </div>
                </div>
              )}

              {/* Muestra el período actual */}
              {tarjeta.dia_cierre && (
                <div className="mt-2 text-xs text-gray-500">
                  📆 Período actual: {getPeriodoActual(tarjeta.dia_cierre)}
                </div>
              )}

              {/* Fechas de cierre y vencimiento */}
              {(tarjeta.dia_cierre || tarjeta.dia_vencimiento) && (
                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 flex justify-between">
                  {tarjeta.dia_cierre && (
                    <span>📆 Cierra: {tarjeta.dia_cierre}</span>
                  )}
                  {tarjeta.dia_vencimiento && (
                    <span>⏰ Vence: {tarjeta.dia_vencimiento}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
