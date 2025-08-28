import app from './app.js';
import { createServer } from 'http';

const port = process.env.PORT || 10000; // Render a PORT változót használja
const server = createServer(app);

(async () => {
  // A registerRoutes aszinkron, ezért itt is így hívjuk meg
  const { registerRoutes } = await import('./routes.js');
  await registerRoutes(app);

  server.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
  });
})();
