// utils/calcularPeriodoTarjeta.js
/**
 * Calcula el período de cierre de una tarjeta según la fecha de compra
 * @param {string} fechaCompra - Fecha de la compra (YYYY-MM-DD)
 * @param {number} diaCierre - Día de cierre de la tarjeta (1-31)
 * @returns {Object} - Período de cierre y vencimiento
 */
export function calcularPeriodoTarjeta(fechaCompra, diaCierre) {
  const fecha = new Date(fechaCompra);
  const año = fecha.getFullYear();
  const mes = fecha.getMonth();
  const dia = fecha.getDate();
  
  let periodoCierre;
  let fechaCierreReal;
  
  // Si el día de compra es DESPUÉS del día de cierre -> pasa al MES SIGUIENTE del cierre
  if (dia > diaCierre) {
    // El cierre es en el mes siguiente
    let mesCierre = mes + 1;
    let añoCierre = año;
    if (mesCierre > 11) {
      mesCierre = 0;
      añoCierre++;
    }
    periodoCierre = `${añoCierre}-${String(mesCierre + 1).padStart(2, '0')}`;
    fechaCierreReal = new Date(añoCierre, mesCierre, diaCierre);
  } else {
    // El cierre es en el mes actual
    periodoCierre = `${año}-${String(mes + 1).padStart(2, '0')}`;
    fechaCierreReal = new Date(año, mes, diaCierre);
  }
  
  // El vencimiento es aproximadamente 10-15 días después del cierre
  let fechaVencimiento = new Date(fechaCierreReal);
  fechaVencimiento.setDate(fechaVencimiento.getDate() + 10);
  const periodoVencimiento = `${fechaVencimiento.getFullYear()}-${String(fechaVencimiento.getMonth() + 1).padStart(2, '0')}`;
  
  return {
    periodoCierre,
    periodoVencimiento,
    fechaCierreReal: fechaCierreReal.toISOString().split('T')[0],
    fechaCompraReal: fechaCompra,
    // La primera cuota se paga en el período de vencimiento
    primeraCuotaPeriodo: periodoVencimiento,
  };
}

/**
 * Calcula las fechas de pago de las cuotas según el período de cierre
 * @param {Object} compra - Datos de la compra
 * @param {Object} tarjeta - Datos de la tarjeta
 * @returns {Array} - Lista de fechas de pago
 */
export function calcularFechasCuotasConCierre(compra, tarjeta) {
  const { fechaCompra, cantidadCuotas, cuotaInicial } = compra;
  const { dia_cierre } = tarjeta;
  
  // Calcular el período base de la primera cuota
  const periodoBase = calcularPeriodoTarjeta(fechaCompra, dia_cierre);
  
  // La primera cuota se paga en el período de vencimiento
  const [añoVencimiento, mesVencimiento] = periodoBase.periodoVencimiento.split('-');
  let fechaPago = new Date(parseInt(añoVencimiento), parseInt(mesVencimiento) - 1, 1);
  
  const fechas = [];
  
  // Desde la cuota inicial hasta el total de cuotas
  for (let i = cuotaInicial; i <= cantidadCuotas; i++) {
    fechas.push({
      numero: i,
      fecha: new Date(fechaPago),
      periodo: `${fechaPago.getFullYear()}-${String(fechaPago.getMonth() + 1).padStart(2, '0')}`,
    });
    
    // Avanzar al próximo mes
    fechaPago.setMonth(fechaPago.getMonth() + 1);
  }
  
  return fechas;
}