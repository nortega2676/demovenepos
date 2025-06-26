const { pool } = require('../db/database');

// Función para verificar la conexión a la base de datos
const verificarConexion = async () => {
  try {
    const [rows] = await pool.query('SELECT 1');
    console.log('Conexión a la base de datos verificada correctamente');
    return true;
  } catch (error) {
    console.error('Error al verificar la conexión a la base de datos:', error);
    throw new Error('Error de conexión a la base de datos');
  }
};

// Modelo de ventas
const ventaModel = {
  // Crear una nueva venta
  async crearVenta(ventaData) {
    try {
      console.log('Iniciando creación de venta...');
      console.log('Datos recibidos en el modelo:', JSON.stringify(ventaData, null, 2));
      
      // Verificar conexión a la base de datos
      await verificarConexion();
      
      // Validar y convertir tipos antes de insertar
      const total = parseFloat(ventaData.total);
      const metodo_pago = String(ventaData.metodo_pago);
      const detalles = (ventaData.detalles || []).map(detalle => ({
        producto_id: parseInt(detalle.producto_id),
        cantidad: parseInt(detalle.cantidad),
        precio_unitario: parseFloat(detalle.precio_unitario),
        subtotal: parseFloat(detalle.subtotal)
      }));

      // Validar que todos los productos existen antes de insertar la venta
      const connection = await pool.getConnection();
      try {
        // --- Insertar categoría si es nueva ---
        let categoriaId = null;
        if (ventaData.categoria) {
          // Buscar si existe la categoría
          const [catRows] = await connection.query('SELECT id FROM categorias WHERE nombre = ?', [ventaData.categoria]);
          if (catRows.length > 0) {
            categoriaId = catRows[0].id;
          } else {
            // Insertar nueva categoría
            const [catResult] = await connection.query('INSERT INTO categorias (nombre) VALUES (?)', [ventaData.categoria]);
            categoriaId = catResult.insertId;
          }
        }

        // --- Insertar producto si es nuevo ---
        let productoId = null;
        if (ventaData.producto) {
          // Buscar si existe el producto
          const [prodRows] = await connection.query('SELECT id FROM productos WHERE nombre = ?', [ventaData.producto.nombre]);
          if (prodRows.length > 0) {
            productoId = prodRows[0].id;
          } else {
            // Insertar nuevo producto (requiere categoriaId)
            if (!categoriaId && ventaData.producto.categoria) {
              // Buscar o crear la categoría para el producto
              const [catRows2] = await connection.query('SELECT id FROM categorias WHERE nombre = ?', [ventaData.producto.categoria]);
              if (catRows2.length > 0) {
                categoriaId = catRows2[0].id;
              } else {
                const [catResult2] = await connection.query('INSERT INTO categorias (nombre) VALUES (?)', [ventaData.producto.categoria]);
                categoriaId = catResult2.insertId;
              }
            }
            const [prodResult] = await connection.query('INSERT INTO productos (nombre, precio, categoria_id, stock) VALUES (?, ?, ?, ?)', [ventaData.producto.nombre, ventaData.producto.precio, categoriaId, ventaData.producto.stock || 100]);
            productoId = prodResult.insertId;
          }
        }

        // --- Validar productos ---
        const productoIds = detalles.map(d => d.producto_id);
        if (productoIds.length > 0) {
          const [productosExistentes] = await connection.query(
            `SELECT id FROM productos WHERE id IN (${productoIds.map(() => '?').join(',')})`,
            productoIds
          );
          const idsExistentes = productosExistentes.map(p => p.id);
          const idsFaltantes = productoIds.filter(id => !idsExistentes.includes(id));
          if (idsFaltantes.length > 0) {
            throw new Error(`No existen los siguientes IDs de producto en la base de datos: ${idsFaltantes.join(', ')}`);
          }
        }

        // --- Validar detalles ---
        if (!Array.isArray(detalles) || detalles.length === 0) {
          throw new Error('La venta debe incluir al menos un producto');
        }
        for (const [index, detalle] of detalles.entries()) {
          if (!detalle.producto_id || !detalle.cantidad || !detalle.precio_unitario || !detalle.subtotal) {
            throw new Error(`El detalle en la posición ${index} no tiene todos los campos requeridos`);
          }
        }

        // --- Transacción de venta ---
        console.log('Iniciando transacción...');
        await connection.beginTransaction();
        try {
          console.log('Insertando venta en la base de datos...');
          console.log('Datos de la venta:', { total, metodo_pago });
          
          // 1. Insertar la venta
          const [result] = await connection.query(
            'INSERT INTO ventas (total, metodo_pago, usuario_id) VALUES (?, ?, ?)',
            [Number(total), String(metodo_pago), Number(ventaData.usuario_id || 0)]
          );
          
          if (!ventaData.usuario_id) {
            console.warn('ADVERTENCIA: Se está insertando una venta sin usuario_id');
          }
          
          const ventaId = result.insertId;
          console.log('Venta insertada con ID:', ventaId);
          
          // 2. Insertar los detalles de la venta
          console.log('Insertando detalles de la venta...');
          for (const [index, detalle] of detalles.entries()) {
            const producto_id = Number(detalle.producto_id);
            const cantidad = Number(detalle.cantidad);
            const precio_unitario = Number(detalle.precio_unitario);
            const subtotal = Number(detalle.subtotal);

            console.log(`Insertando detalle ${index + 1}:`, { 
              producto_id, 
              cantidad, 
              precio_unitario, 
              subtotal 
            });

            // Validación estricta
            if (!producto_id || !cantidad || isNaN(precio_unitario) || isNaN(subtotal)) {
              console.error(`Detalle de venta inválido en la posición ${index}:`, detalle);
              throw new Error(`Detalle de venta inválido en la posición ${index}`);
            }

            try {
              const [detalleResult] = await connection.query(
                'INSERT INTO detalles_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
                [
                  ventaId,
                  producto_id,
                  cantidad,
                  precio_unitario,
                  subtotal
                ]
              );
              console.log(`Detalle ${index + 1} insertado correctamente, ID:`, detalleResult.insertId);
            } catch (error) {
              console.error(`Error SQL al insertar detalle ${index + 1}:`, {
                message: error.message,
                code: error.code,
                errno: error.errno,
                sql: error.sql,
                sqlMessage: error.sqlMessage,
                sqlState: error.sqlState
              });
              throw error;
            }
          }
          
          console.log('Confirmando transacción...');
          await connection.commit();
          console.log('Transacción completada con éxito');
          
          return { 
            id: ventaId, 
            message: 'Venta registrada correctamente',
            detalles: detalles.length
          };
          
        } catch (error) {
          console.error('Error en la transacción, realizando rollback...');
          await connection.rollback();
          console.error('Rollback completado');
          throw error;
        }
      } catch (error) {
        console.error('Error en la transacción:', error);
        await connection.rollback();
        throw error;
      } finally {
        console.log('Liberando conexión...');
        await connection.release();
      }
    } catch (error) {
      console.error('Error en crearVenta:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        errno: error.errno,
        sql: error.sql,
        sqlMessage: error.sqlMessage,
        sqlState: error.sqlState
      });
      throw error;
    }
  },

  // Obtener todas las ventas con sus detalles
  async obtenerVentas() {
    try {
      const [ventas] = await pool.query(
        'SELECT v.*, COUNT(dv.id) as total_productos ' +
        'FROM ventas v ' +
        'LEFT JOIN detalles_venta dv ON v.id = dv.venta_id ' +
        'GROUP BY v.id ' +
        'ORDER BY v.fecha_venta DESC'
      );
      
      // Obtener los detalles de cada venta
      for (let venta of ventas) {
        const [detalles] = await pool.query(
          'SELECT dv.*, p.nombre as producto_nombre ' +
          'FROM detalles_venta dv ' +
          'JOIN productos p ON dv.producto_id = p.id ' +
          'WHERE dv.venta_id = ?',
          [venta.id]
        );
        venta.detalles = detalles;
      }
      
      return ventas;
    } catch (error) {
      console.error('Error al obtener las ventas:', error);
      throw error;
    }
  },

  // Obtener ventas por rango de fechas
  async obtenerVentasPorRango(desde, hasta) {
    try {
      const query = `
        SELECT 
          v.id,
          v.fecha_venta as fecha,
          v.total,
          v.metodo_pago,
          v.estado,
          u.username as usuario_nombre,
          dv.id as detalle_id,
          dv.producto_id,
          p.nombre as producto_nombre,
          dv.cantidad,
          dv.precio_unitario,
          dv.subtotal
        FROM ventas v
        LEFT JOIN usuarios u ON v.usuario_id = u.id
        LEFT JOIN detalles_venta dv ON v.id = dv.venta_id
        LEFT JOIN productos p ON dv.producto_id = p.id
        WHERE DATE(v.fecha_venta) BETWEEN ? AND ?
        ORDER BY v.fecha_venta DESC
      `;

      console.log(`Buscando ventas desde ${desde} hasta ${hasta}`);
      const [rows] = await pool.query(query, [desde, hasta]);

      // Agrupar los detalles por venta
      const ventasObj = {};
      rows.forEach(row => {
        if (!ventasObj[row.id]) {
          ventasObj[row.id] = {
            id: row.id,
            fecha: row.fecha,
            total: row.total,
            metodo_pago: row.metodo_pago,
            estado: row.estado,
            usuario_nombre: row.usuario_nombre,
            detalles: []
          };
        }
        
        if (row.detalle_id) {
          ventasObj[row.id].detalles.push({
            id: row.detalle_id,
            producto_id: row.producto_id,
            producto_nombre: row.producto_nombre,
            cantidad: row.cantidad,
            precio_unitario: row.precio_unitario,
            subtotal: row.subtotal
          });
        }
      });

      console.log(`Se encontraron ${Object.keys(ventasObj).length} ventas en el rango especificado`);
      return Object.values(ventasObj);
    } catch (error) {
      console.error('Error en obtenerVentasPorRango:', error);
      throw error;
    }
  },
  
  // Obtener ventas por fecha específica
  async obtenerVentasPorFecha(fecha) {
    try {
      const query = `
        SELECT 
          v.id,
          v.fecha_venta as fecha,
          v.total,
          v.metodo_pago,
          v.estado,
          u.username as usuario_nombre,
          dv.id as detalle_id,
          dv.producto_id,
          p.nombre as producto_nombre,
          dv.cantidad,
          dv.precio_unitario,
          dv.subtotal
        FROM ventas v
        LEFT JOIN usuarios u ON v.usuario_id = u.id
        LEFT JOIN detalles_venta dv ON v.id = dv.venta_id
        LEFT JOIN productos p ON dv.producto_id = p.id
        WHERE DATE(v.fecha_venta) = ?
        ORDER BY v.fecha_venta DESC
      `;

      console.log(`Buscando ventas para la fecha: ${fecha}`);
      const [rows] = await pool.query(query, [fecha]);

      // Agrupar los detalles por venta
      const ventasObj = {};
      rows.forEach(row => {
        if (!ventasObj[row.id]) {
          ventasObj[row.id] = {
            id: row.id,
            fecha: row.fecha,
            total: row.total,
            metodo_pago: row.metodo_pago,
            estado: row.estado,
            usuario_nombre: row.usuario_nombre,
            detalles: []
          };
        }
        
        if (row.detalle_id) {
          ventasObj[row.id].detalles.push({
            id: row.detalle_id,
            producto_id: row.producto_id,
            producto_nombre: row.producto_nombre,
            cantidad: row.cantidad,
            precio_unitario: row.precio_unitario,
            subtotal: row.subtotal
          });
        }
      });

      console.log(`Se encontraron ${Object.keys(ventasObj).length} ventas para la fecha especificada`);
      return Object.values(ventasObj);
    } catch (error) {
      console.error('Error en obtenerVentasPorFecha:', error);
      throw error;
    }
  },
  
  // Obtener reporte de productos vendidos por rango de fechas
  async obtenerProductosVendidos(desde, hasta) {
    try {
      console.log(`Obteniendo productos vendidos desde ${desde} hasta ${hasta}`);
      
      const query = `
        SELECT 
          p.id as producto_id,
          p.nombre as producto_nombre,
          c.nombre as categoria_nombre,
          SUM(dv.cantidad) as cantidad_total,
          CASE 
            WHEN SUM(dv.cantidad) > 0 THEN ROUND(SUM(dv.subtotal) / SUM(dv.cantidad), 2)
            ELSE 0 
          END as precio_unitario,
          SUM(dv.subtotal) as subtotal_total,
          (
            SELECT COUNT(DISTINCT v.id)
            FROM ventas v
            JOIN detalles_venta dv2 ON v.id = dv2.venta_id
            WHERE DATE(v.fecha_venta) BETWEEN ? AND ?
          ) as total_ventas_periodo
        FROM detalles_venta dv
        JOIN productos p ON dv.producto_id = p.id
        LEFT JOIN categorias c ON p.categoria_id = c.id
        JOIN ventas v ON dv.venta_id = v.id
        WHERE DATE(v.fecha_venta) BETWEEN ? AND ?
        GROUP BY p.id, p.nombre, c.nombre
        ORDER BY cantidad_total DESC, producto_nombre ASC`;
      
      const [productos] = await pool.query(query, [desde, hasta, desde, hasta]);
      
      return productos;
      
    } catch (error) {
      console.error('Error en obtenerProductosVendidos:', error);
      throw error;
    }
  }
};

module.exports = ventaModel;
