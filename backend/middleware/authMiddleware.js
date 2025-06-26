const jwt = require('jsonwebtoken');
const { pool } = require('../db/database');

// Middleware para verificar el token JWT
const authenticateToken = async (req, res, next) => {
  try {
    // Obtener el token del encabezado de autorización
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      console.log('No se proporcionó token de autenticación');
      return res.status(401).json({ 
        success: false, 
        error: 'Token de autenticación no proporcionado' 
      });
    }

    let decoded;
    try {
      // Verificar el token
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        console.log('Token expirado:', err.message);
        return res.status(401).json({ 
          success: false, 
          error: 'Token expirado. Por favor, inicie sesión nuevamente' 
        });
      }
      console.log('Error en la autenticación:', err.message);
      return res.status(401).json({ 
        success: false, 
        error: 'Token inválido' 
      });
    }
    
    // Verificar si el usuario existe en la base de datos
    const [users] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [decoded.userId]);
    
    if (!users || users.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Usuario no encontrado' 
      });
    }
    
    // Adjuntar solo los campos necesarios del usuario a la solicitud
    const { id, username, rol } = users[0];
    req.user = { id, username, role: rol };
    next();
    
  } catch (error) {
    console.error('Error en la autenticación:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expirado' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false, 
        error: 'Token inválido' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Error en la autenticación',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Middleware para verificar si el usuario es administrador o soporte
const isAdmin = (req, res, next) => {
  if (req.user && (req.user.rol === 'admin' || req.user.rol === 'soporte')) {
    return next();
  }
  
  res.status(403).json({ 
    success: false, 
    error: 'Acceso denegado. Se requieren privilegios de administrador o soporte.' 
  });
};

module.exports = {
  authenticateToken,
  isAdmin
};
