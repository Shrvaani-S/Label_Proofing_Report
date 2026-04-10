import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGIN ?? '*' }));
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

const USE_SUPABASE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

// ── Supabase backend ──────────────────────────────────────────────────────────
let supabase;
if (USE_SUPABASE) {
  const { createClient } = await import('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

// ── Filesystem backend ────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, 'drafts');
if (!USE_SUPABASE && !fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR);

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/drafts', async (_req, res) => {
  try {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('drafts')
        .select('id, label, saved_at')
        .order('saved_at', { ascending: false });
      if (error) throw error;
      return res.json(data.map(d => ({ id: d.id, label: d.label, savedAt: d.saved_at })));
    }
    const files = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.json'));
    const drafts = files.map(f => {
      const { id, label, savedAt } = JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, f), 'utf8'));
      return { id, label, savedAt };
    }).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    res.json(drafts);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/drafts/:id', async (req, res) => {
  try {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('drafts').select('body').eq('id', req.params.id).single();
      if (error || !data) return res.status(404).json({ error: 'Not found' });
      return res.json(data.body);
    }
    const file = path.join(DRAFTS_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
    res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.put('/api/drafts/:id', async (req, res) => {
  try {
    const savedAt = new Date().toISOString();
    if (USE_SUPABASE) {
      const body = { ...req.body, savedAt };
      const { error } = await supabase
        .from('drafts')
        .upsert({ id: req.params.id, label: req.body.label ?? '', saved_at: savedAt, body });
      if (error) throw error;
      return res.json({ ok: true });
    }
    const draft = { ...req.body, savedAt };
    fs.writeFileSync(path.join(DRAFTS_DIR, `${req.params.id}.json`), JSON.stringify(draft, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete('/api/drafts/:id', async (req, res) => {
  try {
    if (USE_SUPABASE) {
      const { error } = await supabase.from('drafts').delete().eq('id', req.params.id);
      if (error) throw error;
      return res.json({ ok: true });
    }
    const file = path.join(DRAFTS_DIR, `${req.params.id}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`Draft server running on port ${PORT} (${USE_SUPABASE ? 'Supabase' : 'filesystem'})`));
