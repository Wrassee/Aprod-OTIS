#!/bin/bash
set -e

echo "🚀 Building production application..."

# Build the frontend
echo "📦 Building frontend with Vite..."
NODE_ENV=production npx vite build

# Create the dist directory structure
echo "📁 Creating dist directory structure..."
mkdir -p dist

# Build the backend using our ESBuild config
echo "⚙️ Building backend for production..."
NODE_ENV=production node esbuild.config.mjs

# Copy any additional assets if needed
echo "📋 Copying assets..."
if [ -d "shared" ]; then
  cp -r shared dist/ 2>/dev/null || echo "No shared directory to copy"
fi

echo "✅ Production build completed successfully!"
echo ""
echo "🎯 To start production server:"
echo "   NODE_ENV=production node dist/index.production.js"
echo ""
echo "🚀 To deploy to Vercel:"
echo "   vercel --prod"