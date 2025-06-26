import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography, 
  CircularProgress,
  Box,
  Chip,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Grid
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../../utils/currency';

const PagosList = () => {
  const [pagos, setPagos] = useState([]);
  const [filteredPagos, setFilteredPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Filter payments based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPagos(pagos);
      return;
    }

    const filtered = pagos.filter(pago => 
      pago.nombre_cliente.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPagos(filtered);
  }, [searchTerm, pagos]);

  useEffect(() => {
    setFilteredPagos(pagos);
  }, [pagos]);

  useEffect(() => {
    const fetchPagos = async (search = '') => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No se encontró el token de autenticación');
        }
        
        const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
        const apiUrl = `${baseUrl}/creditos${search ? `?search=${encodeURIComponent(search)}` : ''}`;
        
        console.log('🔍 [PagosList] Fetching pagos from:', apiUrl);
        console.log('🔑 Token exists:', !!token);
        
        const requestOptions = {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        };
        console.log('📡 Request options:', JSON.stringify(requestOptions, null, 2));
        
        const response = await fetch(apiUrl, requestOptions);

        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Error response:', errorData);
          throw new Error(
            errorData.message || 
            `Error al cargar los pagos: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log('✅ Pagos cargados:', data.length);
        setPagos(data);
      } catch (err) {
        console.error('❌ Error en fetchPagos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPagos();
  }, []);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completado':
      case 'aprobado':
        return 'success';
      case 'pendiente':
        return 'warning';
      case 'rechazado':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
    } catch (error) {
      return dateString;
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    fetchPagos(searchTerm);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box my={2}>
        <Typography color="error">
          Error al cargar los pagos: {error}
        </Typography>
      </Box>
    );
  }

  const renderContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box my={2}>
          <Typography color="error">
            Error al cargar los pagos: {error}
          </Typography>
        </Box>
      );
    }

    if (filteredPagos.length === 0) {
      return (
        <Box my={4} textAlign="center">
          <Typography color="textSecondary">
            {searchTerm 
              ? `No se encontraron pagos para "${searchTerm}"`
              : 'No hay pagos registrados'}
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer component={Paper} elevation={2}>
        <Table size={isMobile ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>Método</TableCell>
              <TableCell>Referencia</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Registrado por</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPagos.map((pago) => (
              <TableRow key={pago.id_pago} hover>
                <TableCell component="th" scope="row">
                  <Typography variant="body2">
                    {pago.nombre_cliente}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Crédito: {pago.credito_id}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(pago.monto)}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {pago.metodo_pago || 'No especificado'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {pago.referencia || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={pago.estado}
                    color={getStatusColor(pago.estado)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDate(pago.fecha_pago)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {pago.creado_por || 'Sistema'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box 
        component="form" 
        onSubmit={handleSearchSubmit} 
        sx={{ 
          mb: 3, 
          display: 'flex', 
          gap: 2,
          alignItems: 'center'
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar por nombre de cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size={isMobile ? 'small' : 'medium'}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            maxWidth: 500,
            '& .MuiOutlinedInput-root': {
              borderRadius: '28px',
              backgroundColor: theme.palette.background.paper,
            },
          }}
        />
      </Box>
      
      {renderContent()}
    </Box>
  );
};

export default PagosList;
