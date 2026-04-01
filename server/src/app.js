import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import studyRoutes from './routes/studyRoutes.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: process.env.OPENAI_API_KEY ? 'live-ai' : 'fallback-ai',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', studyRoutes);

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message || 'Something went wrong while processing the study request.',
  });
});

export default app;
