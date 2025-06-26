import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { formatCurrency } from '../utils/currency'; // Importar la función formatCurrency

const API_BASE_URL = appConfig.api.baseUrl;

const CierreVentas = ({ open, onClose }) => {
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
  const navigate = useNavigate();
  
  // Obtener el token del localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token');
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
  const checkIfDateIsClosed = async (date) => {
    console.log('🔍 Verificando si la fecha está cerrada:', date);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No se encontró el token de autenticación');
        return false;
      }

      // In Vite, environment variables must be prefixed with VITE_ and accessed via import.meta.env
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const cleanBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const url = `${cleanBaseUrl}/cierre-caja/verificar/${date}`;
      
      console.log('🔗 URL de verificación:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      console.log('📡 Estado de la respuesta:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en la respuesta:', errorText);
        return false;
      }

      const data = await response.json();
      console.log('📊 Datos de respuesta:', data);
      
      const isClosed = data.cerrado || false;
      console.log(`✅ Fecha ${date} ${isClosed ? 'ESTÁ CERRADA' : 'NO está cerrada'}`);
      
      return isClosed;
    } catch (error) {
      console.error('❌ Error en checkIfDateIsClosed:', error);
      return false;
    }
  };

  const fetchReportData = async () => {
    console.log('=== INICIO fetchReportData ===');
    
    if (!fecha) {
      console.error('❌ No se seleccionó ninguna fecha');
      setError('Por favor seleccione una fecha');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No se encontró el token de autenticación');
        localStorage.removeItem('token');
        navigate('/login');
        throw new Error('Sesión expirada. Por favor inicie sesión nuevamente.');
      }

      const formattedDate = format(fecha, 'yyyy-MM-dd');
      console.log('📅 Fecha formateada para verificación:', formattedDate);
      
      // Verificar si la fecha ya está cerrada
      console.log('🔍 Iniciando verificación de fecha cerrada...');
      const isDateClosed = await checkIfDateIsClosed(formattedDate);
      
      if (isDateClosed) {
        const errorMsg = `⛔ La fecha ${formattedDate} ya está cerrada`;
        console.warn(errorMsg);
        setError('La fecha seleccionada ya fue cerrada y no puede ser modificada');
        setLoading(false);
        console.log('=== FIN fetchReportData (fecha cerrada) ===');
        return;
      }
      
      console.log('✅ La fecha no está cerrada, continuando con la carga de datos...');
      
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const endpoint = '/ventas/reporte/cierre';
      const url = `${baseUrl}${endpoint}?fecha=${formattedDate}`;
      
      console.log('🌐 Solicitando datos a:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Respuesta recibida:', result);
        
        // Verificar si la respuesta tiene la estructura esperada
        if (!result.data) {
          console.error('Error: Formato de respuesta inesperado', result);
          throw new Error('Formato de respuesta inesperado');
        }
        
        const data = result.data;
        
        // Inicializar valores ingresados en 0 para cada método de pago
        const valoresIniciales = {};
        const metodosPago = data.por_metodo_pago || {};
        
        Object.keys(metodosPago).forEach(metodo => {
          if (metodo) { // Asegurarse de que el método no sea nulo o indefinido
            valoresIniciales[metodo] = '';
          }
        });
        
        setValoresIngresados(valoresIniciales);
        
        // Asegurarse de que todos los valores numéricos sean válidos
        setReportData({
          totalVentas: typeof data.total_ventas === 'number' ? data.total_ventas : 0,
          totalMonto: typeof data.total_monto === 'number' ? data.total_monto : 0,
          resumenMetodosPago: metodosPago,
          ventas: Array.isArray(data.ventas) ? data.ventas : []
        });
      } else {
        const errorData = await response.json();
        console.error('Error:', errorData);
        throw new Error(errorData.message || 'Error al obtener los datos del reporte');
      }
    } catch (error) {
      console.error('Error al obtener el reporte:', error);
      console.error('Stack trace:', error.stack);
      setError(`Error al obtener el reporte: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleValorChange = (metodo, valor) => {
    // Validar que solo se ingresen números y punto decimal
    if (valor === '' || /^\d*\.?\d*$/.test(valor)) {
      setValoresIngresados(prev => ({
        ...prev,
        [metodo]: valor
      }));
    }
  };

  const handleGuardarCierre = async () => {
    setSaving(true);
    setLoading(true);
    setError('');
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      console.log('Token from localStorage:', token ? 'Token exists' : 'No token found');
      
      if (!token) {
        console.error('No se encontró el token de autenticación');
        localStorage.removeItem('token');
        navigate('/login');
        throw new Error('Sesión expirada. Por favor inicie sesión nuevamente.');
      }

      // Get user ID from token
      let userId;
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        userId = tokenPayload.userId || tokenPayload.id;
        console.log('User ID from token:', userId);
      } catch (tokenError) {
        console.error('Error al decodificar el token:', tokenError);
        localStorage.removeItem('token');
        navigate('/login');
        throw new Error('Token inválido. Por favor inicie sesión nuevamente.');
      }
      
      if (!userId) {
        console.error('No se pudo obtener el ID del usuario del token');
        localStorage.removeItem('token');
        navigate('/login');
        throw new Error('No se pudo identificar al usuario. Por favor inicie sesión nuevamente.');
      }
      
      const formattedDate = format(fecha, 'yyyy-MM-dd');
      
      const cierreData = {
        fecha_cierre: formattedDate,
        monto: totalIngresado,
        diferencia: diferencia,
        usuario_id: userId,
        total_ventas: reportData.totalVentas || 0,
        total_esperado: reportData.totalMonto || 0,
        detalle_metodos: Object.entries(valoresIngresados).map(([metodo, valor]) => ({
          metodo_pago: metodo,
          total_esperado: reportData.resumenMetodosPago[metodo] || 0,
          total_ingresado: parseFloat(valor || 0)
        }))
      };
      
      // Ensure the base URL is clean (no trailing slashes)
      const cleanBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const endpoint = '/cierres-venta';
      const url = `${cleanBaseUrl}${endpoint}`;
      
      console.log('=== REQUEST DETAILS ===');
      console.log('URL:', url);
      console.log('Method: POST');
      console.log('Headers:', {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': token ? 'Bearer [TOKEN_PRESENT]' : 'NO_TOKEN'
      });
      console.log('Request Payload:', cierreData);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(cierreData)
      });
      
      console.log('=== RESPONSE DETAILS ===');
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      
      // Try to parse response as JSON, fall back to text if not JSON
      let responseData;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json().catch(() => ({}));
      } else {
        responseData = await response.text();
      }
      
      console.log('Response Body:', responseData);
      
      if (!response.ok) {
        let errorMessage = 'Error al guardar el cierre de venta';
        
        try {
          const errorData = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Si no se puede parsear como JSON, usar el texto plano
          errorMessage = responseData || errorMessage;
        }
        
        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          errorMessage = 'Sesión expirada. Por favor inicie sesión nuevamente.';
        }
        
        throw new Error(errorMessage);
      }
      
      // Si llegamos aquí, la petición fue exitosa
      setSuccess('Cierre de caja guardado correctamente');
      
      // Recargar los datos para reflejar el cierre guardado
      fetchReportData();
      
      // Cerrar el diálogo después de 2 segundos
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 2000);
      
      return responseData;
    } catch (err) {
      console.error('Error al guardar el cierre de caja:', err);
      setError(err.message || 'Error al guardar el cierre de caja');
      throw err; // Re-lanzar el error para que pueda ser manejado por el llamador si es necesario
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  // Usar la función formatCurrency importada del módulo de utilidades

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
    >
      <DialogTitle>Cierre de Ventas</DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <Box sx={{ my: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={10}>
                <DatePicker
                  label="Seleccione la fecha"
                  value={fecha}
                  onChange={(newValue) => setFecha(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={2}>
                <Button
                  variant="contained"
                  onClick={fetchReportData}
                  disabled={loading}
                  fullWidth
                  startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                >
                  {loading ? 'Cargando...' : 'Actualizar'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </LocalizationProvider>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {Object.keys(reportData.resumenMetodosPago).length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Resumen de Ventas
            </Typography>
            
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Método de Pago</TableCell>
                    <TableCell align="right">Total Esperado</TableCell>
                    <TableCell align="right">Total Ingresado</TableCell>
                    <TableCell align="right">Diferencia</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metodosPago.map((metodo) => (
                    <TableRow key={metodo}>
                      <TableCell>{metodo.charAt(0).toUpperCase() + metodo.slice(1)}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(reportData.resumenMetodosPago[metodo] || 0)}
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="text"
                          value={valoresIngresados[metodo] || ''}
                          onChange={(e) => handleValorChange(metodo, e.target.value)}
                          inputProps={{ style: { textAlign: 'right' } }}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(Math.abs((reportData.resumenMetodosPago[metodo] || 0) - (parseFloat(valoresIngresados[metodo] || 0))))}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell align="right">
                      <strong>{formatCurrency(reportData.totalMonto)}</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{formatCurrency(totalIngresado)}</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong style={{ color: diferencia === 0 ? 'inherit' : 'red' }}>
                        {formatCurrency(diferencia)}
                      </strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Typography variant="body2">
                <strong>Total de Ventas:</strong> {reportData.totalVentas}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleGuardarCierre}
                disabled={loading || saving || !isDifferenceWithinThreshold}
                title={!isDifferenceWithinThreshold ? `La diferencia (${formatCurrency(diferencia)}) supera el ${differenceThresholdPercentage}% permitido (${formatCurrency(maxDifferenceAllowed)})` : ''}
              >
                {saving ? 'Guardando...' : `Guardar Cierre (${differenceThresholdPercentage}% tolerancia)`}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cerrar
        </Button>
      </DialogActions>
      
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default CierreVentas;
