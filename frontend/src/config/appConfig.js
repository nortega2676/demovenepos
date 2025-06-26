// Obtener la URL base de la API de las variables de entorno o usar el valor por defecto
const getApiBaseUrl = () => {
  // Usar import.meta.env en lugar de process.env para Vite
  const env = import.meta.env;
  
  // En desarrollo, usa localhost
  if (env.VITE_APP_ENV === 'development' || !env.VITE_APP_ENV) {
    return 'http://localhost:5000/api';
  } 
  // En producción
  else if (env.VITE_APP_ENV === 'produccion') {
    return 'https://demovenepos.onrender.com/api';
  }
  // Valor por defecto
  return 'https://demovenepos.onrender.com/api';
};

const appConfig = {
  // Nombre de la empresa
  companyName: 'Empresa Demo',
  
  // Título de la aplicación
  appTitle: 'Empresa Demo',
  
  // Configuración de la API
  api: {
    get baseUrl() {
      return getApiBaseUrl();
    },
    timeout: 30000, // 30 segundos
  },
  
  // Configuración de la interfaz
  ui: {
    theme: {
      primaryColor: '#81c784', /* Verde claro */
      secondaryColor: '#a5d6a7', /* Verde claro más suave */
      textColor: '#333333',
    },
    // Otras configuraciones de la interfaz
  },
  
  // Configuración de impresión
  printing: {
    header: 'Empresa Demo',
    footer: 'Gracias por su compra',
    // Otras configuraciones de impresión
  }
};

export default appConfig;
