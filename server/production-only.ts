// PRODUCTION-ONLY server - ZERO Vite dependencies
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { testConnection } from "./db";

const app = express();
const PORT = process.env.PORT || 5000;

// JSON middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";
  console.error('Express error:', err);
  res.status(status).json({ message });
});

// Static file serving for production
function serveStatic() {
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

// Routes setup
async function setupRoutes() {
  try {
    // Test database
    console.log('Testing database connection...');
    await testConnection();
    console.log('Database connection successful');

    // API Routes
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Protocol routes
    app.get('/api/protocols', async (req, res) => {
      try {
        const protocols = await storage.getAllProtocols();
        res.json(protocols);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/protocols', async (req, res) => {
      try {
        const protocol = await storage.createProtocol(req.body);
        res.json(protocol);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/protocols/:id', async (req, res) => {
      try {
        const protocol = await storage.getProtocol(req.params.id);
        if (!protocol) {
          return res.status(404).json({ error: 'Protocol not found' });
        }
        res.json(protocol);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.put('/api/protocols/:id', async (req, res) => {
      try {
        const protocol = await storage.updateProtocol(req.params.id, req.body);
        res.json(protocol);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.delete('/api/protocols/:id', async (req, res) => {
      try {
        await storage.updateProtocol(req.params.id, { completed: false });
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    console.log('Routes registered successfully');
  } catch (error) {
    console.error('Failed to setup routes:', error);
    throw error;
  }
}

// Server initialization
async function startServer() {
  try {
    console.log('Starting production server...');
    
    await setupRoutes();
    serveStatic();
    
    const server = createServer(app);
    
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Production server running on port ${PORT}`);
    });
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start if running directly  
if (process.argv[1] && process.argv[1].endsWith('production-only.ts')) {
  startServer();
}

// Export for serverless
export default app;
export { startServer };