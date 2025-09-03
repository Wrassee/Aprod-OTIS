import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  // MEGHATÁROZZA, HOL VAN A FRONTEND KÓD (KRITIKUS FONTOSSÁGÚ)
  root: "client",
  
  plugins: [react()],

  resolve: {
    alias: {
      // A '@' alias most már helyesen a 'client/src' mappára fog mutatni
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'https://aprod-otis-5gsy.onrender.com', // A te Render URL-ed
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    // MEGHATÁROZZA, HOVA KERÜLJÖN A KÉSZ WEBOLDAL (FONTOS A DEPLOYHOZ)
    outDir: path.resolve(__dirname, "dist"),
    // A 'dist' mappa tartalmát minden build előtt törli a tisztaság érdekében
    emptyOutDir: true, 
  }
});

