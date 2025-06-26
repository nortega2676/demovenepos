const { pool } = require('../db/database');

const cierrePersonalController = {
  // Verificar si existe cierre personal para una fecha específica
  verificarFechaCerradaPersonal: function(req, res) {
    try {
      const { fecha } = req.params;
      const usuarioId = req.user.id; // Obtener el ID del usuario autenticado

      if (!fecha) {
        return res.status(400).json({ 
          success: false, 
          error: 'La fecha es requerida' 
        });
      }

      // Verificar si ya existe un cierre personal para esta fecha y usuario
      pool.query(
        'SELECT id FROM cierre_venta WHERE DATE(fecha_cierre) = ? AND usuario_id = ? AND tipo = "personal"',
        [fecha, usuarioId],
        (error, cierres) => {
          if (error) {
            console.error('Error en verificarFechaCerradaPersonal:', error);
            return res.status(500).json({ 
              success: false, 
              error: 'Error al verificar la fecha de cierre personal',
              details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
          }

          res.json({ 
            success: true, 
            cerrado: cierres.length > 0,
            cierre: cierres[0] || null
          });
        }
      );
    } catch (error) {
      console.error('Error en verificarFechaCerradaPersonal:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al verificar la fecha de cierre personal',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Obtener reporte de cierre personal
  obtenerReporteCierrePersonal: function(req, res) {
    try {
      const { fecha } = req.query;
      const usuarioId = req.user.id; // Obtener el ID del usuario autenticado

      if (!fecha) {
        return res.status(400).json({ 
          success: false, 
          error: 'La fecha es requerida' 
        });
      }

      // Obtener las ventas del usuario para la fecha especificada
      pool.query(
        `SELECT 
          v.id,
          v.fecha_creacion,
          v.total,
          v.metodo_pago,
          u.nombre AS usuario_nombre,
          u.apellido AS usuario_apellido
        FROM ventas v
        INNER JOIN usuarios u ON v.usuario_id = u.id
        WHERE DATE(v.fecha_creacion) = ?
          AND v.usuario_id = ?
        ORDER BY v.fecha_creacion DESC`,
        [fecha, usuarioId],
        (error, ventas) => {
          if (error) {
            console.error('Error en obtenerReporteCierrePersonal:', error);
            return res.status(500).json({ 
              success: false, 
              error: 'Error al obtener el reporte de cierre personal',
              details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
          }

          // Calcular totales
          const totalVentas = ventas.length;
          const totalMonto = ventas.reduce((sum, venta) => sum + parseFloat(venta.total), 0);
          
          // Agrupar por método de pago
          const porMetodoPago = {};
          ventas.forEach(venta => {
            if (!porMetodoPago[venta.metodo_pago]) {
              porMetodoPago[venta.metodo_pago] = 0;
            }
            porMetodoPago[venta.metodo_pago] += parseFloat(venta.total);
          });

          // Verificar si ya existe un cierre para esta fecha
          pool.query(
            'SELECT * FROM cierre_venta WHERE DATE(fecha_cierre) = ? AND usuario_id = ? AND tipo = "personal"',
            [fecha, usuarioId],
            (error, cierres) => {
              if (error) {
                console.error('Error al verificar cierre existente:', error);
                return res.status(500).json({ 
                  success: false, 
                  error: 'Error al verificar cierre existente',
                  details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
              }


              res.json({
                success: true,
                data: {
                  fecha,
                  total_ventas: totalVentas,
                  total_monto: totalMonto,
                  por_metodo_pago: porMetodoPago,
                  ventas: ventas.map(v => ({
                    id: v.id,
                    fecha: v.fecha_creacion,
                    metodo_pago: v.metodo_pago,
                    total: v.total,
                    usuario_nombre: `${v.usuario_nombre} ${v.usuario_apellido || ''}`.trim()
                  })),
                  cierre_existente: cierres[0] || null
                }
              });
            }
          );
        }
      );
    } catch (error) {
      console.error('Error en obtenerReporteCierrePersonal:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al generar el reporte de cierre personal',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = cierrePersonalController;
