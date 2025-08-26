// Production-safe Vite wrapper for deployment
import express, { type Express } from "express";
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

// Production-only setup - serves static files instead of Vite dev server
export async function setupVite(app: Express, server: Server) {
  if (process.env.NODE_ENV === 'production') {
    // Serve static files in production
    app.use(express.static(path.join(process.cwd(), 'dist/public')));
    
    // Fallback for SPA routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
    });
    
    log("Production static file server initialized");
    return;
  }
  
  // Development mode - import and use actual Vite
  try {
    const { setupVite: devSetupVite } = await import('./vite.js');
    return devSetupVite(app, server);
  } catch (error) {
    log("Vite development server not available, falling back to static serving");
    app.use(express.static('public'));
  }
}