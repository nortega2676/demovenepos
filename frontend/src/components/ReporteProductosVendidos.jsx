import React, { useState } from 'react';
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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { formatCurrency } from '../utils/currency';
import appConfig from '../config/appConfig';

const API_BASE_URL = appConfig.api.baseUrl;

const ReporteProductosVendidos = () => {
  // Debug: Verificar variables de entorno
  console.log('VITE_CURRENCY_SYMBOL:', import.meta.env.VITE_CURRENCY_SYMBOL);
  console.log('VITE_CURRENCY_CODE:', import.meta.env.VITE_CURRENCY_CODE);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1); // Primer día del mes actual
    return date;
  });
  
  const [endDate, setEndDate] = useState(new Date());
  const [reportData, setReportData] = useState({
    desde: '',
    hasta: '',
    total_cantidad: 0,
    total_subtotal: 0,
    productos: []
  });
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
      console.log('API Response:', result); // Debug log
      
      if (result.success) {
        // Debug log para ver la estructura de los productos
        if (result.data.productos && result.data.productos.length > 0) {
          console.log('Primer producto del reporte:', result.data.productos[0]);
          console.log('Campos disponibles en el producto:', Object.keys(result.data.productos[0]));
        }
        setReportData({
          desde: result.data.desde,
          hasta: result.data.hasta,
          total_cantidad: result.data.total_cantidad || 0,
          total_subtotal: result.data.total_subtotal || 0,
          productos: result.data.productos || []
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

  const handleExportPDF = () => {
    try {
      if (!reportData || !reportData.productos || reportData.productos.length === 0) {
        console.error('No hay datos para exportar');
        setError('No hay datos para exportar. Por favor genere un reporte primero.');
        return;
      }

      // Crear título con rango de fechas
      const title = `Reporte de Productos Vendidos\nDel ${format(new Date(reportData.desde), 'dd/MM/yyyy')} al ${format(new Date(reportData.hasta), 'dd/MM/yyyy')}`;
      
      // Calcular totales
      const totalCantidad = reportData.productos.reduce((sum, item) => sum + (parseInt(item.cantidad_total) || 0), 0);
      const totalSubtotal = reportData.productos.reduce((sum, item) => sum + (parseFloat(item.subtotal_total) || 0), 0);
      
      // Usar los totales calculados si los del API son 0
      const cantidadFinal = reportData.total_cantidad > 0 ? reportData.total_cantidad : totalCantidad;
      const subtotalFinal = reportData.total_subtotal > 0 ? reportData.total_subtotal : totalSubtotal;
      
      // Crear resumen
      const summary = [
        ['Productos Totales:', reportData.productos.length],
        ['Cantidad Total:', cantidadFinal],
        ['Subtotal General:', `${import.meta.env.VITE_CURRENCY_SYMBOL || ''} ${formatCurrencyForPDF(subtotalFinal)}`]
      ];
      
      // Configurar columnas y datos de la tabla
      const columns = ['Producto', 'Categoría', 'Cantidad', 'Precio Unitario', 'Subtotal'];
      
      // Preparar datos para la tabla
      const data = reportData.productos.map(item => ({
        producto: item.producto_nombre || 'Sin nombre',
        categoria: item.categoria_nombre || 'Sin categoría',
        cantidad: parseInt(item.cantidad_total) || 0,
        precio_unitario: parseFloat(item.precio_unitario_promedio) || 0,
        subtotal: parseFloat(item.subtotal_total) || 0
      }));
      
      // Ordenar por cantidad descendente
      data.sort((a, b) => b.cantidad - a.cantidad);
      
      // Generar PDF
      const doc = new jsPDF();
      let yPos = 20;
      
      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE PRODUCTOS VENDIDOS', 105, yPos, { align: 'center' });
      
      // Agregar símbolo de moneda en el encabezado
      const currencySymbol = import.meta.env.VITE_CURRENCY_SYMBOL || '';
      yPos += 10;  
      
      // Subtítulo con fechas
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Del ${format(new Date(reportData.desde), 'dd/MM/yyyy')} al ${format(new Date(reportData.hasta), 'dd/MM/yyyy')}`, 
               105, yPos, { align: 'center' });
      yPos += 15;
      
      // Resumen
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN DEL PERÍODO', 14, yPos);
      yPos += 8;
      
      summary.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), 60, yPos);
        yPos += 7;
      });
      
      yPos += 10;
      
      // Preparar datos para la tabla
      const tableData = data.map(item => ({
        producto: item.producto,
        categoria: item.categoria,
        cantidad: item.cantidad.toLocaleString(),
        precio_unitario: formatCurrencyForPDF(item.precio_unitario),
        subtotal: formatCurrencyForPDF(item.subtotal)
      }));
      
      // Agregar fila de totales
      const totalRow = {
        producto: '',
        categoria: 'TOTAL GENERAL',
        cantidad: cantidadFinal.toLocaleString(),
        precio_unitario: '',
        subtotal: formatCurrencyForPDF(subtotalFinal)
      };
      
      // Configuración de la tabla
      const tableConfig = {
        startY: yPos,
        head: [columns],
        body: [
          ...tableData.map(item => [
            item.producto,
            item.categoria,
            item.cantidad,
            item.precio_unitario ? `${currencySymbol} ${item.precio_unitario}` : '',
            item.subtotal ? `${currencySymbol} ${item.subtotal}` : ''
          ]),
          [
            '',
            'TOTAL GENERAL',
            totalRow.cantidad,
            '',
            totalRow.subtotal ? `${currencySymbol} ${totalRow.subtotal}` : ''
          ]
        ],
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
          cellPadding: 3,
          overflow: 'linebreak',
          lineWidth: 0.1,
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 50 },
          2: { 
            cellWidth: 30, 
            halign: 'right',
            cellPadding: { left: 5, right: 5 }
          },
          3: { 
            cellWidth: 30, 
            halign: 'right',
            cellPadding: { left: 5, right: 5 }
          },
          4: { 
            halign: 'right',
            cellPadding: { left: 5, right: 5 }
          }
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
      doc.save(`reporte-productos-vendidos-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`);
      
    } catch (error) {
      console.error('Error en handleExportPDF:', error);
      setError('Error al generar el PDF. Por favor intente de nuevo.');
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Formatear moneda para la interfaz de usuario
  const formatCurrencyValue = (value) => {
    if (value === undefined || value === null || value === '') {
      return formatCurrency(0, { 
        showSymbol: true,
        locale: 'es-VE',
        currency: import.meta.env.VITE_CURRENCY_CODE || 'VES'
      });
    }
    const formatted = formatCurrency(parseFloat(value) || 0, { 
      showSymbol: true,
      locale: 'es-VE',
      currency: import.meta.env.VITE_CURRENCY_CODE || 'VES'
    });
    console.log(`Formatting ${value} as:`, formatted);
    return formatted;
  };
  
  // Obtener el símbolo de moneda de las variables de entorno
  const currencySymbol = import.meta.env.VITE_CURRENCY_SYMBOL || '';
  
  // Formatear moneda para PDF
  const formatCurrencyForPDF = (value) => {
    if (value === undefined || value === null || value === '') return '0.00';
    const num = parseFloat(value) || 0;
    // Solo devolver el número formateado sin símbolo, lo manejaremos en la tabla
    return num.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });
  };

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Reporte de Productos Vendidos
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Box display="flex" gap={2} alignItems="flex-end" flexWrap="wrap" mb={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
              <DatePicker
                label="Fecha inicial"
                value={startDate}
                onChange={setStartDate}
                renderInput={(params) => <TextField {...params} size="small" sx={{ minWidth: 200 }} />}
                maxDate={endDate || new Date()}
              />
              <DatePicker
                label="Fecha final"
                value={endDate}
                onChange={setEndDate}
                renderInput={(params) => <TextField {...params} size="small" sx={{ minWidth: 200, mr: 2 }} />}
                minDate={startDate}
                maxDate={new Date()}
              />
            </LocalizationProvider>
            
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ minWidth: '180px' }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Generando...' : 'Generar Reporte'}
            </Button>
            
            <Button 
              variant="contained" 
              color="success"
              onClick={handleExportPDF}
              startIcon={<PictureAsPdfIcon />}
              disabled={!reportData || reportData.productos?.length === 0 || loading}
              sx={{
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

      {reportData.productos.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, overflow: 'hidden' }}>
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Productos Vendidos del {format(new Date(reportData.desde), 'dd/MM/yyyy')} al {format(new Date(reportData.hasta), 'dd/MM/yyyy')}
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
              <Typography variant="subtitle1" color="primary">
                Total de productos vendidos: <strong>{reportData.productos.reduce((sum, item) => sum + (Number(item.cantidad_total) || 0), 0).toLocaleString()}</strong>
              </Typography>
              <Typography variant="subtitle2" color="textSecondary">
                Mostrando {reportData.productos.length} productos diferentes
              </Typography>
            </Paper>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Producto</strong></TableCell>
                  <TableCell align="right"><strong>Categoría</strong></TableCell>
                  <TableCell align="right"><strong>Cantidad</strong></TableCell>
                  <TableCell align="right"><strong>Precio Unitario</strong></TableCell>
                  <TableCell align="right"><strong>Subtotal</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.productos
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((producto, index) => (
                    <TableRow key={index}>
                      <TableCell>{producto.producto_nombre || 'Sin nombre'}</TableCell>
                      <TableCell align="right">{producto.categoria_nombre || 'Sin categoría'}</TableCell>
                      <TableCell align="right">{producto.cantidad_total || 0}</TableCell>
                      <TableCell align="right">
                        {formatCurrencyValue(producto.precio_unitario_promedio || producto.precio_unitario || producto.precio || 0)}
                        {console.log('Producto:', producto)} {/* Debug log */}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrencyValue(producto.subtotal_total || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={reportData.productos.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </Paper>
      )}
    </Box>
  );
};

export default ReporteProductosVendidos;
