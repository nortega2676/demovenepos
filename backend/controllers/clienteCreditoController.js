const { pool } = require('../db/database');

const clienteCreditoController = {
  // Crear un nuevo registro de cliente a crédito
  async crearClienteCredito(req, res) {
    console.log('🔔 [ClienteCredito] Iniciando creación de cliente a crédito');
    console.log('📝 [ClienteCredito] Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    let connection;
    try {
      connection = await pool.getConnection();
      console.log('🔁 [ClienteCredito] Iniciando transacción...');
      await connection.beginTransaction();
      
      const { 
        nombre, 
        apellido, 
        id_cliente, 
        telefono, 
        monto,
        estado = 'pendiente',
        fecha_limite,
        venta_id = null
      } = req.body;

      // Validar campos obligatorios
      console.log('🔍 [ClienteCredito] Validando campos obligatorios...');
      if (!nombre || !apellido || !id_cliente || !monto || !fecha_limite) {
        const errorMsg = '❌ [ClienteCredito] Faltan campos obligatorios';
        console.error(errorMsg, { nombre, apellido, id_cliente, monto, fecha_limite });
        return res.status(400).json({
          success: false,
          error: 'Nombre, apellido, id_cliente, monto y fecha_limite son campos obligatorios'
        });
      }

      // Validar formato de fecha
      if (isNaN(Date.parse(fecha_limite))) {
        const errorMsg = '❌ [ClienteCredito] Formato de fecha inválido';
        console.error(errorMsg, { fecha_limite });
        return res.status(400).json({
          success: false,
          error: 'El formato de la fecha límite no es válido. Use el formato YYYY-MM-DD.'
        });
      }

      // Insertar el cliente a crédito
      console.log('💾 [ClienteCredito] Insertando en la base de datos...');
      const query = `
        INSERT INTO cliente_credito 
        (nombre, apellido, id_cliente, telefono, monto, estado, fecha_limite, venta_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        nombre, 
        apellido, 
        id_cliente, 
        telefono || null, 
        parseFloat(monto), 
        estado, 
        new Date(fecha_limite).toISOString().split('T')[0],
        venta_id
      ];
      
      console.log('📋 [ClienteCredito] Query:', query.replace(/\s+/g, ' ').trim());
      console.log('📋 [ClienteCredito] Parámetros:', JSON.stringify(params));
      
      const [result] = await connection.query(query, params);
      console.log('✅ [ClienteCredito] Inserción exitosa. ID generado:', result.insertId);

      await connection.commit();
      console.log('✅ [ClienteCredito] Transacción confirmada');
      
      const responseData = {
        success: true,
        message: 'Cliente a crédito registrado exitosamente',
        data: {
          id: result.insertId,
          nombre,
          apellido,
          id_cliente,
          telefono: telefono || null,
          monto: parseFloat(monto),
          venta_id,
          estado,
          fecha_limite: new Date(fecha_limite).toISOString().split('T')[0]
        }
      };
      
      console.log('✅ [ClienteCredito] Respuesta exitosa:', JSON.stringify(responseData, null, 2));
      return res.status(201).json(responseData);
      
    } catch (error) {
      console.error('❌ [ClienteCredito] Error en crearClienteCredito:', error);
      
      if (connection) {
        try {
          console.log('🔄 [ClienteCredito] Intentando rollback...');
          await connection.rollback();
          console.log('↩️ [ClienteCredito] Rollback completado');
        } catch (rollbackError) {
          console.error('❌ [ClienteCredito] Error al hacer rollback:', rollbackError);
        }
      }
      
      const errorResponse = {
        success: false,
        error: 'Error al registrar el cliente a crédito',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
      
      console.error('❌ [ClienteCredito] Error response:', JSON.stringify(errorResponse, null, 2));
      return res.status(500).json(errorResponse);
    } finally {
      if (connection) {
        try {
          console.log('🔗 [ClienteCredito] Liberando conexión a la base de datos');
          await connection.release();
        } catch (releaseError) {
          console.error('⚠️ [ClienteCredito] Error al liberar conexión:', releaseError);
        }
      }
    }
  },

  // Obtener todos los clientes a crédito
  async obtenerClientesCredito(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [clientes] = await connection.query(
        `SELECT * FROM cliente_credito ORDER BY fecha_creacion DESC`
      );
      
      res.json({
        success: true,
        data: clientes
      });
      
    } catch (error) {
      console.error('Error al obtener clientes a crédito:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener los clientes a crédito'
      });
    } finally {
      if (connection) {
        try {
          await connection.release();
        } catch (releaseError) {
          console.error('Error al liberar conexión:', releaseError);
        }
      }
    }
  },

  // Obtener un cliente a crédito por ID de cliente
  async obtenerClienteCreditoPorId(req, res) {
    console.log('🔍 [DEBUG] Buscando crédito para el cliente ID:', req.params.id);
    let connection;
    try {
      connection = await pool.getConnection();
      const { id } = req.params;
      console.log('🔍 [DEBUG] ID del cliente a buscar:', id);
      
      // Buscar el crédito activo más reciente para el cliente
      const query = `
        SELECT 
          id_cliente,
          id_credito,
          nombre,
          apellido,
          venta_id,
          monto,
          (SELECT COALESCE(SUM(monto), 0) 
           FROM pagos_credito 
           WHERE credito_id = cliente_credito.id_credito) as monto_pagado
        FROM cliente_credito
        WHERE id_cliente = ?
        ORDER BY id_credito DESC
        LIMIT 1`;
      
      // Registrar la consulta SQL completa con parámetros
      const sqlLog = {
        query: query.replace(/\s+/g, ' ').trim(),
        parameters: [id],
        timestamp: new Date().toISOString()
      };
      
      console.log('🔍 [SQL] Ejecutando consulta:', JSON.stringify(sqlLog, null, 2));
      
      let creditos = [];
      try {
        [creditos] = await connection.query(query, [id]);
        console.log('✅ [SQL] Consulta ejecutada con éxito. Resultados:', JSON.stringify(creditos, null, 2));
      } catch (sqlError) {
        console.error('❌ [SQL] Error en la consulta:', {
          error: sqlError.message,
          sql: sqlError.sql,
          code: sqlError.code,
          errno: sqlError.errno,
          sqlState: sqlError.sqlState,
          sqlMessage: sqlError.sqlMessage,
          query: sqlLog.query,
          parameters: sqlLog.parameters
        });
        throw sqlError; // Relanzar el error para que lo capture el catch externo
      }
      
      if (creditos.length === 0) {
        console.log('⚠️ [DEBUG] No se encontraron créditos para el cliente ID:', id);
        return res.status(404).json({
          success: false,
          error: 'No se encontró un crédito activo para este cliente',
          debug: { clienteId: id, query: query.replace(/\s+/g, ' ').trim() }
        });
      }
      
      const credito = creditos[0];
      const saldo_pendiente = credito.monto - (credito.monto_pagado || 0);
      
      res.json({
        success: true,
        data: {
          id: credito.id_credito,
          id_cliente: credito.id_cliente,
          nombre: credito.nombre,
          apellido: credito.apellido,
          venta_id: credito.venta_id,
          monto_total: parseFloat(credito.monto),
          saldo_pendiente: parseFloat(saldo_pendiente.toFixed(2))
        }
      });
      
    } catch (error) {
      console.error('❌ [ERROR] Error al obtener cliente a crédito:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name,
        ...(error.sql ? {
          sql: error.sql,
          sqlMessage: error.sqlMessage,
          sqlState: error.sqlState
        } : {})
      });
      
      res.status(500).json({
        success: false,
        error: 'Error al obtener la información del crédito del cliente',
        details: error.message,
        ...(process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          ...(error.sql ? {
            sql: error.sql,
            sqlMessage: error.sqlMessage
          } : {})
        } : {})
      });
    } finally {
      if (connection) {
        try {
          await connection.release();
        } catch (releaseError) {
          console.error('Error al liberar conexión:', releaseError);
        }
      }
    }
  },

  // Actualizar el estado de un cliente a crédito
  async actualizarEstadoClienteCredito(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      
      const { id } = req.params;
      const { estado } = req.body;
      
      if (!estado) {
        return res.status(400).json({
          success: false,
          error: 'El estado es requerido'
        });
      }
      
      // Verificar si el cliente existe
      const [clientes] = await connection.query(
        'SELECT * FROM cliente_credito WHERE id = ?',
        [id]
      );
      
      if (clientes.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Cliente a crédito no encontrado'
        });
      }
      
      // Actualizar el estado
      await connection.query(
        'UPDATE cliente_credito SET estado = ? WHERE id = ?',
        [estado, id]
      );
      
      await connection.commit();
      
      res.json({
        success: true,
        message: 'Estado actualizado correctamente',
        data: { id, estado }
      });
      
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('Error al hacer rollback:', rollbackError);
        }
      }
      
      console.error('Error al actualizar estado:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar el estado del cliente a crédito'
      });
    } finally {
      if (connection) {
        try {
          await connection.release();
        } catch (releaseError) {
          console.error('Error al liberar conexión:', releaseError);
        }
      }
    }
  },

  // Obtener clientes a crédito por estado
  async obtenerClientesCreditoPorEstado(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();
      const { estado } = req.params;
      
      const [clientes] = await connection.query(
        'SELECT * FROM cliente_credito WHERE estado = ? ORDER BY fecha_creacion DESC',
        [estado]
      );
      
      res.json({
        success: true,
        data: clientes
      });
      
    } catch (error) {
      console.error('Error al obtener clientes por estado:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener los clientes por estado'
      });
    } finally {
      if (connection) {
        try {
          await connection.release();
        } catch (releaseError) {
          console.error('Error al liberar conexión:', releaseError);
        }
      }
    }
  },

  // Obtener historial de pagos de un cliente a crédito
  async obtenerHistorialPagos(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();
      const { id } = req.params;
      
      // Verificar si el cliente existe
      const [clientes] = await connection.query(
        'SELECT * FROM cliente_credito WHERE id = ?',
        [id]
      );
      
      if (clientes.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Cliente a crédito no encontrado'
        });
      }
      
      // Obtener el historial de pagos
      const [pagos] = await connection.query(
        'SELECT * FROM pagos_credito WHERE cliente_credito_id = ? ORDER BY fecha_pago DESC',
        [id]
      );
      
      res.json({
        success: true,
        data: {
          cliente: clientes[0],
          pagos
        }
      });
      
    } catch (error) {
      console.error('Error al obtener historial de pagos:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener el historial de pagos'
      });
    } finally {
      if (connection) {
        try {
          await connection.release();
        } catch (releaseError) {
          console.error('Error al liberar conexión:', releaseError);
        }
      }
    }
  }
};

// Generar reporte de cuentas por cobrar
clienteCreditoController.generarReporteCuentasPorCobrar = async (req, res) => {
  console.log('📊 [ClienteCredito] Generando reporte de cuentas por cobrar');
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    // Consulta para obtener las cuentas por cobrar con los pagos realizados
    const query = `
      SELECT 
        cc.id_credito,
        cc.venta_id,
        cc.nombre,
        cc.apellido,
        cc.id_cliente,
        cc.monto as monto_credito,  -- Monto original del crédito
        COALESCE(pagos.total_pagado, 0) as total_pagado,
        GREATEST(cc.monto - COALESCE(pagos.total_pagado, 0), 0) as saldo_pendiente,
        cc.telefono,
        cc.fecha_limite,
        CASE 
          WHEN cc.estado = 'pagado' THEN 'pagado'
          WHEN DATEDIFF(cc.fecha_limite, CURDATE()) < 0 THEN 'atrasado'
          ELSE 'pendiente'
        END as estado,
        DATEDIFF(cc.fecha_limite, CURDATE()) as dias_restantes
      FROM cliente_credito cc
      LEFT JOIN (
        SELECT 
          credito_id, 
          COALESCE(SUM(monto), 0) as total_pagado
        FROM pagos_credito 
        WHERE estado = 'completado' OR estado IS NULL
        GROUP BY credito_id
      ) pagos ON cc.id_credito = pagos.credito_id
      WHERE cc.estado IN ('pendiente', 'atrasado') 
        AND (cc.monto > COALESCE(pagos.total_pagado, 0) OR cc.estado = 'pendiente')
      ORDER BY 
        CASE 
          WHEN DATEDIFF(cc.fecha_limite, CURDATE()) < 0 AND cc.estado != 'pagado' THEN 0
          ELSE 1
        END,
        cc.fecha_limite ASC`;

    const [result] = await connection.query(query);
    
    // Calcular totales
    const totalMonto = result.reduce((sum, item) => sum + parseFloat(item.monto_credito || 0), 0);
    const totalPagado = result.reduce((sum, item) => sum + parseFloat(item.total_pagado || 0), 0);
    const totalCobrar = result.reduce((sum, item) => sum + parseFloat(item.saldo_pendiente || 0), 0);
    const totalClientes = result.length;
    const clientesAtrasados = result.filter(item => 
      item.estado === 'atrasado' || 
      (item.dias_restantes < 0 && item.estado === 'pendiente')
    ).length;

    // Formatear la respuesta
    const reporte = {
      fechaGeneracion: new Date().toISOString(),
      totalMonto: parseFloat(totalMonto).toFixed(2),
      totalPagado: parseFloat(totalPagado).toFixed(2),
      totalCobrar: parseFloat(totalCobrar).toFixed(2),
      totalClientes,
      clientesAtrasados,
      clientesAlDia: totalClientes - clientesAtrasados,
      cuentas: result.map(item => ({
        id_credito: item.id_credito,
        venta_id: item.venta_id,
        nombre: item.nombre,
        apellido: item.apellido,
        id_cliente: item.id_cliente,
        monto_credito: parseFloat(item.monto_credito).toFixed(2),
        total_pagado: parseFloat(item.total_pagado).toFixed(2),
        saldo_pendiente: parseFloat(item.saldo_pendiente).toFixed(2),
        telefono: item.telefono,
        fecha_limite: item.fecha_limite,
        estado: item.estado,
        dias_restantes: item.dias_restantes < 0 ? 0 : item.dias_restantes
      }))
    };

    console.log(`✅ [ClienteCredito] Reporte generado con éxito: ${totalClientes} cuentas encontradas`);
    res.json({
      success: true,
      data: reporte
    });

  } catch (error) {
    console.error('❌ [ClienteCredito] Error al generar el reporte:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar el reporte de cuentas por cobrar',
      details: error.message
    });
  } finally {
    if (connection) await connection.release();
  }
};

module.exports = clienteCreditoController;
