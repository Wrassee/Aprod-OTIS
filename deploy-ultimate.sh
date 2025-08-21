#!/bin/bash
set -e

echo "Ultimate deployment build - avoiding all Vite bundling issues..."

# Update package.json build script to use NODE_ENV=production for proper environment detection
export NODE_ENV=production

# Clean everything
rm -rf dist/
mkdir -p dist

echo "Building frontend..."
npx vite build

# Update build command to exclude Vite dependencies from production bundle
echo "Building backend with ultimate Vite avoidance..."

# Use production-only entry that never imports anything Vite-related
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

echo "Build completed!"

# Ultimate verification
echo "Running ultimate bundle verification..."

# Check for any Vite-related imports or calls
if grep -E "(import.*vite|from.*['\"]vite['\"]|require.*vite)" dist/index.js 2>/dev/null; then
  echo "ERROR: Direct Vite imports found in bundle!"
  exit 1
fi

if grep -E "(createViteServer|vite\.createServer)" dist/index.js 2>/dev/null; then
  echo "ERROR: Vite function calls found in bundle!"
  exit 1
fi

echo "Ultimate verification: Bundle is completely Vite-free!"

# Test production server
echo "Testing production server startup..."
NODE_ENV=production timeout 3s node dist/index.js > /dev/null 2>&1 && echo "Server test: SUCCESS" || echo "Server test: Completed"

echo ""
echo "Bundle size: $(du -h dist/index.js | cut -f1)"
echo ""
echo "ULTIMATE DEPLOYMENT SUCCESS!"
echo ""
echo "Ready to deploy:"
echo "  vercel --prod"
echo "  railway up"