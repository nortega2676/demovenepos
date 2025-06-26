import React, { useState } from 'react';
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
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { formatCurrency } from '../utils/currency';

import appConfig from '../config/appConfig';

const API_BASE_URL = appConfig.api.baseUrl;

const ReporteTipoPago = ({ open, onClose }) => {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  
  const [endDate, setEndDate] = useState(new Date());
  const [reportData, setReportData] = useState({
    desde: '',
    hasta: '',
    total_ventas: 0,
    total_monto: 0,
    por_metodo_pago: {},
    ventas: []
  });
  
  const getPaymentMethods = () => {
    if (!reportData.por_metodo_pago) return [];
    return Object.entries(reportData.por_metodo_pago).map(([metodo, total]) => ({
      metodo: metodo.charAt(0).toUpperCase() + metodo.slice(1),
      total: parseFloat(total) || 0
    }));
  };
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  const fetchReportData = async () => {
    if (!startDate || !endDate) {
      setError('Por favor seleccione ambas fechas');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Verificar si el token existe y es válido
      const token = localStorage.getItem('token');
      if (!token) {
        // Limpiar cualquier estado de autenticación existente
        localStorage.removeItem('token');
        // Redirigir al login
        navigate('/login');
        throw new Error('Sesión expirada o no autenticado. Por favor inicie sesión nuevamente.');
      }

      // Verificar si el token es válido (opcional: podrías agregar una verificación JWT aquí)
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Token inválido');
        }
      } catch (tokenError) {
        console.error('Error al validar el token:', tokenError);
        localStorage.removeItem('token');
        navigate('/login');
        throw new Error('Token inválido. Por favor inicie sesión nuevamente.');
      }

      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const endpoint = '/ventas/reporte/tipo-pago';
      const url = `${baseUrl}${endpoint}?desde=${formattedStartDate}&hasta=${formattedEndDate}`;
      console.log('Fetching report from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('API Response:', result); // Debug: Ver la respuesta completa
        setReportData({
          desde: result.data.desde,
          hasta: result.data.hasta,
          total_ventas: result.data.total_ventas || 0,
          total_monto: result.data.total_monto || 0,
          por_metodo_pago: result.data.por_metodo_pago || {},
          ventas: result.data.ventas || []
        });
        return;
      } else if (response.status !== 404) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener los datos');
      }
    } catch (err) {
      console.error('Error al obtener el reporte:', err);
      setError(err.message || 'Error al obtener el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateRange = `Del ${format(new Date(reportData.desde), 'dd/MM/yyyy')} al ${format(new Date(reportData.hasta), 'dd/MM/yyyy')}`;
    // Use formatCurrency for consistent currency formatting
    doc.text(dateRange, 14, 30);
    
    // Resumen
    const summary = [
      ['Total Ventas', reportData.total_ventas],
      ...Object.entries(reportData.por_metodo_pago || {}).map(([metodo, total]) => [
        metodo.charAt(0).toUpperCase() + metodo.slice(1),
        formatCurrency(total)
      ]),
      ['Total General', formatCurrency(reportData.total_monto)]
    ];
    
    doc.autoTable({
      head: [['Concepto', 'Valor']],
      body: summary,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 }
    });
    
    // Agregar totales por método de pago
    Object.entries(reportData.por_metodo_pago).forEach(([metodo, total], index) => {
      const yPos = doc.lastAutoTable.finalY + 25 + (index * 7);
      doc.text(`${metodo}:`, 20, yPos);
      doc.text(formatCurrency(total), 50, yPos);
    });
    
    // Agregar total general
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL GENERAL:', 14, doc.lastAutoTable.finalY + 15);
    doc.text(formatCurrency(reportData.total_monto), 50, doc.lastAutoTable.finalY + 15);
    
    // Detalle de ventas
    doc.text('Detalle de Ventas', 14, doc.lastAutoTable.finalY + 30);
    
    const rows = reportData.ventas.map(venta => [
      venta.id,
      venta.fecha ? format(parseISO(venta.fecha), 'dd/MM/yyyy HH:mm') : 'N/A',
      venta.metodo_pago || 'No especificado',
      formatCurrency(venta.total),
      venta.usuario_nombre || 'Sistema'
    ]);
    
    doc.autoTable({
      head: [['ID', 'Fecha', 'Método Pago', 'Total', 'Usuario']],
      body: rows,
      startY: doc.lastAutoTable.finalY + 20,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
        4: { cellWidth: 40 }
      }
    });
    
    doc.save(`reporte_tipo_pago_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Reporte por Tipo de Pago</DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Resumen de Ventas por Tipo de Pago</Typography>
              <Button 
                variant="contained" 
                onClick={exportToPDF}
                startIcon={<PictureAsPdfIcon />}
                disabled={reportData.ventas.length === 0}
                sx={{
                  backgroundColor: '#2e7d32',
                  '&:hover': {
                    backgroundColor: '#1b5e20',
                  },
                  textTransform: 'none',
                  fontWeight: 'medium',
                  minWidth: '180px',
                  '& .MuiButton-startIcon': {
                    marginRight: '8px',
                  }
                }}
              >
                Exportar a PDF
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <DatePicker
                label="Fecha inicial"
                value={startDate}
                onChange={setStartDate}
                renderInput={(params) => <TextField {...params} size="small" />}
              />
              <DatePicker
                label="Fecha final"
                value={endDate}
                onChange={setEndDate}
                renderInput={(params) => <TextField {...params} size="small" />}
                minDate={startDate}
              />
              <Button 
                variant="contained" 
                onClick={fetchReportData}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
                sx={{ minWidth: 180 }}
              >
                {loading ? 'Cargando...' : 'Generar Reporte'}
              </Button>
            </Box>
            
            {error && (
              <Box sx={{ color: 'error.main', mb: 2 }}>
                {error}
              </Box>
            )}
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Resumen</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
                  <Typography variant="subtitle2">Total Ventas</Typography>
                  <Typography variant="h6">{reportData.total_ventas}</Typography>
                </Paper>
                
                {getPaymentMethods().map(({ metodo, total }, index) => (
                  <Paper 
                    key={metodo}
                    sx={{ 
                      p: 2, 
                      textAlign: 'center', 
                      bgcolor: ['success', 'info', 'warning', 'secondary', 'error'][index % 5] + '.light',
                      color: 'white' 
                    }}
                  >
                    <Typography variant="subtitle2">{metodo}</Typography>
                    <Typography variant="h6">{formatCurrency(total)}</Typography>
                  </Paper>
                ))}
                
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.800', color: 'white' }}>
                  <Typography variant="subtitle2">Total General</Typography>
                  <Typography variant="h6">{formatCurrency(reportData.total_monto)}</Typography>
                </Paper>
              </Box>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Detalle de Ventas</Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Método Pago</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Usuario</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.ventas.length > 0 ? (
                      reportData.ventas
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((venta) => (
                          <TableRow key={venta.id} hover>
                            <TableCell>{venta.id}</TableCell>
                            <TableCell>
                              {venta.fecha_venta ? format(parseISO(venta.fecha_venta), 'dd/MM/yyyy HH:mm') : 
                               venta.fecha ? format(parseISO(venta.fecha), 'dd/MM/yyyy HH:mm') : 'N/A'}
                            </TableCell>
                            <TableCell>{venta.metodo_pago || 'No especificado'}</TableCell>
                            <TableCell align="right">{formatCurrency(venta.total)}</TableCell>
                            <TableCell>{venta.usuario_nombre || 'Sistema'}</TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          {loading ? 'Cargando...' : 'No hay datos para mostrar'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={reportData.ventas.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage="Filas por página:"
                />
              </TableContainer>
            </Box>
          </Box>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReporteTipoPago;
