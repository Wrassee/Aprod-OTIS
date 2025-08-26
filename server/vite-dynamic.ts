// Remove direct Vite imports from server/vite.ts and use dynamic imports to prevent bundling issues
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

// Update setupVite function to use dynamic imports with error handling
export async function setupVite(app: Express, server: Server) {
  // Add environment check to prevent Vite setup in production
  if (process.env.NODE_ENV === "production") {
    console.log('Production environment - skipping Vite setup');
    return;
  }

  if (process.env.NODE_ENV !== "development") {
    console.log('Non-development environment - skipping Vite setup');
    return;
  }

  try {
    // Dynamic imports only - never direct imports to prevent bundling
    console.log('Loading Vite dynamically...');
    
    const [viteModule, nanoidModule, viteConfigModule] = await Promise.all([
      import("vite").catch(() => null),
      import("nanoid").catch(() => ({ nanoid: () => 'dev' })),
      import("../vite.config").then(m => m.default).catch(() => ({}))
    ]);

    if (!viteModule) {
      console.log('Vite not available - continuing without it');
      return;
    }

    const { createServer, createLogger } = viteModule;
    const { nanoid } = nanoidModule;
    
    if (!createServer || !createLogger) {
      console.log('Vite functions not available - skipping setup');
      return;
    }

    const viteLogger = createLogger();
    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    };

    const viteServer = await createServer({
      ...viteConfigModule,
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
    // Add catch block to setupVite function for graceful fallback
    console.error('Vite setup failed:', error);
    console.log('Continuing without Vite - static serving will be used');
    // Don't throw - allow graceful fallback
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  if (!fs.existsSync(distPath)) {
    console.warn(`Build directory not found: ${distPath}, make sure to build the client first`);
    return;
  }
  
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}