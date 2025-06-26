const cierreVentaModel = require('../models/cierreVentaModel');

const cierreVentaController = {
  // Verificar si una fecha ya tiene cierre
  async verificarFechaCerrada(req, res) {
    console.log('=== INICIO verificarFechaCerrada ===');
    
    try {
      const { fecha } = req.params;
      const { tipo = 'general' } = req.query;
      const usuario_id = req.user?.id;
      
      console.log('Fecha recibida para verificación:', { fecha, tipo, usuario_id });
      
      if (!fecha) {
        console.error('❌ No se proporcionó una fecha para verificar');
        return res.status(400).json({
          success: false,
          error: 'Se requiere una fecha para verificar'
        });
      }
      
      // Validar que el tipo sea válido
      if (tipo !== 'general' && tipo !== 'personal') {
        console.error('❌ Tipo de verificación no válido:', tipo);
        return res.status(400).json({
          success: false,
          error: 'Tipo de verificación no válido. Use "general" o "personal"'
        });
      }
      
      // Para verificación personal, se requiere el ID del usuario
      if (tipo === 'personal' && !usuario_id) {
        console.error('❌ No se pudo identificar al usuario para verificación personal');
        return res.status(401).json({
          success: false,
          error: 'No se pudo identificar al usuario'
        });
      }
      
      let cerrado = false;
      
      if (tipo === 'personal') {
        // Verificar cierre personal para el usuario
        console.log(`🔍 Buscando cierres personales para la fecha: ${fecha}, usuario: ${usuario_id}`);
        cerrado = await cierreVentaModel.existeCierrePersonalParaFecha(fecha, usuario_id);
      } else {
        // Verificar cierre general
        console.log(`🔍 Buscando cierres generales para la fecha: ${fecha}`);
        cerrado = await cierreVentaModel.existeCierreGeneralParaFecha(fecha);
      }
      
      console.log(`✅ Resultado de verificación (${tipo}) para ${fecha}:`, cerrado ? 'CERRADO' : 'NO CERRADO');
      
      res.json({
        success: true,
        cerrado,
        fecha_verificada: fecha,
        tipo
      });
      
    } catch (error) {
      console.error('❌ Error en verificarFechaCerrada:', error);
      res.status(500).json({
        success: false,
        error: 'Error al verificar si la fecha está cerrada',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      console.log('=== FIN verificarFechaCerrada ===');
    }
  },
  // Crear un nuevo cierre de venta
  async crearCierreVenta(req, res) {
    try {
      console.log('Solicitud de creación de cierre recibida:', {
        body: req.body,
        user: req.user
      });

      const { fecha_cierre, monto, diferencia, tipo = 'general' } = req.body;
      const usuario_id = req.user?.id;

      // Validar campos requeridos
      if (!fecha_cierre) {
        const error = 'El campo fecha_cierre es requerido';
        console.error('Error de validación:', error);
        return res.status(400).json({
          success: false,
          error
        });
      }

      if (monto === undefined || monto === null) {
        const error = 'El campo monto es requerido';
        console.error('Error de validación:', error);
        return res.status(400).json({
          success: false,
          error
        });
      }

      if (diferencia === undefined || diferencia === null) {
        const error = 'El campo diferencia es requerido';
        console.error('Error de validación:', error);
        return res.status(400).json({
          success: false,
          error
        });
      }

      if (!usuario_id) {
        const error = 'No se pudo identificar al usuario';
        console.error('Error de autenticación:', error);
        return res.status(401).json({
          success: false,
          error
        });
      }

      // Validar que el tipo sea válido
      if (tipo !== 'general' && tipo !== 'personal') {
        const error = 'Tipo de cierre no válido';
        console.error('Error de validación:', error);
        return res.status(400).json({
          success: false,
          error
        });
      }

      console.log('Datos validados correctamente:', {
        fecha_cierre,
        monto,
        diferencia,
        usuario_id,
        tipo
      });

      // Verificar si ya existe un cierre para esta fecha según el tipo
      let existeCierre = false;
      let errorMensaje = '';
      
      if (tipo === 'personal') {
        existeCierre = await cierreVentaModel.existeCierrePersonalParaFecha(fecha_cierre, usuario_id);
        errorMensaje = `Ya existe un cierre de caja personal para la fecha ${fecha_cierre}`;
      } else {
        // Para cierres generales, verificar que no exista un cierre general para la fecha
        existeCierre = await cierreVentaModel.existeCierreGeneralParaFecha(fecha_cierre);
        errorMensaje = `Ya existe un cierre de caja general para la fecha ${fecha_cierre}`;
      }
      
      if (existeCierre) {
        console.error('Error de validación:', errorMensaje);
        return res.status(400).json({
          success: false,
          error: errorMensaje
        });
      }

      // Crear el cierre con los campos necesarios
      const cierreData = {
        fecha_cierre,
        monto: parseFloat(monto),
        diferencia: parseFloat(diferencia),
        usuario_id,
        tipo
      };

      console.log('Creando cierre de venta con datos:', cierreData);
      const nuevoCierre = await cierreVentaModel.crearCierreVenta(cierreData);

      res.status(201).json({
        success: true,
        data: nuevoCierre,
        message: `Cierre de caja ${tipo} guardado exitosamente`
      });

    } catch (error) {
      console.error('Error en crearCierreVenta:', error);
      res.status(500).json({
        success: false,
        error: 'Error al guardar el cierre de caja',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Obtener cierres por rango de fechas con filtros opcionales
  async obtenerCierresPorRango(req, res) {
    try {
      const { desde, hasta, tipo, usuario_id } = req.query;
      const current_user_id = req.user?.id;
      
      // Validar fechas
      if (!desde || !hasta) {
        return res.status(400).json({
          success: false,
          error: 'Se requieren los parámetros "desde" y "hasta" (formato: YYYY-MM-DD)'
        });
      }

      // Validar tipo si se proporciona
      if (tipo && tipo !== 'general' && tipo !== 'personal') {
        return res.status(400).json({
          success: false,
          error: 'El parámetro "tipo" debe ser "general" o "personal"'
        });
      }
      
      // Si se solicita un tipo personal, verificar que el usuario esté autenticado
      if (tipo === 'personal' && !current_user_id) {
        return res.status(401).json({
          success: false,
          error: 'No autorizado para ver cierres personales'
        });
      }
      
      // Si se proporciona un usuario_id, verificar permisos (solo admin puede ver otros usuarios)
      const isAdmin = req.user?.rol === 'admin';
      if (usuario_id && usuario_id !== current_user_id && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'No tiene permiso para ver los cierres de otros usuarios'
        });
      }
      
      // Determinar el ID de usuario a usar en la consulta
      const userIdToQuery = tipo === 'personal' ? (usuario_id || current_user_id) : null;
      
      const cierres = await cierreVentaModel.obtenerCierresPorRango(desde, hasta, tipo, userIdToQuery);
      
      res.json({
        success: true,
        data: cierres
      });

    } catch (error) {
      console.error('Error en obtenerCierresPorRango:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener los cierres de caja',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  // Obtener cierres personales por rango de fechas
  async obtenerCierresPersonalesPorRango(req, res) {
    try {
      const { desde, hasta } = req.query;
      const usuario_id = req.user?.id;
      
      // Validar fechas
      if (!desde || !hasta) {
        return res.status(400).json({
          success: false,
          error: 'Se requieren los parámetros "desde" y "hasta" (formato: YYYY-MM-DD)'
        });
      }
      
      if (!usuario_id) {
        return res.status(401).json({
          success: false,
          error: 'No se pudo identificar al usuario'
        });
      }
      
      // Obtener cierres personales del usuario
      const cierres = await cierreVentaModel.obtenerCierresPorRango(
        desde, 
        hasta, 
        'personal', 
        usuario_id
      );
      
      res.json({
        success: true,
        data: cierres
      });
      
    } catch (error) {
      console.error('Error en obtenerCierresPersonalesPorRango:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener los cierres de caja personales',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = cierreVentaController;
