import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGIN ?? '*' }));
app.use(express.json({ limit: '50mb' }));

// List all drafts (metadata only, no image data)
app.get('/api/drafts', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('drafts')
      .select('id, label, saved_at')
      .order('saved_at', { ascending: false });
    if (error) throw error;
    res.json(data.map(d => ({ id: d.id, label: d.label, savedAt: d.saved_at })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Get a single draft (full data including images)
app.get('/api/drafts/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('drafts')
      .select('body')
      .eq('id', req.params.id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json(data.body);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Save / overwrite a draft
app.put('/api/drafts/:id', async (req, res) => {
  try {
    const savedAt = new Date().toISOString();
    const body = { ...req.body, savedAt };
    const { error } = await supabase
      .from('drafts')
      .upsert({ id: req.params.id, label: req.body.label ?? '', saved_at: savedAt, body });
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Delete a draft
app.delete('/api/drafts/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('drafts')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`Draft server running on port ${PORT}`));
