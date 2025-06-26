const ventaModel = require('../models/ventaModel');
const { pool } = require('../db/database');

const ventaController = {
  // Crear una nueva venta
  async crearVenta(req, res) {
    console.log('Solicitud de creación de venta recibida');
    console.log('Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    try {
      const ventaData = req.body;
      
      // Validar datos de entrada
      if (!ventaData.total || isNaN(ventaData.total)) {
        return res.status(400).json({ 
          success: false,
          error: 'El total de la venta es requerido y debe ser un número válido' 
        });
      }
      
      if (!ventaData.metodo_pago || typeof ventaData.metodo_pago !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'El método de pago es requerido' 
        });
      }
      
      if (!ventaData.detalles || !Array.isArray(ventaData.detalles) || ventaData.detalles.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'La venta debe incluir al menos un producto' 
        });
      }
      
      console.log('Validaciones pasadas, intentando crear la venta...');
      
      // Crear la venta en la base de datos
      const resultado = await ventaModel.crearVenta(ventaData);
      
      console.log('Venta creada exitosamente con ID:', resultado.id);
      
      res.status(201).json({
        success: true,
        message: 'Venta registrada correctamente',
        data: { id: resultado.id }
      });
      
    } catch (error) {
      console.error('Error en crearVenta:', error);
      
      // Determinar el código de estado apropiado
      const statusCode = error.message.includes('no existe') ? 404 : 500;
      
      res.status(statusCode).json({ 
        success: false, 
        error: error.message || 'Error al procesar la venta',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  // Obtener todas las ventas
  async obtenerVentas(req, res) {
    try {
      const ventas = await ventaModel.obtenerVentas();
      res.json({ success: true, data: ventas });
    } catch (error) {
      console.error('Error en obtenerVentas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las ventas',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Obtener una venta por ID
  async obtenerVentaPorId(req, res) {
    try {
      const { id } = req.params;
      const venta = await ventaModel.obtenerVentaPorId(parseInt(id));
      
      if (!venta) {
        return res.status(404).json({ 
          success: false, 
          error: 'Venta no encontrada' 
        });
      }
      
      res.json({ success: true, data: venta });
      
    } catch (error) {
      console.error('Error en obtenerVentaPorId:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener la venta',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Obtener reporte de ventas por rango de fechas
  async obtenerReporteVentas(req, res) {
    try {
      const { desde, hasta } = req.query;
      
      // Validar fechas
      if (!desde || !hasta) {
        return res.status(400).json({ 
          success: false, 
          error: 'Se requieren las fechas de inicio y fin' 
        });
      }
      
      // Obtener los productos vendidos en el rango de fechas
      const productosVendidos = await ventaModel.obtenerProductosVendidos(desde, hasta);
      
      // Calcular totales
      const totalVentas = productosVendidos.reduce((sum, item) => sum + parseFloat(item.subtotal_total), 0);
      const totalUnidades = productosVendidos.reduce((sum, item) => sum + parseInt(item.cantidad_total), 0);
      
      res.json({ 
        success: true, 
        data: {
          desde,
          hasta,
          total_ventas: totalVentas,
          total_unidades: totalUnidades,
          total_productos: productosVendidos.length,
          productos: productosVendidos
        }
      });
      
    } catch (error) {
      console.error('Error en obtenerReporteVentas:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al generar el reporte de ventas',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  // Obtener reporte de productos vendidos por rango de fechas
  async obtenerProductosVendidos(req, res) {
    try {
      const { fechaInicio, fechaFin } = req.query;
      
      // Validar fechas
      if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ 
          success: false, 
          error: 'Se requieren las fechas de inicio y fin' 
        });
      }
      
      // Obtener los productos vendidos en el rango de fechas
      const productosVendidos = await ventaModel.obtenerProductosVendidos(fechaInicio, fechaFin);
      
      // Obtener el total de ventas del primer registro (todos tendrán el mismo valor)
      const totalVentas = productosVendidos.length > 0 ? 
        productosVendidos[0].total_ventas_periodo : 0;
      
      // Calcular totales generales
      const totales = {
        ventas_totales: totalVentas, // Usamos el contador de la consulta SQL
        cantidad_total: 0,
        subtotal_total: 0
      };
      
      if (productosVendidos && productosVendidos.length > 0) {
        totales.cantidad_total = productosVendidos.reduce((sum, item) => sum + parseInt(item.cantidad_total), 0);
        totales.subtotal_total = productosVendidos.reduce((sum, item) => sum + parseFloat(item.subtotal_total), 0);
      }
      
      res.json({ 
        success: true, 
        data: {
          desde: fechaInicio,
          hasta: fechaFin,
          totales,
          productos: productosVendidos
        }
      });
      
    } catch (error) {
      console.error('Error en obtenerProductosVendidos:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al generar el reporte de productos vendidos',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Obtener reporte de ventas por tipo de pago
  // Obtener reporte de cierre de ventas por fecha
  async obtenerReporteCierreVentas(req, res) {
    try {
      console.log('Solicitud de reporte de cierre recibida con parámetros:', req.query);
      const { fecha } = req.query;
      
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
      
      console.log(`Obteniendo ventas para la fecha: ${fecha}`);
      const ventas = await ventaModel.obtenerVentasPorFecha(fecha);
      console.log(`Se obtuvieron ${ventas.length} ventas para la fecha ${fecha}`);
      
      // Procesar para agrupar por tipo de pago
      console.log('Procesando ventas para generar reporte...');
      const reporte = {
        fecha,
        total_ventas: 0,
        total_monto: 0,
        por_metodo_pago: {},
        ventas: []
      };
      
      console.log('Estructura inicial del reporte:', JSON.stringify(reporte, null, 2));
      
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
      
      console.log('Reporte generado exitosamente:', JSON.stringify(reporte, null, 2));
      
      res.json({
        success: true,
        data: reporte
      });
      
    } catch (error) {
      console.error('Error en obtenerReporteCierreVentas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al generar el reporte de cierre de ventas',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Obtener reporte de ventas por tipo de pago
  async obtenerVentasPorTipoPago(req, res) {
    try {
      const { desde, hasta } = req.query;
      
      // Validar fechas
      if (!desde || !hasta) {
        return res.status(400).json({ 
          success: false, 
          error: 'Se requieren los parámetros "desde" y "hasta" (formato: YYYY-MM-DD)' 
        });
      }
      
      // Validar formato de fechas
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(desde) || !dateRegex.test(hasta)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Formato de fecha inválido. Use YYYY-MM-DD' 
        });
      }
      
      // Obtener ventas por rango de fechas
      const ventas = await ventaModel.obtenerVentasPorRango(desde, hasta);
      
      // Procesar para agrupar por tipo de pago
      const reporte = {
        desde,
        hasta,
        total_ventas: 0,
        total_monto: 0,
        por_metodo_pago: {},
        ventas: [] // Asegurarse de incluir el array de ventas
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
          fecha: venta.fecha, // Usando el campo 'fecha' que viene del modelo
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
      
      res.json({
        success: true,
        data: reporte
      });
      
    } catch (error) {
      console.error('Error en obtenerVentasPorTipoPago:', error);
      res.status(500).json({
        success: false,
        error: 'Error al generar el reporte de tipos de pago',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = ventaController;
