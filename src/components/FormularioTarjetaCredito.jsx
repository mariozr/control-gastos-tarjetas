// components/FormularioTarjetaCredito.jsx (con la corrección de fechas)

import { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import { formatearMonto } from "../utils/formatearMonto";
import {
  calcularPeriodoTarjeta,
  calcularFechasCuotasConCierre,
  formatearFechaLocal,
  dateToString,
  obtenerDia,
} from "../utils/fechas";

export default function FormularioTarjetaCredito({
  categorias,
  formasPago,
  onGastoAgregado,
  onError,
  onSuccess,
}) {
  const [tarjetas, setTarjetas] = useState([]);
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState("");
  const [tarjetaInfo, setTarjetaInfo] = useState(null);
  const [formData, setFormData] = useState({
    descripcion: "",
    montoTotal: "",
    categoria: "",
    forma_pago: "Tarjeta de Crédito",
    fechaCompra: new Date().toISOString().split("T")[0], // Formato YYYY-MM-DD
    cantidadCuotas: 1,
    cuotaInicial: 1,
    tieneInteres: false,
    tipoInteres: "porcentaje",
    valorInteres: "",
  });

  const [loading, setLoading] = useState(false);
  const [loadingTarjetas, setLoadingTarjetas] = useState(true);
  const [mostrarDetalleCuotas, setMostrarDetalleCuotas] = useState(false);
  const [infoPeriodo, setInfoPeriodo] = useState(null);

  // Cargar tarjetas disponibles
  useEffect(() => {
    cargarTarjetas();
  }, []);

  // Actualizar info del período cuando cambia la fecha o la tarjeta
  useEffect(() => {
    if (tarjetaInfo && tarjetaInfo.dia_cierre && formData.fechaCompra) {
      const periodo = calcularPeriodoTarjeta(
        formData.fechaCompra,
        tarjetaInfo.dia_cierre,
      );
      setInfoPeriodo(periodo);
      console.log("Período calculado:", periodo); // Para debug
    } else {
      setInfoPeriodo(null);
    }
  }, [formData.fechaCompra, tarjetaInfo]);

  const cargarTarjetas = async () => {
    setLoadingTarjetas(true);
    const { data, error } = await supabase
      .from("tarjetas_credito")
      .select("*, entidades(nombre, color)")
      .eq("activa", true)
      .order("favorita", { ascending: false })
      .order("nombre");

    if (!error && data) {
      setTarjetas(data);
      const favorita = data.find((t) => t.favorita);
      if (favorita) {
        setTarjetaSeleccionada(favorita.id.toString());
        setTarjetaInfo(favorita);
      } else if (data.length > 0) {
        setTarjetaSeleccionada(data[0].id.toString());
        setTarjetaInfo(data[0]);
      }
    }
    setLoadingTarjetas(false);
  };

  // Actualizar info de tarjeta cuando cambia la selección
  useEffect(() => {
    const tarjeta = tarjetas.find(
      (t) => t.id.toString() === tarjetaSeleccionada,
    );
    setTarjetaInfo(tarjeta || null);
  }, [tarjetaSeleccionada, tarjetas]);

  // Calcular monto total con intereses
  const calcularMontoConInteres = () => {
    const total = parseFloat(formData.montoTotal);
    if (!formData.tieneInteres || !formData.valorInteres || !total)
      return total;

    const interes = parseFloat(formData.valorInteres);
    if (formData.tipoInteres === "porcentaje") {
      return total * (1 + interes / 100);
    } else {
      return total + interes;
    }
  };

  // Calcular valor de cada cuota
  const calcularMontoCuota = () => {
    const montoConInteres = calcularMontoConInteres();
    const cuotas = parseInt(formData.cantidadCuotas);
    if (!montoConInteres || !cuotas || cuotas === 0) return 0;
    return montoConInteres / cuotas;
  };

  // Calcular interés total
  const calcularInteresTotal = () => {
    const totalOriginal = parseFloat(formData.montoTotal);
    const totalConInteres = calcularMontoConInteres();
    if (!formData.tieneInteres || !totalOriginal) return 0;
    return totalConInteres - totalOriginal;
  };

  // Generar fechas de las cuotas usando el día de cierre
  const generarFechasCuotas = () => {
    if (!tarjetaInfo || !tarjetaInfo.dia_cierre) {
      // Fallback: método anterior si no hay día de cierre
      const [year, month, day] = formData.fechaCompra.split("-").map(Number);
      const fechaCompra = new Date(year, month - 1, day);
      const cuotas = parseInt(formData.cantidadCuotas);
      const cuotaInicial = parseInt(formData.cuotaInicial);
      const fechas = [];

      let fechaPago = new Date(fechaCompra);
      fechaPago.setMonth(fechaPago.getMonth() + 1);
      fechaPago.setDate(1);

      for (let i = cuotaInicial; i <= cuotas; i++) {
        fechas.push({
          numero: i,
          fecha: new Date(fechaPago),
          fechaStr: dateToString(fechaPago),
          periodo: `${fechaPago.getFullYear()}-${String(fechaPago.getMonth() + 1).padStart(2, "0")}`,
        });
        fechaPago.setMonth(fechaPago.getMonth() + 1);
      }
      return fechas;
    }

    // Usar el nuevo cálculo con día de cierre
    return calcularFechasCuotasConCierre(
      {
        fechaCompra: formData.fechaCompra,
        cantidadCuotas: parseInt(formData.cantidadCuotas),
        cuotaInicial: parseInt(formData.cuotaInicial),
      },
      tarjetaInfo,
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const registrarCompraEnCuotas = async () => {
    // Validaciones
    if (!formData.descripcion.trim()) {
      onError("Por favor ingresa una descripción");
      return false;
    }

    if (parseFloat(formData.montoTotal) <= 0) {
      onError("Por favor ingresa un monto total válido");
      return false;
    }

    if (!formData.categoria) {
      onError("Por favor selecciona una categoría");
      return false;
    }

    if (!tarjetaSeleccionada && tarjetas.length > 0) {
      onError("Por favor selecciona una tarjeta");
      return false;
    }

    const cantidadCuotas = parseInt(formData.cantidadCuotas);
    if (cantidadCuotas < 1 || cantidadCuotas > 24) {
      onError("La cantidad de cuotas debe ser entre 1 y 24");
      return false;
    }

    if (formData.tieneInteres) {
      const interes = parseFloat(formData.valorInteres);
      if (isNaN(interes) || interes < 0) {
        onError("Por favor ingresa un valor de interés válido");
        return false;
      }
    }

    const montoTotalOriginal = parseFloat(formData.montoTotal);
    const montoConInteres = calcularMontoConInteres();
    const montoCuota = calcularMontoCuota();
    const tarjetaId = tarjetaSeleccionada
      ? parseInt(tarjetaSeleccionada)
      : null;

    // Calcular período de cierre para la compra
    let periodoCierre = null;
    let fechaCierreCalculada = null;
    if (tarjetaInfo && tarjetaInfo.dia_cierre) {
      const periodo = calcularPeriodoTarjeta(
        formData.fechaCompra,
        tarjetaInfo.dia_cierre,
      );
      periodoCierre = periodo.periodoCierre;
      fechaCierreCalculada = periodo.fechaCierreReal;
    }

    // 1. Crear el registro principal de la compra
    const { data: compraPrincipal, error: errorPrincipal } = await supabase
      .from("gastos")
      .insert([
        {
          descripcion: formData.descripcion,
          monto: montoTotalOriginal,
          monto_con_interes: montoConInteres,
          categoria: formData.categoria,
          forma_pago: formData.forma_pago,
          fecha: formData.fechaCompra,
          es_cuota: true,
          tipo_gasto: "credito_compra",
          total_cuotas: cantidadCuotas,
          monto_cuota: montoCuota,
          fecha_compra: formData.fechaCompra,
          tiene_interes: formData.tieneInteres,
          tipo_interes: formData.tipoInteres,
          valor_interes: formData.tieneInteres
            ? parseFloat(formData.valorInteres)
            : null,
          tarjeta_credito_id: tarjetaId,
          periodo_cierre: periodoCierre,
          fecha_cierre_calculada: fechaCierreCalculada,
        },
      ])
      .select();

    if (errorPrincipal) {
      onError("Error al registrar la compra: " + errorPrincipal.message);
      return false;
    }

    const compraId = compraPrincipal[0].id;
    const fechasCuotas = generarFechasCuotas();

    // 2. Crear los registros individuales de cada cuota
    const cuotasPromises = fechasCuotas.map(async (cuota) => {
      const fechaPago = cuota.fechaStr || dateToString(cuota.fecha);

      return supabase.from("gastos").insert([
        {
          descripcion: `${formData.descripcion} (Cuota ${cuota.numero}/${cantidadCuotas})${formData.tieneInteres ? " c/interés" : ""}`,
          monto: cuota.monto || montoCuota,
          categoria: formData.categoria,
          forma_pago: formData.forma_pago,
          fecha: fechaPago,
          es_cuota: true,
          tipo_gasto: "credito_cuota",
          cuota_actual: cuota.numero,
          total_cuotas: cantidadCuotas,
          monto_cuota: montoCuota,
          gasto_original_id: compraId,
          fecha_compra: formData.fechaCompra,
          tiene_interes: formData.tieneInteres,
          tarjeta_credito_id: tarjetaId,
          periodo_cierre: cuota.periodo,
          periodo_vencimiento: cuota.periodo,
        },
      ]);
    });

    const resultados = await Promise.all(cuotasPromises);
    const errores = resultados.filter((r) => r.error);

    if (errores.length > 0) {
      await supabase.from("gastos").delete().eq("id", compraId);
      onError(`Error al registrar las cuotas: ${errores[0].error.message}`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const exito = await registrarCompraEnCuotas();

    if (exito) {
      const tarjetaNombre =
        tarjetas.find((t) => t.id.toString() === tarjetaSeleccionada)?.nombre ||
        "";
      const mensajeInteres = formData.tieneInteres
        ? ` con ${formData.tipoInteres === "porcentaje" ? formData.valorInteres + "%" : "$" + formData.valorInteres} de interés`
        : "";
      onSuccess(
        `Compra registrada en ${tarjetaNombre} - ${formData.cantidadCuotas} cuotas${mensajeInteres}`,
      );
      onGastoAgregado();

      setFormData({
        descripcion: "",
        montoTotal: "",
        categoria: formData.categoria,
        forma_pago: "Tarjeta de Crédito",
        fechaCompra: new Date().toISOString().split("T")[0],
        cantidadCuotas: 1,
        cuotaInicial: 1,
        tieneInteres: false,
        tipoInteres: "porcentaje",
        valorInteres: "",
      });
    }

    setLoading(false);
  };

  const montoTotalOriginal = parseFloat(formData.montoTotal) || 0;
  const montoConInteres = calcularMontoConInteres();
  const interesTotal = calcularInteresTotal();
  const montoCuota = calcularMontoCuota();
  const fechasCuotas = generarFechasCuotas();

  // Obtener el día de la fecha seleccionada para mostrar correctamente
  const diaSeleccionado = formData.fechaCompra
    ? obtenerDia(formData.fechaCompra)
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
          Descripción de la compra
        </label>
        <input
          type="text"
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Ej: Compra en Electrodomésticos"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
          Monto Total de la Compra
        </label>
        <input
          type="number"
          name="montoTotal"
          value={formData.montoTotal}
          onChange={handleChange}
          required
          step="0.01"
          min="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="0.00"
        />
        {montoTotalOriginal > 0 && (
          <p className="text-xs text-green-600 mt-1">
            Monto original: {formatearMonto(montoTotalOriginal)}
          </p>
        )}
      </div>

      {/* Selector de Tarjeta */}
      {!loadingTarjetas && tarjetas.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
            💳 Seleccionar tarjeta
          </label>
          <select
            value={tarjetaSeleccionada}
            onChange={(e) => setTarjetaSeleccionada(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {tarjetas.map((tarjeta) => (
              <option key={tarjeta.id} value={tarjeta.id}>
                {tarjeta.nombre} •••• {tarjeta.ultimos_digitos}
                {tarjeta.favorita && " ⭐"}
                {tarjeta.dia_cierre && ` (Cierra: ${tarjeta.dia_cierre})`}
              </option>
            ))}
          </select>
          {tarjetaInfo && (
            <div className="mt-1 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tarjetaInfo.color || "#3B82F6" }}
              />
              <span className="text-xs text-gray-500">
                Saldo actual: {formatearMonto(tarjetaInfo.saldo_actual || 0)}
                {tarjetaInfo.limite &&
                  ` / Límite: ${formatearMonto(tarjetaInfo.limite)}`}
                {tarjetaInfo.dia_cierre &&
                  ` | Cierra: ${tarjetaInfo.dia_cierre}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Información del período de cierre - VERSIÓN CORREGIDA */}
      {infoPeriodo && tarjetaInfo && tarjetaInfo.dia_cierre && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
            📅 Información de cierre
          </p>
          <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <p>
              🔹 Compra realizada el:{" "}
              {formatearFechaLocal(formData.fechaCompra)}
            </p>
            <p>🔹 Día de cierre de la tarjeta: {tarjetaInfo.dia_cierre}</p>

            {infoPeriodo.esDespuesCierre ? (
              <>
                <p className="text-yellow-600 dark:text-yellow-400">
                  ⚠️ La compra fue DESPUÉS del cierre ({infoPeriodo.diaCompra}{" "}
                  &gt; {infoPeriodo.diaCierre})
                </p>
                <p>
                  🔹 Entra en el resumen que cierra el:{" "}
                  {infoPeriodo.fechaCierreReal}
                </p>
                <p>
                  🔹 El resumen vence el: {infoPeriodo.fechaVencimientoReal}
                </p>
                <p className="text-green-600 dark:text-green-400 font-semibold">
                  ✅ Primera cuota se paga en: {infoPeriodo.primeraCuotaPeriodo}
                </p>
              </>
            ) : (
              <>
                <p className="text-green-600 dark:text-green-400">
                  ✓ La compra fue ANTES o IGUAL al cierre (
                  {infoPeriodo.diaCompra} ≤ {infoPeriodo.diaCierre})
                </p>
                <p>
                  🔹 Entra en el resumen que cierra el:{" "}
                  {infoPeriodo.fechaCierreReal}
                </p>
                <p>
                  🔹 El resumen vence el: {infoPeriodo.fechaVencimientoReal}
                </p>
                <p className="text-green-600 dark:text-green-400 font-semibold">
                  ✅ Primera cuota se paga en: {infoPeriodo.primeraCuotaPeriodo}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sección de Intereses */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            name="tieneInteres"
            checked={formData.tieneInteres}
            onChange={handleChange}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            ¿La compra tiene intereses?
          </span>
        </label>

        {formData.tieneInteres && (
          <div className="space-y-3 ml-6">
            <div className="flex gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tipoInteres"
                  value="porcentaje"
                  checked={formData.tipoInteres === "porcentaje"}
                  onChange={handleChange}
                  className="w-3 h-3"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Porcentaje (%)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tipoInteres"
                  value="fijo"
                  checked={formData.tipoInteres === "fijo"}
                  onChange={handleChange}
                  className="w-3 h-3"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Monto fijo ($)
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                {formData.tipoInteres === "porcentaje"
                  ? "Porcentaje de interés"
                  : "Monto de interés"}
              </label>
              <input
                type="number"
                name="valorInteres"
                value={formData.valorInteres}
                onChange={handleChange}
                step={formData.tipoInteres === "porcentaje" ? "0.01" : "0.01"}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={
                  formData.tipoInteres === "porcentaje" ? "Ej: 15" : "Ej: 5000"
                }
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
          Categoría
        </label>
        <select
          name="categoria"
          value={formData.categoria}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Seleccionar categoría</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
            Cantidad de cuotas
          </label>
          <select
            name="cantidadCuotas"
            value={formData.cantidadCuotas}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24].map((num) => (
              <option key={num} value={num}>
                {num} cuota{num !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
            Desde cuota N°
          </label>
          <input
            type="number"
            name="cuotaInicial"
            value={formData.cuotaInicial}
            onChange={handleChange}
            min="1"
            max={formData.cantidadCuotas}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            (Si ya pagaste algunas cuotas)
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
          Fecha de compra
        </label>
        <input
          type="date"
          name="fechaCompra"
          value={formData.fechaCompra}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          ℹ️ El total de la compra NO se sumará a los gastos de este mes. Solo
          se sumarán las cuotas en sus meses correspondientes según el cierre de
          la tarjeta.
        </p>
      </div>

      {/* Resumen financiero */}
      {formData.montoTotal && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Monto original:
              </span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {formatearMonto(montoTotalOriginal)}
              </span>
            </div>

            {formData.tieneInteres && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formData.tipoInteres === "porcentaje"
                      ? `Interés (${formData.valorInteres}%):`
                      : "Interés fijo:"}
                  </span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    + {formatearMonto(interesTotal)}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Total a pagar:
                  </span>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {formatearMonto(montoConInteres)}
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Valor por cuota:
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {formatearMonto(montoCuota)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Detalle de cuotas */}
      {formData.montoTotal && formData.cantidadCuotas > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <button
            type="button"
            onClick={() => setMostrarDetalleCuotas(!mostrarDetalleCuotas)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              📅 Calendario de pagos
            </span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${mostrarDetalleCuotas ? "rotate-180" : ""}`}
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

          {mostrarDetalleCuotas && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {fechasCuotas.map((cuota) => (
                  <div
                    key={cuota.numero}
                    className="flex justify-between items-center text-sm p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Cuota {cuota.numero}/{formData.cantidadCuotas}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        {cuota.fecha.toLocaleDateString("es-AR", {
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {formatearMonto(cuota.monto || montoCuota)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 text-xs text-gray-500 dark:text-gray-400">
                💡 Total a pagar: {formatearMonto(montoConInteres)} en{" "}
                {formData.cantidadCuotas} meses
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-md hover:from-purple-700 hover:to-blue-700 transition disabled:from-purple-300 disabled:to-blue-300 font-semibold"
      >
        {loading ? "Registrando compra..." : "✅ Registrar Compra en Cuotas"}
      </button>
    </form>
  );
}
