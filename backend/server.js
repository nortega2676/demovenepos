const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./db/database');
const ventaRoutes = require('./routes/ventaRoutes');
const userRoutes = require('./routes/userRoutes');
const cierreVentaRoutes = require('./routes/cierreVentaRoutes');
const cierreCajaRoutes = require('./routes/cierreCajaRoutes');
const exchangeRateRoutes = require('./routes/exchangeRateRoutes');
const productoMaestroRoutes = require('./routes/productoMaestroRoutes');
const clienteCreditoRoutes = require('./routes/clienteCreditoRoutes');
const pagoCreditoRoutes = require('./routes/pagoCreditoRoutes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'https://laprovidencia.veneconsultinggroup.com',
  'https://www.laprovidencia.veneconsultinggroup.com',
  'http://localhost:5000',
  'https://demovenepos.onrender.com',
  'https://demovenepos.veneconsultinggroup.com',
  'https://www.demovenepos.veneconsultinggroup.com'
];

// Middleware para manejar CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Verificar si el origen está permitido
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // Manejar solicitudes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Max-Age', '86400'); // 24 horas
    return res.status(200).json({});
  }
  
  next();
});

// Configuración de CORS para el resto de las rutas
app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn('Origen no permitido por CORS:', origin);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Asegurar que express.json() esté antes de las rutas
app.use(express.json());

// Mount routes - Asegurar que las rutas más específicas estén primero
app.use('/api/ventas', ventaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cierres-venta', cierreVentaRoutes);
app.use('/api/cierre-caja', cierreCajaRoutes);
app.use('/api/reportes/productos-maestro', productoMaestroRoutes);
app.use('/api/clientes-credito', clienteCreditoRoutes);
app.use('/api/creditos', pagoCreditoRoutes);

// Montar exchangeRateRoutes
app.use('/api', exchangeRateRoutes);

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    console.log('Auth Header:', authHeader);
    console.log('Token from header:', token ? 'Token exists' : 'No token found');

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ 
        success: false, 
        error: 'No se proporcionó token de autenticación' 
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('Decoded token:', decoded);
    } catch (err) {
      console.error('Token verification error:', err.message);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Token expirado. Por favor, inicie sesión nuevamente' 
        });
      }
      return res.status(403).json({ 
        success: false, 
        error: 'Token inválido' 
      });
    }

    // Get user ID from token (try both userId and id for backward compatibility)
    const userId = decoded.userId || decoded.id || decoded.sub;
    
    if (!userId) {
      console.error('No user ID found in token');
      return res.status(401).json({
        success: false,
        error: 'Token no contiene información de usuario válida'
      });
    }

    // Get user from database
    const [users] = await pool.query(
      'SELECT id, username, rol as role FROM usuarios WHERE id = ?',
      [userId]
    );
    
    if (!users || users.length === 0) {
      console.log('User not found in database');
      return res.status(401).json({ 
        success: false, 
        error: 'Usuario no encontrado' 
      });
    }

    // Attach user to request
    req.user = {
      id: users[0].id,
      username: users[0].username,
      role: users[0].role
    };
    
    console.log('User authenticated:', req.user);
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error de autenticación',
      details: error.message
    });
  }
};

// Login route
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Usuario y contraseña son requeridos' 
      });
    }

    // Get user from database
    const [users] = await pool.query(
      'SELECT id, username, password, rol as role FROM usuarios WHERE username = ?', 
      [username]
    );
    
    const user = users[0];
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciales inválidas' 
      });
    }
    
    // Generate JWT
    const tokenPayload = { 
      userId: user.id, 
      username: user.username, 
      role: user.role 
    };
    
    console.log('Creating token with payload:', tokenPayload);
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Generated token:', token);

    res.json({ 
      success: true, 
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error en el servidor' 
    });
  }
});

// Product routes
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.*, c.nombre as categoria_nombre 
      FROM productos p 
      LEFT JOIN categorias c ON p.categoria_id = c.id
      ORDER BY p.nombre
    `);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Error al obtener los productos' });
  }
});

// Create product (admin only)
app.post('/api/products', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'No autorizado' });
  }

  try {
    const { nombre, descripcion, precio, categoria_id, stock } = req.body;
    
    if (!nombre || !precio) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nombre y precio son requeridos' 
      });
    }

    const [result] = await pool.query(
      'INSERT INTO productos (nombre, descripcion, precio, categoria_id, stock) VALUES (?, ?, ?, ?, ?)',
      [nombre, descripcion, precio, categoria_id || null, stock || 0]
    );

    const [newProduct] = await pool.query('SELECT * FROM productos WHERE id = ?', [result.insertId]);
    
    res.status(201).json({ 
      success: true, 
      data: newProduct[0],
      message: 'Producto creado exitosamente'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al crear el producto',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Bulk update product prices (admin only)
app.post('/api/products/update-prices', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'No autorizado' });
  }

  try {
    const { percentage, categoryIds } = req.body;
    
    // Validate input
    if (percentage === undefined || isNaN(parseFloat(percentage))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Porcentaje de actualización no válido' 
      });
    }

    // Calculate the multiplier (e.g., 10% increase = 1.1, 10% decrease = 0.9)
    const multiplier = 1 + (parseFloat(percentage) / 100);
    
    // Build the query
    let query = 'UPDATE productos SET precio = ROUND(precio * ?, 2)';
    const params = [multiplier];
    
    // Add category filter if specified
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      query += ' WHERE categoria_id IN (?)';
      params.push(categoryIds);
    }
    
    // Execute the update
    const [result] = await pool.query(query, params);
    
    // Get the count of updated products
    const updatedCount = result.affectedRows || 0;
    
    res.json({ 
      success: true, 
      data: { updatedCount },
      message: `Precios actualizados exitosamente para ${updatedCount} productos`
    });
    
  } catch (error) {
    console.error('Error updating prices:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al actualizar los precios',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update single product (admin only)
app.put('/api/products/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'No autorizado' });
  }

  try {
    const productId = parseInt(req.params.id);
    const { nombre, descripcion, precio, categoria_id, stock } = req.body;
    
    if (isNaN(productId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID de producto no válido' 
      });
    }
    
    // Check if product exists
    const [existingProduct] = await pool.query('SELECT * FROM productos WHERE id = ?', [productId]);
    if (existingProduct.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Producto no encontrado' 
      });
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];
    
    if (nombre !== undefined) {
      updateFields.push('nombre = ?');
      updateValues.push(nombre);
    }
    
    if (descripcion !== undefined) {
      updateFields.push('descripcion = ?');
      updateValues.push(descripcion);
    }
    
    if (precio !== undefined) {
      updateFields.push('precio = ?');
      updateValues.push(precio);
    }
    
    if (categoria_id !== undefined) {
      updateFields.push('categoria_id = ?');
      updateValues.push(categoria_id);
    }
    
    if (stock !== undefined) {
      updateFields.push('stock = ?');
      updateValues.push(stock);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No se proporcionaron campos para actualizar' 
      });
    }
    
    // Add productId to the values array for the WHERE clause
    updateValues.push(productId);
    
    const query = `UPDATE productos SET ${updateFields.join(', ')} WHERE id = ?`;
    
    await pool.query(query, updateValues);
    
    // Get the updated product
    const [updatedProduct] = await pool.query('SELECT * FROM productos WHERE id = ?', [productId]);
    
    res.json({ 
      success: true, 
      data: updatedProduct[0],
      message: 'Producto actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al actualizar el producto',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Category routes
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM categorias ORDER BY nombre');
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Error al obtener las categorías' });
  }
});

// Create category (admin only)
app.post('/api/categories', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'No autorizado' });
  }

  try {
    const { nombre } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ 
        success: false, 
        error: 'El nombre de la categoría es requerido' 
      });
    }

    const [result] = await pool.query(
      'INSERT INTO categorias (nombre) VALUES (?)',
      [nombre]
    );

    const [newCategory] = await pool.query('SELECT * FROM categorias WHERE id = ?', [result.insertId]);
    
    res.status(201).json({ 
      success: true, 
      data: newCategory[0],
      message: 'Categoría creada exitosamente'
    });
  } catch (error) {
    console.error('Error creating category:', error);
    
    // Handle duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
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

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const connection = await pool.getConnection();
    console.log('Database connection successful');
    connection.release();
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();

// Export for testing
module.exports = app;
