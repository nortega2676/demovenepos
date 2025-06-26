const { pool } = require('../db/database');

const pagoCreditoController = {
  // Obtener información del crédito por ID de cliente
  getCreditoByClienteId: async (req, res) => {
    console.log('🔍 [pagoCreditoController] getCreditoByClienteId - Iniciando');
    console.log('🔍 [pagoCreditoController] Parámetros recibidos:', req.params);
    console.log('🔍 [pagoCreditoController] Headers:', req.headers);
    
    try {
      const { clienteId } = req.params;
      console.log('🔍 [pagoCreditoController] Buscando crédito para cliente ID:', clienteId);
      
      // Construir la consulta SQL para obtener el crédito y calcular el saldo pendiente
      const sqlQuery = `
        SELECT 
          cc.id_credito as id,
          cc.id_cliente,
          cc.nombre,
          cc.apellido,
          cc.monto as monto_total,
          ROUND(cc.monto - IFNULL(SUM(CASE WHEN pc.estado IN ('completado', 'aprobado') THEN pc.monto ELSE 0 END), 0), 2) as saldo_pendiente,
          cc.estado,
          cc.fecha_limite,
          IFNULL(SUM(CASE WHEN pc.estado IN ('completado', 'aprobado') THEN pc.monto ELSE 0 END), 0) as total_pagado
        FROM cliente_credito cc
        LEFT JOIN pagos_credito pc ON cc.id_credito = pc.credito_id
        WHERE cc.id_cliente = ? AND cc.estado = 'pendiente'
        GROUP BY cc.id_credito
        ORDER BY cc.id_credito DESC
        LIMIT 1`;
        
      // Mostrar la consulta SQL con los parámetros reemplazados para depuración
      const sqlForLog = sqlQuery
        .replace(/\?/g, `'${clienteId}'`)
        .replace(/\s+/g, ' ')
        .trim();
        
      console.log('\n📝 [SQL DEBUG] Consulta a ejecutar:');
      console.log('----------------------------------------');
      console.log(sqlForLog);
      console.log('----------------------------------------');
      
      console.log('🔍 [pagoCreditoController] Ejecutando consulta SQL:');
      console.log('📝 SQL:', sqlQuery.replace(/\s+/g, ' ').trim());
      console.log('📝 Parámetros:', [clienteId]);
      
      const startTime = Date.now();
      // Ejecutar la consulta
      console.log('🔄 [SQL] Ejecutando consulta...');
      const [credito] = await pool.query(sqlQuery, [clienteId]);
      const queryTime = Date.now() - startTime;
      
      // Mostrar resultados
      console.log(`✅ [SQL] Consulta completada en ${queryTime}ms`);
      console.log('📊 [SQL] Resultados obtenidos:', JSON.stringify(credito, null, 2));
      
      console.log(`✅ [pagoCreditoController] Consulta completada en ${queryTime}ms`);
      console.log('📊 [pagoCreditoController] Resultados de la consulta:', JSON.stringify(credito, null, 2));

      console.log('🔍 [pagoCreditoController] Resultado de la consulta SQL:', credito);
      
      if (!credito || credito.length === 0) {
        console.log('⚠️ [pagoCreditoController] No se encontró crédito para el cliente ID:', clienteId);
        return res.status(404).json({
          success: false,
          message: 'No se encontró un crédito pendiente para este cliente',
          clienteId: clienteId,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: credito[0]
      });
    } catch (error) {
      console.error('❌ [pagoCreditoController] Error al obtener crédito:', error);
      console.error('❌ [pagoCreditoController] Stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la información del crédito',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      console.log('🏁 [pagoCreditoController] getCreditoByClienteId - Finalizado');
    }
  },

  // Registrar un nuevo pago
  registrarPago: async (req, res) => {
    console.log('💳 [pagoCreditoController] Iniciando registro de pago');
    console.log('📝 Datos recibidos:', req.body);
    
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      
      const { id_credito, monto, metodo_pago, referencia, usuario_id } = req.body;
      const fecha_pago = new Date();
      const estado = 'completado'; // Estado por defecto para pagos completados

      // 1. Verificar que el crédito existe y está pendiente
      const [credito] = await connection.query(
        'SELECT * FROM cliente_credito WHERE id_credito = ? AND estado = ? FOR UPDATE',
        [id_credito, 'pendiente']
      );

      if (!credito || credito.length === 0) {
        throw new Error('Crédito no encontrado o ya está pagado');
      }

      // 2. Calcular el total pagado hasta ahora
      const [pagosAnteriores] = await connection.query(
        'SELECT COALESCE(SUM(monto), 0) as total_pagado FROM pagos_credito WHERE credito_id = ?',
        [id_credito]
      );
      
      const totalPagadoHastaAhora = parseFloat(pagosAnteriores[0].total_pagado);
      const montoTotalCredito = parseFloat(credito[0].monto);
      const montoPago = parseFloat(monto);
      
      // 3. Verificar que el pago no exceda el saldo pendiente
      const saldoPendiente = montoTotalCredito - totalPagadoHastaAhora;
      if (montoPago > saldoPendiente) {
        throw new Error(`El monto del pago (${montoPago}) excede el saldo pendiente (${saldoPendiente})`);
      }

      // 4. Insertar el registro de pago
      const [result] = await connection.query(
        `INSERT INTO pagos_credito 
         (credito_id, monto, fecha_pago, metodo_pago, referencia, usuario_id, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id_credito, montoPago, fecha_pago, metodo_pago, referencia, usuario_id, estado]
      );

      // 5. Verificar si el crédito queda completamente pagado
      const nuevoTotalPagado = totalPagadoHastaAhora + montoPago;
      const nuevoSaldoPendiente = montoTotalCredito - nuevoTotalPagado;
      
      if (nuevoSaldoPendiente <= 0) {
        // Si el saldo queda en 0, marcar como pagado
        await connection.query(
          'UPDATE cliente_credito SET estado = ? WHERE id_credito = ?',
          ['pagado', id_credito]
        );
      }
      // No actualizamos el monto en cliente_credito para mantener el monto original

      await connection.commit();
      
      console.log('✅ Pago registrado exitosamente');
      res.status(201).json({
        success: true,
        message: 'Pago registrado exitosamente',
        pagoId: result.insertId,
        totalPagado: nuevoTotalPagado,
        saldoPendiente: nuevoSaldoPendiente > 0 ? nuevoSaldoPendiente : 0
      });

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error(' Error al registrar pago:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar el pago',
        error: error.message
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  // Obtener todos los pagos con información de cliente y crédito
  getAllPagos: async (req, res) => {
    console.log('🔍 [pagoCreditoController] getAllPagos - Iniciando');
    console.log('📝 [SQL] Ejecutando consulta para obtener todos los pagos');
    
    try {
      const { search } = req.query;
      let sqlQuery = `
        SELECT 
          pc.id_pago,
          pc.credito_id,
          pc.monto,
          pc.metodo_pago,
          pc.referencia,
          pc.estado,
          pc.fecha_pago,
          cc.id_cliente,
          CONCAT(cc.nombre, ' ', cc.apellido) as nombre_cliente,
          cc.monto as monto_credito,
          u.username as creado_por
        FROM pagos_credito pc
        JOIN cliente_credito cc ON pc.credito_id = cc.id_credito
        LEFT JOIN usuarios u ON pc.usuario_id = u.id`;

      // Agregar condición de búsqueda si se proporciona
      if (search) {
        sqlQuery += ` WHERE cc.nombre LIKE ? OR cc.apellido LIKE ? OR CONCAT(cc.nombre, ' ', cc.apellido) LIKE ?`;
      }

      // Ordenar por fecha de pago descendente
      sqlQuery += ` ORDER BY pc.fecha_pago DESC`;
      
      console.log('🔍 [pagoCreditoController] Query:', sqlQuery);
      console.log('🔍 [pagoCreditoController] Search term:', search);
      
      let queryParams = [];
      if (search) {
        const searchTerm = `%${search}%`;
        queryParams = [searchTerm, searchTerm, searchTerm];
      }
      
      const [pagos] = await pool.query(sqlQuery, queryParams);
      
      console.log('🔍 [pagoCreditoController] Ejecutando consulta para obtener todos los pagos');
      console.log(`✅ [pagoCreditoController] Se encontraron ${pagos.length} pagos`);
      res.status(200).json(pagos);
    } catch (error) {
      console.error('❌ [pagoCreditoController] Error al obtener los pagos:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al obtener los pagos',
        error: error.message 
      });
    }
  }
};

// Export the controller object directly
module.exports = pagoCreditoController;
