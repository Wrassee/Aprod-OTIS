import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Ezek a te beállításaid, valószínűleg jók, ha a mappaszerkezeted megfelelő.
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },

  // ✨ EZ A HIÁNYZÓ RÉSZ ✨
  // A server blokk felel a helyi fejlesztői szerver működéséért.
  server: {
    proxy: {
      // Minden olyan kérés, ami a '/api' útvonallal kezdődik...
      '/api': {
        // ...továbbítódik erre a célcímre.
        target: 'https://aprod-otis-5gsy.onrender.com/', // ❗️ CSERÉLD KI A RENDEREN FUTÓ ALKALMAZÁSOD URL-JÉRE!
        
        // Ez a beállítás szükséges ahhoz, hogy a cél szerver elfogadja a kérést.
        changeOrigin: true,
      }
    }
  }
});