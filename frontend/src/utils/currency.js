/**
 * Formatea un monto de dinero según la configuración de moneda
 * @param {number} amount - Monto a formatear
 * @param {Object} options - Opciones de formato adicionales
 * @returns {string} Monto formateado con el símbolo de moneda
 */
/**
 * Formatea un monto de dinero según la configuración de moneda
 * @param {number|string} amount - Monto a formatear (puede ser número o string)
 * @param {Object} [options={}] - Opciones de formato adicionales
 * @param {boolean} [options.showSymbol=true] - Mostrar el símbolo de moneda
 * @param {boolean} [options.showCode=false] - Mostrar el código de moneda
 * @param {number} [options.decimalPlaces] - Número de decimales a mostrar (sobrescribe el valor por defecto)
 * @param {string} [options.locale] - Configuración regional (ej: 'es-VE')
 * @returns {string} Monto formateado con el símbolo de moneda
 */
export const formatCurrency = (amount, options = {}) => {
  // Manejar valores nulos o indefinidos
  if (amount === undefined || amount === null || amount === '') return '';
  
  // Convertir a número si es un string
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Verificar si el valor es un número válido
  if (isNaN(numericAmount)) return '';
  
  // Obtener configuración de las variables de entorno
  const defaultSymbol = import.meta.env.VITE_CURRENCY_SYMBOL || 'Bs.';
  const defaultCode = import.meta.env.VITE_CURRENCY_CODE || 'VES';
  const defaultDecimals = parseInt(import.meta.env.VITE_CURRENCY_DECIMALS || '2', 10);
  const defaultLocale = import.meta.env.VITE_CURRENCY_LOCALE || 'es-VE';
  
  // Combinar opciones por defecto con las opciones proporcionadas
  const {
    showSymbol = true,
    showCode = false,
    decimalPlaces = defaultDecimals,
    locale = defaultLocale
  } = options;
  
  // Formatear el número con separadores de miles y decimales
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
    useGrouping: true
  });
  
  // Aplicar formato al número
  const formattedAmount = formatter.format(numericAmount);
  
  // Construir el resultado final
  const parts = [];
  
  if (showSymbol) {
    parts.push(defaultSymbol.trim());
  }
  
  parts.push(formattedAmount);
  
  if (showCode) {
    parts.push(defaultCode.trim());
  }
  
  return parts.join(' ');
};

/**
 * Obtiene solo el símbolo de la moneda
 * @returns {string} Símbolo de la moneda
 */
export const getCurrencySymbol = () => {
  return import.meta.env.VITE_CURRENCY_SYMBOL || '';
};

/**
 * Obtiene solo el código de la moneda
 * @returns {string} Código de la moneda
 */
export const getCurrencyCode = () => {
  return import.meta.env.VITE_CURRENCY_CODE || '';
};
