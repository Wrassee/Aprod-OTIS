// Production entry point - no Vite dependencies
import express, { type Express } from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function createProductionServer() {
  const app = express();
  
  // CORS and JSON parsing
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Serve static files in production
  app.use(express.static(join(__dirname, '../dist/public')));

  // Import and register routes
  const { registerRoutes } = await import('./routes.js');
  await registerRoutes(app);

  // Catch-all handler for SPA
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/public/index.html'));
  });

  return app;
}

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 5000;
  const app = await createProductionServer();
  
  app.listen(port, () => {
    console.log(`Production server running on port ${port}`);
  });
}