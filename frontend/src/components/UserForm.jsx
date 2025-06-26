import React, { useState, useEffect, useMemo } from 'react';
import {
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  FormHelperText,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ROLES, DEFAULT_ROLE, getRoleDisplayName, getRoleOptions } from '../utils/roles';

const UserForm = ({ open, onClose, onSubmit, initialData = {}, currentUserRole }) => {
  const [formData, setFormData] = useState({
    username: initialData.username || '',
    password: '',
    role: initialData.role || DEFAULT_ROLE
  });
  
  // Obtener roles disponibles basados en el rol del usuario actual
  const roleOptions = useMemo(() => {
    console.log('Current user role:', currentUserRole);
    if (!currentUserRole) {
      console.log('No current user role provided');
      return [];
    }
    const options = getRoleOptions(currentUserRole);
    console.log('Available role options:', options);
    return options;
  }, [currentUserRole]);
  
  // Obtener solo los valores de los roles disponibles
  const availableRoles = useMemo(() => {
    const roles = roleOptions.map(option => option.value);
    console.log('Available role values:', roles);
    return roles;
  }, [roleOptions]);
  
  // Actualizar el rol del formulario si no es válido
  useEffect(() => {
    if (availableRoles.length > 0 && formData.role && !availableRoles.includes(formData.role)) {
      setFormData(prev => ({
        ...prev,
        role: DEFAULT_ROLE
      }));
    }
  }, [availableRoles, formData.role]);
  
  // Reiniciar el formulario cuando se abre/cierra
  useEffect(() => {
    if (open) {
      setFormData({
        username: initialData.username || '',
        password: '',
        role: initialData.role || DEFAULT_ROLE
      });
    }
  }, [open, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: theme.shadows[5],
          [theme.breakpoints.down('sm')]: {
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            height: '100%',
            maxHeight: '100%'
          }
        }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ 
          m: 0, 
          p: 2,
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6" component="div">
            {initialData.id ? 'Editar Usuario' : 'Nuevo Usuario'}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: theme.palette.grey[600],
              position: 'absolute',
              right: 8,
              top: 8,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
                color: theme.palette.grey[900]
              },
              transition: 'all 0.2s ease-in-out',
              '& .MuiSvgIcon-root': {
                fontSize: '1.5rem'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nombre de usuario"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={!!initialData.id}
            />
            <TextField
              fullWidth
              type="password"
              label={initialData.id ? 'Nueva contraseña (dejar en blanco para no cambiar)' : 'Contraseña'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!initialData.id}
            />
            <FormControl fullWidth>
              <InputLabel>Rol</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                label="Rol"
                required
                disabled={!roleOptions.length}
              >
                {roleOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {!roleOptions.length ? 'Cargando roles...' : 'Seleccione un rol para el usuario'}
              </FormHelperText>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          p: 2, 
          gap: 2,
          '& > *': {
            m: '0 !important',
            minWidth: 100
          }
        }}>
          <Button 
            onClick={onClose}
            variant="outlined"
            color="primary"
            sx={{
              borderColor: theme.palette.grey[400],
              color: theme.palette.text.primary,
              '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: 'transparent'
              }
            }}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
                boxShadow: theme.shadows[4]
              },
              '&:active': {
                boxShadow: theme.shadows[2]
              }
            }}
          >
            {initialData.id ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserForm;
