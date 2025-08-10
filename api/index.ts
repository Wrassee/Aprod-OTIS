// Vercel API Route Handler
import { createServer } from 'http';
import express from 'express';
import { registerRoutes } from '../server/routes';
import '../server/vite';

const app = express();

// Initialize routes
registerRoutes(app).then(() => {
  console.log('Vercel API routes initialized');
});

export default app;