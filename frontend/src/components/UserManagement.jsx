import React, { useState, useEffect } from 'react';
import appConfig from '../config/appConfig';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Avatar,
  Tooltip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Person as PersonIcon } from '@mui/icons-material';
import ConfirmationDialog from './common/ConfirmationDialog';
import UserForm from './UserForm';
import { getRoleName, hasRole, ROLES, ADMIN_ROLE } from '../utils/roles';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const UserManagement = ({ onClose }) => {
  const [users, setUsers] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Formatear fecha legible
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PPpp', { locale: es });
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return dateString;
    }
  };

  // Obtener información del usuario actual
  const loadCurrentUser = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) throw new Error('No se encontró información de usuario');
      
      const user = JSON.parse(userData);
      if (!user.role) throw new Error('El usuario no tiene un rol definido');
      
      console.log('Usuario actual cargado:', user);
      setCurrentUser(user);
      return user;
      
    } catch (error) {
      console.error('Error al cargar información del usuario:', error);
      setError('Error al cargar la información del usuario actual');
      return null;
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const baseUrl = appConfig.api.baseUrl;
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      console.log('Solicitando lista de usuarios a:', `${baseUrl}/users`);
      console.log('Token de autenticación:', token);
      
      const response = await fetch(`${baseUrl}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error en la respuesta del servidor:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.message || `Error al cargar los usuarios: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Usuarios recibidos:', data);
      
      // Mapear los datos para asegurar que el campo de rol se llame 'role' en lugar de 'rol'
      const formattedUsers = data.map(user => ({
        ...user,
        role: user.rol, // Mapear 'rol' a 'role' para mantener consistencia en el frontend
      }));
      
      // Ordenar usuarios por fecha de creación (más recientes primero)
      const sortedUsers = [...formattedUsers].sort((a, b) => 
        new Date(b.fecha_creacion) - new Date(a.fecha_creacion)
      );
      
      setUsers(sortedUsers);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setError('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      const user = await loadCurrentUser();
      await loadUsers();
      
      // Si no hay usuario actual, redirigir al login
      if (!user || !user.role) {
        console.error('No se pudo cargar el usuario actual o su rol');
        window.location.href = '/';
      }
    };
    
    loadData();
  }, []);

  const handleCreateUser = async (userData) => {
    try {
      const baseUrl = appConfig.api.baseUrl; 
      const method = userData.id ? 'PUT' : 'POST';
      const url = userData.id 
        ? `${baseUrl}/users/${userData.id}`
        : `${baseUrl}/users`;

      // Asegurarse de que el campo de rol se envíe como 'rol' en lugar de 'role'
      const formattedData = {
        ...userData,
        rol: userData.role, // Mapear 'role' a 'rol' para el backend
      };
      delete formattedData.role; // Eliminar la propiedad 'role' para evitar confusión

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formattedData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el usuario');
      }

      await loadUsers();
      setOpenForm(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error al crear usuario:', error);
      setError(error.message || 'Error al crear el usuario');
    }
  };

  const handleDeleteClick = (userId) => {
    console.log('Intentando eliminar usuario con ID:', userId);
    // Asegurarse de que el ID sea un número
    const userIdNumber = parseInt(userId, 10);
    if (isNaN(userIdNumber)) {
      console.error('ID de usuario no válido:', userId);
      setSnackbar({
        open: true,
        message: 'ID de usuario no válido',
        severity: 'error'
      });
      return;
    }
    setUserToDelete(userIdNumber);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/';
        return;
      }

      const baseUrl = appConfig.api.baseUrl; // Remove the function call
      const response = await fetch(`${baseUrl}/users/${userToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar el usuario');
      }

      setSnackbar({
        open: true,
        message: 'Usuario eliminado correctamente',
        severity: 'success'
      });
      
      await loadUsers();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Error al eliminar el usuario',
        severity: 'error'
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading && users.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, color: 'error.main' }}>
        <Typography color="error">{error}</Typography>
        <Button onClick={loadUsers} sx={{ mt: 2 }}>Reintentar</Button>
      </Box>
    );
  }

  // Verificar si el usuario actual puede crear/editar/eliminar usuarios
  const isAdmin = currentUser && currentUser.role === ADMIN_ROLE;
  const isSoporte = currentUser && currentUser.role === 'soporte';
  const canEdit = isAdmin || isSoporte; // Admin o Soporte pueden editar
  const canDelete = isAdmin || isSoporte; // Admin o Soporte pueden eliminar

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          Gestión de Usuarios
        </Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenForm(true)}
          >
            Nuevo Usuario
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Usuario</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Fecha de Creación</TableCell>
              <TableCell>Último Acceso</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No hay usuarios registrados
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isCurrentUser = currentUser && currentUser.id === user.id;
                // Admin y Soporte pueden editar cualquier usuario excepto a sí mismos
                const canEditUser = (isAdmin || isSoporte) && !isCurrentUser;
                // Admin y Soporte pueden eliminar cualquier usuario excepto a sí mismos
                const canDeleteUser = (isAdmin || isSoporte) && !isCurrentUser;
                
                return (
                  <TableRow 
                    key={user.id} 
                    sx={{ 
                      bgcolor: isCurrentUser ? 'action.hover' : 'inherit',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body1">{user.username}</Typography>
                          {isCurrentUser && (
                            <Typography variant="caption" color="text.secondary">
                              Tú
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getRoleName(user.role)} 
                        color={user.role === ADMIN_ROLE ? 'primary' : 'default'}
                        size="small"
                        variant={user.role === ADMIN_ROLE ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={formatDate(user.fecha_creacion)}>
                        <Typography variant="body2">
                          {format(new Date(user.fecha_creacion), 'PP', { locale: es })}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {user.ultimo_acceso ? (
                        <Tooltip title={formatDate(user.ultimo_acceso)}>
                          <Typography variant="body2">
                            {format(new Date(user.ultimo_acceso), 'PPp', { locale: es })}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Nunca
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Editar">
                          <IconButton 
                            onClick={() => {
                              setSelectedUser(user);
                              setOpenForm(true);
                            }}
                            size="small"
                            disabled={!canEditUser}
                            sx={{ 
                              color: theme => canEditUser ? theme.palette.success.main : theme.palette.action.disabled,
                              '&:hover': {
                                backgroundColor: theme => `${theme.palette.success.main}15`
                              }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton 
                            onClick={() => handleDeleteClick(user.id)}
                            size="small"
                            disabled={!canDeleteUser}
                            sx={{ 
                              color: theme => canDeleteUser ? theme.palette.error.main : theme.palette.action.disabled,
                              '&:hover': {
                                backgroundColor: theme => `${theme.palette.error.main}15`
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {currentUser && (
        <UserForm
          open={openForm}
          onClose={() => {
            setOpenForm(false);
            setSelectedUser(null);
          }}
          onSubmit={handleCreateUser}
          initialData={selectedUser || {}}
          currentUserRole={currentUser.role}
        />
      )}

      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Eliminar Usuario"
        content="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer."
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmText="Eliminar"
        cancelText="Cancelar"
        loading={isDeleting}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;
