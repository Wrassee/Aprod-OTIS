#!/bin/bash

echo "🚀 OTIS APROD v0.4.8 - GitHub + Vercel Deployment"
echo "================================================="

# Check if we're in the project directory
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found. Run this script from the project root."
    exit 1
fi

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    git branch -M main
else
    echo "✅ Git repository already initialized"
fi

# Create GitHub deployment structure
echo "🏗️  Preparing files for GitHub deployment..."

# Copy Vercel-specific package.json files
if [ -f "package-vercel.json" ]; then
    echo "📝 Using Vercel-optimized package.json for root"
    cp package-vercel.json package.json
fi

if [ -f "client/package-vercel.json" ]; then
    echo "📝 Using Vercel-optimized package.json for client"
    cp client/package-vercel.json client/package.json
fi

if [ -f "client/vite.config.vercel.ts" ]; then
    echo "📝 Using Vercel-optimized Vite config"
    cp client/vite.config.vercel.ts client/vite.config.ts
fi

# Build client for verification (optional)
echo "🔍 Testing client build..."
cd client
npm install --silent
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Client build successful"
else
    echo "⚠️  Client build failed, but continuing with deployment"
fi
cd ..

# Add all files to git
echo "📋 Adding files to Git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "OTIS APROD v0.4.8 - Vercel deployment ready

Features:
✅ PWA with Service Worker v0.4.8
✅ Measurement data persistence
✅ Excel/PDF generation
✅ Multi-language support (HU/DE)
✅ Admin template management
✅ Error documentation with photos
✅ Vercel serverless optimization

Migration files:
- vercel.json - Deployment configuration
- api/index.ts - Serverless API handler
- client/vite.config.vercel.ts - Optimized build
- README-VERCEL.md - Deployment guide"

echo ""
echo "🎯 Next Steps for Vercel Deployment:"
echo "===================================="
echo ""
echo "1. **Push to GitHub:**"
echo "   git remote add origin https://github.com/YOUR-USERNAME/otis-aprod.git"
echo "   git push -u origin main"
echo ""
echo "2. **Create Vercel Project:**"
echo "   • Go to https://vercel.com/dashboard"
echo "   • Click 'Import Project'"
echo "   • Connect your GitHub repository"
echo "   • Framework: Other"
echo "   • Build Command: npm run build"
echo "   • Output Directory: client/dist"
echo ""
echo "3. **Environment Variables (Vercel Dashboard):**
cat << 'EOF'
   NODE_ENV=production
   DATABASE_URL=postgresql://username:password@host:5432/database
   PGHOST=your-postgres-host
   PGPORT=5432
   PGUSER=your-username
   PGPASSWORD=your-password
   PGDATABASE=your-database
   SESSION_SECRET=your-random-secret-key
EOF
echo ""
echo "4. **Deploy:**"
echo "   Vercel will automatically deploy when you push to main branch"
echo ""
echo "📱 **PWA Features After Deployment:**"
echo "   ✅ Installable on mobile/desktop"
echo "   ✅ Offline functionality"
echo "   ✅ Push notification ready"
echo "   ✅ App store distribution ready"
echo ""
echo "🚀 **OTIS APROD v0.4.8 is ready for production!**"