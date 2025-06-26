const { pool } = require('./db/database');

async function ensureTestProduct() {
  const connection = await pool.getConnection();
  try {
    // Verificar si existe la tabla productos
    const [tables] = await connection.query("SHOW TABLES LIKE 'productos'");
    if (tables.length === 0) {
      console.error('La tabla productos no existe.');
      process.exit(1);
    }
    // Verificar si existe el producto con id=1
    const [rows] = await connection.query('SELECT * FROM productos WHERE id = 1');
    if (rows.length === 0) {
      // Insertar categoría de prueba si no existe
      await connection.query(
        'INSERT IGNORE INTO categorias (id, nombre) VALUES (?, ?)',
        [1, 'General']
      );
      // Insertar producto de prueba
      await connection.query(
        'INSERT INTO productos (id, nombre, descripcion, precio, categoria_id, stock) VALUES (?, ?, ?, ?, ?, ?)',
        [1, 'Producto de Prueba', 'Producto para pruebas de venta', 50.25, 1, 100]
      );
      console.log('Producto de prueba insertado.');
    } else {
      console.log('Producto de prueba ya existe.');
    }
  } catch (error) {
    console.error('Error al insertar producto de prueba:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

ensureTestProduct();
