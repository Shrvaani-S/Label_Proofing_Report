import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, 'drafts');

if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// List all drafts (metadata only, no image data)
app.get('/api/drafts', (_req, res) => {
  try {
    const files = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.json'));
    const drafts = files.map(f => {
      const raw = JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, f), 'utf8'));
      return { id: raw.id, label: raw.label, savedAt: raw.savedAt };
    }).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    res.json(drafts);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Get a single draft (full data including images)
app.get('/api/drafts/:id', (req, res) => {
  const file = path.join(DRAFTS_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  try {
    res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Save / overwrite a draft
app.put('/api/drafts/:id', (req, res) => {
  try {
    const file = path.join(DRAFTS_DIR, `${req.params.id}.json`);
    fs.writeFileSync(file, JSON.stringify(req.body));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Delete a draft
app.delete('/api/drafts/:id', (req, res) => {
  const file = path.join(DRAFTS_DIR, `${req.params.id}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
});

app.listen(3001, () => console.log('Draft server running on http://localhost:3001'));
