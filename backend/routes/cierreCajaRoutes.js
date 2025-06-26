const express = require('express');
const router = express.Router();
const cierreCajaController = require('../controllers/cierreCajaController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Ruta para obtener el reporte de cierre de caja
router.get('/reporte', cierreCajaController.obtenerReporteCierreCaja);

// Ruta para verificar si una fecha ya tiene cierre de caja
router.get('/verificar-fecha/:fecha', cierreCajaController.verificarFechaCerrada);

// Ruta para registrar un nuevo cierre de caja
router.post('/registrar', cierreCajaController.registrarCierreCaja);

module.exports = router;
