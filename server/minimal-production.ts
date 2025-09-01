// Minimal production server - ZERO Vite dependencies
import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { testConnection } from "./db";

const app = express();

// Export for serverless deployment
export default app;

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit", 
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

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

async function registerRoutes(app: Express): Promise<Server> {
  // Test database connection first
  console.log('Testing database connection...');
  const dbConnected = await testConnection();
  if (!dbConnected) {
    throw new Error('Database connection failed');
  }
  
  // Basic API routes for production
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', environment: 'production' });
  });
  
  app.get('/api/questions/:lang', async (req, res) => {
    try {
      const lang = req.params.lang || 'hu';
      const questions = await storage.getQuestions(lang);
      res.json(questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  });
  
  app.get('/api/admin/templates', async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });
  
  return createServer(app);
}

(async () => {
  try {
    console.log('Starting production server...');
    const server = await registerRoutes(app);
    console.log('Routes registered successfully');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error('Express error:', err);
      res.status(status).json({ message });
    });

    console.log('Serving static files in production mode...');
    serveStatic(app);

    // For serverless deployment, don't start the server
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      console.log('Running in serverless environment');
      return;
    }

    const PORT = Number(process.env.PORT) || 5000;
    server.listen({
      PORT,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start production server:', error);
    process.exit(1);
  }
})();
