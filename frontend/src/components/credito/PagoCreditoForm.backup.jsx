import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
  MenuItem,
  Grid,
  Paper,
  IconButton
} from '@mui/material';
import { Search as SearchIcon, AttachMoney as MoneyIcon } from '@mui/icons-material';
import { formatCurrency } from '../../utils/currency';

const PagoCreditoForm = ({ open, onClose }) => {
  // Estados del componente
  const [busqueda, setBusqueda] = useState('');
  const [clienteInfo, setClienteInfo] = useState(null);
  const [creditoInfo, setCreditoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    monto: '',
    metodo_pago: 'efectivo',
    referencia: '',
    usuario_id: ''
  });

  // Métodos de pago disponibles
  const metodosPago = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'pago_movil', label: 'Pago Móvil' },
    { value: 'punto_venta', label: 'Punto de Venta' },
    { value: 'otro', label: 'Otro' },
  ];

  // Efecto para obtener el ID del usuario del localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setFormData(prev => ({
          ...prev,
          usuario_id: user.id || ''
        }));
      } catch (error) {
        console.error('Error al parsear datos del usuario:', error);
      }
    }
  }, []);

  // Buscar información del crédito por ID de cliente
  const buscarCredito = async (e) => {
    if (e) e.preventDefault();
    
    console.log(' [Frontend] Iniciando búsqueda de crédito...');
    console.log(' [Frontend] ID de cliente a buscar:', busqueda);
    
    if (!busqueda) {
      const errorMsg = 'Por favor ingresa un ID de cliente';
      console.log(` [Frontend] ${errorMsg}`);
      setError(errorMsg);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setClienteInfo(null);
      setCreditoInfo(null);
      
      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      console.log(' [Frontend] Token de autenticación:', token ? '***' + token.slice(-5) : 'No encontrado');
      
      // Obtener la URL base de la API desde las variables de entorno
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      // Construir la URL completa del endpoint
      const apiUrl = `${apiBaseUrl}/creditos/cliente/${busqueda}`.replace(/([^:]\/)\/+/g, '$1');
      console.log(' [Frontend] URL de la API:', apiUrl);
      
      console.log(' [Frontend] Enviando solicitud GET a:', apiUrl);
      const startTime = Date.now();
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      const endTime = Date.now();
      console.log(` [Frontend] Tiempo de respuesta: ${endTime - startTime}ms`);
      console.log(' [Frontend] Respuesta del servidor - Status:', response.status);
      console.log(' [Frontend] Headers de la respuesta:', Object.fromEntries([...response.headers]));
      
      const responseText = await response.text();
      console.log(' [Frontend] Respuesta en texto plano:', responseText);
      
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
        console.log(' [Frontend] Datos parseados de la respuesta:', data);
      } catch (parseError) {
        console.error(' [Frontend] Error al parsear la respuesta JSON:', parseError);
        console.error(' [Frontend] Respuesta recibida (texto):', responseText);
        throw new Error('Error en el formato de la respuesta del servidor');
      }
      
      if (!response.ok) {
        console.error(' [Frontend] Error en la respuesta:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        throw new Error(data.error || data.message || `Error al buscar el crédito (${response.status})`);
      }
      
      console.log(' [Frontend] Datos recibidos del backend:', data);
      
      // Actualizar la información del cliente
      setClienteInfo({
        id: data.data.id,
        nombre: data.data.nombre,
        apellido: data.data.apellido,
        telefono: data.data.telefono
      });
      
      // Actualizar la información del crédito
      setCreditoInfo({
        id: data.data.id,
        monto_total: data.data.monto_total,
        saldo_pendiente: data.data.saldo_pendiente,
        estado: data.data.estado
        // fecha_limite no está siendo devuelta por el backend actualmente
      });
      
      // Establecer el monto máximo como valor predeterminado
      setFormData(prev => ({
        ...prev,
        monto: parseFloat(data.data.saldo_pendiente).toFixed(2)
      }));
      
      setSuccess('Cliente encontrado correctamente');
      
    } catch (err) {
      console.error('Error al buscar crédito:', err);
      setError(err.message || 'Error al buscar el crédito. Verifique el ID del cliente.');
      setClienteInfo(null);
      setCreditoInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en los campos del formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validar que el monto no sea mayor al saldo pendiente
    if (name === 'monto' && creditoInfo) {
      const monto = parseFloat(value) || 0;
      if (monto > creditoInfo.saldo_pendiente) {
        setError('El monto no puede ser mayor al saldo pendiente');
      } else if (monto <= 0) {
        setError('El monto debe ser mayor a cero');
      } else {
        setError('');
      }
    }
  };

  // Manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!creditoInfo) {
      setError('Debe buscar un crédito válido primero');
      return;
    }
    
    // Validar campos requeridos
    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      setError('El monto del pago es requerido y debe ser mayor a cero');
      return;
    }
    
    if (parseFloat(formData.monto) > creditoInfo.saldo_pendiente) {
      setError('El monto no puede ser mayor al saldo pendiente');
      return;
    }
    
    if (formData.metodo_pago !== 'efectivo' && !formData.referencia) {
      setError('La referencia es requerida para este método de pago');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      setSuccess('');
      
      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }
      
      // Obtener la URL base de la API desde las variables de entorno
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const apiUrl = `${apiBaseUrl}/creditos/pagar`;
      
      console.log('Enviando pago a:', apiUrl);
      console.log('Datos del pago:', {
        id_credito: creditoInfo.id,
        monto: parseFloat(formData.monto),
        metodo_pago: formData.metodo_pago,
        referencia: formData.referencia,
        usuario_id: formData.usuario_id
      });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_credito: creditoInfo.id,
          monto: parseFloat(formData.monto),
          metodo_pago: formData.metodo_pago,
          referencia: formData.referencia,
          usuario_id: formData.usuario_id
        })
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Error en la respuesta del servidor:', responseData);
        throw new Error(responseData.error || responseData.message || 'Error al procesar el pago');
      }
      
      console.log('Pago registrado exitosamente:', responseData);
      
      // Actualizar el saldo pendiente
      setCreditoInfo(prev => ({
        ...prev,
        saldo_pendiente: prev.saldo_pendiente - parseFloat(formData.monto),
        estado: (prev.saldo_pendiente - parseFloat(formData.monto) <= 0) ? 'pagado' : 'pendiente'
      }));
      
      setSuccess('Pago registrado exitosamente');
      
      // Limpiar el formulario después de 2 segundos
      setTimeout(() => {
        setFormData({
          monto: '',
          metodo_pago: 'efectivo',
          referencia: '',
          usuario_id: formData.usuario_id // Mantener el usuario_id
        });
        setSuccess('');
      }, 2000);
      
    } catch (err) {
      console.error('Error al procesar el pago:', err);
      setError(err.message || 'Error al procesar el pago. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Manejar el cierre del diálogo
  const handleClose = () => {
    // Limpiar el estado
    setBusqueda('');
    setClienteInfo(null);
    setCreditoInfo(null);
    setError('');
    setSuccess('');
    setFormData(prev => ({
      monto: '',
      metodo_pago: 'efectivo',
      referencia: '',
      usuario_id: prev.usuario_id // Mantener el usuario_id
    }));
    
    // Cerrar el diálogo
    onClose();
  };

  // Renderizar el componente
  return (
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/credito/pagar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          creditoId: creditoInfo.id,
          monto: parseFloat(formData.monto),
          metodo_pago: formData.metodo_pago,
          referencia: formData.referencia,
          notas: formData.notas
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error al procesar el pago');
      }
      
      setSuccess('Pago registrado exitosamente');
      
      // Resetear el formulario después de 2 segundos
      setTimeout(() => {
        setSuccess('');
        setFormData({
          monto: '',
          metodo_pago: 'efectivo',
          referencia: '',
          notas: ''
        });
        setClienteInfo(null);
        setCreditoInfo(null);
        setBusqueda('');
      }, 2000);
      
    } catch (err) {
      console.error('Error al procesar pago:', err);
      setError(err.message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  // Limpiar el formulario al cerrar
  const handleClose = () => {
    setFormData({
      monto: '',
      metodo_pago: 'efectivo',
      referencia: '',
      notas: ''
    });
    setClienteInfo(null);
    setCreditoInfo(null);
    setBusqueda('');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Registrar Pago de Crédito</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={buscarCredito} sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="ID del Cliente"
                variant="outlined"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                required
                disabled={loading || isSubmitting}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={buscarCredito}
                        edge="end"
                        disabled={loading || !busqueda || isSubmitting}
                      >
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                onKeyPress={(e) => e.key === 'Enter' && buscarCredito(e)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={buscarCredito}
                disabled={loading || !busqueda || isSubmitting}
                startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}

        {creditoInfo && (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Información del Crédito
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography>Cliente: {creditoInfo.nombre} {creditoInfo.apellido}</Typography>
                  <Typography>ID Cliente: {creditoInfo.id_cliente}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>Monto Total: {formatCurrency(creditoInfo.monto_total)}</Typography>
                  <Typography>Saldo Pendiente: {formatCurrency(creditoInfo.saldo_pendiente)}</Typography>
                  <Typography>Estado: {creditoInfo.estado.toUpperCase()}</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
              Detalles del Pago
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Monto a Pagar"
                  name="monto"
                  type="number"
                  value={formData.monto}
                  onChange={handleChange}
                  required
                  margin="normal"
                  disabled={isSubmitting}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MoneyIcon />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    min: 1,
                    max: creditoInfo?.saldo_pendiente || 0,
                    step: '0.01'
                  }}
                  error={formData.monto > (creditoInfo?.saldo_pendiente || 0)}
                  helperText={formData.monto > (creditoInfo?.saldo_pendiente || 0)
                    ? 'El monto no puede ser mayor al saldo pendiente'
                    : ''}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Método de Pago"
                  name="metodo_pago"
                  value={formData.metodo_pago}
                  onChange={handleChange}
                  required
                  margin="normal"
                  disabled={isSubmitting}
                >
                  {metodosPago.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Referencia o Número de Transacción"
                  name="referencia"
                  value={formData.referencia}
                  onChange={handleChange}
                  margin="normal"
                  disabled={isSubmitting}
                  helperText={formData.metodo_pago !== 'efectivo' ? 'Obligatorio para este método de pago' : 'Opcional para pagos en efectivo'}
                  required={formData.metodo_pago !== 'efectivo'}
                />
              </Grid>
            </Grid>

            <DialogActions sx={{ px: 0, pb: 0, mt: 3 }}>
              <Button
                onClick={handleClose}
                color="error"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting || !formData.monto || formData.monto > creditoInfo.saldo_pendiente}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Procesando...' : 'Registrar Pago'}
              </Button>
            </DialogActions>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PagoCreditoForm;
