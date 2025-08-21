#!/usr/bin/env node

// Vercel build script for OTIS APROD
const esbuild = require('esbuild');
const path = require('path');

async function build() {
  try {
    console.log('Building for Vercel production...');
    
    // Build the serverless function
    await esbuild.build({
      entryPoints: ['server/app.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outfile: 'api/index.js',
      external: [
        '@neondatabase/serverless',
        '@supabase/supabase-js',
        'pg',
        'drizzle-orm',
        'multer'
      ],
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    });
    
    console.log('✅ Build successful for Vercel');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();