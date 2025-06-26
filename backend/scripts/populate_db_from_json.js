// Script para poblar la base de datos MySQL con productos y categorías desde los archivos JSON
const fs = require('fs');
const path = require('path');
const { pool } = require('../db/database');

async function main() {
  const categoriesPath = path.join(__dirname, '../data/categories.json');
  const productsPath = path.join(__dirname, '../data/products.json');

  const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Insertar categorías
    for (const cat of categories) {
      // El nombre puede estar en name o nombre
      const nombre = cat.name || cat.nombre;
      if (!nombre) continue;
      await connection.query(
        'INSERT IGNORE INTO categorias (id, nombre) VALUES (?, ?)',
        [cat.id && !isNaN(Number(cat.id)) ? Number(cat.id) : undefined, nombre]
      );
    }

    // Insertar productos
    for (const prod of products) {
      // Buscar la categoría correspondiente
      let categoriaId = prod.category;
      // Si la categoría es string textual, buscar su id
      if (isNaN(Number(categoriaId))) {
        // Buscar id de la categoría por nombre
        const [catRows] = await connection.query('SELECT id FROM categorias WHERE nombre = ? OR id = ?', [categoriaId, categoriaId]);
        if (catRows.length > 0) {
          categoriaId = catRows[0].id;
        } else {
          // Insertar la categoría si no existe
          const [catResult] = await connection.query('INSERT INTO categorias (nombre) VALUES (?)', [categoriaId]);
          categoriaId = catResult.insertId;
        }
      }
      await connection.query(
        'INSERT IGNORE INTO productos (id, nombre, precio, categoria_id, stock) VALUES (?, ?, ?, ?, ?)',
        [prod.id, prod.name, prod.price, categoriaId, prod.stock || 100]
      );
    }

    await connection.commit();
    console.log('¡Categorías y productos insertados correctamente en la base de datos!');
  } catch (error) {
    await connection.rollback();
    console.error('Error al poblar la base de datos:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

main();
