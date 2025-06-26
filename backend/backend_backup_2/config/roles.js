// Roles del sistema ordenados por nivel de privilegio (de mayor a menor)
const ROLES = {
  ADMIN: 'admin',
  SOPORTE: 'soporte',
  OPERADOR: 'operador',
  CAJERO: 'cajero',
};

// Niveles de acceso para cada rol (de mayor a menor privilegio)
const ROLE_LEVELS = {
  [ROLES.SOPORTE]: 4,     // Máximo nivel, acceso a todo
  [ROLES.ADMIN]: 3,       // Acceso a todo excepto menú de soporte
  [ROLES.OPERADOR]: 2,    // Solo acceso al menú de reportes
  [ROLES.CAJERO]: 1,      // Mínimos privilegios
};

// Función para verificar si un rol tiene los permisos necesarios
const hasRole = (userRole, requiredRole) => {
  if (!userRole || !ROLE_LEVELS[userRole]) return false;
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
};

// Validar si un rol es válido
const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};

// Obtener todos los roles
const getAllRoles = () => {
  return Object.entries(ROLES).map(([key, value]) => ({
    id: value,
    name: key.charAt(0) + key.slice(1).toLowerCase(),
    level: ROLE_LEVELS[value]
  }));
};

module.exports = {
  ROLES,
  ROLE_LEVELS,
  hasRole,
  isValidRole,
  getAllRoles
};
