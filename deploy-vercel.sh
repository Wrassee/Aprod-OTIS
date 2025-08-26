#!/bin/bash

echo "🚀 OTIS APROD v0.4.8 - Vercel Deployment Script"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found. Make sure you're in the project root directory."
    exit 1
fi

# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the client application
echo "🏗️  Building client application..."
cd client
npm run build
cd ..

# Create production environment file
echo "⚙️  Setting up environment variables..."
if [ ! -f ".env.production" ]; then
    cat > .env.production << EOF
NODE_ENV=production
# Add your production environment variables here:
# DATABASE_URL=
# PGHOST=
# PGPORT=
# PGUSER=  
# PGPASSWORD=
# PGDATABASE=
# SESSION_SECRET=
# SENDGRID_API_KEY=
EOF
    echo "📝 Created .env.production template. Please fill in your environment variables."
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!"
echo "📱 Your OTIS APROD PWA is now live on Vercel"
echo ""
echo "🔧 Next steps:"
echo "1. Configure environment variables in Vercel Dashboard"
echo "2. Set up custom domain (optional)"
echo "3. Test PWA installation on mobile devices"
echo "4. Verify all functionality works in production"