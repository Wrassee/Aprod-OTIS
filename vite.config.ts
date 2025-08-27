import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// A Replit specifikus dolgokat itt hagyhatod, ha szükségesek a Replit környezetben
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  // Nincs 'root' beállítás, így a projekt gyökerét használja alapértelmezettként
  // Nincs 'build.outDir' beállítás, így az alapértelmezett 'dist' mappát használja
  
  base: '/', // Ez a legbiztosabb beállítás a Vercelhez és a routinghoz
  publicDir: 'public',

  plugins: [
    react(),
    runtimeErrorOverlay(), // Ezt a sort törölheted, ha már nem Repliten fejlesztesz
    ...(process.env.NODE_ENV !== "production" &&
    process.env.RE_PL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer()
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      // JAVÍTVA: Az aliasok az új, gyökérben lévő mappákra mutatnak
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
    },
  },
});