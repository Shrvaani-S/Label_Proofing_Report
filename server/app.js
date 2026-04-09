import express from 'express';
import cors from 'cors';
import { USE_SUPABASE } from './config/supabase.js';
import draftRoutes from './routes/draftRoutes.js';

const app = express();

app.use(cors({ origin: process.env.ALLOWED_ORIGIN ?? '*' }));
app.use(express.json({ limit: '50mb' }));

app.use('/api/drafts', draftRoutes);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Draft server running on port ${PORT} (${USE_SUPABASE ? 'Supabase' : 'filesystem'})`);
});
