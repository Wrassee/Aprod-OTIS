#!/bin/bash
set -e

echo "🔧 Clean build for OTIS APROD (avoiding all Vite issues)..."

# Set production environment
export NODE_ENV=production

# Build frontend only
echo "📦 Building frontend..."
npx vite build

# Update build command to exclude Vite dependencies from bundling
echo "⚙️ Building backend with production-only entry (ZERO Vite dependencies)..."
mkdir -p dist

# Use production-only server that completely avoids server/vite.ts
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
  --external:server/vite.ts \
  --external:./vite \
  --external:./server/vite \
  --external:../vite.config \
  --log-level=info

echo "✅ Clean build completed successfully!"

# Verify bundle doesn't contain problematic Vite imports (allow http createServer)
if grep -qi "from.*vite\|createLogger.*vite\|import.*vite" dist/index.js 2>/dev/null; then
  echo "❌ Build still contains Vite imports!"
  exit 1
else
  echo "✅ Bundle verification: Completely clean (zero Vite imports)"
fi

echo "📦 Bundle size: $(du -h dist/index.js | cut -f1)"
echo "🎉 Ready for deployment!"
echo ""
echo "Deploy commands:"
echo "  vercel --prod              # Deploy to Vercel"
echo "  railway up                 # Deploy to Railway"  
echo "  node dist/index.js         # Test production server"