// utils/fechas.js (versión corregida definitiva)

/**
 * Convierte una fecha string YYYY-MM-DD a un objeto Date sin offset de zona horaria
 */
export function stringToDate(fechaString) {
  if (!fechaString) return null;
  const [year, month, day] = fechaString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Convierte un objeto Date a string YYYY-MM-DD sin offset
 */
export function dateToString(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene el día del mes de una fecha (1-31)
 */
export function obtenerDia(fechaString) {
  if (!fechaString) return null;
  const [year, month, day] = fechaString.split('-').map(Number);
  return day;
}

/**
 * Formatea una fecha para mostrar en la UI
 */
export function formatearFechaLocal(fechaString) {
  if (!fechaString) return '';
  const [year, month, day] = fechaString.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Calcula el período de cierre de una tarjeta según la fecha de compra
 * @param {string} fechaCompraStr - Fecha de la compra (YYYY-MM-DD)
 * @param {number} diaCierre - Día de cierre de la tarjeta (1-31)
 * @returns {Object} - Período de cierre y fecha de primera cuota
 */
export function calcularPeriodoTarjeta(fechaCompraStr, diaCierre) {
  const [year, month, day] = fechaCompraStr.split('-').map(Number);
  const diaCompra = day;
  
  const formatDate = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  let mesResumen;      // Mes en que aparece en el resumen
  let añoResumen;
  let fechaPrimerPago;  // Fecha de la primera cuota
  
  if (diaCompra > diaCierre) {
    // Compra DESPUÉS del cierre
    // Ej: Compra 25/05, cierra 24/05 -> entra en cierre de JUNIO, paga en JULIO
    
    // El resumen es del mes siguiente
    mesResumen = month + 1;
    añoResumen = year;
    if (mesResumen > 12) {
      mesResumen = 1;
      añoResumen++;
    }
    
    // La primera cuota se paga en el MES SIGUIENTE al resumen
    let mesPago = mesResumen + 1;
    let añoPago = añoResumen;
    if (mesPago > 12) {
      mesPago = 1;
      añoPago++;
    }
    
    fechaPrimerPago = new Date(añoPago, mesPago - 1, 1);
    
  } else {
    // Compra ANTES o IGUAL al cierre
    // Ej: Compra 20/05, cierra 24/05 -> entra en cierre de MAYO, paga en JUNIO
    
    // El resumen es del mes actual
    mesResumen = month;
    añoResumen = year;
    
    // La primera cuota se paga en el MES SIGUIENTE al resumen
    let mesPago = mesResumen + 1;
    let añoPago = añoResumen;
    if (mesPago > 12) {
      mesPago = 1;
      añoPago++;
    }
    
    fechaPrimerPago = new Date(añoPago, mesPago - 1, 1);
  }
  
  return {
    periodoCierre: `${añoResumen}-${String(mesResumen).padStart(2, '0')}`,
    primeraCuotaPeriodo: `${fechaPrimerPago.getFullYear()}-${String(fechaPrimerPago.getMonth() + 1).padStart(2, '0')}`,
    primeraCuotaFecha: formatDate(fechaPrimerPago),
    diaCompra,
    diaCierre,
    esDespuesCierre: diaCompra > diaCierre,
  };
}

/**
 * Calcula las fechas de pago de las cuotas según el período de cierre
 */
export function calcularFechasCuotasConCierre(compra, tarjeta) {
  const { fechaCompra, cantidadCuotas, cuotaInicial, montoCuota } = compra;
  const { dia_cierre } = tarjeta;
  
  // Calcular el período base
  const periodoBase = calcularPeriodoTarjeta(fechaCompra, dia_cierre);
  
  // Obtener la fecha de la primera cuota
  const [añoPrimera, mesPrimera] = periodoBase.primeraCuotaPeriodo.split('-');
  let fechaPago = new Date(parseInt(añoPrimera), parseInt(mesPrimera) - 1, 1);
  
  const fechas = [];
  
  for (let i = cuotaInicial; i <= cantidadCuotas; i++) {
    const añoPago = fechaPago.getFullYear();
    const mesPago = fechaPago.getMonth() + 1;
    
    fechas.push({
      numero: i,
      fecha: new Date(fechaPago),
      fechaStr: `${añoPago}-${String(mesPago).padStart(2, '0')}-01`,
      periodo: `${añoPago}-${String(mesPago).padStart(2, '0')}`,
      mesNombre: fechaPago.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
      monto: montoCuota,
    });
    
    // Avanzar al próximo mes para la siguiente cuota
    fechaPago.setMonth(fechaPago.getMonth() + 1);
  }
  
  return fechas;
}