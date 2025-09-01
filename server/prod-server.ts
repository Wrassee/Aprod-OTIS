import app from './app.js';
import { createServer } from 'http';

const PORT = Number(process.env.PORT) || 5000;

const server = createServer(app);

(async () => {
  const { registerRoutes } = await import('./routes.js'); // .js kell
  await registerRoutes(app);

  server.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
})();
