import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Button, 
  Box,
  useTheme,
  useMediaQuery,
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { Add as AddIcon, AttachMoney as AttachMoneyIcon } from '@mui/icons-material';
import PagoCreditoForm from '../components/credito/PagoCreditoForm';
import PagosList from '../components/credito/PagosList';

const PagoCreditoPage = () => {
  const [openForm, setOpenForm] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleOpenForm = () => {
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 2 : 0
      }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Pagos de Crédito
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenForm}
          size={isMobile ? 'medium' : 'large'}
          fullWidth={isMobile}
        >
          Nuevo Pago
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Lista de Pagos
          </Typography>
          <Divider />
        </Box>
        <PagosList />
      </Paper>

      <PagoCreditoForm 
        open={openForm} 
        onClose={handleCloseForm} 
      />
    </Container>
  );
};

export default PagoCreditoPage;
