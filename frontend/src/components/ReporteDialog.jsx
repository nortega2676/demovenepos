import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography, Box, CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ReporteDialog = ({ open, onClose }) => {
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(new Date());
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const generarReporte = async () => {
    if (!fechaInicio || !fechaFin) {
      setError('Por favor seleccione ambas fechas');
      return;
    }

    if (fechaInicio > fechaFin) {
      setError('La fecha de inicio no puede ser mayor a la fecha fin');
      return;
    }

    setCargando(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/reportes/ventas?desde=${format(fechaInicio, 'yyyy-MM-dd')}&hasta=${format(fechaFin, 'yyyy-MM-dd')}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al generar el reporte');
      }

      const data = await response.json();
      setReporte(data);
    } catch (err) {
      console.error('Error:', err);
      setError('Error al generar el reporte. Por favor intente nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  const imprimirPDF = () => {
    if (!reporte) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Título
    doc.setFontSize(18);
    doc.text('Reporte de Ventas', pageWidth / 2, 15, { align: 'center' });
    
    // Rango de fechas
    doc.setFontSize(12);
    doc.text(
      `Del ${format(fechaInicio, 'dd/MM/yyyy')} al ${format(fechaFin, 'dd/MM/yyyy')}`, 
      pageWidth / 2, 
      25, 
      { align: 'center' }
    );
    
    // Tabla de datos
    const headers = [
      'Producto',
      'Categoría',
      'Cantidad',
      'Precio Unit.',
      'Total'
    ];
    
    const data = reporte.map(item => [
      item.producto_nombre,
      item.categoria_nombre || 'Sin categoría',
      item.cantidad_total.toString(),
      `$${parseFloat(item.precio_unitario).toFixed(2)}`,
      `$${parseFloat(item.subtotal_total).toFixed(2)}`
    ]);
    
    // Añadir totales
    const totalVentas = reporte.reduce((sum, item) => sum + parseFloat(item.subtotal_total), 0);
    data.push([
      { content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: `$${totalVentas.toFixed(2)}`, styles: { fontStyle: 'bold' } }
    ]);
    
    doc.autoTable({
      head: [headers],
      body: data,
      startY: 35,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 121, 255],
        textColor: 255,
        fontStyle: 'bold'
      },
      didDrawPage: function(data) {
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          pageWidth - 20,
          doc.internal.pageSize.height - 10
        );
      }
    });
    
    doc.save(`reporte-ventas-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Generar Reporte de Ventas</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, mb: 3 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <DatePicker
                label="Fecha Inicio"
                value={fechaInicio}
                onChange={(newValue) => setFechaInicio(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
                maxDate={fechaFin || new Date()}
              />
              <DatePicker
                label="Fecha Fin"
                value={fechaFin}
                onChange={(newValue) => setFechaFin(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
                maxDate={new Date()}
                minDate={fechaInicio}
              />
            </Box>
          </LocalizationProvider>

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {cargando ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : reporte ? (
            <>
              <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400, overflow: 'auto' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell align="right">Precio Unit.</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reporte.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.producto_nombre}</TableCell>
                        <TableCell>{item.categoria_nombre || 'Sin categoría'}</TableCell>
                        <TableCell align="right">{item.cantidad_total}</TableCell>
                        <TableCell align="right">${parseFloat(item.precio_unitario).toFixed(2)}</TableCell>
                        <TableCell align="right">${parseFloat(item.subtotal_total).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {reporte.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="right">
                          <strong>Total General:</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>
                            $
                            {reporte
                              .reduce((sum, item) => sum + parseFloat(item.subtotal_total), 0)
                              .toFixed(2)}
                          </strong>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box mt={2}>
                <Typography variant="body2" color="textSecondary">
                  Total de productos diferentes: {reporte.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total de unidades vendidas: {reporte.reduce((sum, item) => sum + parseInt(item.cantidad_total), 0)}
                </Typography>
              </Box>
            </>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">
          Cerrar
        </Button>
        <Box>
          {reporte && (
            <Button
              onClick={imprimirPDF}
              variant="contained"
              sx={{
                mr: 1,
                backgroundColor: '#2e7d32',
                '&:hover': {
                  backgroundColor: '#1b5e20',
                },
                textTransform: 'none',
                fontWeight: 'medium',
                minWidth: '120px',
                '& .MuiButton-startIcon': {
                  marginRight: '6px',
                }
              }}
            >
              Imprimir PDF
            </Button>
          )}
          <Button
            onClick={generarReporte}
            variant="contained"
            color="primary"
            disabled={cargando}
          >
            {cargando ? 'Generando...' : 'Generar Reporte'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ReporteDialog;
