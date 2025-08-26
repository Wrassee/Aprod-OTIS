#!/bin/bash
echo "🚀 OTIS APROD Production-Safe Build v0.4.9"
echo "Building frontend..."
npm run build:frontend

echo "Building backend (excluding Vite)..."
esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  --exclude:server/vite.ts \
  --define:process.env.NODE_ENV='"production"'

echo "✅ Production build complete!"
echo "Frontend: dist/public/"
echo "Backend: dist/index.js"