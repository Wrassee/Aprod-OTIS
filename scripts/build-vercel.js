#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  OTIS APROD v0.4.8 - Vercel Build Script');
console.log('===========================================');

// Ensure we're in the right directory
if (!fs.existsSync('vercel.json')) {
    console.error('❌ Error: vercel.json not found');
    process.exit(1);
}

try {
    // Build client for production
    console.log('📦 Building client application...');
    process.chdir('client');
    execSync('npm run build', { stdio: 'inherit' });
    process.chdir('..');

    // Verify build output
    const distPath = path.join('client', 'dist');
    if (!fs.existsSync(distPath)) {
        throw new Error('Client build failed - dist directory not found');
    }

    // Copy necessary files to dist
    const filesToCopy = [
        'public/manifest.json',
        'public/sw.js', 
        'public/offline.html',
        'public/pwa-64x64.png',
        'public/pwa-192x192.png',
        'public/pwa-512x512.png'
    ];

    console.log('📋 Copying PWA files to dist...');
    filesToCopy.forEach(file => {
        const src = path.join(file);
        const dest = path.join('client', 'dist', path.basename(file));
        
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`✅ Copied ${file}`);
        } else {
            console.warn(`⚠️  Warning: ${file} not found`);
        }
    });

    // Create package.json for Vercel if it doesn't exist
    const clientPackageJson = path.join('client', 'package.json');
    if (!fs.existsSync(clientPackageJson)) {
        console.log('📝 Creating client package.json...');
        const packageContent = {
            name: 'otis-aprod-client',
            version: '0.4.8',
            scripts: {
                build: 'vite build'
            }
        };
        fs.writeFileSync(clientPackageJson, JSON.stringify(packageContent, null, 2));
    }

    console.log('✅ Build completed successfully!');
    console.log('🚀 Ready for Vercel deployment');
    
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}