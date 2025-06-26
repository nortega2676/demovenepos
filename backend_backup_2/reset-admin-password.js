const { pool } = require('./db/database');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  const connection = await pool.getConnection();
  try {
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizar la contraseña del admin
    await connection.query(
      'UPDATE usuarios SET password = ? WHERE username = ?',
      [hashedPassword, 'admin']
    );
    
    console.log('Contraseña del admin actualizada correctamente');
    console.log('Nueva contraseña:', newPassword);
    
  } catch (error) {
    console.error('Error al actualizar la contraseña del admin:', error);
  } finally {
    connection.release();
    process.exit();
  }
}

resetAdminPassword();
