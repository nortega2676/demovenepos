const { pool } = require('../db/database');

const reporteVentasPorHoraController = {
  // Obtener reporte de ventas por hora
  async obtenerVentasPorHora(req, res) {
    let connection;
    try {
      const { fecha } = req.query;

      // Validar fecha
      if (!fecha) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar una fecha para el reporte'
        });
      }

      // Consulta para obtener las ventas por hora
      const query = `
        WITH RECURSIVE horas_del_dia AS (
          SELECT 6 AS hora
          UNION ALL
          SELECT hora + 1 FROM horas_del_dia WHERE hora < 23  -- Cambiado de 21 a 23 para incluir hasta las 23:00
        )
        SELECT 
          h.hora,
          COALESCE(COUNT(v.id), 0) as cantidad_ventas,
          COALESCE(SUM(v.total), 0) as total_ventas,
          CASE 
            WHEN COUNT(v.id) > 0 THEN COALESCE(SUM(v.total), 0) / COUNT(v.id)
            ELSE 0 
          END as promedio_por_venta
        FROM horas_del_dia h
        LEFT JOIN ventas v ON HOUR(v.fecha_venta) = h.hora 
          AND DATE(v.fecha_venta) = ?
        GROUP BY h.hora
        ORDER BY h.hora ASC;
      `;
      
      connection = await pool.getConnection();
      
      // Ejecutar consulta
      const [resultados] = await connection.query(query, [fecha]);
      
      // Formatear los resultados para asegurar que todos los campos sean del tipo correcto
      const ventasPorHora = resultados.map(item => ({
        hora: item.hora.toString().padStart(2, '0'),
        cantidad_ventas: Number(item.cantidad_ventas) || 0,
        total_ventas: Number(item.total_ventas) || 0,
        promedio_por_venta: Number(item.promedio_por_venta) || 0
      }));

      res.json({
        success: true,
        data: ventasPorHora
      });

    } catch (error) {
      console.error('Error en reporteVentasPorHoraController:', error);
      res.status(500).json({
        success: false,
        error: 'Error al generar el reporte de ventas por hora',
        detalle: error.message
      });
    } finally {
      if (connection) connection.release();
    }
  }
};

module.exports = reporteVentasPorHoraController;
