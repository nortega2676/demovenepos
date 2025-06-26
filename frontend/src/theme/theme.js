import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32', // Verde oscuro
      light: '#81c784', // Verde claro
      dark: '#1b5e20', // Verde más oscuro
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#a5d6a7', // Verde claro más suave
      light: '#e8f5e9', // Verde muy claro
      dark: '#81c784', // Verde claro
      contrastText: '#000000',
    },
    background: {
      default: '#e8f5e9', // Fondo verde muy claro
      paper: '#ffffff', // Fondo de tarjetas
    },
    text: {
      primary: '#2e7d32', // Texto verde oscuro
      secondary: '#1b5e20', // Texto verde más oscuro
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#2e7d32',
          color: '#ffffff',
          '& .MuiTypography-root, & .MuiButton-text, & .MuiIconButton-root': {
            color: '#ffffff',
          },
          '& .MuiButton-outlined': {
            color: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              borderColor: '#ffffff',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          },
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          '& .MuiTypography-h6': {
            color: '#ffffff',
            fontWeight: 500,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#ffffff',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      color: '#2e7d32',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      color: '#2e7d32',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      color: '#2e7d32',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      color: '#2e7d32',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      color: '#2e7d32',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      color: '#2e7d32',
    },
  },
});

export default theme;
