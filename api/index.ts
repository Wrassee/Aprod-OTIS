// Vercel serverless function entry point
import { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server/production-entry';

export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};