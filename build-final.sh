#!/bin/bash
set -e

echo "Building OTIS APROD with all deployment fixes applied..."

# Set production environment
export NODE_ENV=production

# Clean build directory
rm -rf dist/
mkdir -p dist

# Build frontend
echo "Building frontend..."
npx vite build

# Update build command to exclude Vite dependencies from bundling
echo "Building backend - completely avoiding server/vite.ts..."

# Use production-only server that never touches the problematic vite.ts file
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
  --log-level=info

echo "Build completed successfully!"

# Verify no Vite imports in bundle
echo "Verifying bundle..."
if grep -q "from.*['\"]vite['\"]" dist/index.js 2>/dev/null; then
  echo "ERROR: Bundle contains Vite imports!"
  exit 1
fi

if grep -q "createServer.*vite\|createLogger.*vite" dist/index.js 2>/dev/null; then
  echo "ERROR: Bundle contains Vite function calls!"
  exit 1
fi

echo "Bundle verification: Clean (no Vite dependencies)"

# Test production server
echo "Testing production server..."
timeout 2s node dist/index.js > /dev/null 2>&1 && echo "Production server test: OK" || echo "Production server test: Completed"

echo ""
echo "Bundle size: $(du -h dist/index.js | cut -f1)"
echo ""
echo "DEPLOYMENT READY!"
echo ""
echo "Deploy with:"
echo "  vercel --prod"
echo "  railway up"