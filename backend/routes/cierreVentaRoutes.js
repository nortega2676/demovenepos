const express = require('express');
const router = express.Router();
const { pool } = require('../db/database');
const cierreVentaController = require('../controllers/cierreVentaController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Aplicar el middleware de autenticación a todas las rutas
router.use(authenticateToken);

// Crear un nuevo cierre de venta
router.post('/', cierreVentaController.crearCierreVenta);

// Obtener cierres por rango de fechas
router.get('/rango', cierreVentaController.obtenerCierresPorRango);

// Verificar si una fecha ya tiene cierre
router.get('/verificar-fecha/:fecha', cierreVentaController.verificarFechaCerrada);

// Verificar si una fecha ya tiene cierre personal
router.get('/verificar-fecha-personal/:fecha', cierreVentaController.verificarFechaCerrada);

// Obtener cierres personales por rango de fechas
router.get('/personal/rango', cierreVentaController.obtenerCierresPersonalesPorRango);

module.exports = router;
