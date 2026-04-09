import { listDrafts, getDraft, upsertDraft, deleteDraft } from '../services/draftService.js';

export async function getAll(_req, res) {
  try {
    const drafts = await listDrafts();
    res.json(drafts);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

export async function getOne(req, res) {
  try {
    const draft = await getDraft(req.params.id);
    if (!draft) return res.status(404).json({ error: 'Not found' });
    res.json(draft);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

export async function upsert(req, res) {
  try {
    await upsertDraft(req.params.id, req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}

export async function remove(req, res) {
  try {
    await deleteDraft(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
