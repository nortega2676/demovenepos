const { pool } = require('../db/database');

const cierreCajaController = {
  // Obtener reporte de cierre de caja por fecha
  async obtenerReporteCierreCaja(req, res) {
    try {
      console.log('Solicitud de reporte de cierre de caja recibida con parámetros:', req.query);
      const { fecha } = req.query;
      const usuarioId = req.user.id; // Obtener el ID del usuario autenticado
      
      // Validar fecha
      if (!fecha) {
        console.error('Error: No se proporcionó el parámetro fecha');
        return res.status(400).json({ 
          success: false, 
          error: 'Se requiere el parámetro "fecha" (formato: YYYY-MM-DD)' 
        });
      }
      
      // Validar formato de fecha
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(fecha)) {
        console.error(`Error: Formato de fecha inválido: ${fecha}`);
        return res.status(400).json({ 
          success: false, 
          error: 'Formato de fecha inválido. Use YYYY-MM-DD' 
        });
      }
      
      console.log(`Verificando si ya existe cierre para la fecha: ${fecha} del usuario: ${usuarioId}`);
      
      // Verificar si ya existe un cierre para esta fecha y usuario
      const [cierres] = await pool.query(
        'SELECT id, fecha_cierre, monto, diferencia FROM cierre_caja WHERE DATE(fecha_cierre) = ? AND usuario_id = ?',
        [fecha, usuarioId]
      );

      if (cierres.length > 0) {
        console.log(`Ya existe un cierre para la fecha ${fecha} del usuario ${usuarioId}`);
        return res.json({
          success: true,
          fechaCerrada: true,
          mensaje: 'Ya existe un cierre de caja para esta fecha',
          cierreExistente: cierres[0],
          ventas: []
        });
      }
      
      console.log(`Obteniendo ventas para la fecha: ${fecha} del usuario: ${usuarioId}`);
      
      // Obtener las ventas del usuario para la fecha especificada
      const [ventas] = await pool.query(`
        SELECT 
          v.id,
          v.fecha_venta as fecha,
          v.total,
          v.metodo_pago,
          v.estado,
          v.usuario_id,
          u.username as usuario_nombre
        FROM ventas v
        LEFT JOIN usuarios u ON v.usuario_id = u.id
        WHERE DATE(v.fecha_venta) = ? AND v.usuario_id = ?
        ORDER BY v.fecha_venta DESC
      `, [fecha, usuarioId]);

      console.log(`Se obtuvieron ${ventas.length} ventas para la fecha ${fecha} del usuario ${usuarioId}`);
      
      // Procesar para agrupar por tipo de pago
      console.log('Procesando ventas para generar reporte de cierre de caja...');
      const reporte = {
        fecha,
        total_ventas: 0,
        total_monto: 0,
        por_metodo_pago: {},
        ventas: []
      };
      
      ventas.forEach(venta => {
        const metodo = venta.metodo_pago || 'No especificado';
        const monto = parseFloat(venta.total) || 0;
        
        // Inicializar el método de pago si no existe
        if (!reporte.por_metodo_pago[metodo]) {
          reporte.por_metodo_pago[metodo] = 0;
        }
        
        // Sumar al total y al método de pago correspondiente
        reporte.total_ventas++;
        reporte.total_monto += monto;
        reporte.por_metodo_pago[metodo] += monto;
        
        // Agregar la venta al array de ventas
        reporte.ventas.push({
          id: venta.id,
          fecha: venta.fecha,
          metodo_pago: venta.metodo_pago,
          total: monto,
          usuario_nombre: venta.usuario_nombre || 'Sistema'
        });
      });
      
      // Redondear montos a 2 decimales
      reporte.total_monto = parseFloat(reporte.total_monto.toFixed(2));
      Object.keys(reporte.por_metodo_pago).forEach(key => {
        reporte.por_metodo_pago[key] = parseFloat(reporte.por_metodo_pago[key].toFixed(2));
      });
      
      // Inicializar ingresos manuales vacíos para cada método de pago
      reporte.ingresos_manuales = {};
      Object.keys(reporte.por_metodo_pago).forEach(metodo => {
        reporte.ingresos_manuales[metodo] = 0;
      });
      
      console.log('Reporte de cierre de caja generado exitosamente');
      
      res.json({
        success: true,
        data: reporte
      });
      
    } catch (error) {
      console.error('Error en obtenerReporteCierreCaja:', error);
      res.status(500).json({
        success: false,
        error: 'Error al generar el reporte de cierre de caja',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Verificar si una fecha ya tiene cierre de caja para el usuario
  async verificarFechaCerrada(req, res) {
    try {
      const { fecha } = req.params;
      const usuarioId = req.user.id;

      if (!fecha) {
        return res.status(400).json({ 
          success: false, 
          error: 'La fecha es requerida' 
        });
      }

      // Verificar si ya existe un cierre para esta fecha y usuario
      const [cierres] = await pool.query(
        'SELECT id, fecha_cierre, total_efectivo, total_tarjeta, total_transferencia, observaciones FROM cierres_caja WHERE DATE(fecha_cierre) = ? AND usuario_id = ?',
        [fecha, usuarioId]
      );

      res.json({ 
        success: true, 
        cerrado: cierres.length > 0,
        cierre: cierres[0] || null
      });
    } catch (error) {
      console.error('Error en verificarFechaCerrada:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al verificar la fecha de cierre',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Registrar un nuevo cierre de caja
  async registrarCierreCaja(req, res) {
    try {
      const { fecha, monto, diferencia } = req.body;
      const usuarioId = req.user.id;

      // Validar datos requeridos
      if (!fecha) {
        return res.status(400).json({ 
          success: false, 
          error: 'La fecha es requerida' 
        });
      }

      if (monto === undefined || monto === null) {
        return res.status(400).json({ 
          success: false, 
          error: 'El monto es requerido' 
        });
      }

      if (diferencia === undefined || diferencia === null) {
        return res.status(400).json({ 
          success: false, 
          error: 'La diferencia es requerida' 
        });
      }

      // Verificar si ya existe un cierre para esta fecha y usuario
      const [cierres] = await pool.query(
        'SELECT id FROM cierre_caja WHERE DATE(fecha_cierre) = ? AND usuario_id = ?',
        [fecha, usuarioId]
      );

      if (cierres.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Ya existe un cierre de caja para esta fecha' 
        });
      }

      // Insertar el nuevo cierre de caja
      const [result] = await pool.query(
        'INSERT INTO cierre_caja (fecha_cierre, usuario_id, monto, diferencia) VALUES (?, ?, ?, ?)',
        [fecha, usuarioId, monto, diferencia]
      );

      res.json({
        success: true,
        message: 'Cierre de caja registrado exitosamente',
        cierre_id: result.insertId
      });
    } catch (error) {
      console.error('Error en registrarCierreCaja:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al registrar el cierre de caja',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = cierreCajaController;
