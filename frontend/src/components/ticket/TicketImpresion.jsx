import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Paper
} from '@mui/material';
import { Print as PrintIcon, Close as CloseIcon } from '@mui/icons-material';
import { formatCurrency } from '../../utils/currency';

const TicketImpresion = ({ 
  open, 
  onClose, 
  clienteInfo = null, 
  pagoInfo = null,
  creditoInfo = null,
  ticketInfo = null
}) => {
  // Función para manejar la impresión del ticket
  const handlePrint = () => {
    window.print();
  };

  // Obtener el ID de la venta del localStorage o de las props
  const getVentaId = () => {
    // Intentar obtener el ID de la venta desde las props primero
    if (pagoInfo?.venta_id) return pagoInfo.venta_id;
    
    // Si no está en las props, intentar obtenerlo del localStorage
    try {
      const ventaActual = JSON.parse(localStorage.getItem('ventaActual'));
      return ventaActual?.id || 'N/A';
    } catch (e) {
      console.error('Error al obtener el ID de la venta:', e);
      return 'N/A';
    }
  };

  // Obtener información del usuario logueado
  const getUsuarioActual = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        return {
          nombre: user.nombre || 'Usuario',
          apellido: user.apellido || '',
          username: user.username || user.email || 'usuario'
        };
      }
    } catch (e) {
      console.error('Error al obtener información del usuario:', e);
    }
    return { nombre: 'Sistema', apellido: '', username: 'sistema' };
  };
  
  const usuarioActual = getUsuarioActual();

  // Formatear la fecha actual
  const formatDate = (date) => {
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <span>Ticket de Pago</span>
          <Button 
            startIcon={<CloseIcon />} 
            onClick={onClose}
            color="inherit"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* Contenido del ticket */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            border: '1px solid #e0e0e0',
            maxWidth: 400,
            mx: 'auto',
            '@media print': {
              border: 'none',
              boxShadow: 'none',
              width: '100%',
              maxWidth: '100%',
              p: 1
            }
          }}
          id="ticket-content"
        >
          {/* Encabezado */}
          <Box textAlign="center" mb={2}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              TIENDA VENEPOS
            </Typography>
            <Typography variant="body2" color="textSecondary">
              RIF: J-12345678-9
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Av. Principal, Local 123, Caracas
            </Typography>
            <Typography variant="body2">
              Tlf: (0212) 555-1234
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Información del ticket */}
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Fecha:</Typography>
              <Typography variant="body2">{formatDate(new Date())}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Ticket #:</Typography>
              <Typography variant="body2" fontWeight="bold">
                {getVentaId()}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Cajero:</Typography>
              <Typography variant="body2" fontWeight="medium">
                {usuarioActual.nombre} {usuarioActual.apellido}
                {usuarioActual.username && ` (@${usuarioActual.username})`}
              </Typography>
            </Box>
          </Box>


          <Divider sx={{ my: 1 }} />

          {/* Detalles del pago */}
          <Box mb={2}>
            <Typography variant="subtitle2" fontWeight="bold" mb={1}>
              DETALLES DEL PAGO
            </Typography>
            
            {clienteInfo && (
              <Box mb={2}>
                <Typography variant="body2" fontWeight="bold">Cliente:</Typography>
                <Typography variant="body2">
                  {clienteInfo.nombre} {clienteInfo.apellido}
                </Typography>
                <Typography variant="body2">
                  ID: {clienteInfo.id}
                </Typography>
              </Box>
            )}

            {creditoInfo && (
              <Box mb={2}>
                <Typography variant="body2" fontWeight="bold">Crédito:</Typography>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Monto Total:</Typography>
                  <Typography variant="body2">
                    {formatCurrency(Number(creditoInfo.monto_total) || 0)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Pagado:</Typography>
                  <Typography variant="body2">
                    {formatCurrency(Number(creditoInfo.total_pagado) || 0)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Saldo Anterior:</Typography>
                  <Typography variant="body2">
                    {formatCurrency(Number(creditoInfo.saldo_pendiente) + Number(pagoInfo?.monto || 0))}
                  </Typography>
                </Box>
              </Box>
            )}

            {pagoInfo && ticketInfo && (
              <Box>
                {/* Total de la Orden */}
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Total de la Orden:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(Number(ticketInfo.total) || 0)}
                  </Typography>
                </Box>
                
                {/* Monto Pagado */}
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Monto Pagado:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(Number(pagoInfo.monto) || 0)}
                  </Typography>
                </Box>
                
                {/* Cambio */}
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Cambio:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(Number(pagoInfo.cambio) || 0)}
                  </Typography>
                </Box>
                
                {/* Línea divisora */}
                <Divider sx={{ my: 1 }} />
                
                {/* Método de Pago */}
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Método de Pago:</Typography>
                  <Typography variant="body2" textTransform="capitalize">
                    {pagoInfo.metodo_pago ? pagoInfo.metodo_pago.replace('_', ' ') : 'No especificado'}
                  </Typography>
                </Box>
                
                {/* Referencia (si existe) */}
                {pagoInfo.referencia && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Referencia:</Typography>
                    <Typography variant="body2">
                      {pagoInfo.referencia}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {creditoInfo && (
              <Box mt={2} pt={1} borderTop="1px dashed #e0e0e0">
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" fontWeight="bold">Nuevo Saldo:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(Number(creditoInfo.saldo_pendiente) || 0)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" fontWeight="bold">Estado:</Typography>
                  <Typography 
                    variant="body2" 
                    fontWeight="bold"
                    color={creditoInfo.saldo_pendiente <= 0 ? 'success.main' : 'warning.main'}
                  >
                    {creditoInfo.saldo_pendiente <= 0 ? 'PAGADO COMPLETO' : 'PENDIENTE'}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Pie de página */}
          <Box textAlign="center" mt={2}>
            <Typography variant="caption" display="block">
              Gracias por su compra
            </Typography>
            <Typography variant="caption" display="block">
              Vuelva pronto
            </Typography>
            <Typography variant="caption" display="block" mt={1}>
              *** {new Date().getFullYear()} Tienda Venepos ***
            </Typography>
          </Box>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
        <Button 
          onClick={onClose} 
          color="inherit"
          startIcon={<CloseIcon />}
        >
          Cerrar
        </Button>
        <Button 
          onClick={handlePrint} 
          variant="contained" 
          color="primary"
          startIcon={<PrintIcon />}
        >
          Imprimir Ticket
        </Button>
      </DialogActions>
      
      {/* Estilos para impresión */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #ticket-content,
          #ticket-content * {
            visibility: visible;
          }
          #ticket-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            box-shadow: none;
          }
          .MuiDialogActions-root {
            display: none !important;
          }
        }
      `}</style>
    </Dialog>
  );
};

export default TicketImpresion;
