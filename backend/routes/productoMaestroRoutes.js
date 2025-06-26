const express = require('express');
const router = express.Router();
const productoMaestroController = require('../controllers/productoMaestroController');
const { authenticateToken } = require('../middleware/auth');

// Ruta protegida que requiere autenticación
router.get('/', authenticateToken, productoMaestroController.obtenerProductosMaestro);

module.exports = router;
