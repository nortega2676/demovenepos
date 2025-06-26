const express = require('express');
const router = express.Router();
const { getDollarRate } = require('../controllers/exchangeRateController');

// Ruta para obtener la tasa del dólar
// El prefijo '/api' ya se agrega en server.js
router.get('/exchange-rate', getDollarRate);

module.exports = router;
