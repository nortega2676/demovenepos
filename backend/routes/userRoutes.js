const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Middleware para verificar si el usuario es administrador o soporte
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'soporte') {
    return res.status(403).json({ 
      success: false, 
      error: 'No autorizado. Se requieren permisos de administrador o soporte.' 
    });
  }
  next();
};

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Obtener todos los usuarios (solo administradores)
router.get('/', isAdmin, userController.getUsers);

// Crear un nuevo usuario (solo administradores)
router.post('/', isAdmin, userController.createUser);

// Actualizar un usuario (solo administradores)
router.put('/:id', isAdmin, userController.updateUser);

// Eliminar un usuario (solo administradores)
router.delete('/:id', isAdmin, userController.deleteUser);

module.exports = router;