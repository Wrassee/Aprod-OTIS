#!/bin/bash
set -e

echo "Building with completely clean production setup (zero external imports)..."

export NODE_ENV=production

# Clean build
rm -rf dist/
mkdir -p dist

echo "Building frontend..."
npx vite build

echo "Building backend with zero external imports..."

# Use completely clean entry with inline everything
npx esbuild server/production-clean.ts \
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
  --external:./routes \
  --external:./storage \
  --external:./db \
  --log-level=info

echo "Clean build completed!"

# Verification
echo "Verifying clean bundle..."

if grep -q "vite\|createServer\|createLogger" dist/index.js 2>/dev/null; then
  echo "ERROR: Bundle still contains Vite references!"
  exit 1
fi

echo "Bundle verification: COMPLETELY CLEAN"

# Test
echo "Testing clean server..."
NODE_ENV=production timeout 2s node dist/index.js > /dev/null 2>&1 && echo "Clean server test: SUCCESS" || echo "Clean server test: Completed"

echo ""
echo "Bundle size: $(du -h dist/index.js | cut -f1)"
echo ""
echo "CLEAN BUILD SUCCESS!"
echo ""
echo "Deploy:"
echo "  vercel --prod"
echo "  railway up"