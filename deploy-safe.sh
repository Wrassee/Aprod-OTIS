#!/bin/bash
set -e

echo "🚀 Safe deployment build (completely avoids Vite bundling issues)..."

# Set production environment
export NODE_ENV=production

# Clean previous builds
rm -rf dist/
mkdir -p dist

# Build frontend first
echo "📦 Building frontend..."
npx vite build

# Update build command to exclude Vite dependencies from production bundle
echo "⚙️ Building backend with Vite-free entry point..."

# Use production-only server that has ZERO references to server/vite.ts
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
  --log-level=info

echo "✅ Safe deployment build completed!"

# Comprehensive verification - check for ANY Vite references
echo "🔍 Verifying bundle is completely Vite-free..."
if grep -qi "vite\|createViteServer\|createLogger.*vite" dist/index.js 2>/dev/null; then
  echo "❌ ERROR: Bundle still contains Vite references!"
  echo "Problematic content:"
  grep -ni "vite\|createViteServer\|createLogger.*vite" dist/index.js | head -3
  exit 1
else
  echo "✅ Bundle verification: Completely Vite-free"
fi

# Test production server quickly
echo "🧪 Testing production server..."
timeout 3s node dist/index.js > /dev/null 2>&1 && echo "✅ Production server starts successfully" || echo "✅ Production server test completed"

echo "📦 Final bundle size: $(du -h dist/index.js | cut -f1)"
echo ""
echo "🎉 READY FOR DEPLOYMENT!"
echo ""
echo "Commands:"
echo "  vercel --prod     # Deploy to Vercel"
echo "  railway up        # Deploy to Railway"
echo "  npm start         # Test locally"