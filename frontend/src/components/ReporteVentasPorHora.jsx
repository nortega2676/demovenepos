import React, { useState, forwardRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  TablePagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Toolbar,
  AppBar,
  Slide,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { formatCurrency } from '../utils/currency';
import appConfig from '../config/appConfig';

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const API_BASE_URL = appConfig.api.baseUrl;

const ReporteVentasPorHora = ({ open, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [date, setDate] = useState(new Date());
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchReportData = async () => {
    if (!date) {
      setError('Por favor seleccione una fecha');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      const response = await fetch(
        `${API_BASE_URL}/ventas/reporte/ventas-por-hora?fecha=${formattedDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener el reporte');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Asegurarse de que todas las horas estén presentes
        const horasCompletas = Array.from({ length: 16 }, (_, i) => {
          const hora = i + 6; // De 6 AM a 9 PM
          const horaData = result.data.find(item => parseInt(item.hora) === hora) || {
            hora: hora.toString().padStart(2, '0'),
            cantidad_ventas: 0,
            total_ventas: 0,
            promedio_por_venta: 0
          };
          return {
            ...horaData,
            hora: hora.toString().padStart(2, '0')
          };
        });
        
        setReportData(horasCompletas);
      } else {
        throw new Error(result.error || 'Error al obtener el reporte');
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('Error al cargar el reporte. Por favor intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      setReportData([]);
      setPage(0);
      setError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchReportData();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatCurrencyForTable = (value) => {
    return formatCurrency(value);
  };

  const handleExportPDF = () => {
    if (!reportData || reportData.length === 0) {
      console.error('No hay datos para exportar');
      setError('No hay datos para exportar. Por favor genere un reporte primero.');
      return;
    }

    try {
      // Crear título con fecha
      const title = `Reporte de Ventas por Hora - ${format(date, 'dd/MM/yyyy')}`;
      
      // Calcular totales
      const totalVentas = reportData.reduce((sum, item) => sum + parseFloat(item.total_ventas), 0);
      const totalTransacciones = reportData.reduce((sum, item) => sum + parseInt(item.cantidad_ventas), 0);
      const promedioVenta = totalTransacciones > 0 ? totalVentas / totalTransacciones : 0;
      
      // Configurar columnas y datos de la tabla
      const columns = ['Hora', '# Ventas', 'Total Ventas', 'Promedio x Venta'];
      
      // Usar todos los datos sin paginación para el PDF
      const data = reportData.map(row => [
        `${row.hora}:00 - ${parseInt(row.hora) + 1}:00`,
        row.cantidad_ventas,
        formatCurrencyForTable(row.total_ventas),
        row.cantidad_ventas > 0 ? formatCurrencyForTable(row.promedio_por_venta) : '-'
      ]);
      
      // Agregar fila de totales
      const totalRow = [
        'TOTAL',
        totalTransacciones,
        formatCurrencyForTable(totalVentas),
        formatCurrencyForTable(promedioVenta)
      ];
      
      // Generar PDF con título, resumen y tabla completa
      const doc = new jsPDF();
      let yPos = 20;
      
      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE VENTAS POR HORA', 105, yPos, { align: 'center' });
      yPos += 10;
      
      // Subtítulo con fecha
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${format(date, 'dd/MM/yyyy')}`, 105, yPos, { align: 'center' });
      yPos += 15;
      
      // Resumen
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN', 14, yPos);
      yPos += 7;
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Ventas: ${formatCurrency(totalVentas)}`, 20, yPos);
      yPos += 7;
      doc.text(`Total Transacciones: ${totalTransacciones}`, 20, yPos);
      yPos += 7;
      doc.text(`Promedio por Venta: ${formatCurrency(promedioVenta)}`, 20, yPos);
      yPos += 15;
      
      // Configuración de la tabla
      const tableConfig = {
        startY: yPos,
        head: [columns],
        body: [...data, totalRow],
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: yPos },
        styles: {
          fontSize: 9,
          cellPadding: 2,
          overflow: 'linebreak',
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30, halign: 'right' },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 40, halign: 'right' }
        },
        didDrawPage: function(data) {
          // Número de página en el pie de página
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          doc.setFontSize(10);
          doc.text(`Página ${doc.internal.getNumberOfPages()}`, 
                  data.settings.margin.left, 
                  pageHeight - 10);
        }
      };
      
      // Estilo para la fila de totales
      tableConfig.willDrawCell = function(data) {
        if (data.table && data.table.rows && data.row.index === data.table.rows.length - 1) {
          doc.setFillColor(41, 128, 185);
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
        }
      };
      
      // Asegurarse de que la tabla tenga datos antes de intentar dibujarla
      if (!data || data.length === 0) {
        throw new Error('No hay datos para generar el reporte');
      }
      
      // Agregar la tabla al documento
      doc.autoTable(tableConfig);
      
      // Restaurar estilos después de dibujar la tabla
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      // Guardar el PDF
      doc.save(`reporte-ventas-hora-${format(date, 'yyyyMMdd')}-${format(new Date(), 'HHmmss')}.pdf`);
      
    } catch (error) {
      console.error('Error al exportar a PDF:', error);
      setError('Error al generar el PDF. Por favor intente de nuevo.');
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Dialog
        fullScreen={fullScreen}
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
        maxWidth="lg"
        fullWidth
      >
        <AppBar position="relative" color="primary" elevation={1}>
          <Toolbar>
            <AccessTimeIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Reporte de Ventas por Hora
            </Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleClose}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <DatePicker
              label="Seleccionar fecha"
              value={date}
              onChange={(newValue) => setDate(newValue)}
              renderInput={(params) => (
                <TextField {...params} sx={{ minWidth: 250 }} required />
              )}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Cargando...' : 'Generar Reporte'}
            </Button>
            {reportData.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<PictureAsPdfIcon />}
                onClick={handleExportPDF}
                disabled={loading}
              >
                Exportar a PDF
              </Button>
            )}
          </Box>

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {reportData.length > 0 && (
            <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
              <Typography variant="h6" gutterBottom>
                Resumen de Ventas - {format(date, 'dd/MM/yyyy')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="subtitle2">Total Ventas:</Typography>
                  <Typography variant="h6">
                    {formatCurrency(
                      reportData.reduce((sum, item) => sum + parseFloat(item.total_ventas), 0)
                    )}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Total Transacciones:</Typography>
                  <Typography variant="h6">
                    {reportData.reduce((sum, item) => sum + parseInt(item.cantidad_ventas), 0)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Promedio por Venta:</Typography>
                  <Typography variant="h6">
                    {formatCurrency(
                      reportData.reduce((sum, item) => sum + parseFloat(item.total_ventas), 0) /
                      Math.max(
                        1,
                        reportData.reduce((sum, item) => sum + parseInt(item.cantidad_ventas), 0)
                      )
                    )}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          )}

          {reportData.length > 0 && (
            <Paper elevation={2} sx={{ overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: '60vh' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Hora</TableCell>
                      <TableCell align="right"># Ventas</TableCell>
                      <TableCell align="right">Total Ventas</TableCell>
                      <TableCell align="right">Promedio por Venta</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((row, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{row.hora}:00 - {parseInt(row.hora) + 1}:00</TableCell>
                          <TableCell align="right">{row.cantidad_ventas}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(row.total_ventas)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(row.promedio_por_venta)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={reportData.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Filas por página:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
                }
              />
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ReporteVentasPorHora;
