const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'venepos',
    multipleStatements: true
  });

  try {
    console.log('Connected to database. Running migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'db', 'migrations', '20250602_add_id_to_cierre_venta.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');
    
    // Execute the migration
    await connection.query(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await connection.end();
    console.log('Database connection closed.');
  }
}

runMigration();
