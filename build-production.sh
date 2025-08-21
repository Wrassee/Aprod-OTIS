#!/bin/bash
set -e

echo "🔧 Building OTIS APROD for production deployment..."

# Set production environment
export NODE_ENV=production

# Build frontend
echo "📦 Building frontend..."
npx vite build

# Update build command to exclude Vite dependencies from production bundle
echo "⚙️ Building backend with production entry point (excludes Vite)..."
mkdir -p dist

# Use production entry point that completely avoids Vite dependencies
npx esbuild server/production-entry.ts \
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
  --log-level=info

echo "✅ Production build completed successfully!"

# Verify bundle doesn't contain Vite dependencies
if grep -q "createServer.*vite\|createLogger.*vite" dist/index.js 2>/dev/null; then
  echo "❌ Build still contains Vite dependencies!"
  exit 1
else
  echo "✅ Bundle verification: Clean (no Vite dependencies)"
fi

echo "📦 Bundle size: $(du -h dist/index.js | cut -f1)"
echo "🎉 Ready for deployment!"
echo ""
echo "Deploy commands:"
echo "  vercel --prod              # Deploy to Vercel"
echo "  railway up                 # Deploy to Railway"  
echo "  node dist/index.js         # Test production server"