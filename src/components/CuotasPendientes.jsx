// components/CuotasPendientes.jsx
import { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { formatearMonto } from "../utils/formatearMonto";

export default function CuotasPendientes({ onError }) {
  const [cuotas, setCuotas] = useState([]);
  const [totalPendiente, setTotalPendiente] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCuotasPendientes();
  }, []);

  const cargarCuotasPendientes = async () => {
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
    } else if (data) {
      setCuotas(data);
      const total = data.reduce((sum, cuota) => sum + cuota.monto, 0);
      setTotalPendiente(total);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
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
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            ⏰ Cuotas Pendientes de Pago
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {cuotas.length} cuotas
            </span>
          </h3>
          <div className="text-right">
            <p className="text-xs text-white/80">Total pendiente</p>
            <p className="text-xl font-bold text-white">
              {formatearMonto(totalPendiente)}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {cuotas.map((cuota) => {
          const fechaVencimiento = new Date(cuota.fecha);
          const hoy = new Date();
          const diasRestantes = Math.ceil(
            (fechaVencimiento - hoy) / (1000 * 60 * 60 * 24),
          );
          const esUrgente = diasRestantes <= 5 && diasRestantes >= 0;

          return (
            <div
              key={cuota.id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {cuota.descripcion}
                    </span>
                    {cuota.tarjetas_credito && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${cuota.tarjetas_credito.color}20`,
                          color: cuota.tarjetas_credito.color,
                        }}
                      >
                        💳 {cuota.tarjetas_credito.nombre}
                      </span>
                    )}
                    {esUrgente && diasRestantes >= 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                        ⚠️ Urgente
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Vence:{" "}
                    {fechaVencimiento.toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {diasRestantes > 0 && (
                      <span className="ml-2 text-xs">
                        (en {diasRestantes} días)
                      </span>
                    )}
                    {diasRestantes === 0 && (
                      <span className="ml-2 text-xs text-red-500">
                        (Vence hoy)
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {formatearMonto(cuota.monto)}
                  </p>
                  {cuota.cuota_actual && cuota.total_cuotas && (
                    <p className="text-xs text-gray-500">
                      Cuota {cuota.cuota_actual}/{cuota.total_cuotas}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={cargarCuotasPendientes}
          className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
        >
          🔄 Actualizar
        </button>
      </div>
    </div>
  );
}
