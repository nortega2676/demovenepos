const express = require('express');
const router = express.Router();
const ventaController = require('../controllers/ventaController');
const cierrePersonalController = require('../controllers/cierrePersonalController');
const reporteProductosController = require('../controllers/reporteProductosController');
const reporteVentasPorHoraController = require('../controllers/reporteVentasPorHoraController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Aplicar autenticación a todas las rutas de ventas
router.use(authenticateToken);

// Rutas para ventas
router.post('/', ventaController.crearVenta);
router.get('/', ventaController.obtenerVentas);
router.get('/:id', ventaController.obtenerVentaPorId);

// Rutas de reportes
router.get('/reporte/ventas', ventaController.obtenerReporteVentas);
router.get('/reporte/productos-vendidos', ventaController.obtenerProductosVendidos);
router.get('/reporte/productos-vendidos-simplificado', reporteProductosController.obtenerReporteProductosVendidos);
router.get('/reporte/tipo-pago', ventaController.obtenerVentasPorTipoPago);
router.get('/reporte/cierre', ventaController.obtenerReporteCierreVentas);
router.get('/reporte/ventas-por-hora', reporteVentasPorHoraController.obtenerVentasPorHora);

// Rutas para cierre de caja personal
router.get('/reporte/cierre-personal', cierrePersonalController.obtenerReporteCierrePersonal);
router.get('/reporte/cierre-personal/verificar-fecha/:fecha', cierrePersonalController.verificarFechaCerradaPersonal);

module.exports = router;
