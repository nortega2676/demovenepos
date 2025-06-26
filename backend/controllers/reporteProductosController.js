const { pool } = require('../db/database');

const reporteProductosController = {
  // Obtener reporte de productos vendidos simplificado
  async obtenerReporteProductosVendidos(req, res) {
    let connection;
    try {
      const { fechaInicio, fechaFin } = req.query;

      // Validar fechas
      if (!fechaInicio || !fechaFin) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar fecha de inicio y fecha de fin'
        });
      }

      // Consulta unificada para obtener productos y totales
      const query = `
        WITH ventas_periodo AS (
          SELECT 
            p.nombre as producto_nombre,
            COALESCE(c.nombre, 'Sin categoría') as categoria_nombre,
            vd.cantidad,
            vd.subtotal
          FROM ventas v
          JOIN detalles_venta vd ON v.id = vd.venta_id
          JOIN productos p ON vd.producto_id = p.id
          LEFT JOIN categorias c ON p.categoria_id = c.id
          WHERE DATE(v.fecha_venta) BETWEEN ? AND ?
        )
        SELECT 
          producto_nombre,
          categoria_nombre,
          CAST(SUM(cantidad) AS UNSIGNED) as cantidad_total,
          CAST(SUM(subtotal) AS DECIMAL(10,2)) as subtotal_total
        FROM ventas_periodo
        GROUP BY producto_nombre, categoria_nombre
        ORDER BY producto_nombre ASC;
        
        -- Total general
        SELECT 
          SUM(cantidad) as total_cantidad,
          SUM(subtotal) as total_subtotal
        FROM ventas_periodo;`;
      
      connection = await pool.getConnection();
      
      // Ejecutar consulta múltiple
      const [results] = await connection.query(query, [fechaInicio, fechaFin, fechaInicio, fechaFin]);
      
      // Los productos están en el primer conjunto de resultados
      const productos = Array.isArray(results[0]) ? results[0] : [];
      // Los totales están en el segundo conjunto de resultados
      const totales = Array.isArray(results[1]) ? results[1] : [];
      
      console.log('Productos encontrados:', productos);
      console.log('Totales calculados:', totales[0]);
      
      // Obtener los totales
      const totalCantidad = Number(totales[0]?.total_cantidad) || 0;
      const totalSubtotal = Number(totales[0]?.total_subtotal) || 0;
      
      // Calcular totales manualmente como verificación
      const totalCantidadCalculado = productos.reduce((sum, item) => {
        return sum + (parseInt(item.cantidad_total) || 0);
      }, 0);
      
      console.log('Total cantidad (DB):', totalCantidad);
      console.log('Total cantidad (calculado):', totalCantidadCalculado);
      
      // Usar el total calculado manualmente si el de la base de datos es 0
      const totalFinalCantidad = totalCantidad > 0 ? totalCantidad : totalCantidadCalculado;
      const totalFinalSubtotal = totalSubtotal > 0 ? totalSubtotal : 0;

      res.json({
        success: true,
        data: {
          desde: fechaInicio,
          hasta: fechaFin,
          total_cantidad: totalFinalCantidad,
          total_subtotal: totalFinalSubtotal,
          productos: productos
        }
      });

    } catch (error) {
      console.error('Error en reporteProductosController:', error);
      res.status(500).json({
        success: false,
        error: 'Error al generar el reporte de productos vendidos',
        detalle: error.message
      });
    } finally {
      if (connection) connection.release();
    }
  }
};

module.exports = reporteProductosController;
