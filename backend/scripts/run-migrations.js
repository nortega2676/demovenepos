const { pool } = require('../db/database');

async function runMigration() {
  try {
    console.log('Iniciando migración...');
    
    // Leer el contenido del archivo de migración
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, '../db/migrations/20250531_add_usuario_id_to_ventas.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Dividir las consultas
    const queries = sql.split('\n\n');
    
    // Ejecutar cada consulta por separado
    for (const query of queries) {
      if (query.trim()) {
        await pool.query(query);
      }
    }
    console.log('Migración completada exitosamente');
  } catch (error) {
    console.error('Error en la migración:', error);
    process.exit(1);
  } finally {
    pool.end();
  }
}

runMigration();
