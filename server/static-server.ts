// server/static-server.ts

import express, { type Express } from "express";
import fs from "fs";
import path from "path";

// Ez a log függvény maradhat, a tiéd volt eredetileg
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  // --- JAVÍTÁS ITT ---
  // A "/public" részt eltávolítottuk a végéről, mert a Vite a 'dist' mappába másol mindent.
  const distPath = path.resolve(process.cwd(), "dist");

  // Ellenőrizzük, hogy a 'dist' mappa létezik-e
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  log(`Serving static files from: ${distPath}`);

  // Statikus fájlok kiszolgálása a helyes 'dist' mappából
  app.use(express.static(distPath));

  // Minden más kérést az index.html-re irányítunk a kliensoldali routing miatt
  app.get("*", (req, res, next) => {
    // Ha a kérés az API-hoz szól, azt a routes.ts kezeli, így kihagyjuk
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}