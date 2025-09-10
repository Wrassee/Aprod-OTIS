// server/app.ts

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { serveStatic } from "./static-server.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// A te egyedi logoló middleware-ed (változatlan)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      console.log(logLine);
    }
  });

  next();
});

// Útvonalak és statikus fájlok beállítása
(async () => {
  try {
    console.log('Initializing API routes...');
    await registerRoutes(app);
    console.log('API routes registered successfully');
    
    // --- JAVASOLT RÉSZ AZ EREDETI KÓDBÓL ---
    // Statikus front-end fájlok kiszolgálása try...catch blokkban
    try {
      serveStatic(app);
      console.log('Static file serving initialized');
    } catch (staticError) {
      console.log('Static files not available (development mode?):', (staticError as Error).message);
    }
    // --- JAVASOLT RÉSZ VÉGE ---

    // Hibakezelő (változatlan)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error('Express error:', err);
      res.status(status).json({ message });
    });
  } catch (error) {
    console.error('Failed to initialize routes:', error);
  }
})();

export default app;