const express = require('express');
const router = express.Router();
const pagoCreditoController = require('../controllers/pagoCreditoController');
const { authenticateToken } = require('../middleware/auth');

// Middleware para logging de rutas
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Query params:', req.query);
  console.log('Body:', req.body);
  next();
});

// Obtener información del crédito por ID de cliente
router.get('/cliente/:clienteId', authenticateToken, pagoCreditoController.getCreditoByClienteId);

// Registrar un nuevo pago
router.post('/pagar', authenticateToken, pagoCreditoController.registrarPago);

// Obtener todos los pagos
router.get('/', authenticateToken, pagoCreditoController.getAllPagos);

module.exports = router;
