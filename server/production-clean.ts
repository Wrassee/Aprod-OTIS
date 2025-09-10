// COMPLETELY CLEAN production server - ZERO external dependencies that might import Vite
import express from "express";
import fs from "fs";
import path from "path";

// Inline all functions to avoid imports that might pull in Vite
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit", 
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

function serveStatic(app: express.Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  if (!fs.existsSync(distPath)) {
    console.warn(`Build directory not found: ${distPath}`);
    // Create simple fallback
    app.get("*", (req, res) => {
      res.status(404).send("Build not found");
    });
    return;
  }
  
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

const app = express();

// Export for Vercel
export default app;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Basic API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/questions/:lang', (req, res) => {
  const { lang } = req.params;
  // Basic questions structure
  const questions = {
    hu: [
      { id: '1', text: 'Elevator működik?', type: 'radio', options: ['Igen', 'Nem'] },
      { id: '2', text: 'Dokumentáció rendben?', type: 'radio', options: ['Igen', 'Nem'] }
    ],
    de: [
      { id: '1', text: 'Aufzug funktioniert?', type: 'radio', options: ['Ja', 'Nein'] },
      { id: '2', text: 'Dokumentation in Ordnung?', type: 'radio', options: ['Ja', 'Nein'] }
    ]
  };
  res.json(questions[lang as keyof typeof questions] || questions.hu);
});

app.post('/api/protocols', (req, res) => {
  // Simple protocol creation
  const protocol = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  res.json(protocol);
});

app.get('/api/protocols', (req, res) => {
  res.json([]);
});

// Initialize server
(async () => {
  try {
    console.log('Starting clean production server...');
    
    serveStatic(app);
    console.log('Static serving configured');
    
    const PORT = Number(process.env.PORT) || 5000;
    
    if (process.env.NODE_ENV !== "test") {
      const server = app.listen(PORT, "0.0.0.0", () => {
        log(`serving on port ${PORT}`);
      });

      server.on("error", (error: any) => {
        if (error.syscall !== "listen") {
          throw error;
        }

        const bind = typeof PORT === "string" ? "Pipe " + PORT : "Port " + PORT;

        switch (error.code) {
          case "EACCES":
            console.error(bind + " requires elevated privileges");
            process.exit(1);
            break;
          case "EADDRINUSE":
            console.error(bind + " is already in use");
            process.exit(1);
            break;
          default:
            throw error;
        }
      });
    }
    
  } catch (error) {
    console.error('Server initialization failed:', error);
    process.exit(1);
  }
})();
