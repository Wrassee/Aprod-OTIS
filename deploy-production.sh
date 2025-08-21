#!/bin/bash
set -e

echo "🚀 Deploying OTIS APROD with fixed build process..."

# Ensure we're building for production
export NODE_ENV=production

# Build frontend
echo "📦 Building frontend..."
npx vite build

# Build backend using production-safe server (completely excludes Vite)
echo "⚙️ Building backend with production-safe server..."
mkdir -p dist

npx esbuild server/production-entry.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outfile=dist/index.js \
  --minify \
  --target=node18 \
  --define:process.env.NODE_ENV='"production"'

echo "✅ Build completed successfully!"

# Verify bundle doesn't contain Vite dependencies
if grep -q "createServer.*vite\|createLogger.*vite" dist/index.js; then
  echo "❌ Build still contains Vite dependencies!"
  exit 1
else
  echo "✅ Bundle verification: Clean (no Vite dependencies)"
fi

echo "📦 Bundle size: $(du -h dist/index.js | cut -f1)"
echo ""
echo "🎉 Ready for deployment!"
echo ""
echo "Deploy commands:"
echo "  vercel --prod              # Deploy to Vercel"
echo "  railway up                 # Deploy to Railway"
echo "  node dist/index.js         # Test locally"