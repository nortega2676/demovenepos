import React, { useState, useEffect } from 'react';
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
  Tooltip,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import appConfig from '../config/appConfig';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

const API_BASE_URL = appConfig.api.baseUrl;

const SalesReport = () => {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // Primer día del mes actual
    return date;
  });
  
  const [endDate, setEndDate] = useState(new Date());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchReportData = async () => {
    if (!startDate || !endDate) {
      setError('Por favor seleccione ambas fechas');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      const response = await fetch(
        `${API_BASE_URL}/ventas/reporte/productos-vendidos?fechaInicio=${formattedStartDate}&fechaFin=${formattedEndDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener el reporte');
      }
      
      const result = await response.json();
      if (result.success) {
        setReportData({
          desde: result.data.desde,
          hasta: result.data.hasta,
          totales: result.data.totales,
          productos: result.data.productos
        });
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

  const handleExportPDF = () => {
    if (!reportData) return;
    
    try {
      // Crear título con rango de fechas
      const title = `Reporte de Ventas\nDel ${format(new Date(reportData.desde), 'dd/MM/yyyy')} al ${format(new Date(reportData.hasta), 'dd/MM/yyyy')}`;
      
      // Crear resumen
      const summary = [
        ['Ventas Totales:', reportData.totales.ventas_totales],
        ['Productos Vendidos:', reportData.totales.cantidad_total],
        ['Ingresos Totales:', formatCurrency(reportData.totales.subtotal_total)]
      ];
      
      // Configurar columnas y datos de la tabla
      const columns = ['Producto', 'Categoría', 'Precio Unitario', 'Cantidad', 'Total', 'Veces Vendido'];
      
      // Usar todos los productos sin paginación
      const data = reportData.productos.map(item => [
        item.producto_nombre,
        item.categoria_nombre || 'Sin categoría',
        formatCurrency(item.precio_unitario),
        item.cantidad_total,
        formatCurrency(item.subtotal_total),
        item.veces_vendido
      ]);
      
      // Agregar fila de totales
      const totalRow = [
        '',
        'TOTAL GENERAL',
        '',
        reportData.productos.reduce((sum, item) => sum + Number(item.cantidad_total), 0),
        formatCurrency(reportData.productos.reduce((sum, item) => sum + Number(item.subtotal_total), 0)),
        reportData.productos.reduce((sum, item) => sum + Number(item.veces_vendido), 0)
      ];
      
      // Generar PDF con título, resumen y tabla completa
      const doc = new jsPDF();
      let yPos = 20;
      
      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE VENTAS', 105, yPos, { align: 'center' });
      yPos += 10;
      
      // Agregar totales
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Ventas:', 14, yPos);
      doc.text(formatCurrency(reportData.totales.ventas_totales), 50, yPos);
      yPos += 7;
      
      // Subtítulo con fechas
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Del ${format(new Date(reportData.desde), 'dd/MM/yyyy')} al ${format(new Date(reportData.hasta), 'dd/MM/yyyy')}`, 
               105, yPos, { align: 'center' });
      yPos += 8;
      
      summary.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 20, yPos);
        doc.text(formatCurrency(value), 60, yPos);
        yPos += 7;
      });
      
      yPos += 10;
      
      // Tabla de productos
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
          0: { cellWidth: 50 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' }
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
      
      // Agregar la tabla al documento
      doc.autoTable(tableConfig);
      
      // Guardar el PDF
      doc.save(`reporte-ventas-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`);
      
    } catch (error) {
      console.error('Error al exportar a PDF:', error);
      setError('Error al generar el PDF. Por favor intente de nuevo.');
    }
  };

  // Usar la función formatCurrency importada del módulo de utilidades
  // que ya maneja las variables de entorno correctamente

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Reporte de Productos Vendidos
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Box display="flex" gap={2} alignItems="flex-end" flexWrap="wrap" mb={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label="Fecha de inicio"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                renderInput={(params) => <TextField {...params} />}
                maxDate={endDate}
              />
              <DatePicker
                label="Fecha de fin"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                renderInput={(params) => <TextField {...params} />}
                minDate={startDate}
                maxDate={new Date()}
              />
            </LocalizationProvider>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ minWidth: '120px' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Generar Reporte'}
            </Button>
            <Button 
              variant="contained" 
              onClick={handleExportPDF}
              startIcon={<PictureAsPdfIcon />}
              disabled={!reportData || loading}
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
        </form>
      </Paper>

      {error && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#ffebee' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      {reportData && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box mb={3}>
            <Typography variant="h6">Resumen del Período</Typography>
            <Box display="flex" gap={3} mt={1} flexWrap="wrap">
              <Box>
                <Typography variant="subtitle2">Ventas Totales:</Typography>
                <Typography variant="h6">{reportData.totales.ventas_totales}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Productos Vendidos:</Typography>
                <Typography variant="h6">{reportData.totales.cantidad_total}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Ingresos Totales:</Typography>
                <Typography variant="h6">{formatCurrency(reportData.totales.subtotal_total)}</Typography>
              </Box>
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell align="right">Categoría</TableCell>
                  <TableCell align="right">Precio Unitario</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Veces Vendido</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.productos
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((producto) => (
                    <TableRow key={producto.producto_id} hover>
                      <TableCell>{producto.producto_nombre}</TableCell>
                      <TableCell align="right">{producto.categoria_nombre || 'Sin categoría'}</TableCell>
                      <TableCell align="right">{formatCurrency(producto.precio_unitario)}</TableCell>
                      <TableCell align="right">{producto.cantidad_total}</TableCell>
                      <TableCell align="right">{formatCurrency(producto.subtotal_total)}</TableCell>
                      <TableCell align="right">{producto.veces_vendido}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={reportData.productos.length}
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
    </Box>
  );
};

export default SalesReport;
