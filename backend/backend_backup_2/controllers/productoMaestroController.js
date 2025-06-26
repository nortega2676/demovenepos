const Product = require('../models/Product');

const productoMaestroController = {
  // Obtener el reporte maestro de productos
  obtenerProductosMaestro: async (req, res) => {
    try {
      console.log('Iniciando obtención de reporte maestro de productos');
      
      // Obtener todos los productos con información de categoría
      const productos = await Product.getAll();
      
      // Formatear los datos para la respuesta
      console.log('Formateando datos de productos...');
      const productosFormateados = productos.map(producto => ({
        nombre: producto.nombre || 'Sin nombre',
        precio: parseFloat(producto.precio) || 0,
        categoria: producto.categoria_nombre || 'Sin categoría',
        categoria_id: producto.categoria_id || null
      }));

      // Ordenar por nombre de categoría y luego por nombre de producto
      productosFormateados.sort((a, b) => {
        if (a.categoria < b.categoria) return -1;
        if (a.categoria > b.categoria) return 1;
        return a.nombre.localeCompare(b.nombre);
      });

      // Mostrar resumen antes de enviar la respuesta
      console.log('=== RESUMEN DE DATOS PROCESADOS ===');
      console.log('Total de productos:', productosFormateados.length);
      console.log('Primeros 3 productos formateados:', JSON.stringify(productosFormateados.slice(0, 3), null, 2));
      
      // Enviar respuesta
      const respuesta = {
        success: true,
        data: productosFormateados,
        timestamp: new Date().toISOString()
      };
      
      console.log('=== FIN DE OBTENCIÓN DE REPORTE MAESTRO DE PRODUCTOS ===');
      res.json(respuesta);

    } catch (error) {
      console.error('Error en obtenerProductosMaestro:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener el reporte maestro de productos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = productoMaestroController;
