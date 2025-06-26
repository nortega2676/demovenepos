import React, { useState, useEffect, useRef } from 'react';
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
  IconButton,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { Search as SearchIcon, AttachMoney as MoneyIcon } from '@mui/icons-material';
import { formatCurrency } from '../../utils/currency';
import TicketImpresion from '../ticket/TicketImpresion';

const PagoCreditoForm = ({ open, onClose }) => {
  // Estados del componente
  const [busqueda, setBusqueda] = useState('');
  const [clienteInfo, setClienteInfo] = useState(null);
  const [creditoInfo, setCreditoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [pagoInfo, setPagoInfo] = useState(null);
  const formDataRef = useRef({
    monto: '',
    metodo_pago: 'efectivo',
    referencia: '',
    usuario_id: ''
  });
  
  // Usar useRef para mantener una referencia estable a formData
  const [formData, setFormData] = useState({
    monto: '',
    metodo_pago: 'efectivo',
    referencia: '',
    usuario_id: ''
  });
  
  // Sincronizar formData con formDataRef
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

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
    
    if (!busqueda) {
      setError('Por favor ingresa un ID de cliente');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setClienteInfo(null);
      setCreditoInfo(null);
      
      const token = localStorage.getItem('token');
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Obtener información del crédito (incluye el cálculo del saldo pendiente)
      const creditoUrl = `${apiBaseUrl}/creditos/cliente/${busqueda}`.replace(/([^:]\/)\/+/g, '$1');
      console.log('Buscando crédito en:', creditoUrl);
      
      const response = await fetch(creditoUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Error al buscar el crédito');
      }
      
      const credito = result.data;
      console.log('Datos del crédito recibidos:', credito);
      
      // Asegurarse de que tenemos un ID de crédito válido
      if (!credito.id) {
        throw new Error('No se pudo obtener la información del crédito');
      }
      
      // Convertir a números y asegurar que sean números válidos
      const montoTotal = Number.parseFloat(credito.monto_total) || 0;
      const saldoPendiente = Number.parseFloat(credito.saldo_pendiente) || 0;
      const totalPagado = Number.parseFloat(credito.total_pagado) || 0;
      
      console.log('Valores numéricos procesados:', {
        montoTotal,
        saldoPendiente,
        totalPagado
      });
      
      // Actualizar la información del cliente y crédito
      setClienteInfo({
        id: credito.id_cliente || '',
        nombre: credito.nombre || '',
        apellido: credito.apellido || '',
        telefono: credito.telefono || ''
      });
      
      setCreditoInfo({
        id: credito.id,
        monto_total: montoTotal,
        saldo_pendiente: saldoPendiente,
        total_pagado: totalPagado,
        estado: saldoPendiente <= 0 ? 'pagado' : 'pendiente'
      });
      
      // Establecer el monto máximo como valor predeterminado (el saldo pendiente)
      const montoInicial = saldoPendiente > 0 ? saldoPendiente.toFixed(2) : '0.00';
      console.log('Monto inicial del formulario:', montoInicial);
      
      setFormData(prev => ({
        ...prev,
        monto: montoInicial
      }));
      
      setSuccess('Crédito encontrado correctamente');
      
    } catch (err) {
      console.error('Error al buscar crédito:', err);
      setError(err.message || 'Error al buscar el crédito. Verifique el ID del cliente.');
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
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }
      
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const apiUrl = `${apiBaseUrl}/creditos/pagar`;
      
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
        throw new Error(responseData.error || responseData.message || 'Error al procesar el pago');
      }
      
      setSuccess('Pago registrado exitosamente');
      
      // Mostrar el diálogo de impresión del ticket
      setPagoInfo({
        monto: formData.monto,
        metodo_pago: formData.metodo_pago,
        referencia: formData.referencia,
        fecha: new Date().toISOString()
      });
      
      // Actualizar la información del crédito después del pago
      try {
        // 1. Obtener información actualizada del crédito
        const creditoUrl = `${apiBaseUrl}/creditos/cliente/${busqueda}`.replace(/([^:]\/)\/+/g, '$1');
        const creditoResponse = await fetch(creditoUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
        
        if (!creditoResponse.ok) {
          throw new Error('Error al actualizar la información del crédito');
        }
        
        const creditoData = await creditoResponse.json();
        
        // Cerrar el diálogo después de 1.5 segundos
        setTimeout(() => {
          onClose();
          // Resetear el formulario
          setFormData({
            monto: '',
            metodo_pago: 'efectivo',
            referencia: '',
            usuario_id: userInfo?.id || ''
          });
          setClienteInfo(null);
          setCreditoInfo(null);
          setBusqueda('');
          // Mostrar el diálogo de impresión del ticket después de cerrar el formulario
          setShowTicket(true);
        }, 1500);
        
        // 2. Obtener el total de pagos actualizados
        const pagosUrl = `${apiBaseUrl}/pagos-credito/credito/${creditoData.data.id}`.replace(/([^:]\/)\/+/g, '$1');
        const pagosResponse = await fetch(pagosUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
        
        let totalPagado = 0;
        if (pagosResponse.ok) {
          const pagosData = await pagosResponse.json();
          totalPagado = pagosData.data.reduce((sum, pago) => sum + parseFloat(pago.monto || 0), 0);
        }
        
        const montoTotal = parseFloat(creditoData.data.monto_total || 0);
        const saldoPendiente = montoTotal - totalPagado;
        
        // Actualizar el estado con los datos actualizados
        setCreditoInfo({
          id: creditoData.data.id_credito,
          monto_total: montoTotal,
          saldo_pendiente: saldoPendiente,
          total_pagado: totalPagado,
          estado: saldoPendiente <= 0 ? 'pagado' : 'pendiente'
        });
        
        // Actualizar el monto del formulario con el nuevo saldo pendiente
        setFormData(prev => ({
          ...prev,
          monto: saldoPendiente > 0 ? saldoPendiente.toFixed(2) : '0.00'
        }));
        
      } catch (err) {
        console.error('Error al actualizar la información del crédito:', err);
        // Si hay un error al actualizar, al menos mostramos el pago exitoso
        setCreditoInfo(prev => ({
          ...prev,
          saldo_pendiente: prev.saldo_pendiente - parseFloat(formData.monto),
          estado: (prev.saldo_pendiente - parseFloat(formData.monto) <= 0) ? 'pagado' : 'pendiente'
        }));
      }
      
      // Limpiar el formulario después de 2 segundos
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          monto: '',
          metodo_pago: 'efectivo',
          referencia: ''
        }));
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
      ...prev,
      monto: '',
      metodo_pago: 'efectivo',
      referencia: ''
    }));
    
    // Cerrar el diálogo
    onClose();
  };

  return (
    <>
      <TicketImpresion
        open={showTicket}
        onClose={() => setShowTicket(false)}
        clienteInfo={clienteInfo}
        pagoInfo={pagoInfo}
        creditoInfo={creditoInfo}
      />
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
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
                  <Typography>Cliente: {clienteInfo?.nombre} {clienteInfo?.apellido}</Typography>
                  <Typography>ID Cliente: {clienteInfo?.id}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography>Monto Total: {formatCurrency(Number(creditoInfo.monto_total) || 0)}</Typography>
                  <Typography>Saldo Pendiente: {formatCurrency(Number(creditoInfo.saldo_pendiente) || 0)}</Typography>
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
                    min: 0.01,
                    max: creditoInfo?.saldo_pendiente || 0,
                    step: 0.01
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="metodo-pago-label">Método de Pago</InputLabel>
                  <Select
                    labelId="metodo-pago-label"
                    name="metodo_pago"
                    value={formData.metodo_pago}
                    onChange={handleChange}
                    label="Método de Pago"
                    disabled={isSubmitting}
                  >
                    {metodosPago.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                disabled={isSubmitting || !formData.monto || parseFloat(formData.monto) > creditoInfo.saldo_pendiente}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Procesando...' : 'Registrar Pago'}
              </Button>
            </DialogActions>
          </Box>
        )}
      </DialogContent>
      </Dialog>
    </>
  );
};

export default PagoCreditoForm;
