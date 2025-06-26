const express = require('express');
const router = express.Router();
const clienteCreditoController = require('../controllers/clienteCreditoController');
const { authenticateToken } = require('../middleware/auth');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);

// Rutas para clientes a crédito
router.post('/', clienteCreditoController.crearClienteCredito);
router.get('/', clienteCreditoController.obtenerClientesCredito);
router.get('/:id', clienteCreditoController.obtenerClienteCreditoPorId);
router.put('/:id/estado', clienteCreditoController.actualizarEstadoClienteCredito);
router.get('/estado/:estado', clienteCreditoController.obtenerClientesCreditoPorEstado);
router.get('/:id/historial-pagos', clienteCreditoController.obtenerHistorialPagos);

// Ruta para el reporte de cuentas por cobrar
router.get('/reporte/cuentas-por-cobrar', clienteCreditoController.generarReporteCuentasPorCobrar);

module.exports = router;
