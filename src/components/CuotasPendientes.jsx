// components/CuotasPendientes.jsx
import { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { formatearMonto } from "../utils/formatearMonto";

export default function CuotasPendientes() {
  const [cuotasPendientes, setCuotasPendientes] = useState([]);
  const [totalPendiente, setTotalPendiente] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCuotasPendientes();
  }, []);

  const cargarCuotasPendientes = async () => {
    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("gastos")
      .select("*")
      .eq("es_cuota", true)
      .gte("fecha", hoy)
      .order("fecha", { ascending: true });

    if (error) {
      console.error("Error al cargar cuotas pendientes:", error);
    } else if (data) {
      setCuotasPendientes(data);
      const total = data.reduce((sum, cuota) => sum + cuota.monto, 0);
      setTotalPendiente(total);
    }
    setLoading(false);
  };

  if (loading) return null;

  if (cuotasPendientes.length === 0) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-6 border border-yellow-200 dark:border-yellow-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
          💳 Cuotas pendientes de pago
        </h3>
        <span className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
          {formatearMonto(totalPendiente)}
        </span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {cuotasPendientes.map((cuota) => (
          <div
            key={cuota.id}
            className="flex justify-between items-center text-sm"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {cuota.descripcion}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Vence: {new Date(cuota.fecha).toLocaleDateString("es-AR")}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-red-600 dark:text-red-400">
                {formatearMonto(cuota.monto)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
