import type { ReportData } from '../types';

export interface Draft {
  id: string;
  label: string;
  savedAt: string;
  data?: ReportData; // only present when fetching a single draft
}

export async function getDrafts(): Promise<Draft[]> {
  try {
    const res = await fetch('/api/drafts');
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    return res.json();
  } catch (e) {
    if (e instanceof TypeError) throw new Error('Draft server is not running. Start it with: npm run server');
    throw e;
  }
}

export async function loadDraft(id: string): Promise<Draft> {
  const res = await fetch(`/api/drafts/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to load draft');
  return res.json();
}

export async function saveDraft(draft: Draft & { data: ReportData }): Promise<void> {
  try {
    const res = await fetch(`/api/drafts/${encodeURIComponent(draft.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
  } catch (e) {
    if (e instanceof TypeError) throw new Error('Draft server is not running. Start it with: npm run server');
    throw e;
  }
}

export async function deleteDraft(id: string): Promise<void> {
  const res = await fetch(`/api/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete draft');
}

export async function toDataUrl(url: string): Promise<string> {
  if (!url.startsWith('blob:')) return url;
  const blob = await fetch(url).then(r => r.blob());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
