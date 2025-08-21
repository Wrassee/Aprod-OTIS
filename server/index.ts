import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
// Use conditional imports to prevent bundling issues
import { serveStatic, log } from "./production-wrapper";

const app = express();

// Export for Vercel
export default app;
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('Starting server initialization...');
    const server = await registerRoutes(app);
    console.log('Routes registered successfully');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error('Express error:', err);
      res.status(status).json({ message });
    });

    // Setup development or production serving
    if (process.env.NODE_ENV === "development") {
      console.log('Setting up Vite in development mode...');
      // Add environment check in server startup to prevent Vite setup in production
      try {
        // Use completely safe Vite wrapper that prevents all bundling issues
        const { setupVite } = await import("./production-wrapper");
        await setupVite(app, server);
        console.log('Vite setup completed successfully');
      } catch (error: any) {
        console.log('Vite setup failed, falling back to static serving:', error.message);
        console.log('This is normal in production-like environments');
        serveStatic(app);
      }
    } else {
      console.log('Serving static files in production mode...');
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
