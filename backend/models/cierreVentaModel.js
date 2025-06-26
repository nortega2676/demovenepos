const { pool } = require('../db/database');

const cierreVentaModel = {
  // Crear un nuevo cierre de venta
  async crearCierreVenta(cierreData) {
    const connection = await pool.getConnection();
    try {
      const { fecha_cierre, monto, diferencia, usuario_id, tipo = 'general' } = cierreData;
      
      // Log the incoming data
      console.log('Datos recibidos para cierre de venta:', {
        fecha_cierre,
        monto,
        diferencia,
        usuario_id,
        tipo
      });
      
      const sql = `
        INSERT INTO cierre_venta 
        (fecha_cierre, monto, diferencia, usuario_id, tipo) 
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const params = [fecha_cierre, monto, diferencia, usuario_id, tipo];
      
      // Create a copy of params for logging
      const paramsCopy = [...params];
      
      // Log the SQL query that will be executed
      console.log('Ejecutando SQL:', {
        sql,
        params: [...params],
        sqlWithParams: sql.replace(/\?/g, (m) => {
          const val = paramsCopy.shift();
          return typeof val === 'string' ? `'${val}'` : val;
        })
      });
      
      const [result] = await connection.query(sql, params);
      
      console.log('Cierre de venta creado exitosamente. ID:', result.insertId);
      return { id: result.insertId };
      
    } catch (error) {
      console.error('Error en crearCierreVenta:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlMessage: error.sqlMessage,
        sqlState: error.sqlState,
        sql: error.sql
      });
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },
  
  // Verificar si ya existe un cierre personal para la fecha y usuario
  async existeCierrePersonalParaFecha(fecha, usuarioId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT id_cierre FROM cierre_venta WHERE DATE(fecha_cierre) = ? AND usuario_id = ? AND tipo = ?',
        [fecha, usuarioId, 'personal']
      );
      
      return rows.length > 0;
    } catch (error) {
      console.error('Error en existeCierrePersonalParaFecha:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },
  
  // Verificar si existe un cierre general para la fecha
  async existeCierreGeneralParaFecha(fecha) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(
        'SELECT id_cierre FROM cierre_venta WHERE DATE(fecha_cierre) = ? AND tipo = ?',
        [fecha, 'general']
      );
      
      return rows.length > 0;
    } catch (error) {
      console.error('Error en existeCierreGeneralParaFecha:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  // Verificar si ya existe un cierre para la fecha
  async existeCierreParaFecha(fecha) {
    try {
      const [rows] = await pool.query(
        'SELECT id_cierre FROM cierre_venta WHERE DATE(fecha_cierre) = ?',
        [fecha]
      );
      
      return rows.length > 0;
    } catch (error) {
      console.error('Error en existeCierreParaFecha:', error);
      throw error;
    }
  },

  // Obtener cierres por rango de fechas con filtros opcionales
  async obtenerCierresPorRango(desde, hasta, tipo = null, usuarioId = null) {
    const connection = await pool.getConnection();
    try {
      let query = `
        SELECT 
          cv.id_cierre as id, 
          cv.fecha_cierre, 
          cv.monto, 
          cv.diferencia, 
          cv.usuario_id, 
          cv.fecha_creacion,
          cv.tipo,
          u.nombre as usuario_nombre,
          u.email as usuario_email
        FROM cierre_venta cv
        LEFT JOIN usuarios u ON cv.usuario_id = u.id
        WHERE DATE(cv.fecha_cierre) BETWEEN ? AND ?
      `;
      
      const params = [desde, hasta];
      
      // Agregar filtro por tipo si se especifica
      if (tipo) {
        query += ' AND cv.tipo = ?';
        params.push(tipo);
      }
      
      // Agregar filtro por usuario si se especifica
      if (usuarioId) {
        query += ' AND cv.usuario_id = ?';
        params.push(usuarioId);
      }
      
      // Ordenar por fecha de cierre descendente
      query += ' ORDER BY cv.fecha_cierre DESC';
      
      console.log('Ejecutando consulta obtenerCierresPorRango:', {
        query,
        params,
        tipo,
        usuarioId
      });
      
      const [rows] = await connection.query(query, params);
      return rows;
      
    } catch (error) {
      console.error('Error en obtenerCierresPorRango:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
};

module.exports = cierreVentaModel;
