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
  TablePagination,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import { Search, Print, FileDownload } from '@mui/icons-material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useNavigate } from 'react-router-dom';
import appConfig from '../config/appConfig';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency } from '../utils/currency';

const ReporteProductoMaestro = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalProductos, setTotalProductos] = useState(0);
  const navigate = useNavigate();

  // Obtener los productos del servidor
  const fetchProductos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${appConfig.api.baseUrl}/reportes/productos-maestro`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar el reporte de productos');
      }

      const data = await response.json();
      
      if (data.success) {
        setProductos(data.data);
        setTotalProductos(data.data.length);
      } else {
        throw new Error(data.error || 'Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setError(error.message || 'Error al cargar el reporte de productos');
    } finally {
      setLoading(false);
    }
  };

  // Cargar los datos al montar el componente
  useEffect(() => {
    fetchProductos();
  }, []);

  // Manejar cambio de página
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Manejar cambio de filas por página
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filtrar productos por término de búsqueda
  const filteredProductos = productos.filter(producto => 
    (producto.nombre && producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (producto.codigo && producto.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (producto.categoria && producto.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Paginación
  const paginatedProductos = filteredProductos.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Usamos la función formatCurrency importada de utils/currency
  // que ya incluye la configuración de moneda desde las variables de entorno
  

  // Función para exportar a PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text('Reporte Maestro de Productos', 14, 22);
      
      // Fecha de generación
      doc.setFontSize(11);
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, 14, 30);
      
      // Resumen
      doc.setFontSize(12);
      doc.text(`Total de productos: ${productos.length}`, 14, 45);
      
      // Tabla de productos
      const rows = productos.map(producto => [
        producto.nombre || '',
        formatCurrency(producto.precio || 0, { showSymbol: true }),
        producto.categoria || 'Sin categoría'
      ]);
      
      doc.autoTable({
        head: [['Nombre', 'Precio', 'Categoría']],
        body: rows,
        startY: 55,
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 9,
          cellPadding: 2,
          overflow: 'linebreak',
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 100, halign: 'left' },
          1: { cellWidth: 30, halign: 'right' },
          2: { cellWidth: 50, halign: 'left' }
        },
        margin: { top: 10 }
      });
      
      // Guardar el PDF
      doc.save(`reporte_productos_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      alert('Ocurrió un error al generar el PDF. Por favor, inténtelo de nuevo.');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box my={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: { xs: 1, sm: 1.5 },
        maxWidth: '1000px',
        mx: 'auto',
        width: '100%',
        boxSizing: 'border-box',
        '& .MuiTableCell-root': {
          py: 1,
          fontSize: '0.875rem'
        },
        '& .MuiTableHead-root .MuiTableCell-root': {
          py: 1.25,
          fontSize: '0.875rem',
          fontWeight: 600
        }
      }}
    >
      {/* Encabezado */}
      <Box 
        sx={{
          width: '100%',
          mb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Typography variant="h4" component="h1" sx={{ 
          textAlign: { xs: 'center', sm: 'left' },
          mb: { xs: 2, sm: 0 }
        }}>
          Reporte Maestro de Productos
        </Typography>
        
        <Button 
          variant="contained" 
          onClick={handleExportPDF}
          startIcon={<PictureAsPdfIcon />}
          disabled={productos.length === 0}
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

      {/* Resumen de totales */}
      <Box 
        sx={{ 
          width: '100%',
          mb: 3,
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <Paper 
          elevation={2} 
          sx={{ 
            p: 2, 
            minWidth: { xs: '100%', sm: '300px' },
            textAlign: 'center'
          }}
        >
          <Typography variant="subtitle2" color="textSecondary">
            Total de Productos
          </Typography>
          <Typography variant="h5">{totalProductos}</Typography>
        </Paper>
      </Box>

      {/* Barra de búsqueda */}
      <Box sx={{ width: '100%', mb: 2, position: 'relative' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar productos por nombre o categoría..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="primary" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              backgroundColor: 'rgba(25, 118, 210, 0.05)',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
              },
              '&.Mui-focused': {
                backgroundColor: 'white',
                boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
              }
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(25, 118, 210, 0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
              borderWidth: '1px',
            }
          }}
        />
      </Box>

      {/* Tabla de productos */}
      <Paper 
        elevation={2} 
        sx={{ 
          width: '100%',
          overflow: 'hidden',
          borderRadius: '8px',
          mb: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <TableContainer 
          sx={{ 
            maxHeight: 'calc(100vh - 280px)',
            '&::-webkit-scrollbar': {
              height: '6px',
              width: '6px'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '3px',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.3)'
              }
            }
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Precio</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Categoría</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedProductos.length > 0 ? (
                paginatedProductos.map((producto, index) => (
                  <TableRow 
                    key={`${producto.nombre}-${producto.categoria_id}-${index}`}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>{producto.nombre}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(producto.precio || 0)}
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'inline-block',
                          px: 1.25,
                          py: 0.4,
                          borderRadius: '10px',
                          backgroundColor: 'rgba(25, 118, 210, 0.08)',
                          color: 'primary.dark',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          lineHeight: 1.2
                        }}
                      >
                        {producto.categoria || 'Sin categoría'}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                    <Box sx={{ color: 'text.secondary' }}>
                      {searchTerm 
                        ? 'No se encontraron productos que coincidan con la búsqueda' 
                        : 'No hay productos disponibles'}
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {filteredProductos.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredProductos.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            sx={{
              '& .MuiTablePagination-toolbar': {
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 1,
                p: 1
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                my: 1
              }
            }}
          />
        )}
      </Paper>
    </Box>
  );
};

export default ReporteProductoMaestro;
