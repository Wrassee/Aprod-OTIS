#!/bin/bash
set -e

echo "🔧 Applying deployment fix..."

# Build frontend
echo "📦 Building frontend..."
NODE_ENV=production npx vite build

# Build backend with proper exclusions
echo "⚙️ Building backend..."
mkdir -p dist

# Build production entry point that completely avoids Vite dependencies
npx esbuild server/production-entry.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outfile=dist/index.js \
  --minify \
  --target=node18 \
  --define:process.env.NODE_ENV='"production"'

echo "✅ Production build uses clean entry point without Vite dependencies"

echo "✅ Build completed successfully!"
echo "🚀 Ready for deployment"