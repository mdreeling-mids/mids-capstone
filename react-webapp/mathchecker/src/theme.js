// theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#007bff", // Academic blue
    },
    secondary: {
      main: "#6c757d", // Neutral gray
    },
    background: {
      default: "#f9fafb",
    },
  },
  typography: {
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    h1: { fontWeight: 700 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 500 },
    body1: { fontSize: "1rem" },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        },
      },
    },
  },
});

export default theme;
