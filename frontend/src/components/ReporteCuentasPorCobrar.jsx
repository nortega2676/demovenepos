import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  InputAdornment
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { formatCurrency } from '../utils/currency';

// Debug: Mostrar configuración de moneda
console.log('Configuración de moneda:', {
  VITE_CURRENCY_SYMBOL: import.meta.env.VITE_CURRENCY_SYMBOL,
  VITE_CURRENCY_CODE: import.meta.env.VITE_CURRENCY_CODE,
  VITE_SHOW_EXCHANGE_RATE: import.meta.env.VITE_SHOW_EXCHANGE_RATE,
  VITE_SHOW_REFERENCE_TOTAL: import.meta.env.VITE_SHOW_REFERENCE_TOTAL
});

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ReporteCuentasPorCobrar = ({ open, onClose }) => {
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const cargarReporte = async () => {
    setCargando(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/clientes-credito/reporte/cuentas-por-cobrar`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar el reporte');
      }

      const data = await response.json();
      if (data.success) {
        setReporte(data.data);
      } else {
        throw new Error(data.error || 'Error al procesar el reporte');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Error al cargar el reporte. Por favor intente nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (open) {
      cargarReporte();
    }
  }, [open]);

  const generarPDF = async () => {
    if (!reporte) return;

    // Configurar el documento con la fuente estándar que incluye el símbolo de moneda
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Configurar la fuente para que sea compatible con caracteres especiales
    // Usar 'times' en lugar de 'helvetica' para mejor compatibilidad con caracteres especiales
    doc.setFont('times');
    doc.setFontSize(12);
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;
    
    // Configuración de moneda
    const currencySymbol = import.meta.env.VITE_CURRENCY_SYMBOL || 'Bs.';
    const currencyCode = import.meta.env.VITE_CURRENCY_CODE || 'VES';
    
    // Mostrar información de depuración
    console.log('Configuración de moneda:', {
      symbol: currencySymbol,
      code: currencyCode,
      env: {
        VITE_CURRENCY_SYMBOL: import.meta.env.VITE_CURRENCY_SYMBOL,
        VITE_CURRENCY_CODE: import.meta.env.VITE_CURRENCY_CODE,
        VITE_CURRENCY_LOCALE: import.meta.env.VITE_CURRENCY_LOCALE
      }
    });
    
    // Función para formatear montos para la interfaz de usuario
    const formatCurrencyValue = (value) => {
      return formatCurrency(parseFloat(value) || 0, { 
        showSymbol: true,
        showCode: false,
        locale: 'es-VE'
      });
    };
    
    // Función para formatear montos para PDF
    const formatMonto = (monto) => {
      const amount = Number(monto) || 0;
      // Usar formatCurrency con las opciones correctas
      return formatCurrency(amount, {
        showSymbol: true,
        showCode: false,
        locale: 'es-VE'
      });
    };

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE CUENTAS POR COBRAR', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Fecha de generación
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generado el: ${format(new Date(reporte.fechaGeneracion), 'PPP', { locale: es })}`,
      pageWidth - margin,
      yPos,
      { align: 'right' }
    );
    yPos += 15;

    // Resumen
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN', margin, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    const totalCobrar = Number(reporte.totalCobrar) || 0;
    
    // Usar la misma función de formato que en la tabla
    doc.text(`Total por cobrar: ${formatMonto(totalCobrar)}`, margin, yPos);
    yPos += 7;
    doc.text(`Total de clientes: ${reporte.totalClientes}`, margin, yPos);
    yPos += 7;
    doc.text(`Clientes al día: ${reporte.clientesAlDia}`, margin, yPos);
    yPos += 7;
    doc.text(`Clientes atrasados: ${reporte.clientesAtrasados}`, margin, yPos);
    yPos += 15;

    // Tabla de cuentas
    const headers = [
      'Cliente',
      'Teléfono',
      'Monto',
      'Saldo',
      'Vencimiento',
      'Días Rest.',
      'Estado'
    ];

    const data = reporte.cuentas.map(cuenta => {
      const monto = Number(cuenta.monto_credito || cuenta.monto) || 0;
      
      return [
        `${cuenta.nombre} ${cuenta.apellido}`.trim(),
        cuenta.telefono || 'N/A',
        formatMonto(monto),
        formatMonto(cuenta.saldo_pendiente || 0), // Usar saldo_pendiente para el saldo
        format(new Date(cuenta.fecha_limite), 'dd/MM/yyyy'),
        cuenta.dias_restantes.toString(),
        cuenta.estado.charAt(0).toUpperCase() + cuenta.estado.slice(1)
      ];
    });
    
    // Depuración: Mostrar cómo se está formateando un monto de ejemplo
    if (data.length > 0) {
      console.log('Ejemplo de monto formateado para PDF:', {
        montoOriginal: reporte.cuentas[0].monto,
        montoFormateado: formatMonto(reporte.cuentas[0].monto)
      });
    }

    doc.autoTable({
      startY: yPos,
      head: [headers],
      body: data,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 'auto', halign: 'right' },
        3: { cellWidth: 'auto', halign: 'right' },
        4: { cellWidth: 'auto', halign: 'center' },
        5: { cellWidth: 'auto', halign: 'center' },
        6: { cellWidth: 'auto', halign: 'center' }
      },
      didDrawPage: function (data) {
        // Pie de página
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(
          `Página ${doc.internal.getNumberOfPages()}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    });

    // Guardar el PDF
    doc.save(`Reporte_Cuentas_Por_Cobrar_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
  };

  const getColorEstado = (estado) => {
    switch (estado.toLowerCase()) {
      case 'atrasado':
        return 'error';
      case 'pendiente':
        return 'warning';
      case 'pagado':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="reporte-cuentas-por-cobrar-title"
    >
      <DialogTitle id="reporte-cuentas-por-cobrar-title" sx={{ bgcolor: 'primary.main', color: 'white' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <span>Reporte de Cuentas por Cobrar</span>
          <Box display="flex" gap={1}>
            <Tooltip title="Exportar a PDF">
              <Button
                variant="contained"
                color="secondary"
                size="small"
                startIcon={<PictureAsPdfIcon />}
                onClick={generarPDF}
                disabled={cargando || error}
                sx={{
                  textTransform: 'none',
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'grey.100',
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'grey.200',
                    color: 'grey.500',
                  },
                }}
              >
                Exportar a PDF
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {cargando ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box my={2} textAlign="center">
            <Typography color="error">{error}</Typography>
            <Button variant="outlined" onClick={cargarReporte} sx={{ mt: 2 }}>
              Reintentar
            </Button>
          </Box>
        ) : reporte ? (
          <Box>
            {/* Resumen */}
            <Box display="flex" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
              <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" color="textSecondary">TOTAL POR COBRAR</Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(reporte.totalCobrar, { showSymbol: true })}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" color="textSecondary">TOTAL CLIENTES</Typography>
                <Typography variant="h6">{reporte.totalClientes}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" color="textSecondary">CLIENTES AL DÍA</Typography>
                <Typography variant="h6" color="success.main">{reporte.clientesAlDia}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" color="textSecondary">CLIENTES ATRASADOS</Typography>
                <Typography variant="h6" color="error.main">{reporte.clientesAtrasados}</Typography>
              </Paper>
            </Box>

            {/* Barra de búsqueda */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <TextField
                variant="outlined"
                size="small"
                placeholder="Buscar por nombre de cliente..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: '100%',
                  maxWidth: '400px',
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'background.paper',
                    '&:hover fieldset': {
                      borderColor: 'primary.main',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main',
                    },
                  },
                }}
              />
            </Box>

            {/* Tabla de cuentas */}
            <TableContainer component={Paper} sx={{ mt: 2, maxHeight: '60vh', overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell align="right">Monto</TableCell>
                    <TableCell align="right">Saldo Pendiente</TableCell>
                    <TableCell align="center">Vencimiento</TableCell>
                    <TableCell align="center">Días Rest.</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reporte.cuentas
                    .filter(cuenta => {
                      if (!busqueda) return true;
                      const nombreCompleto = `${cuenta.nombre || ''} ${cuenta.apellido || ''}`.toLowerCase();
                      return nombreCompleto.includes(busqueda.toLowerCase());
                    })
                    .map((cuenta, index) => (
                    <TableRow
                      key={index}
                      hover
                      sx={{
                        '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                      }}
                    >
                      <TableCell>{`${cuenta.nombre} ${cuenta.apellido}`.trim()}</TableCell>
                      <TableCell>{cuenta.telefono || 'N/A'}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(cuenta.monto_credito || cuenta.monto, { showSymbol: true })}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold" color={parseFloat(cuenta.saldo_pendiente) > 0 ? 'error' : 'inherit'}>
                          {formatCurrency(cuenta.saldo_pendiente, { showSymbol: true })}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {format(new Date(cuenta.fecha_limite), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={cuenta.dias_restantes}
                          size="small"
                          color={cuenta.dias_restantes <= 0 ? 'error' : 'default'}
                          variant={cuenta.dias_restantes <= 0 ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={cuenta.estado.charAt(0).toUpperCase() + cuenta.estado.slice(1)}
                          size="small"
                          color={getColorEstado(cuenta.estado)}
                          variant="filled"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box mt={2} textAlign="right">
              <Typography variant="caption" color="textSecondary">
                Generado el {format(new Date(reporte.fechaGeneracion), 'PPPp', { locale: es })}
              </Typography>
            </Box>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReporteCuentasPorCobrar;
