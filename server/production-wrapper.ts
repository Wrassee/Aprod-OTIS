// Create a production-safe wrapper that completely avoids Vite imports when not in development
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Replace direct Vite imports with conditional dynamic imports to prevent bundling issues
export async function setupVite(app: Express, server: Server) {
  // Add environment check in server startup to prevent Vite setup in production
  if (process.env.NODE_ENV === "production") {
    console.log('Production environment detected - completely skipping Vite');
    return;
  }

  // Only attempt Vite setup in explicit development mode
  if (process.env.NODE_ENV !== "development") {
    console.log('Not in development mode - skipping Vite setup');
    return;
  }

  try {
    console.log('Attempting conditional Vite import...');
    
    // Use dynamic imports that will only execute in development
    const viteImport = await import("vite").catch((err) => {
      console.log('Vite import failed (expected in production):', err.message);
      return null;
    });

    if (!viteImport) {
      console.log('Vite not available - continuing without it');
      return;
    }

    // Extract functions safely
    const { createServer, createLogger } = viteImport;
    if (!createServer || !createLogger) {
      console.log('Vite functions not available');
      return;
    }

    // Get other dependencies
    const { nanoid } = await import("nanoid").catch(() => ({ nanoid: () => 'dev' }));
    const viteConfig = await import("../vite.config").then(m => m.default).catch(() => ({}));
    
    const viteLogger = createLogger();
    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    };

    const viteServer = await createServer({
      ...viteConfig,
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg: any, options: any) => {
          viteLogger.error(msg, options);
          process.exit(1);
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    app.use(viteServer.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const clientTemplate = path.resolve(process.cwd(), "client", "index.html");
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`,
        );
        const page = await viteServer.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        viteServer.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
    
    console.log('Vite setup completed successfully');
  } catch (error) {
    console.log('Vite setup failed, continuing without it:', error);
    // Never throw - always allow graceful continuation
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  if (!fs.existsSync(distPath)) {
    console.warn(`Build directory not found: ${distPath}`);
    return;
  }
  
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}