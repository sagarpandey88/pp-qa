import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env';
import { initDb, closeDb, isFallbackMode } from './db/pool';

// Import route modules
import authRoutes from './routes/auth.routes';
import azureAppRoutes from './routes/azureApp.routes';
import dataverseRoutes from './routes/dataverse.routes';
import solutionRoutes from './routes/solution.routes';
import byokRoutes from './routes/byok.routes';
import chatRoutes from './routes/chat.routes';
import testSuiteRoutes from './routes/testSuite.routes';
import runnerRoutes from './routes/runner.routes';

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve Playwright test artifacts & HTML reports
const playwrightReportDir = path.resolve(__dirname, '../playwright/report');
const testArtifactsDir = path.resolve(__dirname, '../playwright/artifacts');
app.use('/reports', express.static(playwrightReportDir));
app.use('/artifacts', express.static(testArtifactsDir));
app.use('/api/reports', express.static(playwrightReportDir));
app.use('/api/artifacts', express.static(testArtifactsDir));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    databaseMode: isFallbackMode() ? 'in-memory-fallback' : 'postgresql-live',
    version: '1.0.0',
    service: 'pp-qa-backend'
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/azure-profiles', azureAppRoutes);
app.use('/api/dataverse', dataverseRoutes);
app.use('/api/solutions', solutionRoutes);
app.use('/api/byok', byokRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/test-suites', testSuiteRoutes);
app.use('/api/runs', runnerRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Central Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[SERVER ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(config.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// Initialize DB and start server
let server: any = null;

async function startServer() {
  await initDb();
  server = app.listen(config.PORT, () => {
    console.log(`[SERVER] Power Platform & Copilot QA API running on http://localhost:${config.PORT}`);
    console.log(`[SERVER] Database Mode: ${isFallbackMode() ? 'In-Memory Fallback' : 'PostgreSQL Live'}`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[SERVER] Shutting down gracefully...');
  if (server) server.close();
  await closeDb();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[SERVER] Shutting down gracefully...');
  if (server) server.close();
  await closeDb();
  process.exit(0);
});

if (process.env.NODE_ENV !== 'test') {
  startServer().catch(err => {
    console.error('[SERVER FATAL]', err);
    process.exit(1);
  });
}

export { app, startServer };

