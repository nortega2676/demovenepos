const axios = require('axios');

const getDollarRate = async (req, res) => {
  console.log('Solicitud recibida para obtener el tipo de cambio');
  console.log('URL de la solicitud:', req.originalUrl);
  console.log('Método de la solicitud:', req.method);
  console.log('Headers:', req.headers);
  
  // La configuración CORS se maneja a nivel de aplicación en server.js
  // No es necesario configurar CORS en cada controlador
  
  // Solo registramos la solicitud para depuración
  console.log('Solicitud recibida para obtener el tipo de cambio');
  console.log('URL de la solicitud:', req.originalUrl);
  console.log('Método de la solicitud:', req.method);
  console.log('Headers:', req.headers);
  
  // Si es una solicitud OPTIONS, ya fue manejada por el middleware CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiUrl = 'https://ve.dolarapi.com/v1/dolares/oficial';
    console.log('Realizando solicitud a:', apiUrl);
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'LaProvidenciaPOS/1.0'
      },
      timeout: 5000 // 5 segundos de timeout
    });

    console.log('Respuesta recibida de dolarapi.com:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });

    // Verificar que la respuesta tenga el formato esperado
    if (!response.data) {
      console.error('Formato de respuesta inesperado de dolarapi.com:', response.data);
      return res.status(500).json({
        success: false,
        error: 'Formato de respuesta inesperado del servicio de tasas de cambio',
        receivedData: response.data
      });
    }

    // Extraer los datos relevantes de la respuesta de la API
    const rateData = response.data;
    
    // Usar el promedio directamente de la respuesta de la API
    const promedio = parseFloat(rateData.promedio) || 0;
    
    const responseData = {
      success: true,
      data: {
        rate: promedio, // Usamos el promedio de la API
        promedio: promedio,
        lastUpdate: rateData.fechaActualizacion || new Date().toISOString(),
        source: 'Tipo de cambio oficial',
        currency: 'USD',
        updatedAt: new Date().toISOString(),
        tipo: rateData.nombre || 'oficial',
        compra: rateData.compra ? parseFloat(rateData.compra) : null,
        venta: rateData.venta ? parseFloat(rateData.venta) : null,
        fecha_actualizacion: rateData.fechaActualizacion || new Date().toISOString()
      }
    };
    
    console.log('Enviando respuesta al cliente:', responseData);
    res.json(responseData);
    
  } catch (error) {
    console.error('Error al obtener la tasa del dólar:', {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No hay respuesta',
      stack: error.stack
    });
    
    // Intentar devolver un valor de respaldo si la API falla
    const fallbackRate = 36.50; // Valor de respaldo
    console.warn(`Usando valor de respaldo para la tasa de cambio: ${fallbackRate}`);
    
    res.json({
      success: true,
      data: {
        rate: fallbackRate,
        lastUpdate: new Date().toISOString(),
        source: 'Valor de respaldo',
        isFallback: true,
        error: `Error al obtener tasa real: ${error.message}`
      }
    });
  }
};

module.exports = {
  getDollarRate
};
