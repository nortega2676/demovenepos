const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, initDatabase, testConnection } = require('./db/database');
const Category = require('./models/Category');
const Product = require('./models/Product');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Middleware de autenticación
const authenticateToken = async (req, res, next) => {
  try {
    console.log('Headers recibidos:', JSON.stringify(req.headers, null, 2));
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    
    if (!authHeader) {
      console.log('No se proporcionó el encabezado de autorización');
      return res.status(401).json({ 
        success: false,
        error: 'Token de autenticación no proporcionado' 
      });
    }

    // Verificar que el token esté en el formato correcto
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.log('Formato de token inválido');
      return res.status(401).json({ 
        success: false,
        error: 'Formato de token inválido. Use: Bearer <token>' 
      });
    }

    const token = parts[1].trim();
    if (!token) {
      console.log('Token vacío');
      return res.status(401).json({ 
        success: false,
        error: 'Token no puede estar vacío' 
      });
    }

    console.log('Verificando token...');
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
      if (err) {
        console.log('Error al verificar el token:', err.message);
        const errorMessage = err.name === 'TokenExpiredError' 
          ? 'La sesión ha expirado. Por favor, inicie sesión nuevamente.'
          : 'Token inválido';
        
        return res.status(403).json({ 
          success: false,
          error: errorMessage,
          expired: err.name === 'TokenExpiredError'
        });
      }
      
      // Asegurarse de que el objeto de usuario tenga la estructura esperada
      const user = {
        id: decoded.userId || decoded.id,
        username: decoded.username,
        role: decoded.role || 'usuario' // Usar siempre 'role' para consistencia
      };
      console.log('Usuario autenticado con rol:', user.role);
      
      console.log('Usuario autenticado exitosamente:', user);
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Error en el middleware de autenticación:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error en el proceso de autenticación',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Ruta para login
app.post('/api/login', async (req, res) => {
  try {
    console.log('Solicitud de login recibida:', req.body);
    
    // Verificar que el cuerpo de la solicitud sea JSON
    if (!req.is('application/json')) {
      console.log('Content-Type no es application/json');
      return res.status(400).json({ 
        success: false, 
        error: 'El contenido debe ser application/json' 
      });
    }

    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Faltan credenciales');
      return res.status(400).json({ 
        success: false,
        error: 'Usuario y contraseña son requeridos' 
      });
    }
    
    // Verificar la conexión a la base de datos primero
    try {
      await pool.getConnection();
      console.log('Conexión a la base de datos exitosa');
    } catch (dbError) {
      console.error('Error de conexión a la base de datos:', dbError);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al conectar con la base de datos',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
    
    // Buscar usuario en la base de datos (insensible a mayúsculas/minúsculas)
    console.log('Buscando usuario en la base de datos...');
    let users;
    try {
      // Buscar el nombre de usuario exacto (insensible a mayúsculas/minúsculas)
      [users] = await pool.query(
        'SELECT id, username, password, rol as role FROM usuarios WHERE LOWER(username) = LOWER(?)', 
        [username]
      );
      
      const user = users[0];

      if (!user) {
        console.log('Usuario no encontrado');
        return res.status(401).json({ 
          success: false,
          error: 'Usuario o contraseña incorrectos' 
        });
      }

      console.log('Usuario encontrado, verificando contraseña...');
      
      // Verificar la contraseña
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        console.log('Contraseña incorrecta para el usuario:', user.username);
        return res.status(401).json({ 
          success: false,
          error: 'Usuario o contraseña incorrectos' 
        });
      }
      
      // Si llegamos aquí, el usuario y la contraseña son válidos
      console.log('Credenciales válidas, generando token JWT...');
      
      // Generar el token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          role: user.role || 'usuario'  // Usando role en lugar de rol
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );
      
      console.log('Token generado exitosamente');
      
      // Enviar respuesta exitosa
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role || 'usuario'  // Usando role en lugar de rol
        },
        token
      });
      
    } catch (error) {
      console.error('Error en el proceso de autenticación:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Error en el proceso de autenticación',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: error.code
      });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al iniciar sesión',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Ruta para actualizar precios de productos
app.post('/api/products/update-prices', authenticateToken, async (req, res) => {
  console.log('=== Inicio de actualización de precios ===');
  console.log('Usuario autenticado:', req.user);
  
  try {
    console.log('Usuario que intenta realizar la acción:', req.user);
    
    // Verificar si el usuario es administrador
    // Nota: El rol puede venir como 'role' (del token) o 'rol' (de la base de datos)
    const userRole = req.user.role || req.user.rol;
    
    if (userRole !== 'admin') {
      console.log('Intento de acceso no autorizado. Rol del usuario:', userRole);
      return res.status(403).json({ 
        success: false,
        error: 'No autorizado. Se requieren permisos de administrador.' 
      });
    }
    
    console.log('Usuario autorizado como administrador');

    console.log('Datos recibidos en el cuerpo de la petición:', req.body);
    const { percentage, categoryIds } = req.body;

    // Validar el porcentaje
    if (percentage === undefined || percentage === null || isNaN(percentage)) {
      console.log('Porcentaje inválido recibido:', percentage);
      return res.status(400).json({ 
        success: false, 
        error: 'El porcentaje es requerido y debe ser un número' 
      });
    }

    // Validar que el porcentaje esté en un rango razonable
    if (percentage < -100 || percentage > 1000) {
      return res.status(400).json({
        success: false,
        error: 'El porcentaje debe estar entre -100 y 1000'
      });
    }

    // Calcular el multiplicador (ej: 10% de aumento = 1.1, 10% de descuento = 0.9)
    const multiplier = 1 + (parseFloat(percentage) / 100);

    // Construir la consulta SQL
    let query = 'UPDATE productos SET precio = ROUND(precio * ?, 2)';
    const params = [multiplier];

    console.log('Multiplicador calculado:', multiplier);

    // Si se especifican categorías, filtrar por ellas
    if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
      console.log('Filtrando por categorías:', categoryIds);
      
      // Validar que los IDs de categoría sean números
      const validCategoryIds = categoryIds.map(id => parseInt(id)).filter(id => !isNaN(id));
      
      console.log('IDs de categoría válidos:', validCategoryIds);
      
      if (validCategoryIds.length === 0) {
        console.log('No se proporcionaron IDs de categoría válidos');
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar IDs de categoría válidos'
        });
      }
      
      query += ' WHERE categoria_id IN (?)';
      params.push(validCategoryIds);
    }

    console.log('Consulta SQL a ejecutar:', query);
    console.log('Parámetros:', params);

    try {
      // Ejecutar la actualización
      const [result] = await pool.query(query, params);
      console.log('Resultado de la consulta:', result);
      
      // Obtener el número de filas afectadas
      const updatedCount = result.affectedRows;
      console.log('Filas actualizadas:', updatedCount);
      
      if (updatedCount === 0) {
        console.log('Advertencia: No se actualizó ningún producto');
      }

      res.json({
        success: true,
        message: `Se actualizaron los precios de ${updatedCount} productos exitosamente`,
        data: {
          updatedCount,
          percentage: parseFloat(percentage)
        }
      });
    } catch (dbError) {
      console.error('Error al ejecutar la consulta SQL:', dbError);
      throw dbError; // Esto será capturado por el catch externo
    }

  } catch (error) {
    console.error('Error al actualizar precios:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al actualizar los precios',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Ruta para obtener productos con información de categoría
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.id, p.nombre, p.descripcion, p.precio, 
             p.categoria_id, c.nombre as categoria_nombre, p.stock
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ORDER BY p.nombre
    `);
    
    // Formatear la respuesta
    const formattedProducts = products.map(product => ({
      id: product.id,
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      precio: parseFloat(product.precio) || 0,
      categoria_id: product.categoria_id,
      categoria: product.categoria_nombre || 'Sin categoría',
      stock: product.stock || 0
    }));
    
    res.json({ success: true, data: formattedProducts });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener productos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/products - Usuario:', req.user);
    // Verificar si el usuario es administrador
    if (req.user.role !== 'admin') {
      console.log('Acceso denegado. Se requiere rol de administrador. Rol actual:', req.user.role);
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }

    const { nombre, precio, categoria_id } = req.body;
    
    // Validar datos
    if (!nombre || precio === undefined || !categoria_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nombre, precio y categoría son campos requeridos' 
      });
    }

    // Insertar producto
    const [result] = await pool.query(
      `INSERT INTO productos (nombre, precio, categoria_id) 
       VALUES (?, ?, ?)`,
      [nombre, precio, categoria_id]
    );

    // Obtener el producto recién creado con información de la categoría
    const [products] = await pool.query(
      `SELECT p.*, c.nombre as categoria_nombre
       FROM productos p
       LEFT JOIN categorias c ON p.categoria_id = c.id
       WHERE p.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: products[0]
    });
  } catch (error) {
    console.error('Error al agregar producto:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al agregar producto',
      details: error.message 
    });
  }
});

// Ruta para actualizar un producto (solo admin)
app.put('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    console.log(`PUT /api/products/${req.params.id} - Usuario:`, req.user);
    // Verificar si el usuario es administrador
    if (req.user.role !== 'admin') {
      console.log('Acceso denegado. Se requiere rol de administrador. Rol actual:', req.user.role);
      return res.status(403).json({ 
        success: false, 
        error: 'No autorizado. Se requieren permisos de administrador.' 
      });
    }

    const productId = parseInt(req.params.id);
    const { nombre, descripcion, precio, categoria_id, stock } = req.body;
    
    // Validar ID
    if (isNaN(productId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID de producto no válido' 
      });
    }
    
    // Validar datos si se proporcionan
    const updateData = {};
    
    if (nombre !== undefined) {
      if (nombre.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          error: 'El nombre del producto no puede estar vacío' 
        });
      }
      updateData.nombre = nombre.trim();
    }
    
    if (precio !== undefined) {
      const precioValue = parseFloat(precio);
      if (isNaN(precioValue) || precioValue < 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'El precio debe ser un número mayor o igual a 0' 
        });
      }
      updateData.precio = precioValue;
    }
    
    if (categoria_id !== undefined) {
      const categoriaId = parseInt(categoria_id);
      if (isNaN(categoriaId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ID de categoría no válido' 
        });
      }
      updateData.categoria_id = categoriaId;
    }
    
    if (stock !== undefined) {
      const stockValue = parseInt(stock);
      if (isNaN(stockValue) || stockValue < 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'El stock debe ser un número entero mayor o igual a 0' 
        });
      }
      updateData.stock = stockValue;
    }
    
    if (descripcion !== undefined) {
      updateData.descripcion = descripcion || null;
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No se proporcionaron datos para actualizar' 
      });
    }
    
    const updatedProduct = await Product.update(productId, updateData);
    
    res.json({ 
      success: true, 
      data: updatedProduct,
      message: 'Producto actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    
    if (error.code === 'DUPLICATE_ENTRY' || error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un producto con este nombre'
      });
    }
    
    if (error.code === 'INVALID_CATEGORY' || error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        error: 'La categoría especificada no existe'
      });
    }
    
    if (error.message === 'Producto no encontrado') {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el producto',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Ruta para eliminar un producto (solo admin)
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    console.log(`DELETE /api/products/${req.params.id} - Usuario:`, req.user);
    // Verificar si el usuario es administrador
    if (req.user.role !== 'admin') {
      console.log('Acceso denegado. Se requiere rol de administrador. Rol actual:', req.user.role);
      return res.status(403).json({ 
        success: false, 
        error: 'No autorizado. Se requieren permisos de administrador.' 
      });
    }

    const productId = parseInt(req.params.id);
    
    // Validar ID
    if (isNaN(productId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID de producto no válido' 
      });
    }
    
    await Product.delete(productId);
    
    res.json({ 
      success: true, 
      message: 'Producto eliminado exitosamente' 
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    
    if (error.message === 'Producto no encontrado') {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }
    
    if (error.message.includes('ventas asociadas')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el producto',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rutas para categorías
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await Category.getAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener las categorías',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Crear una nueva categoría (solo admin)
app.post('/api/categories', authenticateToken, async (req, res) => {
  try {
    // Verificar si el usuario es administrador
    if (req.user.role !== 'admin') {
      console.log('Acceso denegado. Se requiere rol de administrador. Rol actual:', req.user.role);
      return res.status(403).json({ 
        success: false, 
        error: 'No autorizado. Se requieren permisos de administrador.',
        userRole: req.user.role
      });
    }

    const { nombre } = req.body;
    
    // Validar datos
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'El nombre de la categoría es obligatorio' 
      });
    }
    
    const newCategory = await Category.create({ 
      nombre: nombre.trim()
    });
    
    res.status(201).json({ 
      success: true, 
      data: newCategory,
      message: 'Categoría creada exitosamente'
    });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    
    if (error.code === 'DUPLICATE_ENTRY' || error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una categoría con este nombre'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error al crear la categoría',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Actualizar una categoría (solo admin)
app.put('/api/categories/:id', authenticateToken, async (req, res) => {
  try {
    // Verificar si el usuario es administrador
    if (req.user.role !== 'admin') {
      console.log('Acceso denegado. Se requiere rol de administrador. Rol actual:', req.user.role);
      return res.status(403).json({ 
        success: false, 
        error: 'No autorizado. Se requieren permisos de administrador.',
        userRole: req.user.role
      });
    }

    const categoryId = parseInt(req.params.id);
    const { nombre, descripcion } = req.body;
    
    // Validar datos
    if (isNaN(categoryId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID de categoría no válido' 
      });
    }
    
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'El nombre de la categoría es obligatorio' 
      });
    }
    
    const updatedCategory = await Category.update(categoryId, { 
      nombre: nombre.trim(),
      descripcion: descripcion || null
    });
    
    res.json({ 
      success: true, 
      data: updatedCategory,
      message: 'Categoría actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    
    if (error.code === 'DUPLICATE_ENTRY' || error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una categoría con este nombre'
      });
    }
    
    if (error.message === 'Categoría no encontrada') {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la categoría',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Eliminar una categoría (solo admin)
app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
  try {
    // Verificar si el usuario es administrador
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'No autorizado. Se requieren permisos de administrador.' 
      });
    }

    const categoryId = parseInt(req.params.id);
    
    // Validar ID
    if (isNaN(categoryId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID de categoría no válido' 
      });
    }
    
    await Category.delete(categoryId);
    
    res.json({ 
      success: true, 
      message: 'Categoría eliminada exitosamente' 
    });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    
    if (error.message === 'Categoría no encontrada') {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }
    
    if (error.message.includes('tiene productos asociados')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la categoría',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Toast POS API is running' });
});

// Iniciar el servidor
const startServer = async () => {
  try {
    // Iniciar el servidor
    const server = app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
      console.log('Base de datos inicializada correctamente');
    });

    // Manejar errores de inicio del servidor
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`El puerto ${PORT} está en uso, intentando con el puerto ${Number(PORT) + 1}...`);
        // Intentar con el siguiente puerto
        app.listen(Number(PORT) + 1, () => {
          console.log(`Servidor corriendo en http://localhost:${Number(PORT) + 1}`);
          console.log('Base de datos inicializada correctamente');
        });
      } else {
        console.error('Error al iniciar el servidor:', error);
      }
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Iniciar la aplicación
startServer();

// Export the Express API
module.exports = app;
