import app from './app.js';
import { createServer } from 'http';

const port: number = Number(process.env.PORT) || 10000; // mindig number

const server = createServer(app);

(async () => {
  const { registerRoutes } = await import('./routes.js'); // .js kell
  await registerRoutes(app);

  server.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
  });
})();
