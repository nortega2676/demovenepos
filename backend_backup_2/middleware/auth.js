const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  console.log('🔐 [auth] Iniciando autenticación');
  console.log(`🔐 [auth] ${req.method} ${req.originalUrl}`);
  console.log('🔐 [auth] Headers:', req.headers);
  
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    console.log('🔐 [auth] Auth header:', authHeader);
    
    const token = authHeader && authHeader.split(' ')[1];
    console.log('🔐 [auth] Token extraído:', token ? '***' + token.slice(-5) : 'No proporcionado');
    
    if (!token) {
      console.log('🔐 [auth] Error: No se proporcionó token de autenticación');
      return res.status(401).json({ 
        success: false,
        error: 'Token de autenticación no proporcionado',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🔐 [auth] Verificando token...');
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        console.error('❌ [auth] Error al verificar el token:', {
          message: err.message,
          name: err.name,
          expiredAt: err.expiredAt
        });
        return res.status(403).json({ 
          success: false,
          error: 'Token inválido o expirado',
          details: err.message,
          code: 'INVALID_TOKEN'
        });
      }
      
      console.log('✅ [auth] Usuario autenticado:', {
        id: user.userId,
        username: user.username,
        role: user.role
      });
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Error en el middleware de autenticación:', error);
    return res.status(500).json({ error: 'Error en la autenticación' });
  }
};

module.exports = { authenticateToken };
