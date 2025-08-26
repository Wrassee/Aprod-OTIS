#!/bin/bash
# Production build script that avoids Vite issues

echo "🔨 Building production version..."

# Build frontend
echo "📦 Building frontend with Vite..."
npm run check
vite build

# Build backend with production entry point (avoiding Vite imports)
echo "🚀 Building backend with production entry..."
esbuild server/production-entry.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "✅ Production build complete!"
echo "📁 Frontend: dist/public/"
echo "📁 Backend: dist/production-entry.js"
echo "🚀 Start with: node dist/production-entry.js"