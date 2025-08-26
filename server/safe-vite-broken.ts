// Safe Vite wrapper - NO direct Vite imports to prevent bundling issues
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

export async function setupVite(app: Express, server: Server) {
  // Only setup Vite in development environment
  if (process.env.NODE_ENV !== "development") {
    console.log('Skipping Vite setup in production mode');
    return;
  }

  // Environment check to prevent production bundling
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    console.log('Production environment detected, skipping Vite setup');
    return;
  }

  try {
    // Remove direct Vite imports and use dynamic imports with environment checks
    const vite = await import("vite").catch((error) => {
      console.log('Vite not available, skipping setup:', error.message);
      return null;
    });
    
    if (!vite) {
      console.log('Vite module not found, falling back to static serving');
      return;
    }
    
    const { nanoid } = await import("nanoid").catch(() => ({ nanoid: () => 'dev' }));
    const viteConfig = await import("../vite.config").then(m => m.default).catch(() => ({}));
    
    // Use conditional dynamic imports for Vite dependencies
    const viteLogger = vite.createLogger();

    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    };

    const viteServer = await vite.createServer({
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
        const clientTemplate = path.resolve(
          process.cwd(),
          "client",
          "index.html",
        );

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
  } catch (error) {
    // Add error handling and close the try-catch block in setupVite function
    console.error('Failed to setup Vite in development:', error);
    console.log('Falling back to static file serving');
    // Don't throw error, allow fallback to static serving
  }
}
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}