import { build } from 'esbuild';

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  entryPoints: [isProduction ? 'server/index.production.ts' : 'server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  minify: isProduction,
  target: 'node18',
  external: [
    // Exclude development dependencies from production builds
    'vite',
    '@replit/vite-plugin-cartographer',
    '@replit/vite-plugin-runtime-error-modal',
    '@vitejs/plugin-react'
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  }
};

try {
  await build(config);
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}