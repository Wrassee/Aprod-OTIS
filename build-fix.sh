#!/bin/bash
set -e

echo "🔧 Applying deployment fix..."

# Build frontend
echo "📦 Building frontend..."
NODE_ENV=production npx vite build

# Build backend with proper exclusions
echo "⚙️ Building backend..."
mkdir -p dist

# Build minimal production server with zero Vite dependencies
npx esbuild server/minimal-production.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outfile=dist/index.js \
  --minify \
  --target=node18 \
  --define:process.env.NODE_ENV='"production"'

echo "✅ Production build complete - minimal bundle without Vite dependencies"
echo "📦 Bundle size: $(du -h dist/index.js | cut -f1)"

echo "✅ Build completed successfully!"
echo "🚀 Ready for deployment"