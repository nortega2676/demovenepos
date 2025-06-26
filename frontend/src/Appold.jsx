import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Button,
  Typography,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import {
  Menu as MenuIcon,
  ShoppingCart,
  Person,
  Settings,
  Add,
  Remove,
  DeleteOutline
} from '@mui/icons-material';

function App() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [orderItems, setOrderItems] = useState([]);
  const [total, setTotal] = useState(0);

  // Ejemplo de categorías
  const categories = [
    { id: 'all', name: 'Todo' },
    { id: 'drinks', name: 'Bebidas' },
    { id: 'food', name: 'Comidas' },
    { id: 'desserts', name: 'Postres' }
  ];

  // Ejemplo de productos
  const products = [
    { id: 1, name: 'Hamburguesa', price: 8.99, category: 'food' },
    { id: 2, name: 'Pizza', price: 12.99, category: 'food' },
    { id: 3, name: 'Coca Cola', price: 2.50, category: 'drinks' },
    { id: 4, name: 'Helado', price: 3.99, category: 'desserts' },
    { id: 5, name: 'Papas Fritas', price: 4.99, category: 'food' },
    { id: 6, name: 'Agua', price: 1.50, category: 'drinks' },
  ]

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory)

  const handleAddToOrder = (product) => {
    const existingItem = orderItems.find(item => item.id === product.id)
    
    if (existingItem) {
      // Si el producto ya existe, incrementar la cantidad
      const updatedItems = orderItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
          : item
      )
      setOrderItems(updatedItems)
    } else {
      // Si es un nuevo producto, agregarlo con cantidad 1
      setOrderItems([...orderItems, {
        ...product,
        quantity: 1,
        subtotal: product.price
      }])
    }
  }

  const handleRemoveFromOrder = (productId) => {
    const updatedItems = orderItems.map(item =>
      item.id === productId && item.quantity > 1
        ? { ...item, quantity: item.quantity - 1, subtotal: (item.quantity - 1) * item.price }
        : item
    ).filter(item => item.quantity > 0)
    
    setOrderItems(updatedItems)
  }

  const handleDeleteItem = (productId) => {
    setOrderItems(orderItems.filter(item => item.id !== productId))
  }

  // Calcular el total cada vez que cambia orderItems
  useEffect(() => {
    const newTotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0)
    setTotal(newTotal)
  }, [orderItems])

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#f5f5f5'
      }}
    >
      <AppBar position="static" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Toast POS
          </Typography>
          <IconButton color="inherit">
            <ShoppingCart />
          </IconButton>
          <IconButton color="inherit">
            <Person />
          </IconButton>
          <IconButton color="inherit">
            <Settings />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          overflow: 'hidden'
        }}
      >
        {/* Panel de Orden (Izquierda) */}
        <Box
          sx={{
            width: '255px',
            flexShrink: 0,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            borderRight: '1px solid #e0e0e0',
            backgroundColor: '#ffffff',
            height: '100%'
          }}
        >
          {/* Encabezado del panel */}
          <Box sx={{ p: 1.5, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
              Orden Actual
            </Typography>
          </Box>

          {/* Categorías */}
          <Paper sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Grid container spacing={1}>
              {categories.map((category) => (
                <Grid item key={category.id}>
                  <Button
                    variant={selectedCategory === category.id ? "contained" : "outlined"}
                    onClick={() => setSelectedCategory(category.id)}
                    sx={{
                      minWidth: '120px',
                      fontWeight: 'bold'
                    }}
                  >
                    {category.name}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Productos */}
          <Box sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 2
          }}>
            <Grid container spacing={2}>
              {filteredProducts.map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <Paper
                    elevation={1}
                    onClick={() => handleAddToOrder(product)}
                    sx={{
                      p: 2,
                      height: '120px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e0e0e0',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 2,
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                      {product.name}
                    </Typography>
                    <Typography
                      variant="h6"
                      color="primary"
                      sx={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }}
                    >
                      ${product.price.toFixed(2)}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Orden */}
          <Box sx={{ p: 2 }}>
            {orderItems.map((item) => (
              <Paper
                key={item.id}
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e0e0e0',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                    borderColor: 'primary.main'
                  }
                }}
              >
                <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                  {product.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontSize: '1.1rem', mr: 1 }}>
                    x{item.quantity}
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ fontSize: '1.1rem' }}>
                    ${item.subtotal.toFixed(2)}
                  </Typography>
                </Box>
              </Paper>
            ))}
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>Total:</Typography>
              <Typography variant="h6" color="primary" sx={{ fontSize: '1.1rem' }}>
                ${total.toFixed(2)}
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={orderItems.length === 0}
              sx={{
                py: 1,
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              Pagar (${total.toFixed(2)})
            </Button>
          </Box>
        </Box>

        {/* Productos */}
        <Box sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2
        }}>
          <Grid container spacing={2}>
            {filteredProducts.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <Paper
                  elevation={1}
                  onClick={() => handleAddToOrder(product)}
                  fullWidth
                  size="large"
                  disabled={orderItems.length === 0}
                  sx={{
                    py: 1,
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  Pagar (${total.toFixed(2)})
                </Button>
          </Paper>

          {/* Productos */}
          <Box sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 2
          }}>
            <Grid container spacing={2}>
              {filteredProducts.map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <Paper
                    elevation={1}
                    onClick={() => handleAddToOrder(product)}
                    sx={{
                      p: 2,
                      height: '120px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e0e0e0',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 2,
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                      {product.name}
                    </Typography>
                    <Typography
                      variant="h6"
                      color="primary"
                      sx={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }}
                    >
                      ${product.price.toFixed(2)}
                    </Typography>
            </Grid>
          ))}
        </Grid>
      </Box>
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e0e0e0',
          zIndex: (theme) => theme.zIndex.drawer + 2
        }}
      >
        <Button
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          disabled={orderItems.length === 0}
          sx={{
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}
        >
          Ver Orden (${total.toFixed(2)})
        </Button>
      </Paper>
    </Box>
  );
}

export default App;
