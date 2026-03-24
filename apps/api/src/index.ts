import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import userRoutes from './routes/users';
import connectorRoutes from './routes/connectors';
import ragRoutes from './routes/rag';
import suluRoutes from './routes/sulu';
import reportRoutes from './routes/reports';
import dashboardRoutes from './routes/dashboard';
import trendsRoutes from './routes/trends';
import semrushRoutes from './routes/semrush';
import apiKeyRoutes from './routes/api-keys';
import v1Routes from './routes/v1';
import { startScheduler } from './lib/scheduler';

const app = express();
const PORT = parseInt(process.env.API_PORT || '3001', 10);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/users', userRoutes);
app.use('/api/connectors', connectorRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/sulu', suluRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/semrush', semrushRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/v1', v1Routes);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Growth Rocket BI API running on port ${PORT}`);
  if (process.env.NODE_ENV !== 'test') {
    startScheduler();
  }
});

export default app;
