import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import appConfig from '../config/appConfig';
import { formatCurrency } from '../utils/currency';

const API_BASE_URL = appConfig.api.baseUrl;

const CierreCajaPersonal = ({ open, onClose, onSaveSuccess }) => {
  const [fecha, setFecha] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  
  const [reportData, setReportData] = useState({
    totalVentas: 0,
    totalMonto: 0,
    resumenMetodosPago: {},
    ventas: []
  });
  
  const [valoresIngresados, setValoresIngresados] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fechaCerrada, setFechaCerrada] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const navigate = useNavigate();

  // Extraer información del usuario del token JWT
  const getCurrentUser = () => {
    const token = getAuthToken();
    if (!token) return null;
    
    try {
      // El token JWT está en el formato: header.payload.signature
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      
      // Reemplazar caracteres específicos de base64url a base64
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      
      // Decodificar la carga útil (payload) del token
      const payload = JSON.parse(window.atob(base64));
      
      // Devolver la información del usuario desde el payload
      return {
        id: payload.userId,
        username: payload.username,
        role: payload.role,
        // Agregar más campos si están disponibles en el token
      };
    } catch (error) {
      console.error('❌ [CierreCajaPersonal] Error al decodificar el token:', error);
      return null;
    }
  };

  // Cargar información del usuario al montar el componente
  useEffect(() => {
    console.log('🔍 [CierreCajaPersonal] Cargando información del usuario desde el token...');
    const userData = getCurrentUser();
    console.log('👤 [CierreCajaPersonal] Usuario autenticado:', userData);
    setUsuario(userData);
  }, [open]);  // Recargar cuando se abra el diálogo
  
  // Usar la función formatCurrency importada del módulo de utilidades con configuración consistente
  const formatCurrencyValue = (value) => {
    return formatCurrency(value, { 
      showSymbol: true, 
      showCode: false,
      decimalPlaces: 2
    });
  }; 
  
  // Obtener el token del localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Función para manejar el cierre de caja
  const handleCerrarCaja = async () => {
    if (!usuario) {
      setError('No se pudo obtener la información del usuario');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      // Formatear la fecha al formato YYYY-MM-DD
      const fechaFormateada = format(fecha, 'yyyy-MM-dd');
      
      // Obtener el monto total ingresado y la diferencia
      const monto = totalIngresado;
      const diferenciaCalculada = diferencia;

      const response = await fetch(`${API_BASE_URL}/cierre-caja/registrar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fecha: fechaFormateada,
          monto: monto,
          diferencia: diferenciaCalculada
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el cierre de caja');
      }

      setSuccess('Cierre de caja guardado exitosamente');
      setFechaCerrada(true);
      
      // Recargar los datos para reflejar el cierre
      await fetchReportData();
      
    } catch (error) {
      console.error('Error al guardar el cierre de caja:', error);
      setError(error.message || 'Error al guardar el cierre de caja');
    } finally {
      setSaving(false);
    }
  };
  
  // Obtener el ID del usuario del token
  const getUserId = () => {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || null;
    } catch (error) {
      console.error('Error al decodificar el token:', error);
      return null;
    }
  };

  // Obtener métodos de pago únicos de forma segura
  const metodosPago = reportData?.resumenMetodosPago ? Object.keys(reportData.resumenMetodosPago) : [];
  
  // Calcular total ingresado de forma segura
  const totalIngresado = metodosPago.reduce((sum, metodo) => {
    const valor = parseFloat(valoresIngresados[metodo] || 0);
    return isNaN(valor) ? sum : sum + valor;
  }, 0);

  // Obtener el umbral de diferencia permitido desde las variables de entorno
  const differenceThresholdPercentage = parseFloat(import.meta.env.VITE_DIFFERENCE_THRESHOLD_PERCENTAGE) || 0;
  
  // Calcular diferencia de forma segura (siempre positiva)
  const diferencia = Math.abs((reportData?.totalMonto || 0) - totalIngresado);
  
  // Calcular el monto máximo de diferencia permitido (umbral)
  const maxDifferenceAllowed = useMemo(() => {
    const total = reportData?.totalMonto || 0;
    return (total * differenceThresholdPercentage) / 100;
  }, [reportData?.totalMonto, differenceThresholdPercentage]);
  
  // Verificar si la diferencia está dentro del umbral permitido
  const isDifferenceWithinThreshold = diferencia <= maxDifferenceAllowed;

  // Función para verificar si una fecha ya está cerrada
  // Se ha eliminado la validación de fecha cerrada según lo solicitado
  const verificarFechaCerrada = async (fecha) => {
    return false; // Siempre retorna falso para deshabilitar la validación
  };

  // Función para cargar los datos del reporte
  const fetchReportData = async () => {
    if (!fecha) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }
      
      const fechaFormateada = format(fecha, 'yyyy-MM-dd');
      const response = await fetch(
        `${API_BASE_URL}/cierre-caja/reporte?fecha=${fechaFormateada}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar el reporte');
      }
      
      const responseData = await response.json();
      console.log('Datos recibidos del backend:', JSON.stringify(responseData, null, 2));
      
      if (responseData.fechaCerrada) {
        // Si ya existe un cierre para esta fecha
        setReportData({
          totalVentas: 0,
          totalMonto: 0,
          resumenMetodosPago: {},
          ventas: []
        });
        setFechaCerrada(true);
        setSuccess(responseData.mensaje || 'Este cierre de caja ya fue realizado');
      } else {
        // Mapear los datos del backend al formato esperado por el frontend
        const formattedData = {
          totalVentas: responseData.total_ventas || responseData.data?.total_ventas || 0,
          totalMonto: responseData.total_monto || responseData.data?.total_monto || 0,
          resumenMetodosPago: responseData.por_metodo_pago || responseData.data?.por_metodo_pago || {},
          ventas: Array.isArray(responseData.ventas) ? responseData.ventas : 
                (Array.isArray(responseData.data?.ventas) ? responseData.data.ventas : [])
        };
        
        console.log('Datos formateados para el estado:', JSON.stringify(formattedData, null, 2));
        console.log('Número de ventas a mostrar:', formattedData.ventas.length);
        setReportData(formattedData);
        setFechaCerrada(false);
        
        // Inicializar valores ingresados con valores vacíos
        const nuevosValores = {};
        Object.keys(formattedData.resumenMetodosPago || {}).forEach(metodo => {
          nuevosValores[metodo] = '';
        });
        setValoresIngresados(nuevosValores);
      }
      
    } catch (error) {
      console.error('Error al cargar el reporte:', error);
      setError(error.message || 'Error al cargar el reporte de cierre');
      setReportData({
        totalVentas: 0,
        totalMonto: 0,
        resumenMetodosPago: {},
        ventas: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Guardar cierre de caja
  const handleGuardarCierre = async () => {
    try {
      setSaving(true);
      setError('');
      
      const token = getAuthToken();
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }
      
      // Validar que todos los valores ingresados sean números válidos
      const valoresValidos = Object.entries(valoresIngresados).every(([_, valor]) => {
        return valor === '' || !isNaN(parseFloat(valor));
      });
      
      if (!valoresValidos) {
        throw new Error('Por favor ingrese valores numéricos válidos');
      }
      
      // Verificar si la fecha ya está cerrada
      const estaCerrado = await verificarFechaCerrada(fecha);
      if (estaCerrado) {
        throw new Error('La fecha seleccionada ya está cerrada');
      }
      
      // Preparar datos para el cierre
      const cierreData = {
        fecha: format(fecha, 'yyyy-MM-dd'),
        total_efectivo: parseFloat(valoresIngresados['Efectivo'] || 0),
        total_tarjeta: parseFloat(valoresIngresados['Tarjeta'] || 0),
        total_transferencia: parseFloat(valoresIngresados['Transferencia'] || 0),
        observaciones: 'Cierre de caja personal del día'
      };
      
      // Enviar solicitud para guardar el cierre
      const response = await fetch(`${API_BASE_URL}/api/cierre-caja/registrar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(cierreData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar el cierre de caja');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Cerrar el diálogo y limpiar el estado
        onClose();
        
        // Resetear el estado después de un breve retraso
        setTimeout(() => {
          setReportData({
            totalVentas: 0,
            totalMonto: 0,
            resumenMetodosPago: {},
            ventas: []
          });
          setValoresIngresados({});
          setFecha(null);
          setFechaCerrada(false);
          setSuccess('');
        }, 0);
      } else {
        throw new Error(result.error || 'Error al guardar el cierre de caja');
      }
      
    } catch (error) {
      console.error('Error al guardar el cierre:', error);
      setError(error.message || 'Error al guardar el cierre de caja');
    } finally {
      setSaving(false);
    }
  };

  // Efecto para cargar el reporte cuando cambia la fecha
  useEffect(() => {
    if (open) {
      fetchReportData();
    }
  }, [fecha, open]);

  // Manejar cambio en los valores ingresados
  const handleValorIngresadoChange = (metodo, valor) => {
    setValoresIngresados(prev => ({
      ...prev,
      [metodo]: valor
    }));
  };

  // Manejar recarga del reporte
  const handleRecargar = () => {
    fetchReportData();
  };

  // Cerrar mensajes de éxito/error
  const handleCloseSnackbar = () => {
    setError('');
    setSuccess('');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ p: 2, pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6">Cierre de Caja</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {usuario ? (
              <Box sx={{ 
                bgcolor: 'primary.main',
                color: 'white',
                px: 2,
                py: 0.5,
                borderRadius: 4,
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                boxShadow: 1
              }}>
                {usuario.nombre || usuario.username || 'Usuario'}
              </Box>
            ) : (
              <Box sx={{ 
                bgcolor: 'grey.300',
                color: 'grey.700',
                px: 2,
                py: 0.5,
                borderRadius: 4,
                fontSize: '0.75rem',
                display: 'inline-flex',
                alignItems: 'center'
              }}>
                Cargando usuario...
              </Box>
            )}
            <Button 
              size="small" 
              onClick={() => console.log('Usuario actual:', usuario)}
              sx={{ minWidth: 24, width: 24, height: 24 }}
              title="Ver datos de usuario en consola"
            >
              <InfoOutlinedIcon fontSize="small" />
            </Button>
          </Box>
        </Box>
        <Box display="flex" alignItems="center">
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <DatePicker
              label="Fecha"
              value={fecha}
              onChange={(newValue) => {
                if (newValue) {
                  setFecha(newValue);
                }
              }}
              format="dd/MM/yyyy"
              slotProps={{
                textField: {
                  size: 'small',
                  variant: 'outlined',
                  sx: { width: '150px' }
                }
              }}
            />
          </LocalizationProvider>
          <Button 
            onClick={handleRecargar} 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            sx={{ ml: 1 }}
          >
            {loading ? 'Cargando...' : 'Recargar'}
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Esta es una vista previa del cierre de caja personal. Los montos mostrados corresponden solo a tus ventas.
        </Alert>
        
        <Grid container spacing={3}>
          {/* Resumen de ventas */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Resumen de Ventas
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Total de ventas:</Typography>
                <Typography fontWeight="bold">{reportData.totalVentas}</Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Monto total:</Typography>
                <Typography fontWeight="bold">{formatCurrencyValue(reportData.totalMonto)}</Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>
                Por método de pago:
              </Typography>
              
              {Object.entries(reportData.resumenMetodosPago || {}).map(([metodo, monto]) => (
                <Box key={metodo} display="flex" justifyContent="space-between" mb={1}>
                  <Typography>{metodo}:</Typography>
                  <Typography>{formatCurrencyValue(monto)}</Typography>
                </Box>
              ))}
              
              {Object.keys(reportData.resumenMetodosPago || {}).length === 0 && (
                <Typography color="textSecondary" fontStyle="italic">
                  No hay ventas registradas para esta fecha
                </Typography>
              )}
            </Paper>
          </Grid>
          
          {/* Ingresos manuales */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Ingresos Manuales
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {metodosPago.length > 0 ? (
                <>
                  {metodosPago.map(metodo => (
                    <Box key={metodo} mb={2}>
                      <TextField
                        label={`${metodo} (${formatCurrencyValue(reportData.resumenMetodosPago[metodo] || 0)})`}
                        value={valoresIngresados[metodo] || ''}
                        onChange={(e) => handleValorIngresadoChange(metodo, e.target.value)}
                        fullWidth
                        size="small"
                        type="number"
                        disabled={fechaCerrada}
                        InputProps={{
                          startAdornment: <span style={{ marginRight: '8px' }}>₡</span>,
                        }}
                      />
                    </Box>
                  ))}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Total ingresado:</Typography>
                    <Typography fontWeight="bold">{formatCurrencyValue(totalIngresado)}</Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Diferencia:</Typography>
                    <Typography 
                      fontWeight="bold" 
                      color={isDifferenceWithinThreshold ? 'success.main' : 'error.main'}
                    >
                      {formatCurrency(diferencia)}
                    </Typography>
                  </Box>
                  
                  {!isDifferenceWithinThreshold && (
                    <Alert severity="warning" sx={{ mt: 1, mb: 2 }}>
                      La diferencia supera el umbral permitido ({differenceThresholdPercentage}% del total)
                    </Alert>
                  )}
                </>
              ) : (
                <Typography color="textSecondary" fontStyle="italic">
                  No hay métodos de pago para mostrar
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
        
        {/* Lista de ventas */}
        {console.log('Renderizando ventas:', reportData?.ventas)}
        {reportData?.ventas?.length > 0 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Detalle de Ventas
            </Typography>
            <TableContainer component={Paper} elevation={2}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Hora</TableCell>
                    <TableCell>Método de Pago</TableCell>
                    <TableCell align="right">Monto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.ventas.map((venta) => (
                    <TableRow key={venta.id} hover>
                      <TableCell>{venta.id}</TableCell>
                      <TableCell>{venta.fecha ? format(new Date(venta.fecha), 'HH:mm:ss') : ''}</TableCell>
                      <TableCell>{venta.metodo_pago || 'No especificado'}</TableCell>
                      <TableCell align="right">{formatCurrencyValue(venta.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">
          Cerrar
        </Button>
        
        <Box>
          <Button
            onClick={handleCerrarCaja}
            variant="contained"
            color="primary"
            disabled={saving || fechaCerrada || metodosPago.length === 0 || !isDifferenceWithinThreshold}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            sx={{ ml: 1 }}
          >
            {saving ? 'Guardando...' : 'Guardar Cierre de Caja'}
          </Button>
          {!isDifferenceWithinThreshold && (
            <Typography variant="caption" color="error" display="block" mt={1}>
              Corrija la diferencia antes de guardar
            </Typography>
          )}
        </Box>
      </DialogActions>
      
      {/* Mensajes de éxito/error */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default CierreCajaPersonal;
