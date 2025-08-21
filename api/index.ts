// Serverless deployment entry point - uses production-safe server
import app from '../server/production-only';

// Export for Vercel serverless functions
export default app;