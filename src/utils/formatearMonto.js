export const formatearMonto = (monto) => {
  // Opción 1: Para Argentina (pesos argentinos)
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
  
  // Opción 2: Para México (pesos mexicanos)
  // return new Intl.NumberFormat('es-MX', {
  //   style: 'currency',
  //   currency: 'MXN',
  // }).format(monto);
  
  // Opción 3: Para Chile (pesos chilenos - sin decimales)
  // return new Intl.NumberFormat('es-CL', {
  //   style: 'currency',
  //   currency: 'CLP',
  //   minimumFractionDigits: 0,
  // }).format(monto);
  
  // Opción 4: Para Colombia (pesos colombianos - sin decimales)
  // return new Intl.NumberFormat('es-CO', {
  //   style: 'currency',
  //   currency: 'COP',
  //   minimumFractionDigits: 0,
  // }).format(monto);
  
  // Opción 5: Solo números (sin símbolo de moneda)
  // return new Intl.NumberFormat('es-AR').format(monto);
  
  // Opción 6: Dólares estadounidenses
  // return new Intl.NumberFormat('en-US', {
  //   style: 'currency',
  //   currency: 'USD',
  // }).format(monto);
};