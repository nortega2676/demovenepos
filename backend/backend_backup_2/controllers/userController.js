const { pool } = require('../db/database');
const bcrypt = require('bcryptjs');

const userController = {
  // Obtener todos los usuarios
  async getUsers(req, res) {
    try {
      const [users] = await pool.query(`
        SELECT id, username, rol, fecha_creacion 
        FROM usuarios 
        ORDER BY username
      `);
      
      res.json(users);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener usuarios',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Crear un nuevo usuario
  async createUser(req, res) {
    try {
      const { username, password, rol = 'cajero' } = req.body;
      
      // Validar datos de entrada
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Usuario y contraseña son requeridos' 
        });
      }

      // Verificar si el usuario ya existe
      const [existingUsers] = await pool.query(
        'SELECT id FROM usuarios WHERE username = ?',
        [username]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'El nombre de usuario ya está en uso' 
        });
      }

      // Hash de la contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insertar nuevo usuario
      const [result] = await pool.query(
        'INSERT INTO usuarios (username, password, rol) VALUES (?, ?, ?)',
        [username, hashedPassword, rol]
      );

      // Obtener el usuario creado (sin la contraseña)
      const [newUser] = await pool.query(
        'SELECT id, username, rol, fecha_creacion FROM usuarios WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        user: newUser[0]
      });

    } catch (error) {
      console.error('Error al crear usuario:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al crear el usuario',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Actualizar un usuario
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { username, rol } = req.body;
      
      // Validar datos de entrada
      if (!username || rol === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'Usuario y rol son requeridos' 
        });
      }

      // Verificar si el usuario existe
      const [users] = await pool.query(
        'SELECT id FROM usuarios WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Usuario no encontrado' 
        });
      }

      // Actualizar usuario
      await pool.query(
        'UPDATE usuarios SET username = ?, rol = ? WHERE id = ?',
        [username, rol, id]
      );

      // Obtener el usuario actualizado
      const [updatedUser] = await pool.query(
        'SELECT id, username, rol, fecha_creacion FROM usuarios WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        user: updatedUser[0]
      });

    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al actualizar el usuario',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Eliminar un usuario
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar si el usuario existe
      const [users] = await pool.query(
        'SELECT id FROM usuarios WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Usuario no encontrado' 
        });
      }

      // No permitir eliminar el propio usuario
      if (req.user.userId === parseInt(id)) {
        return res.status(400).json({ 
          success: false, 
          error: 'No puedes eliminar tu propio usuario' 
        });
      }

      // Eliminar usuario
      await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al eliminar el usuario',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = userController;