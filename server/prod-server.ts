// --- EZ A RÉSZ KERÜL A FÁJL ELEJÉRE ---
import dotenv from 'dotenv';

// A Render a /etc/secrets/ mappába teszi a titkos fájlokat
const secretFilePath = '/etc/secrets/aprod-otis-secrets';
dotenv.config({ path: secretFilePath });
// --- EDDIG TART AZ ÚJ RÉSZ ---


import app from './app.js';
import { createServer } from 'http';

// A PORT változót már a betöltött .env fájlból fogja olvasni
const PORT = Number(process.env.PORT) || 10000; // Renderen a 10000-es portot használják

const server = createServer(app);

(async () => {
  const { registerRoutes } = await import('./routes.js');
  await registerRoutes(app);

  server.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
})();