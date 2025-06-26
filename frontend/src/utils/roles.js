// Obtener la lista de roles desde las variables de entorno o usar valores por defecto
const DEFAULT_ROLES = ['admin', 'soporte', 'operador', 'cajero','cajero1'];
const ROLES = (import.meta.env.VITE_ROLES?.split(',') || DEFAULT_ROLES)
  .map(role => role.trim().toLowerCase())
  .filter(role => DEFAULT_ROLES.includes(role));

const DEFAULT_ROLE = import.meta.env.VITE_DEFAULT_ROLE || 'cajero';
const ADMIN_ROLE = import.meta.env.VITE_ADMIN_ROLE || 'admin';

// Función para obtener el nombre legible de un rol
const getRoleName = (role) => {
  if (!role) return '';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

// Obtener el nombre para mostrar de un rol
const getRoleDisplayName = (role) => {
  const roleMap = {
    'admin': 'Administrador',
    'soporte': 'Soporte Técnico',
    'operador': 'Operador',
    'cajero': 'Cajero',
    'cajero1': 'Cajero1'
  };
  return roleMap[role] || getRoleName(role);
};

// Verificar si un rol es válido
const isValidRole = (role) => {
  if (!role) return false;
  return ROLES.includes(role.toLowerCase());
};

// Verificar si un usuario tiene un rol específico o superior
const hasRole = (userRole, requiredRole) => {
  if (!userRole || !requiredRole) return false;
  
  const userRoleIndex = ROLES.indexOf(userRole.toLowerCase());
  const requiredRoleIndex = ROLES.indexOf(requiredRole.toLowerCase());
  
  // Si alguno de los roles no existe, devolver falso
  if (userRoleIndex === -1 || requiredRoleIndex === -1) return false;
  
  // Un usuario tiene un rol si su índice es menor o igual al rol requerido
  // (asumiendo que los roles están ordenados de mayor a menor privilegio)
  return userRoleIndex <= requiredRoleIndex;
};

// Verificar si un usuario tiene un rol igual o superior al requerido
const hasHigherOrEqualRole = (userRole, requiredRole) => {
  return hasRole(userRole, requiredRole);
};

// Verificar si un usuario puede gestionar a otro usuario
const canManageUser = (currentUser, targetUser) => {
  if (!currentUser || !targetUser) return false;
  if (currentUser.id === targetUser.id) return true; // Puede gestionarse a sí mismo
  return hasHigherOrEqualRole(currentUser.role, targetUser.role);
};

// Verificar si un usuario puede eliminar a otro usuario
const canDeleteUser = (currentUser, targetUser) => {
  if (!currentUser || !targetUser) return false;
  if (currentUser.id === targetUser.id) return false; // No puede eliminarse a sí mismo
  return hasHigherOrEqualRole(currentUser.role, targetUser.role);
};

// Obtener opciones de roles para un menú desplegable
const getRoleOptions = (currentUserRole) => {
  if (!currentUserRole) return [];
  
  // Verificar si el rol actual es válido
  if (!ROLES.includes(currentUserRole.toLowerCase())) {
    console.warn(`Rol no reconocido: ${currentUserRole}`);
    return [];
  }
  
  // Para el administrador, mostrar todos los roles
  if (currentUserRole.toLowerCase() === 'admin') {
    return ROLES.map(role => ({
      value: role,
      label: getRoleDisplayName(role)
    }));
  }
  
  // Para otros roles, mostrar solo los roles que tienen menos privilegios
  const roleHierarchy = ['admin', 'soporte', 'operador', 'cajero'];
  const currentRoleLevel = roleHierarchy.indexOf(currentUserRole.toLowerCase());
  
  if (currentRoleLevel === -1) return [];
  
  // Incluir el rol actual y los de menor jerarquía
  return ROLES
    .filter(role => {
      const roleLevel = roleHierarchy.indexOf(role);
      return roleLevel >= currentRoleLevel;
    })
    .map(role => ({
      value: role,
      label: getRoleDisplayName(role)
    }));
};

export {
  ROLES,
  DEFAULT_ROLE,
  ADMIN_ROLE,
  isValidRole,
  getRoleDisplayName,
  getRoleName,
  hasRole,
  hasHigherOrEqualRole,
  canManageUser,
  canDeleteUser,
  getRoleOptions
};
