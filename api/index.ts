// Vercel serverless function entry point
import { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server/index.production';

export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};