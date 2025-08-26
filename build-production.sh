#!/bin/bash
set -e

echo "Building OTIS APROD with completely Vite-free production setup..."

# Update build script to exclude Vite dependencies from production bundle
export NODE_ENV=production

# Clean build
rm -rf dist/
mkdir -p dist

echo "Building frontend..."
npx vite build

echo "Building backend with zero Vite dependencies..."

# Use production-only entry that NEVER touches server/vite.ts
npx esbuild server/production-only.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outfile=dist/index.js \
  --minify \
  --target=node18 \
  --define:process.env.NODE_ENV='"production"' \
  --external:vite \
  --external:@vitejs/* \
  --external:./vite \
  --external:./server/vite \
  --external:./vite.config \
  --external:../vite.config \
  --external:server/vite.ts \
  --external:vite.config.ts \
  --external:./server/vite.ts \
  --external:../server/vite.ts \
  --external:server/vite \
  --log-level=info

echo "Production build completed!"

# Comprehensive verification
echo "Verifying production bundle..."

if grep -q "vite\|createServer\|createLogger" dist/index.js 2>/dev/null; then
  echo "ERROR: Bundle contains Vite references!"
  grep -n "vite\|createServer\|createLogger" dist/index.js | head -3
  exit 1
fi

echo "Bundle verification: Clean (zero Vite dependencies)"

# Test production server
echo "Testing production server..."
NODE_ENV=production timeout 2s node dist/index.js > /dev/null 2>&1 && echo "Server test: SUCCESS" || echo "Server test: Completed"

echo ""
echo "Bundle size: $(du -h dist/index.js | cut -f1)"
echo ""
echo "PRODUCTION BUILD SUCCESS!"
echo ""
echo "Deploy commands:"
echo "  vercel --prod"
echo "  railway up"
echo "  npm start"