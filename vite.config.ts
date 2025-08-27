import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // MEGHATÁROZZUK A PROJEKT GYÖKERÉT: a 'client' mappa
  root: 'client',
  
  // A Vercel számára a kimenetet a fő 'dist' mappába tesszük
  build: {
    outDir: '../dist'
  },

  plugins: [react()],
  resolve: {
    alias: {
      // Az aliasoknak is a 'client/src'-re kell mutatniuk
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});