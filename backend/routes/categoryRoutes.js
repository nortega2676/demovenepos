const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const Category = require('../models/Category');

// Middleware para manejar errores
router.use((err, req, res, next) => {
  console.error('Error en la ruta de categorías:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Obtener todas las categorías
router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await Category.getAll();
    return res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error al obtener las categorías:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener las categorías'
    });
  }
});

// Agregar una nueva categoría (solo admin)
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Verificar si el usuario es administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { nombre } = req.body;
    
    // Validar que se proporcione un nombre
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'El nombre de la categoría es requerido' 
      });
    }

    // Verificar si la categoría ya existe
    const existingCategories = await Category.getAll();
    const categoryExists = existingCategories.some(
      cat => cat.nombre.toLowerCase() === nombre.trim().toLowerCase()
    );
    
    if (categoryExists) {
      return res.status(400).json({ 
        success: false,
        error: 'La categoría ya existe' 
      });
    }

    // Crear la nueva categoría
    const newCategory = {
      nombre: nombre.trim()
    };

    // Insertar en la base de datos
    const result = await Category.create(newCategory);
    
    // Obtener la categoría recién creada
    const createdCategory = await Category.getById(result.insertId);
    
    res.status(201).json({
      success: true,
      data: createdCategory
    });
  } catch (error) {
    console.error('Error al agregar categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar la categoría'
    });
  }
});

module.exports = router;
