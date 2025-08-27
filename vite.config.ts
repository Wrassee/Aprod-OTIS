import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
      // Az "@assets" aliast kivettem, ha nincs rá szükséged,
      // de ha van "attached_assets" mappád a gyökérben, visszateheted:
      // "@assets": path.resolve(__dirname, "./attached_assets"),
    },
  },
});