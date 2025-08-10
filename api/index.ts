// Vercel Serverless API Handler
import express from 'express';
import { registerRoutes } from '../server/routes';

const app = express();

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize routes without Vite for serverless
async function initializeApp() {
  try {
    await registerRoutes(app);
    console.log('Vercel serverless functions initialized');
  } catch (error) {
    console.error('Failed to initialize routes:', error);
  }
}

// Initialize the app
initializeApp();

export default app;