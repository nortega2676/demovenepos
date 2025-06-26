import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import appConfig from './config/appConfig';
import { formatCurrency } from './utils/currency';
import TicketImpresion from './components/ticket/TicketImpresion';
import { 
  MonetizationOnOutlined as MonetizationOnOutlinedIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon 
} from '@mui/icons-material';

// Obtener la URL base de la API
const API_BASE_URL = appConfig.api.baseUrl;

import ReporteProductosVendidos from './components/ReporteProductosVendidos';
import ReporteTipoPago from './components/ReporteTipoPago';
import CierreVentas from './components/CierreVentas';
import CierreCajaPersonal from './components/CierreCajaPersonal';
import ReporteProductoMaestro from './components/ReporteProductoMaestro';
import ReporteCuentasPorCobrar from './components/ReporteCuentasPorCobrar';
import PagoCreditoPage from './pages/PagoCreditoPage';
import ReporteVentasPorHora from './components/ReporteVentasPorHora';

import { 
  Alert,
  AppBar, 
  Autocomplete,
  Box, 
  Button, 
  Card, 
  CardContent, 
  Checkbox, 
  CircularProgress, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle, 
  Divider, 
  FormControl, 
  FormControlLabel, 
  FormGroup, 
  FormLabel, 
  Grid, 
  IconButton, 
  InputAdornment, 
  InputLabel,
  LinearProgress, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  Menu, 
  MenuItem, 
  Paper, 
  Radio,
  RadioGroup,
  Select, 
  Snackbar, 
  TextField, 
  ThemeProvider, 
  ToggleButton, 
  ToggleButtonGroup, 
  Toolbar, 
  Typography, 
  createTheme, 
  styled 
} from '@mui/material';
import {
  Menu as MenuIcon,
  ShoppingCart,
  Person,
  Settings as SettingsIcon,
  Add,
  Remove,
  DeleteOutline,
  Login,
  Logout,
  AddCircleOutline,
  MoreVert,
  People as PeopleIcon,
  Close as CloseIcon,
  Keyboard as KeyboardIcon,
  AttachMoney as AttachMoneyIcon,
  Backup as BackupIcon,
  Category as CategoryIcon,
  Assessment as AssessmentIcon,
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  Payment as PaymentIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import UserManagement from './components/UserManagement';
import SalesReport from './components/SalesReport';

// Estilos globales para los botones
const GlobalButtonStyles = () => {
  const style = {
    'button:focus': {
      outline: 'none !important',
      boxShadow: 'none !important'
    },
    '.MuiButton-root:focus': {
      outline: 'none !important',
      boxShadow: 'none !important'
    }
  };
  
};

function App() {
  // Estado inicial
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [orderItems, setOrderItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [amountPaid, setAmountPaid] = useState('');
  const [change, setChange] = useState(0);
  const [showNumpad, setShowNumpad] = useState(false);
  const [numpadValue, setNumpadValue] = useState('');
  
  // State for customer information dialog (for credit payments)
  const [openCustomerDialog, setOpenCustomerDialog] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    telefono: ''
  });
  
  // Check for existing session on component mount
  useEffect(() => {
    const checkSession = () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        try {
          const userData = JSON.parse(user);
          console.log('Sesión existente encontrada. Usuario:', userData);
          console.log('Rol del usuario:', userData.role);
          
          const userIsAdmin = userData.role === 'admin';
          console.log('Estableciendo isAdmin a:', userIsAdmin);
          
          setAuthenticated(true);
          setIsAdmin(userIsAdmin);
          
          // Cargar categorías si es necesario
          if (categories.length === 0) {
            loadCategories();
          }
        } catch (error) {
          console.error('Error al analizar los datos del usuario:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    };
    
    checkSession();
  }, []);

  const handleNumpadInput = (value) => {
    if (value === 'C') {
      setNumpadValue('');
    } else if (value === '←') {
      setNumpadValue(prev => prev.slice(0, -1));
    } else if (value === '.') {
      if (!numpadValue.includes('.')) {
        setNumpadValue(prev => prev + value);
      }
    } else {
      setNumpadValue(prev => prev + value);
    }
  };

  const handleNumpadConfirm = () => {
    setAmountPaid(numpadValue);
    setChange(parseFloat(numpadValue || 0) - total);
    setShowNumpad(false);
  };
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [openLoginDialog, setOpenLoginDialog] = useState(false);
  const [openCuentasPorCobrar, setOpenCuentasPorCobrar] = useState(false);
  const [openAdminMenu, setOpenAdminMenu] = useState(null);
  const [openAddProductDialog, setOpenAddProductDialog] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: 'food'
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [openAddCategoryDialog, setOpenAddCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [openUserManagement, setOpenUserManagement] = useState(false);
  const [mainMenuAnchor, setMainMenuAnchor] = useState(null);
  const [reportsMenuAnchor, setReportsMenuAnchor] = useState(null);
  const [adminMenuAnchor, setAdminMenuAnchor] = useState(null);
  const [supportMenuAnchor, setSupportMenuAnchor] = useState(null);
  const [cierresMenuAnchor, setCierresMenuAnchor] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // Estado para los productos
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Load products when component mounts or when authentication state changes
  useEffect(() => {
    if (authenticated) {
      loadProducts();
    }
  }, [authenticated]);
  
  // Estado para el diálogo de cambio de precios
  const [openPriceChangeDialog, setOpenPriceChangeDialog] = useState(false);
  const [openIndividualPriceChangeDialog, setOpenIndividualPriceChangeDialog] = useState(false);
  const [priceChangePercentage, setPriceChangePercentage] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [applyToAll, setApplyToAll] = useState(true);
  
  // Estado para el diálogo de cambio de precio individual
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [productsList, setProductsList] = useState([]);
  const [openReporteTipoPago, setOpenReporteTipoPago] = useState(false);
  const [openCierreVentas, setOpenCierreVentas] = useState(false);
  const [dollarRate, setDollarRate] = useState(null);
  const [loadingDollarRate, setLoadingDollarRate] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Estados para los diálogos de administración
  const [openReporteVentasPorHora, setOpenReporteVentasPorHora] = useState(false);
  const [openCierreCaja, setOpenCierreCaja] = useState(false);
  
  // Estados para el ticket de impresión
  const [showTicket, setShowTicket] = useState(false);
  const [ticketInfo, setTicketInfo] = useState(null);
  const [pagoInfo, setPagoInfo] = useState(null);

  // Función para formatear montos de dinero (mantenida por compatibilidad)
  const formatCurrencyAmount = (amount) => {
    return formatCurrency(amount, { showSymbol: true, showCode: false });
  };

  // Función para obtener el tipo de cambio del dólar
  const fetchDollarRate = async () => {
    try {
      setLoadingDollarRate(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No hay token de autenticación disponible');
        return;
      }

      console.log('Solicitando tipo de cambio a:', `${API_BASE_URL}/exchange-rate`);
      const response = await fetch(`${API_BASE_URL}/exchange-rate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'same-origin' // Cambiado de 'include' a 'same-origin' para desarrollo local
      });
      
      console.log('Headers de la respuesta:', [...response.headers.entries()]);

      console.log('Respuesta del servidor (status):', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en la respuesta:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Error ${response.status}: ${response.statusText || 'Error al obtener el tipo de cambio'}`);
      }

      const data = await response.json();
      console.log('Datos recibidos:', data);
      
      if (data.success && data.data) {
        // Función para formatear montos de dinero
        const formatCurrency = (amount) => {
          return formatCurrencyAmount(amount);
        };

        // Usamos el campo 'promedio' de la respuesta
        const rate = data.data.promedio !== undefined ? data.data.promedio : data.data.rate;
        console.log('Tasa de cambio (promedio):', rate);
        setDollarRate(rate);
      } else {
        console.error('Respuesta exitosa pero sin datos válidos:', data);
        throw new Error(data.error || 'Formato de respuesta inesperado');
      }
    } catch (error) {
      console.error('Error al obtener el tipo de cambio:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      // No lanzamos el error aquí para evitar que se propague y rompa la aplicación
    } finally {
      setLoadingDollarRate(false);
    }
  };

  // Función para cargar productos
  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No hay token disponible para cargar productos');
        return [];
      }
      
      console.log('Cargando productos...');
      // Asegurarse de que la URL esté limpia sin dobles barras
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const productsUrl = `${baseUrl}${baseUrl.includes('/api') ? '' : '/api'}/products`;
      console.log('Fetching products from:', productsUrl);
      
      const response = await fetch(productsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en la respuesta de productos:', errorText);
        throw new Error(`Error al cargar productos: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Respuesta de la API de productos:', result);
      
      // Verificar el formato de la respuesta
      let productsArray = [];
      
      if (Array.isArray(result)) {
        productsArray = result;
      } else if (result && Array.isArray(result.data)) {
        productsArray = result.data;
      } else if (result && result.success && Array.isArray(result.products)) {
        productsArray = result.products;
      } else if (result && result.products && Array.isArray(result.products.data)) {
        productsArray = result.products.data;
      } else {
        console.error('Formato de respuesta de productos no reconocido:', result);
        throw new Error('Formato de respuesta de productos no reconocido');
      }
      
      setProducts(productsArray);
      return productsArray;
      
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setSnackbarMessage('Error al cargar los productos: ' + error.message);
      setOpenSnackbar(true);
      return [];
    } finally {
      setLoadingProducts(false);
    }
  };

  // Función para cargar categorías
  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No hay token disponible para cargar categorías');
        return [];
      }
      
      console.log('Cargando categorías...');
      // Ensure we have a clean URL without double slashes
      const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const categoriesUrl = `${baseUrl}${baseUrl.includes('/api') ? '' : '/api'}/categories`;
      console.log('Fetching categories from:', categoriesUrl);
      const response = await fetch(categoriesUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en la respuesta de categorías:', errorText);
        throw new Error(`Error al cargar categorías: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Respuesta de la API de categorías:', result);
      
      // Verificar el formato de la respuesta
      let categoriesArray = [];
      
      if (Array.isArray(result)) {
        categoriesArray = result;
      } else if (result && Array.isArray(result.data)) {
        categoriesArray = result.data;
      } else if (result && result.success && Array.isArray(result.data)) {
        categoriesArray = result.data;
      }
      
      console.log('Categorías extraídas:', categoriesArray);
      console.log('Primera categoría:', categoriesArray[0]); // Depuración
      console.log('Claves de la primera categoría:', categoriesArray[0] ? Object.keys(categoriesArray[0]) : 'No hay categorías');
      setCategories(categoriesArray);
      
      // Si hay categorías, establecer la primera como predeterminada en el formulario
      if (categoriesArray.length > 0 && (!newProduct.category || !categoriesArray.some(cat => cat.id === newProduct.category))) {
        setNewProduct(prev => ({
          ...prev,
          category: categoriesArray[0].id
        }));
      }
      
      return categoriesArray;
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      setSnackbarMessage('Error al cargar las categorías: ' + error.message);
      setOpenSnackbar(true);
      return [];
    }
  };

  // Efecto para obtener la tasa de cambio solo cuando el usuario inicia sesión
  useEffect(() => {
    const fetchRate = async () => {
      if (authenticated) {
        try {
          console.log('Usuario autenticado, obteniendo tasa de cambio...');
          await fetchDollarRate();
        } catch (error) {
          console.error('Error al obtener la tasa de cambio:', error);
        }
      } else {
        // Limpiar la tasa de cambio al cerrar sesión
        setDollarRate(null);
      }
    };

    // Obtener la tasa de cambio solo cuando el estado de autenticación cambia
    fetchRate();
  }, [authenticated]);

  const handleMainMenuOpen = (event) => {
    setMainMenuAnchor(event.currentTarget);
  };

  const handleMainMenuClose = () => {
    setMainMenuAnchor(null);
    setReportsMenuAnchor(null);
    setAdminMenuAnchor(null);
    setSupportMenuAnchor(null);
    setCierresMenuAnchor(null);
  };

  const handleReportsMenuOpen = (event) => {
    event.stopPropagation();
    setReportsMenuAnchor(event.currentTarget);
  };

  const handleAdminMenuOpen = (event) => {
    event.stopPropagation();
    setAdminMenuAnchor(event.currentTarget);
    setReportsMenuAnchor(null);
    setSupportMenuAnchor(null);
    setCierresMenuAnchor(null);
  };

  const handleSupportMenuOpen = (event) => {
    event.stopPropagation();
    setSupportMenuAnchor(event.currentTarget);
    setReportsMenuAnchor(null);
    setAdminMenuAnchor(null);
    setCierresMenuAnchor(null);
  };

  const handleCierresMenuOpen = (event) => {
    event.stopPropagation();
    setCierresMenuAnchor(event.currentTarget);
  };

  const handleCloseUserManagement = () => {
    setOpenUserManagement(false);
  };

  // Manejar la selección/deselección de categorías
  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // Manejar el cambio en la opción "Aplicar a todos"
  const handleApplyToAllChange = (e) => {
    setApplyToAll(e.target.checked);
    if (e.target.checked) {
      setSelectedCategories([]);
    }
  };

  // Manejar el cambio en el porcentaje de ajuste de precios
  const handlePriceChangePercentage = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= -100 && value <= 1000) {
      setPriceChangePercentage(value);
    }
  };

  // Aplicar el cambio de precios
  const applyPriceChanges = async () => {
    try {
      // Obtener el token y verificar que sea válido
      const token = localStorage.getItem('token');
      if (!token || token === 'undefined' || token === 'null') {
        setSnackbarMessage('Sesión expirada. Por favor, inicie sesión nuevamente.');
        setOpenSnackbar(true);
        // Redirigir al login
        navigate('/login');
        return;
      }

      // Asegurarse de que la URL esté bien formada
      const url = API_BASE_URL.endsWith('/') 
        ? `${API_BASE_URL}products/update-prices`
        : `${API_BASE_URL}/products/update-prices`;
      
      console.log('Enviando petición a:', url);
      console.log('Token:', token ? 'Token presente' : 'Token ausente');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          percentage: parseFloat(priceChangePercentage),
          categoryIds: applyToAll ? null : selectedCategories,
        }),
      });

      let errorData;
      try {
        errorData = await response.clone().json();
      } catch (e) {
        // Si no se puede parsear como JSON, usar el texto de la respuesta
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
      }

      if (!response.ok) {
        console.error('Error del servidor:', errorData);
        throw new Error(errorData.error || errorData.message || 'Error al actualizar los precios');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setSnackbarMessage(`Se actualizaron los precios de ${result.data.updatedCount} productos exitosamente`);
        setOpenSnackbar(true);
        setOpenPriceChangeDialog(false);
        
        // Recargar los productos para ver los cambios
        loadProducts();
      } else {
        throw new Error(result.error || 'Error desconocido al actualizar precios');
      }
      
    } catch (error) {
      console.error('Error al actualizar precios:', error);
      const errorMessage = error.response 
        ? `Error ${error.response.status}: ${error.statusText}`
        : error.message;
        
      setSnackbarMessage(`Error al actualizar precios: ${errorMessage}`);
      setOpenSnackbar(true);
      
      // Si el error es de autenticación, redirigir al login
      if (error.message.includes('401') || error.message.includes('403') || error.message.includes('token')) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  // Cerrar menús cuando cambia la ruta
  useEffect(() => {
    setMainMenuAnchor(null);
    setReportsMenuAnchor(null);
    setAdminMenuAnchor(null);
  }, [location.pathname]);

  // Navegar a la ruta del reporte
  const handleViewSalesReport = () => {
    handleMainMenuClose();
    navigate('/reportes/ventas');
  };

  // Funciones de manejo
  const handleLogin = async () => {
    try {
      console.log('Iniciando sesión...');
      console.log('URL de la API:', `${API_BASE_URL}/login`);
      
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('Respuesta del servidor:', response);
      
      // Verificar si la respuesta es JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('La respuesta no es JSON:', text);
        throw new Error('Respuesta del servidor no válida');
      }

      const data = await response.json();
      console.log('Datos de la respuesta:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Verificar que el token y el usuario estén presentes
      if (!data.token || !data.user) {
        console.error('Datos de autenticación faltantes:', data);
        throw new Error('Datos de autenticación incompletos');
      }

      // Debug: Log user role
      console.log('Rol del usuario:', data.user.role);
      console.log('¿Es administrador?:', data.user.role === 'admin');

      // Guardar el token y la información del usuario
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuthenticated(true);
      const userIsAdmin = data.user.role === 'admin';
      console.log('Estableciendo isAdmin a:', userIsAdmin);
      setIsAdmin(userIsAdmin);
      setOpenLoginDialog(false);
      setSnackbarMessage(`Sesión iniciada como ${data.user.username}`);
      setOpenSnackbar(true);
      setUsername('');
      setPassword('');
      navigate('/');
      
      // Cargar categorías inmediatamente después de iniciar sesión
      const loadCategories = async () => {
        try {
          console.log('Cargando categorías...');
          const token = localStorage.getItem('token');
          const categoriesResponse = await fetch(`${API_BASE_URL}/categories`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!categoriesResponse.ok) {
            throw new Error('Error al cargar categorías');
          }
          
          const categoriesData = await categoriesResponse.json();
          console.log('Categorías cargadas:', categoriesData);
          setCategories(categoriesData.data || categoriesData);
        } catch (error) {
          console.error('Error al cargar categorías:', error);
          setSnackbarMessage('Error al cargar las categorías');
          setOpenSnackbar(true);
        }
      };
      
      loadCategories();
    } catch (error) {
      console.error('Error en handleLogin:', error);
      setSnackbarMessage(error.message || 'Error al iniciar sesión');
      setOpenSnackbar(true);
    }
  };

  const handleLogout = () => {
    console.log('Cerrando sesión...');
    // Eliminar el token y la información del usuario
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Actualizar estados
    setAuthenticated(false);
    setIsAdmin(false);
    setOpenAdminMenu(null);
    setOpenLoginDialog(false);
    
    // Limpiar estados de la aplicación
    setProducts([]);
    setCategories([]);
    setOrderItems([]);
    setTotal(0);
    
    setSnackbarMessage('Sesión cerrada correctamente');
    setOpenSnackbar(true);
    
    console.log('Sesión cerrada, redirigiendo...');
    navigate('/');
  };

  const handleOpenAddCategoryDialog = () => {
    setOpenAddCategoryDialog(true);
    setNewCategoryName(''); // Limpiar el campo de texto
  };

  const handleCloseAddProductDialog = () => {
    setOpenAddProductDialog(false);
    setNewProduct({ name: '', price: '', category: categories[0]?.id || '' });
  };

  const handleAddProduct = async () => {
    if (newProduct.name && newProduct.price && newProduct.category) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No hay sesión activa');
        }

        // Ensure we have a clean URL without double /api
        const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        const productsUrl = `${baseUrl}${baseUrl.includes('/api') ? '' : '/api'}/products`;
        console.log('Enviando solicitud a:', productsUrl);

        const response = await fetch(productsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            nombre: newProduct.name.trim(),
            precio: parseFloat(newProduct.price),
            categoria_id: newProduct.category
          }),
        });

        // Check if the response is JSON
        const contentType = response.headers.get('content-type');
        let errorData;
        
        if (!response.ok) {
          try {
            errorData = contentType?.includes('application/json') 
              ? await response.json() 
              : await response.text();
          } catch (e) {
            const errorText = await response.text();
            console.error('Error al analizar la respuesta de error:', errorText);
            throw new Error(`Error al procesar la respuesta del servidor: ${errorText.substring(0, 100)}`);
          }
          throw new Error(errorData.error || errorData.message || `Error ${response.status}: ${response.statusText}`);
        }

        // Try to parse the successful response
        try {
          const responseData = contentType?.includes('application/json')
            ? await response.json()
            : await response.text();
            
          console.log('Respuesta del servidor:', responseData);
          
          // Handle different response formats
          const addedProduct = responseData.data || responseData;
          
          if (addedProduct && (addedProduct.id || addedProduct.id_producto)) {
            // Add the new product to the list
            setProducts(prevProducts => [...prevProducts, addedProduct]);
            // Close the dialog and show success message
            setOpenAddProductDialog(false);
            setNewProduct({ name: '', price: '', category: categories[0]?.id || '' });
            setSnackbarMessage('Producto agregado correctamente');
            setOpenSnackbar(true);
            handleCloseAddProductDialog();
          } else {
            console.error('Formato de respuesta inesperado:', responseData);
            throw new Error('El servidor no devolvió un producto válido');
          }
        } catch (error) {
          console.error('Error al procesar la respuesta:', error);
          throw new Error('Error al procesar la respuesta del servidor');
        }
      } catch (error) {
        console.error('Error al agregar el producto:', error);
        setSnackbarMessage(error.message || 'Error al agregar el producto');
        setOpenSnackbar(true);
      }
    } else {
      setSnackbarMessage('Por favor completa todos los campos');
      setOpenSnackbar(true);
    }
  };

  const handleCloseAddCategoryDialog = () => {
    setOpenAddCategoryDialog(false);
    setNewCategoryName('');
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim() !== '') {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No hay sesión activa');
        }

        const response = await fetch(`${API_BASE_URL}/categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            nombre: newCategoryName.trim()
          })
        });

        // Verificar si la respuesta es JSON
        const contentType = response.headers.get('content-type');
        let responseData;
        
        try {
          responseData = contentType?.includes('application/json') 
            ? await response.json() 
            : await response.text();
        } catch (error) {
          console.error('Error al analizar la respuesta:', error);
          throw new Error('Error al procesar la respuesta del servidor');
        }

        if (!response.ok) {
          console.error('Error en la respuesta del servidor:', responseData);
          throw new Error(responseData.error || responseData.message || 'Error al agregar la categoría');
        }

        // Si la respuesta es exitosa, actualizar la lista de categorías
        const addedCategory = responseData.data || responseData;
        setCategories(prevCategories => [...prevCategories, addedCategory]);
        setSnackbarMessage('Categoría agregada correctamente');
        setOpenSnackbar(true);
        handleCloseAddCategoryDialog();
      } catch (error) {
        console.error('Error al agregar la categoría:', error);
        setSnackbarMessage(error.message || 'Error al agregar la categoría');
        setOpenSnackbar(true);
      }
    } else {
      setSnackbarMessage('El nombre de la categoría no puede estar vacío');
      setOpenSnackbar(true);
    }
  };

  // Efectos
  useEffect(() => {
    const newTotal = orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    setTotal(newTotal);
  }, [orderItems]);

  // Verificar autenticación al cargar la aplicación
  useEffect(() => {
    console.log('Verificando autenticación al cargar la aplicación...');
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('Token encontrado:', !!token);
    console.log('Datos de usuario encontrados:', !!user);
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        console.log('Datos del usuario:', userData);
        console.log('Rol del usuario:', userData.role);
        setAuthenticated(true);
        const esAdmin = userData.role === 'admin';
        console.log('¿Es administrador?:', esAdmin);
        setIsAdmin(esAdmin);
      } catch (error) {
        console.error('Error al analizar los datos del usuario:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else {
      console.log('No se encontró token o datos de usuario');
    }
  }, []);

  // Estado para el indicador de carga
  const [loading, setLoading] = useState(false);

  // Cargar productos desde la API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setAuthenticated(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/products`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 401) {
          localStorage.removeItem('token');
          setAuthenticated(false);
          setSnackbarMessage('La sesión ha expirado. Por favor, vuelve a iniciar sesión.');
          setOpenSnackbar(true);
          return;
        }

        if (!response.ok) {
          throw new Error('Error al cargar los productos');
        }

        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setProducts(result.data);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Error al cargar productos:', error);
        setSnackbarMessage(error.message || 'Error al cargar los productos');
        setOpenSnackbar(true);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    // Cargar categorías
    const loadCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setAuthenticated(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 401) {
          localStorage.removeItem('token');
          setAuthenticated(false);
          setSnackbarMessage('La sesión ha expirado. Por favor, vuelve a iniciar sesión.');
          setOpenSnackbar(true);
          return;
        }


        if (!response.ok) {
          throw new Error('Error al cargar las categorías');
        }

        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          // Asegurarse de que cada categoría tenga un ID único
          const uniqueCategories = Array.from(
            new Map(result.data.map(cat => [cat.id, cat])).values()
          );
          setCategories(uniqueCategories);
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        setSnackbarMessage(error.message || 'Error al cargar las categorías');
        setOpenSnackbar(true);
        setCategories([]);
      }
    };

    if (authenticated) {
      fetchProducts();
      loadCategories();
    }
  }, [authenticated]);

  // Filtrar productos por categoría seleccionada
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => 
        product.categoria_id && product.categoria_id.toString() === selectedCategory
      );
  
  // Asegurar que los productos tengan la estructura correcta con nombres de categoría
  const normalizedProducts = filteredProducts.map(product => {
    // Encontrar la categoría correspondiente
    const category = categories.find(cat => cat.id === product.categoria_id);
    const categoryName = category ? category.nombre : 'Sin categoría';
    
    return {
      id: product.id,
      nombre: product.nombre || 'Producto sin nombre',
      descripcion: product.descripcion || '',
      precio: parseFloat(product.precio) || 0,
      categoria_id: product.categoria_id,
      categoria: categoryName,
      stock: parseInt(product.stock) || 0
    };
  });

  const handleAddToOrder = (product) => {
    const existingItem = orderItems.find(item => item.id === product.id);
    const price = parseFloat(product.precio) || 0;
    const productName = product.nombre || 'Producto sin nombre';
    
    if (existingItem) {
      const updatedItems = orderItems.map(item =>
        item.id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * price
            }
          : item
      );
      setOrderItems(updatedItems);
    } else {
      setOrderItems([
        ...orderItems,
        {
          id: product.id,
          name: productName,
          nombre: productName,
          price: price,
          precio: price,
          categoria: product.categoria || product.categoria_nombre || 'Sin categoría',
          quantity: 1,
          subtotal: price
        }
      ]);
      
      // Calcular el nuevo total
      const newTotal = orderItems.reduce(
        (sum, item) => sum + (item.quantity * item.price),
        price
      );
      setTotal(newTotal);
    }
    
    // Mostrar notificación
    setSnackbarMessage(`${productName} agregado al pedido`);
    setOpenSnackbar(true);
  };

  const handleRemoveFromOrder = (productId) => {
    setOrderItems(orderItems.map(item =>
      item.id === productId
        ? { ...item, quantity: item.quantity - 1, subtotal: (item.quantity - 1) * item.price }
        : item
    ).filter(item => item.quantity > 0));
  };

  const handleDeleteItem = (productId) => {
    setOrderItems(orderItems.filter(item => item.id !== productId));
  };

  const handleOpenPaymentDialog = () => {
    setOpenPaymentDialog(true);
  };

  const handleClosePaymentDialog = () => {
    setOpenPaymentDialog(false);
    setPaymentMethod('efectivo');
    setAmountPaid('');
    setNumpadValue('');
    setChange(0);
    setShowNumpad(false);
    // Clear customer info when closing payment dialog
    setCustomerInfo({
      nombre: '',
      apellido: '',
      cedula: '',
      telefono: ''
    });
  };

  const handleClosePriceChangeDialog = () => {
    setOpenPriceChangeDialog(false);
    setPriceChangePercentage(0);
    setSelectedCategories([]);
    setApplyToAll(true);
  };

  const handleOpenCuentasPorCobrar = () => {
    setOpenCuentasPorCobrar(true);
    handleMainMenuClose();
  };

  const handleCloseCuentasPorCobrar = () => {
    setOpenCuentasPorCobrar(false);
  };

  // Función para abrir el diálogo de cierre de caja
  const handleOpenCierreCaja = () => {
    setOpenCierreCaja(true);
    handleMainMenuClose();
  };

  // Función para abrir el diálogo de cambio de precio individual
  const handleOpenIndividualPriceChange = async () => {
    try {
      setLoadingProducts(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`${API_BASE_URL}/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar los productos');
      }

      const data = await response.json();
      setProductsList(Array.isArray(data) ? data : (data.data || []));
      setOpenIndividualPriceChangeDialog(true);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      setSnackbarMessage(error.message || 'Error al cargar los productos');
      setOpenSnackbar(true);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Función para manejar el cambio de precio individual
  const handleUpdateProductPrice = async () => {
    if (!selectedProduct || !newPrice || isNaN(parseFloat(newPrice))) {
      setSnackbarMessage('Por favor selecciona un producto e ingresa un precio válido');
      setOpenSnackbar(true);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay sesión activa');
      }

      const productId = selectedProduct.id || selectedProduct.id_producto;
      const url = `${API_BASE_URL}/products/${productId}`; // Usando la ruta correcta del backend
      console.log('URL de la solicitud:', url);
      
      const response = await fetch(url, {
        method: 'PUT', // Cambiado a PUT que es lo que el backend espera
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          precio: parseFloat(newPrice)
        })
      });

      // Verificar el tipo de contenido de la respuesta
      const contentType = response.headers.get('content-type');
      let responseData;
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        console.error('Respuesta no es JSON:', text);
        throw new Error('El servidor devolvió una respuesta inesperada');
      }

      if (!response.ok) {
        console.error('Error en la respuesta:', responseData);
        throw new Error(responseData.error || 'Error al actualizar el precio');
      }

      // Actualizar la lista de productos
      const updatedProducts = products.map(p => 
        (p.id === productId || p.id_producto === productId) 
          ? { ...p, precio: parseFloat(newPrice) } 
          : p
      );
      setProducts(updatedProducts);
      
      setSnackbarMessage('Precio actualizado correctamente');
      setOpenSnackbar(true);
      setOpenIndividualPriceChangeDialog(false);
      setSelectedProduct(null);
      setNewPrice('');
    } catch (error) {
      console.error('Error al actualizar el precio:', error);
      setSnackbarMessage(`Error al actualizar el precio: ${error.message}`);
      setOpenSnackbar(true);
    }
  };

  // Función para cerrar el diálogo de cambio de precio individual
  const handleCloseIndividualPriceChange = () => {
    setOpenIndividualPriceChangeDialog(false);
    setSelectedProduct(null);
    setNewPrice('');
  };

  const handleOpenReporteTipoPago = () => {
    setOpenReporteTipoPago(true);
    handleMainMenuClose();
  };

  const handleOpenCierreVentas = () => {
    setOpenCierreVentas(true);
    handleMainMenuClose();
  };

  const handlePaymentMethodChange = (event) => {
    const method = event.target.value;
    setPaymentMethod(method);
    
    if (method === 'credito') {
      // Show customer information dialog when credit is selected
      setOpenCustomerDialog(true);
    } else {
      // Clear customer info if switching from credit to another method
      setCustomerInfo({
        nombre: '',
        apellido: '',
        cedula: '',
        telefono: ''
      });
    }
  };
  
  const handleCustomerInfoChange = (field) => (event) => {
    setCustomerInfo({
      ...customerInfo,
      [field]: event.target.value
    });
  };
  
  const handleCloseCustomerDialog = () => {
    // If user cancels, reset payment method to default (efectivo)
    setOpenCustomerDialog(false);
    setPaymentMethod('efectivo');
  };
  
  const saveCreditCustomer = async (ventaId) => {
    try {
      console.log('💾 [Frontend] Guardando cliente a crédito...');
      const token = localStorage.getItem('token');
      const diasCredito = import.meta.env.VITE_DIAS_CREDITO || 30; // Valor por defecto 30 días
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + parseInt(diasCredito));
      
      const clienteData = {
        nombre: customerInfo.nombre.trim(),
        apellido: customerInfo.apellido.trim(),
        id_cliente: customerInfo.cedula.trim(), // Cambiado de 'cedula' a 'id_cliente' para coincidir con la base de datos
        telefono: customerInfo.telefono ? customerInfo.telefono.trim() : null,
        monto: total,
        estado: 'pendiente',
        fecha_limite: fechaLimite.toISOString().split('T')[0],
        venta_id: ventaId // Incluir el ID de la venta
      };

      console.log('📤 [Frontend] Enviando datos del cliente a crédito:', JSON.stringify(clienteData, null, 2));

      const response = await fetch(`${API_BASE_URL}/clientes-credito`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(clienteData)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('❌ [Frontend] Error en la respuesta del servidor:', responseData);
        throw new Error(responseData.error || 'Error al guardar la información del cliente a crédito');
      }
      
      console.log('✅ [Frontend] Cliente a crédito guardado exitosamente:', responseData);
      return responseData;
      
    } catch (error) {
      console.error('❌ [Frontend] Error al guardar cliente a crédito:', error);
      // Mostrar mensaje de error al usuario
      setSnackbarMessage(`Error al guardar cliente a crédito: ${error.message}`);
      setOpenSnackbar(true);
      throw error; // Relanzar el error para que pueda ser manejado por el llamador
    }
  };

  const handleSaveCustomerInfo = () => {
    // Basic validation
    if (!customerInfo.nombre || !customerInfo.apellido || !customerInfo.cedula) {
      setSnackbarMessage('Por favor complete los campos obligatorios (Nombre, Apellido y Cédula)');
      setOpenSnackbar(true);
      return;
    }
    setOpenCustomerDialog(false);
  };

  const handleAmountPaidClick = () => {
    setNumpadValue(amountPaid);
    setShowNumpad(true);
  };

  // Validar información del cliente para crédito
  const validateCreditCustomer = () => {
    if (!customerInfo.nombre || !customerInfo.apellido || !customerInfo.cedula) {
      setSnackbarMessage('Información del cliente incompleta. Por favor complete los datos del cliente.');
      setOpenSnackbar(true);
      setOpenCustomerDialog(true);
      return false;
    }
    return true;
  };

  // Confirmar venta a crédito
  const confirmCreditSale = () => {
    return window.confirm(
      `¿Registrar venta a crédito a nombre de ${customerInfo.nombre} ${customerInfo.apellido}?`
    );
  };

  // Limpiar el estado después de una venta exitosa
  const resetSaleState = () => {
    setOrderItems([]);
    setTotal(0);
    setPaymentMethod('efectivo');
    setAmountPaid('');
    setChange(0);
    setCustomerInfo({
      nombre: '',
      apellido: '',
      cedula: '',
      telefono: ''
    });
    setOpenPaymentDialog(false);
  };

  // Registrar una venta en el servidor
  const registerSale = async (saleData) => {
    console.log('🔄 [registerSale] Iniciando registro de venta...');
    console.log('📤 [registerSale] Datos de la venta:', JSON.stringify(saleData, null, 2));
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      const response = await fetch(`${API_BASE_URL}/ventas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(saleData)
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('❌ [registerSale] Error en la respuesta del servidor:', responseData);
        throw new Error(
          responseData.error || 
          responseData.message || 
          `Error al registrar la venta (${response.status} ${response.statusText})`
        );
      }
      
      console.log('✅ [registerSale] Venta registrada exitosamente:', responseData);
      return {
        success: true,
        venta: responseData.data || responseData,
        message: responseData.message || 'Venta registrada exitosamente'
      };
      
    } catch (error) {
      console.error('❌ [registerSale] Error al registrar la venta:', error);
      return {
        success: false,
        error: error.message || 'Error de red o servidor',
        message: error.message || 'Error al registrar la venta'
      };
    }
  };

  const handleProcessPayment = async () => {
    // Validación de pago en efectivo
    if (paymentMethod === 'efectivo' && parseFloat(amountPaid) < total) {
      setSnackbarMessage('El monto pagado es insuficiente.');
      setOpenSnackbar(true);
      return;
    }
    
    // Validaciones específicas para crédito
    if (paymentMethod === 'credito' && !validateCreditCustomer()) {
      return;
    }
    
    // Confirmación de venta a crédito
    if (paymentMethod === 'credito' && !confirmCreditSale()) {
      return;
    }
    
    // Obtener el usuario activo
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.id) {
      setSnackbarMessage('No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.');
      setOpenSnackbar(true);
      return;
    }

    // Construir el objeto de venta
    const ventaData = {
      total: total,
      metodo_pago: paymentMethod,
      ...(paymentMethod === 'credito' && {
        cliente: {
          nombre: customerInfo.nombre,
          apellido: customerInfo.apellido,
          cedula: customerInfo.cedula,
          telefono: customerInfo.telefono || null
        }
      }),
      usuario_id: user.id,
      detalles: orderItems.map(item => ({
        producto_id: item.id,
        cantidad: item.quantity,
        precio_unitario: item.precio || item.price,
        subtotal: item.subtotal
      }))
    };

    try {
      console.log('🔄 [Venta] Registrando venta...');
      const ventaResult = await registerSale(ventaData);
      
      if (!ventaResult.success) {
        throw new Error(ventaResult.error || 'Error al registrar la venta');
      }
      
      console.log('✅ [Venta] Venta registrada exitosamente:', ventaResult);
      
      // Si es una venta a crédito, registrar el cliente a crédito
      if (paymentMethod === 'credito' && ventaResult.venta?.id) {
        try {
          console.log('🔄 [Crédito] Registrando cliente a crédito...');
          await saveCreditCustomer(ventaResult.venta.id);
          console.log('✅ [Crédito] Cliente a crédito registrado exitosamente');
        } catch (creditError) {
          console.error('⚠️ [Crédito] Error al registrar cliente a crédito:', creditError);
          // No detenemos el flujo por este error, solo informamos
          setSnackbarMessage(
            'Venta registrada, pero hubo un error al guardar la información de crédito. ' +
            'Por favor, registre manualmente el crédito del cliente.'
          );
          setOpenSnackbar(true);
        }
      }
      
      // Preparar información para el ticket
      const ticketData = {
        items: orderItems.map(item => ({
          nombre: item.nombre || item.name,
          cantidad: item.quantity,
          precio: item.precio || item.price,
          subtotal: item.subtotal
        })),
        total: total,
        fecha: new Date().toISOString(),
        numeroFactura: ventaResult.venta?.id || `TEMP-${Date.now()}`,
        metodoPago: paymentMethod,
        ...(paymentMethod === 'credito' && {
          cliente: {
            nombre: customerInfo.nombre,
            apellido: customerInfo.apellido,
            cedula: customerInfo.cedula,
            telefono: customerInfo.telefono || ''
          }
        })
      };
      
      // Guardar información para el ticket
      setTicketInfo(ticketData);
      setPagoInfo({
        monto: amountPaid,
        metodo_pago: paymentMethod,
        cambio: change,
        fecha: new Date().toISOString(),
        venta_id: ventaResult.venta?.id || `TEMP-${Date.now()}`
      });
      
      // Guardar la venta actual en localStorage para referencia
      if (ventaResult.venta?.id) {
        localStorage.setItem('ventaActual', JSON.stringify({
          id: ventaResult.venta.id,
          fecha: new Date().toISOString()
        }));
      }
      
      // Mostrar el diálogo de impresión del ticket
      setShowTicket(true);
      
      // Limpiar el estado después de una venta exitosa
      resetSaleState();
      setSnackbarMessage('Venta registrada correctamente');
      setOpenSnackbar(true);
      
    } catch (error) {
      console.error('❌ [Venta] Error al procesar la venta:', error);
      setSnackbarMessage(
        `Error al procesar la venta: ${error.message || 'Error de red o servidor'}`
      );
      setOpenSnackbar(true);
    }
  };


  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <Box sx={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: '#f5f5f5',
      position: 'relative'
    }}>
      {/* Footer with version and company info */}
      {authenticated && (
        <Box 
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'background.paper',
            borderTop: '1px solid #e0e0e0',
            py: 1,
            px: 2,
            zIndex: 1100,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '32px',
            boxShadow: '0 -1px 4px rgba(0,0,0,0.1)'
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {import.meta.env.VITE_APP_TITLE} v{import.meta.env.VITE_APP_VERSION} ({import.meta.env.VITE_APP_RELEASE_DATE})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {import.meta.env.VITE_DEVELOPER_COMPANY} • 
            <a 
              href={import.meta.env.VITE_DEVELOPER_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: 'inherit',
                textDecoration: 'none',
                marginLeft: '4px',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              {import.meta.env.VITE_DEVELOPER_URL.replace(/^https?:\/\//, '')}
            </a>
          </Typography>
        </Box>
      )}
      {/* Barra de navegación superior */}
      <AppBar position="static" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Box>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              aria-controls="main-menu"
              aria-haspopup="true"
              onClick={handleMainMenuOpen}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="main-menu"
              anchorEl={mainMenuAnchor}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(mainMenuAnchor)}
              onClose={handleMainMenuClose}
            >

              <MenuItem onClick={handleReportsMenuOpen} sx={{ py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                  <Typography variant="body1" fontWeight="medium"> Reportes</Typography>
                  <span style={{ marginLeft: '8px' }}>▶</span>
                </Box>
              </MenuItem>
              <MenuItem onClick={handleAdminMenuOpen} sx={{ py: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                  <Typography variant="body1" fontWeight="medium"> Administración</Typography>
                  <span style={{ marginLeft: '8px' }}>▶</span>
                </Box>
              </MenuItem>
              {(() => {
                try {
                  const user = JSON.parse(localStorage.getItem('user') || '{}');
                  if (user?.role === 'soporte') {
                    return (
                      <MenuItem onClick={handleSupportMenuOpen} sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                          <Typography variant="body1" fontWeight="medium">Support</Typography>
                          <span style={{ marginLeft: '8px' }}>▶</span>
                        </Box>
                      </MenuItem>
                    );
                  }
                  return null;
                } catch (e) {
                  console.error('Error al analizar los datos del usuario:', e);
                  return null;
                }
              })()}
              {/* Menú desplegable de Reportes */}
              <Menu
                id="reports-menu"
                anchorEl={reportsMenuAnchor}
                open={Boolean(reportsMenuAnchor)}
                onClose={handleMainMenuClose}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                sx={{
                  '& .MuiPaper-root': {
                    ml: 1,
                    boxShadow: 3,
                    minWidth: '250px',
                    '& .MuiMenuItem-root': {
                      py: 1.5,
                    }
                  },
                }}
              >
                <MenuItem onClick={() => {
                  navigate('/reportes/ventas');
                  handleMainMenuClose();
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <AssessmentIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                    <Typography variant="body1" sx={{ minWidth: '24px', fontWeight: 'bold' }}>1.</Typography>
                    <Typography variant="body1">Reporte de Ventas</Typography>
                  </Box>
                </MenuItem>
                <MenuItem onClick={() => {
                  navigate('/reportes/productos-vendidos');
                  handleMainMenuClose();
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <ShoppingCartIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                    <Typography variant="body1" sx={{ minWidth: '24px', fontWeight: 'bold' }}>2.</Typography>
                    <Typography variant="body1">Reporte de Productos Vendidos</Typography>
                  </Box>
                </MenuItem>
                <MenuItem onClick={() => {
                  navigate('/reportes/productos-maestro');
                  handleMainMenuClose();
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <InventoryIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                    <Typography variant="body1" sx={{ minWidth: '24px', fontWeight: 'bold' }}>3.</Typography>
                    <Typography variant="body1">Reporte Maestro de Productos</Typography>
                  </Box>
                </MenuItem>
                <MenuItem onClick={handleOpenReporteTipoPago}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <PaymentIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
                    <Typography variant="body1" sx={{ minWidth: '24px', fontWeight: 'bold' }}>4.</Typography>
                    <Typography variant="body1">Reporte por Tipo de Pago</Typography>
                  </Box>
                </MenuItem>
                <MenuItem onClick={handleOpenCuentasPorCobrar}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <MonetizationOnOutlinedIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                    <Typography variant="body1" sx={{ minWidth: '24px', fontWeight: 'bold' }}>5.</Typography>
                    <Typography variant="body1">Cuentas por Cobrar</Typography>
                  </Box>
                </MenuItem>
                <MenuItem onClick={() => {
                  navigate('/pago-credito');
                  handleMainMenuClose();
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <PaymentIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
                    <Typography variant="body1" sx={{ minWidth: '24px', fontWeight: 'bold' }}>6.</Typography>
                    <Typography variant="body1">Pagos de Crédito</Typography>
                  </Box>
                </MenuItem>
                <MenuItem onClick={() => {
                  setOpenReporteVentasPorHora(true);
                  handleMainMenuClose();
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <AccessTimeIcon sx={{ color: '#2196f3', fontSize: 20 }} />
                    <Typography variant="body1" sx={{ minWidth: '24px', fontWeight: 'bold' }}>7.</Typography>
                    <Typography variant="body1">Ventas por Hora</Typography>
                  </Box>
                </MenuItem>
              </Menu>
              {/* Menú desplegable de Administración */}
              <Menu
                id="admin-menu"
                anchorEl={adminMenuAnchor}
                open={Boolean(adminMenuAnchor)}
                onClose={handleMainMenuClose}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                sx={{
                  '& .MuiPaper-root': {
                    ml: 1,
                    boxShadow: 3,
                  },
                }}
              >
                <MenuItem onClick={() => {
                  handleMainMenuClose();
                  setOpenPriceChangeDialog(true);
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <AttachMoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography>Cambio Masivo de Precios</Typography>
                  </Box>
                </MenuItem>
                <MenuItem onClick={() => {
                  handleMainMenuClose();
                  handleOpenIndividualPriceChange();
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <AttachMoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography>Cambio de Precio Individual</Typography>
                  </Box>
                </MenuItem>

                
                {/* Submenú de Cierres */}
                <MenuItem onClick={handleCierresMenuOpen}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AssignmentTurnedInIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography>Cierres</Typography>
                    </Box>
                    <span style={{ marginLeft: '8px' }}>▶</span>
                  </Box>
                </MenuItem>
                
                {/* Menú desplegable de Cierres */}
                <Menu
                  id="cierres-menu"
                  anchorEl={cierresMenuAnchor}
                  open={Boolean(cierresMenuAnchor)}
                  onClose={handleMainMenuClose}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  sx={{
                    '& .MuiPaper-root': {
                      ml: 1,
                      boxShadow: 3,
                      minWidth: '250px',
                      '& .MuiMenuItem-root': {
                        py: 1.5,
                      }
                    },
                  }}
                >
                  <MenuItem onClick={handleOpenCierreCaja}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ minWidth: '24px', fontWeight: 'bold' }}>1.</Typography>
                      <Typography variant="body1"> Cierre de Caja</Typography>
                    </Box>
                  </MenuItem>

                  <MenuItem onClick={() => {
                    handleMainMenuClose();
                    handleOpenCierreVentas();
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ minWidth: '24px', fontWeight: 'bold' }}>2.</Typography>
                      <Typography variant="body1"> Cierre del Día</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem onClick={() => {
                    handleMainMenuClose();
                    // Aquí iría la función para manejar el cierre del mes
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ minWidth: '24px', fontWeight: 'bold' }}>3.</Typography>
                      <Typography variant="body1"> Cierre del Mes</Typography>
                    </Box>
                  </MenuItem>
                </Menu>
              </Menu>

              {/* Menú desplegable de Support */}
              <Menu
                id="support-menu"
                anchorEl={supportMenuAnchor}
                open={Boolean(supportMenuAnchor)}
                onClose={handleMainMenuClose}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                sx={{
                  '& .MuiPaper-root': {
                    ml: 1,
                    boxShadow: 3,
                    minWidth: '250px',
                    '& .MuiMenuItem-root': {
                      py: 1.5,
                    }
                  },
                }}
              >
                {(() => {
                  try {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    const userRole = user?.role;
                    
                    if (userRole === 'admin' || userRole === 'soporte') {
                      return [
                        <MenuItem key="users" onClick={() => {
                          handleMainMenuClose();
                          setOpenUserManagement(true);
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography>Usuarios y Permisos</Typography>
                          </Box>
                        </MenuItem>,
                        <MenuItem key="settings" onClick={handleMainMenuClose}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography>Configuración General</Typography>
                          </Box>
                        </MenuItem>,
                        <MenuItem key="backup" onClick={handleMainMenuClose}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <BackupIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography>Respaldar Base de Datos</Typography>
                          </Box>
                        </MenuItem>
                      ];
                    }
                    return null;
                  } catch (e) {
                    console.error('Error al analizar los datos del usuario:', e);
                    return null;
                  }
                })()}
              </Menu>
            </Menu>
          </Box>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {appConfig.companyName} - {appConfig.appTitle}
          </Typography>
          
          {/* Indicador de tipo de cambio */}
          {authenticated && import.meta.env.VITE_SHOW_EXCHANGE_RATE === 'true' && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mr: 2,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              {loadingDollarRate ? (
                <CircularProgress size={20} color="inherit" />
              ) : dollarRate ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AttachMoneyIcon fontSize="small" sx={{ fontSize: '1rem' }} />
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {dollarRate.toFixed(2)}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  Sin tasa
                </Typography>
              )}
            </Box>
          )}
          
          <IconButton color="inherit" onClick={() => setOpenPaymentDialog(true)}>
            <ShoppingCart />
          </IconButton>
          <Box>
            <IconButton 
              color="inherit" 
              onClick={(e) => {
                if (authenticated) {
                  setOpenAdminMenu(e.currentTarget);
                } else {
                  setOpenLoginDialog(true);
                }
              }}
            >
              {authenticated ? <Person color="secondary" /> : <Login />}
            </IconButton>
            <Menu
              anchorEl={openAdminMenu}
              open={Boolean(openAdminMenu)}
              onClose={() => setOpenAdminMenu(null)}
            >
              {console.log('Renderizando menú de administración. isAdmin:', isAdmin, 'authenticated:', authenticated)}
              {(() => {
                try {
                  const user = JSON.parse(localStorage.getItem('user') || '{}');
                  const userRole = user?.role;
                  
                  if (userRole === 'admin' || userRole === 'soporte') {
                    return (
                      <>
                        <MenuItem onClick={() => {
                          console.log('Clic en Agregar Producto');
                          setOpenAddProductDialog(true);
                          setOpenAdminMenu(null);
                        }}>
                          <AddCircleOutline sx={{ mr: 1 }} /> Agregar Producto
                        </MenuItem>
                        <MenuItem onClick={() => {
                          console.log('Clic en Agregar Categoría');
                          handleOpenAddCategoryDialog();
                          setOpenAdminMenu(null);
                        }}>
                          <AddCircleOutline sx={{ mr: 1 }} /> Agregar Categoría
                        </MenuItem>
                        <MenuItem onClick={() => {
                          console.log('Clic en Gestión de Usuarios');
                          setOpenUserManagement(true);
                          setOpenAdminMenu(null);
                        }}>
                          <PeopleIcon sx={{ mr: 1 }} /> Gestión de Usuarios
                        </MenuItem>
                      </>
                    );
                  }
                  return null;
                } catch (e) {
                  console.error('Error al analizar los datos del usuario:', e);
                  return null;
                }
              })()}
              {!isAdmin && (
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">
                    {authenticated ? 'No tienes permisos de administrador' : 'No autenticado'}
                  </Typography>
                </MenuItem>
              )}
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1 }} /> Cerrar Sesión
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content with Routes */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <Routes>
          {/* Sales Report Route */}
          <Route path="/reportes/ventas" element={<SalesReport />} />
          
          {/* Products Report Route */}
          <Route path="/reportes/productos-vendidos" element={<ReporteProductosVendidos />} />
          
          {/* Product Master Report Route */}
          <Route path="/reportes/productos-maestro" element={<ReporteProductoMaestro />} />
          
          {/* Credit Payment Route */}
          <Route path="/pago-credito" element={<PagoCreditoPage />} />
          
          {/* Main App Route */}
          <Route 
            path="/" 
            element={
              <Box sx={{ display: 'flex', width: '100%', height: '100%' }}>
                {/* Order Panel */}
                <Box
                  sx={{
                    width: '300px',
                    flexShrink: 0,
                    display: { xs: 'none', md: 'flex' },
                    flexDirection: 'column',
                    borderRight: '1px solid #e0e0e0',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {/* Panel Header */}
                  <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                    <Typography variant="h6">Orden Actual</Typography>
                  </Box>

                  {/* Order Items List */}
                  <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    {orderItems.length === 0 ? (
                      <Typography color="textSecondary" align="center" sx={{ mt: 2 }}>
                        No hay productos en la orden
                      </Typography>
                    ) : (
                      orderItems.map((item) => (
                        <Paper
                          key={item.id}
                          sx={{
                            p: 1,
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'background.paper',
                            '&:hover': {
                              backgroundColor: 'action.hover'
                            }
                          }}
                        >
                          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                            <Typography 
                              variant="subtitle2" 
                              sx={{ 
                                fontSize: '0.8rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '150px'
                              }}
                            >
                              {item.name}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ fontSize: '0.7rem' }}
                            >
                              {formatCurrency(item.price)} x {item.quantity}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromOrder(item.id);
                              }}
                              sx={{ 
                                color: 'primary.main',
                                p: 0.5,
                                '& .MuiSvgIcon-root': {
                                  fontSize: '0.9rem'
                                }
                              }}
                            >
                              <Remove />
                            </IconButton>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'text.primary',
                                minWidth: '20px',
                                textAlign: 'center',
                                fontSize: '0.8rem'
                              }}
                            >
                              {item.quantity}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToOrder(item);
                              }}
                              sx={{ 
                                color: 'primary.main',
                                p: 0.5,
                                '& .MuiSvgIcon-root': {
                                  fontSize: '0.9rem'
                                }
                              }}
                            >
                              <Add />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}
                              sx={{ 
                                color: 'error.main',
                                p: 0.5,
                                ml: 0.5,
                                '& .MuiSvgIcon-root': {
                                  fontSize: '0.9rem'
                                },
                                '&:hover': {
                                  color: 'error.dark',
                                  backgroundColor: 'rgba(244, 67, 54, 0.08)'
                                }
                              }}
                            >
                              <DeleteOutline />
                            </IconButton>
                          </Box>
                        </Paper>
                      ))
                    )}
                  </Box>
                  
                  {/* Order Total */}
                  <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: '#f5f5f5' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1">Total:</Typography>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {formatCurrencyAmount(total)}
                      </Typography>
                    </Box>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={handleOpenPaymentDialog}
                      disabled={orderItems.length === 0}
                      sx={{ 
                        mb: 1,
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        '&:hover': {
                          boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                        }
                      }}
                    >
                      Cobrar ({formatCurrencyAmount(total)})
                    </Button>
                    {import.meta.env.VITE_SHOW_REFERENCE_TOTAL === 'true' && dollarRate && orderItems.length > 0 && (
                      <Box 
                        sx={{
                          backgroundColor: 'rgba(0, 0, 0, 0.05)',
                          borderRadius: 1,
                          p: 1,
                          textAlign: 'center',
                          mb: 1,
                          border: '1px solid rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <Typography 
                          variant="caption" 
                          sx={{
                            fontWeight: 'medium',
                            color: 'text.primary',
                            fontSize: '0.8rem',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          <span>Referencia:</span>
                          <span style={{ fontWeight: 'bold', color: '#1976d2' }}>
                            ${(total / dollarRate).toFixed(2)} USD
                          </span>
                          <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>
                            (Tasa: {dollarRate} Bs/$)
                          </span>
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                
                {/* Main Content */}
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Categories Filter */}
                  <Paper sx={{ p: 2, borderRadius: 0, boxShadow: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                      <Button
                        key="all"
                        variant={selectedCategory === 'all' ? 'contained' : 'outlined'}
                        onClick={() => setSelectedCategory('all')}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        Todas
                      </Button>
                      {categories.map((category) => {
                        // Asegurarse de que category y category.id existan
                        const categoryId = category?.id?.toString() || '';
                        return (
                          <Button
                            key={categoryId}
                            variant={selectedCategory === categoryId ? 'contained' : 'outlined'}
                            onClick={() => setSelectedCategory(categoryId)}
                            sx={{ whiteSpace: 'nowrap' }}
                          >
                            {category.nombre || 'Sin nombre'}
                          </Button>
                        );
                      })}
                    </Box>
                  </Paper>
                  
                  {/* Products Grid */}
                  <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    <Grid container spacing={2}>
                      {normalizedProducts.map((product) => (
                        <Grid 
                          item 
                          xs={6} 
                          sm={4} 
                          md={3} 
                          lg={2} 
                          key={product.id}
                          sx={{
                            display: 'flex',
                            width: '120px',
                            height: '120px',
                            '& > .MuiPaper-root': {
                              width: '120px',
                              height: '120px',
                              minWidth: '120px',
                              minHeight: '120px',
                              flexShrink: 0,
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              p: 1.5,
                              '&:hover': {
                                transform: 'scale(1.05)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }
                            }
                          }}
                        >
                          <Paper
                            elevation={0}
                            sx={{
                              p: 0.5,
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              cursor: 'pointer',
                              position: 'relative',
                              overflow: 'hidden',
                              boxSizing: 'border-box',
                              borderRadius: '4px',
                              border: '1px solid #e0e0e0',
                              background: '#ffffff',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                borderColor: 'primary.main',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }
                            }}
                            onClick={() => handleAddToOrder(product)}
                          >
                            <Box sx={{ 
                              display: 'flex',
                              flexDirection: 'column',
                              height: '100%',
                              width: '100%',
                              justifyContent: 'space-between',
                              '& > *': {
                                width: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }
                            }}>
                              <Box sx={{ 
                                height: '60px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <Typography 
                                  variant="subtitle1" 
                                  noWrap 
                                  sx={{ 
                                    fontWeight: 500,
                                    fontSize: '0.9rem',
                                    mb: 0.5,
                                    color: 'text.primary',
                                    lineHeight: '1.2',
                                    height: '1.2em',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {product.nombre}
                                </Typography>
                                {product.categoria && (
                                  <Typography 
                                    variant="caption"
                                    sx={{
                                      textTransform: 'uppercase',
                                      fontSize: '0.65rem',
                                      color: 'text.secondary',
                                      mb: 0.5,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      textAlign: 'center',
                                      backgroundColor: 'action.hover',
                                      px: 0.8,
                                      py: 0.3,
                                      borderRadius: '4px',
                                      display: 'inline-block',
                                      width: 'fit-content',
                                      mx: 'auto'
                                    }}
                                  >
                                    {product.categoria}
                                  </Typography>
                                )}
                                <Typography 
                                  variant="subtitle2" 
                                  sx={{ 
                                    fontWeight: 500,
                                    lineHeight: 1.1,
                                    fontSize: '0.8rem',
                                    color: 'text.secondary',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    width: '100%',
                                    textAlign: 'center',
                                    mb: 0.5
                                  }}
                                >
                                  {product.descripcion || ''}
                                </Typography>
                              </Box>
                              <Box sx={{ 
                                textAlign: 'right',
                                mt: 'auto',
                                pt: 1,
                                borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                                flexShrink: 0
                              }}>
                                <Typography 
                                  variant="h6" 
                                  sx={{ 
                                    fontWeight: 600,
                                    color: 'primary.main',
                                    lineHeight: 1.2,
                                    fontSize: '1rem',
                                    textAlign: 'center',
                                    mt: 'auto',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    width: '100%',
                                    pt: 1
                                  }}
                                >
                                  {formatCurrencyAmount(product.precio)}
                                </Typography>
                              </Box>
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Box>
              </Box>
            }
          />
        </Routes>
      </Box>

      {/* Reporte Tipo Pago Dialog */}
      <ReporteTipoPago 
        open={openReporteTipoPago} 
        onClose={() => setOpenReporteTipoPago(false)} 
      />
      
      <CierreVentas
        open={openCierreVentas}
        onClose={() => setOpenCierreVentas(false)}
      />

      {/* Diálogo de Cierre de Caja Personal */}
      <CierreCajaPersonal
        open={openCierreCaja}
        onClose={() => setOpenCierreCaja(false)}
      />

      {/* Customer Information Dialog for Credit Payments */}
      <Dialog open={openCustomerDialog} onClose={handleCloseCustomerDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Información del Cliente (Crédito)</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Nombre *"
              fullWidth
              value={customerInfo.nombre}
              onChange={handleCustomerInfoChange('nombre')}
            />
            <TextField
              margin="dense"
              label="Apellido *"
              fullWidth
              value={customerInfo.apellido}
              onChange={handleCustomerInfoChange('apellido')}
            />
            <TextField
              margin="dense"
              label="Cédula *"
              fullWidth
              value={customerInfo.cedula}
              onChange={handleCustomerInfoChange('cedula')}
            />
            <TextField
              margin="dense"
              label="Teléfono"
              fullWidth
              value={customerInfo.telefono}
              onChange={handleCustomerInfoChange('telefono')}
            />

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCustomerDialog} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleSaveCustomerInfo} color="primary" variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Procesar Pago</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
              <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'medium' }}>Método de Pago</FormLabel>
              <RadioGroup
                row
                value={paymentMethod}
                onChange={handlePaymentMethodChange}
                sx={{ gap: 2, flexWrap: 'wrap' }}
              >
                <FormControlLabel 
                  value="efectivo" 
                  control={<Radio />} 
                  label="Efectivo" 
                  sx={{ mr: 2 }}
                />
                <FormControlLabel 
                  value="tdd" 
                  control={<Radio />} 
                  label="TDD" 
                  sx={{ mr: 2 }}
                />
                <FormControlLabel 
                  value="tdc" 
                  control={<Radio />} 
                  label="TDC" 
                  sx={{ mr: 2 }}
                />
                <FormControlLabel 
                  value="transferencia" 
                  control={<Radio />} 
                  label="Transferencia" 
                  sx={{ mr: 2 }}
                />
                <FormControlLabel 
                  value="divisa" 
                  control={<Radio />} 
                  label="Divisa" 
                  sx={{ mr: 2 }}
                />
                <FormControlLabel 
                  value="pago_movil" 
                  control={<Radio />} 
                  label="Pago Móvil" 
                  sx={{ mr: 2 }}
                />
                <FormControlLabel 
                  value="credito" 
                  control={<Radio />} 
                  label="Crédito" 
                  sx={{ 
                    color: 'warning.main',
                    '&.Mui-checked': {
                      color: 'warning.main',
                    },
                  }}
                />
              </RadioGroup>
            </FormControl>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Total a Pagar:</Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                {formatCurrencyAmount(total)}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Monto Recibido"
                type="text"
                value={amountPaid}
                onClick={handleAmountPaidClick}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleAmountPaidClick} edge="end">
                        <KeyboardIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              {/* Botones de montos predeterminados */}
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1,
                mb: 2,
                justifyContent: 'space-between'
              }}>
                {[5, 10, 20, 50, 100].map((monto) => (
                  <Button
                    key={monto}
                    variant="contained"
                    onClick={() => {
                      setAmountPaid(monto.toString());
                      setChange(monto - total);
                    }}
                    sx={{
                      flex: '1 1 calc(20% - 8px)',
                      minWidth: '60px',
                      padding: '8px 4px',
                      fontSize: '0.875rem',
                      backgroundColor: '#4caf50',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#388e3c',
                      },
                      '&:active': {
                        backgroundColor: '#2e7d32',
                      },
                    }}
                  >
                    {formatCurrencyAmount(monto).replace('VES', '').trim()}
                  </Button>
                ))}
              </Box>
              {/* Sección de cambio eliminada para evitar duplicación */}
              {paymentMethod === 'credito' && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="warning.contrastText" sx={{ mb: 1 }}>
                    <strong>Nota:</strong> Esta venta se registrará como crédito. Se generará una cuenta por cobrar.
                  </Typography>
                  <Box sx={{ mt: 1, p: 1.5, bgcolor: 'rgba(0, 0, 0, 0.08)', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.primary" sx={{ fontWeight: 'bold' }}>
                      Datos del Cliente:
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      <strong>Nombre:</strong> {customerInfo.nombre} {customerInfo.apellido}
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      <strong>Cédula:</strong> {customerInfo.cedula}
                    </Typography>
                    {customerInfo.telefono && (
                      <Typography variant="body2" color="text.primary">
                        <strong>Teléfono:</strong> {customerInfo.telefono}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, minHeight: '24px' }}>
                <Typography variant="subtitle1" color="primary">
                  Cambio: {formatCurrencyAmount(change)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Numpad */}
          <Dialog open={showNumpad} onClose={() => setShowNumpad(false)}>
            <DialogContent>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: 1,
                maxWidth: '300px',
                mx: 'auto',
                textAlign: 'center'
              }}>
                <Box sx={{ 
                  gridColumn: '1 / -1', 
                  p: 2, 
                  mb: 2, 
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  textAlign: 'right',
                  fontSize: '1.5rem',
                  minHeight: '2em'
                }}>
                  {numpadValue || '0'}
                </Box>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'C'].map((num) => (
                  <Button
                    key={num}
                    variant="outlined"
                    onClick={() => handleNumpadInput(num.toString())}
                    sx={{ 
                      fontSize: '1.2rem',
                      py: 2,
                      minWidth: '60px',
                      height: '60px'
                    }}
                  >
                    {num}
                  </Button>
                ))}
                <Button
                  variant="outlined"
                  onClick={() => handleNumpadInput('←')}
                  sx={{ 
                    fontSize: '1.2rem',
                    py: 2,
                    height: '60px'
                  }}
                >
                  ←
                </Button>
              </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleNumpadConfirm}
                fullWidth
                size="large"
                disabled={!numpadValue}
              >
                Aceptar
              </Button>
            </DialogActions>
          </Dialog>
        </DialogContent>
        <DialogActions sx={{ p: 2, flexDirection: 'column', alignItems: 'stretch' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}>
            <Button 
              onClick={handleClosePaymentDialog}
              sx={{ mr: 1, flex: 1 }}
            >
              Cancelar
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleProcessPayment}
              disabled={!amountPaid && paymentMethod !== 'credito' || (paymentMethod === 'efectivo' && parseFloat(amountPaid) < total)}
              size="large"
              sx={{ flex: 1 }}
            >
              Confirmar Pago
            </Button>
          </Box>
          {import.meta.env.VITE_SHOW_REFERENCE_TOTAL === 'true' && dollarRate > 0 && (
            <Box sx={{ 
              mt: 1, 
              p: 1, 
              bgcolor: 'action.hover', 
              borderRadius: 1,
              textAlign: 'center'
            }}>
              <Typography variant="body2" color="text.secondary">
                Referencia: ${(total / dollarRate).toFixed(2)} USD (Tasa: {dollarRate} Bs/$)
              </Typography>
            </Box>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={openSnackbar} 
        autoHideDuration={3000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* User Management Dialog */}
      <Dialog 
        open={openUserManagement} 
        onClose={() => setOpenUserManagement(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 24,
            position: 'relative',
            '& .MuiDialogTitle-root': {
              padding: '16px 24px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
            }
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="h6" component="div">
            Gestión de Usuarios
          </Typography>
          <IconButton
            edge="end"
            onClick={() => setOpenUserManagement(false)}
            aria-label="close"
            sx={{
              color: 'text.primary',
              '&:hover': {
                backgroundColor: 'action.hover',
                color: 'text.primary'
              },
              '& .MuiSvgIcon-root': {
                fontSize: '1.5rem'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <UserManagement />
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={openAddProductDialog} onClose={handleCloseAddProductDialog}>
        <DialogTitle>Agregar Nuevo Producto</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, mb: 1, minWidth: '300px' }}>
            <TextField
              fullWidth
              label="Nombre del Producto"
              value={newProduct.name}
              onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Precio"
              type="number"
              value={newProduct.price}
              onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={newProduct.category}
                label="Categoría"
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
              >
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.nombre || category.name || 'Sin nombre'}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No hay categorías disponibles</MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddProductDialog}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleAddProduct}
            disabled={!newProduct.name || !newProduct.price || !newProduct.category}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={openAddCategoryDialog} onClose={handleCloseAddCategoryDialog}>
        <DialogTitle>Agregar Nueva Categoría</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, mb: 1, minWidth: '300px' }}>
            <TextField
              fullWidth
              label="Nombre de la Categoría"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddCategoryDialog}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleAddCategory}
            disabled={!newCategoryName.trim()}
          >
            Agregar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Login Dialog */}
      <Dialog open={openLoginDialog} onClose={() => setOpenLoginDialog(false)}>
        <DialogTitle>Iniciar Sesión</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, mb: 1, minWidth: '300px' }}>
            <TextField
              fullWidth
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <Box sx={{ 
              mt: 4, 
              pt: 2, 
              borderTop: '1px solid #e0e0e0',
              textAlign: 'center',
              color: 'text.secondary',
              fontSize: '0.75rem'
            }}>
              <Typography variant="caption" display="block">
                {import.meta.env.VITE_APP_TITLE} v{import.meta.env.VITE_APP_VERSION}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                © {new Date().getFullYear()} {import.meta.env.VITE_DEVELOPER_COMPANY}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLoginDialog(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleLogin}
            disabled={!username || !password}
          >
            Ingresar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Cambio de Precios */}
      <Dialog 
        open={openPriceChangeDialog} 
        onClose={() => setOpenPriceChangeDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Cambio de Precios
            <IconButton 
              edge="end" 
              onClick={() => setOpenPriceChangeDialog(false)}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Porcentaje de Ajuste"
              type="number"
              value={priceChangePercentage}
              onChange={handlePriceChangePercentage}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
                inputProps: { 
                  min: -100, 
                  max: 1000,
                  step: 0.01
                }
              }}
              helperText="Use valores positivos para aumentar y negativos para disminuir"
              sx={{ mb: 3 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={applyToAll}
                  onChange={handleApplyToAllChange}
                  color="primary"
                />
              }
              label="Aplicar a todos los productos"
              sx={{ mb: 2, display: 'block' }}
            />

            {!applyToAll && (
              <Box sx={{ maxHeight: 300, overflow: 'auto', mb: 2, border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'medium' }}>
                  Seleccionar categorías específicas:
                </Typography>
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <FormControlLabel
                      key={category.id}
                      control={
                        <Checkbox
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => handleCategoryToggle(category.id)}
                          color="primary"
                        />
                      }
                      label={category.nombre || category.name || 'Sin nombre'}
                      sx={{ display: 'block', ml: 1 }}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No hay categorías disponibles
                  </Typography>
                )}
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                onClick={() => setOpenPriceChangeDialog(false)}
                color="secondary"
              >
                Cancelar
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={applyPriceChanges}
                disabled={!priceChangePercentage || (!applyToAll && selectedCategories.length === 0)}
              >
                Aplicar Cambios
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Cambio de Precio Individual */}
      <Dialog 
        open={openIndividualPriceChangeDialog} 
        onClose={handleCloseIndividualPriceChange}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cambiar Precio Individual</DialogTitle>
        <DialogContent>
          {loadingProducts ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Autocomplete
                options={productsList}
                getOptionLabel={(option) => 
                  `${option.nombre || option.nombre_producto} - $${option.precio || option.precio_venta}`
                }
                value={selectedProduct}
                onChange={(event, newValue) => {
                  setSelectedProduct(newValue);
                  setNewPrice(newValue ? (newValue.precio || newValue.precio_venta || '') : '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Seleccionar Producto"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                  />
                )}
              />
              <TextField
                label="Nuevo Precio"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                fullWidth
                margin="normal"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  step: '0.01'
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseIndividualPriceChange}
            color="secondary"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdateProductPrice}
            color="primary"
            variant="contained"
            disabled={!selectedProduct || !newPrice}
          >
            Actualizar Precio
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de Reporte de Cuentas por Cobrar */}
      <ReporteCuentasPorCobrar 
        open={openCuentasPorCobrar} 
        onClose={handleCloseCuentasPorCobrar} 
      />
      
      {/* Diálogo de Reporte de Ventas por Hora */}
      <ReporteVentasPorHora 
        open={openReporteVentasPorHora} 
        onClose={() => setOpenReporteVentasPorHora(false)} 
      />
      
      {/* Diálogo de Impresión de Ticket */}
      {ticketInfo && pagoInfo && (
        <TicketImpresion
          open={showTicket}
          onClose={() => setShowTicket(false)}
          clienteInfo={ticketInfo.cliente}
          pagoInfo={pagoInfo}
          ticketInfo={ticketInfo}
        />
      )}
    </Box>
  );
}

export default App;
