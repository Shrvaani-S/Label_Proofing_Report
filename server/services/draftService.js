import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, USE_SUPABASE } from '../config/supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, '../../drafts');

if (!USE_SUPABASE && !fs.existsSync(DRAFTS_DIR)) {
  fs.mkdirSync(DRAFTS_DIR);
}

export async function listDrafts() {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('drafts')
      .select('id, label, saved_at')
      .order('saved_at', { ascending: false });
    if (error) throw error;
    return data.map(d => ({ id: d.id, label: d.label, savedAt: d.saved_at }));
  }
  const files = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.json'));
  return files
    .map(f => {
      const { id, label, savedAt } = JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, f), 'utf8'));
      return { id, label, savedAt };
    })
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function getDraft(id) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('drafts').select('body').eq('id', id).single();
    if (error || !data) return null;
    return data.body;
  }
  const file = path.join(DRAFTS_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export async function upsertDraft(id, body) {
  const savedAt = new Date().toISOString();
  if (USE_SUPABASE) {
    const payload = { ...body, savedAt };
    const { error } = await supabase
      .from('drafts')
      .upsert({ id, label: body.label ?? '', saved_at: savedAt, body: payload });
    if (error) throw error;
    return;
  }
  const draft = { ...body, savedAt };
  fs.writeFileSync(path.join(DRAFTS_DIR, `${id}.json`), JSON.stringify(draft, null, 2));
}

export async function deleteDraft(id) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from('drafts').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const file = path.join(DRAFTS_DIR, `${id}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}
