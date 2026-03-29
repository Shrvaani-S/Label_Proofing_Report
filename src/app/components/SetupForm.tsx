import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
import type { ReportData, Requirement, DiscrepancyCategory, DiscrepancyItem, ElementType, ChangeType, RequirementStatus, DrawnBox } from '../types';
import { BoundingBoxDrawer } from './BoundingBoxDrawer';
import { getDrafts, loadDraft, saveDraft, deleteDraft, toDataUrl, type Draft } from '../utils/drafts';

interface SetupFormProps {
  initialData?: ReportData;
  onSubmit: (data: ReportData) => void;
}

const ELEMENT_TYPES: ElementType[] = ['Text', 'Symbol', 'Barcode', 'Image'];
const CHANGE_TYPES_REQ: ChangeType[] = ['Modified', 'Added', 'Deleted'];
const CHANGE_TYPES_DISC: ChangeType[] = ['Modified', 'Added', 'Deleted', 'Misplaced', 'Repositioned'];
const REQ_STATUSES: RequirementStatus[] = ['Match', 'Unmatch'];

function makeRequirement(id: number): Requirement {
  return { id, elementType: 'Text', changeType: 'Modified', description: '', expectedValue: '', actualValue: '', status: 'Match' };
}

function generateReportId(existingIds: string[] = []): string {
  const now = new Date();
  const ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
  const yyyy = ist.getUTCFullYear();
  const mm   = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(ist.getUTCDate()).padStart(2, '0');
  const prefix = `${yyyy}${mm}${dd}`;
  const maxCounter = existingIds.filter(id => id.startsWith(prefix)).reduce((max, id) => {
    const n = parseInt(id.slice(-4), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return `${prefix}${String(maxCounter + 1).padStart(4, '0')}`;
}

function makeCategory(): DiscrepancyCategory {
  return { title: '', items: [] };
}

function makeItem(): DiscrepancyItem {
  return { changeType: 'Modified', value: '' };
}

const AUTO_SAVE_KEY = 'setupFormAutoSave';

function readAutoSave(): ReportData | null {
  try {
    const raw = localStorage.getItem(AUTO_SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function SetupForm({ initialData, onSubmit }: SetupFormProps) {
  const isEditing = !!initialData;

  // Use auto-saved data as fallback when not editing an existing report
  const auto = !isEditing ? readAutoSave() : null;

  const [reportId,         setReportId]         = useState(initialData?.reportId ?? auto?.reportId ?? generateReportId());
  const [crNumber,         setCrNumber]         = useState(initialData?.crNumber ?? auto?.crNumber ?? '');
  const [sku,              setSku]              = useState(initialData?.sku ?? auto?.sku ?? '');
  const [currentRevision,  setCurrentRevision]  = useState(initialData?.currentRevision ?? auto?.currentRevision ?? '');
  const [newRevision,      setNewRevision]      = useState(initialData?.newRevision ?? auto?.newRevision ?? '');
  const [currentLabelName, setCurrentLabelName] = useState(initialData?.currentLabelName ?? auto?.currentLabelName ?? '');
  const [newLabelName,     setNewLabelName]     = useState(initialData?.newLabelName ?? auto?.newLabelName ?? '');
  const [currentLabelUrl,  setCurrentLabelUrl]  = useState(initialData?.currentLabelUrl ?? auto?.currentLabelUrl ?? '');
  const [newLabelUrl,      setNewLabelUrl]      = useState(initialData?.newLabelUrl ?? auto?.newLabelUrl ?? '');
  const [currentBoxes,     setCurrentBoxes]     = useState<DrawnBox[]>(initialData?.currentBoxes ?? auto?.currentBoxes ?? []);
  const [newBoxes,         setNewBoxes]         = useState<DrawnBox[]>(initialData?.newBoxes ?? auto?.newBoxes ?? []);
  const [requirements,     setRequirements]     = useState<Requirement[]>(
    (initialData?.requirements ?? auto?.requirements)?.length
      ? (initialData?.requirements ?? auto?.requirements)!.map(r => ({
          ...r,
          status: (r.status === 'Matched' ? 'Match' : r.status === 'Unmatched' ? 'Unmatch' : r.status) as RequirementStatus,
        }))
      : [makeRequirement(1)]
  );
  const [categories,       setCategories]       = useState<DiscrepancyCategory[]>(
    (initialData?.discrepancyCategories ?? auto?.discrepancyCategories)?.length
      ? (initialData?.discrepancyCategories ?? auto?.discrepancyCategories)!
      : [makeCategory()]
  );

  // Drafts
  const [drafts,          setDrafts]          = useState<Draft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [savingDraft,     setSavingDraft]      = useState(false);

  // Auto-save all form fields to localStorage on every change
  useEffect(() => {
    if (isEditing) return;
    try {
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify({
        reportId, crNumber, sku, currentRevision, newRevision,
        currentLabelName, newLabelName, currentLabelUrl, newLabelUrl,
        currentBoxes, newBoxes, requirements,
        discrepancyCategories: categories,
      }));
    } catch { /* storage quota exceeded */ }
  }, [reportId, crNumber, sku, currentRevision, newRevision,
      currentLabelName, newLabelName, currentLabelUrl, newLabelUrl,
      currentBoxes, newBoxes, requirements, categories, isEditing]);

  // Load the drafts list and restore the last selected draft
  useEffect(() => {
    getDrafts().then(list => {
      setDrafts(list);
      const last = localStorage.getItem('lastDraftId');
      if (last && list.some(d => d.id === last)) {
        setSelectedDraftId(last);
      }
    }).catch(() => {});
  }, []);

  const refreshDrafts = () => getDrafts().then(setDrafts);

  const loadDraftData = (d: ReportData) => {
    setReportId(d.reportId);
    setCrNumber(d.crNumber);
    setSku(d.sku);
    setCurrentRevision(d.currentRevision);
    setNewRevision(d.newRevision);
    setCurrentLabelName(d.currentLabelName);
    setNewLabelName(d.newLabelName);
    setCurrentLabelUrl(d.currentLabelUrl);
    setNewLabelUrl(d.newLabelUrl);
    setCurrentBoxes(d.currentBoxes);
    setNewBoxes(d.newBoxes);
    setRequirements(d.requirements);
    setCategories(d.discrepancyCategories?.length ? d.discrepancyCategories : [makeCategory()]);
  };

  const handleSelectDraft = async (id: string) => {
    setSelectedDraftId(id);
    if (!id) return;
    try {
      const draft = await loadDraft(id);
      if (draft.data) {
        loadDraftData(draft.data);
        localStorage.setItem('lastDraftId', id);
      }
    } catch (e) {
      alert(`Failed to load draft: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  };

  const buildDraftData = async (): Promise<{ data: ReportData }> => {
    const [resolvedCurrentUrl, resolvedNewUrl] = await Promise.all([
      toDataUrl(currentLabelUrl),
      toDataUrl(newLabelUrl),
    ]);
    return {
      data: {
        reportId, crNumber, sku, currentRevision, newRevision,
        currentLabelName, newLabelName,
        currentLabelUrl: resolvedCurrentUrl,
        newLabelUrl: resolvedNewUrl,
        currentBoxes, newBoxes,
        requirements: requirements.map((r, i) => ({ ...r, id: i + 1 })),
        discrepancyCategories: categories.filter(c => c.title || c.items.length > 0),
      },
    };
  };

  const persistDraft = async (id: string, data: ReportData) => {
    await saveDraft({ id, label: data.sku, savedAt: new Date().toISOString(), data });
    setSelectedDraftId(id);
    localStorage.setItem('lastDraftId', id);
    await refreshDrafts();
  };

  // Save Draft: update the loaded draft, or create a new one if starting fresh
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      // Regenerate report ID if the date portion is outdated
      const now = new Date();
      const ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
      const todayPrefix = `${ist.getUTCFullYear()}${String(ist.getUTCMonth() + 1).padStart(2, '0')}${String(ist.getUTCDate()).padStart(2, '0')}`;
      const currentPrefix = reportId.slice(0, 8);
      const id = currentPrefix !== todayPrefix
        ? generateReportId(drafts.map(d => d.id))
        : reportId;
      if (id !== reportId) setReportId(id);

      const { data } = await buildDraftData();
      // If the old draft had a different name, remove it so the list stays clean
      if (selectedDraftId && selectedDraftId !== id) {
        await deleteDraft(selectedDraftId);
      }
      await persistDraft(id, { ...data, reportId: id });
      alert(`Draft "${id}" saved.`);
    } catch (err) {
      alert(`Failed to save draft: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setSavingDraft(false);
    }
  };

  // Create New: reset the form to a blank state for a new report
  const handleCreateNew = () => {
    localStorage.removeItem(AUTO_SAVE_KEY);
    localStorage.removeItem('lastDraftId');
    setSelectedDraftId('');
    setReportId(generateReportId(drafts.map(d => d.id)));
    setCrNumber('');
    setSku('');
    setCurrentRevision('');
    setNewRevision('');
    setCurrentLabelName('');
    setNewLabelName('');
    setCurrentLabelUrl('');
    setNewLabelUrl('');
    setCurrentBoxes([]);
    setNewBoxes([]);
    setRequirements([makeRequirement(1)]);
    setCategories([makeCategory()]);
  };

  const handleDeleteDraft = async () => {
    if (!selectedDraftId) return;
    if (!confirm(`Delete draft "${selectedDraftId}"?`)) return;
    await deleteDraft(selectedDraftId);
    setSelectedDraftId('');
    localStorage.removeItem('lastDraftId');
    refreshDrafts();
  };

  const handleImageUpload = (which: 'current' | 'new', file: File) => {
    const name = file.name.replace(/\.[^.]+$/, '');
    const setUrl = which === 'current' ? setCurrentLabelUrl : setNewLabelUrl;
    const setName = which === 'current'
      ? (n: string) => { if (!currentLabelName) setCurrentLabelName(n); }
      : (n: string) => { if (!newLabelName)     setNewLabelName(n); };

    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = async () => {
        const typedArray = new Uint8Array(reader.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
        setUrl(canvas.toDataURL('image/png'));
        setName(name);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setUrl(reader.result as string);
        setName(name);
      };
      reader.readAsDataURL(file);
    }
  };

  // Requirements
  const addRequirement = () =>
    setRequirements(prev => [...prev, makeRequirement(prev.length ? prev[prev.length - 1].id + 1 : 1)]);

  const updateReq = (i: number, field: keyof Requirement, value: string) =>
    setRequirements(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const deleteReq = (i: number) =>
    setRequirements(prev => prev.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, id: idx + 1 })));

  // Categories / discrepancy items
  const addCategory = () => setCategories(prev => [...prev, makeCategory()]);
  const deleteCategory = (ci: number) => setCategories(prev => prev.filter((_, i) => i !== ci));
  const updateCatTitle = (ci: number, title: string) =>
    setCategories(prev => prev.map((c, i) => i === ci ? { ...c, title } : c));

  const addItem = (ci: number) =>
    setCategories(prev => prev.map((c, i) => i === ci ? { ...c, items: [...c.items, makeItem()] } : c));
  const deleteItem = (ci: number, ii: number) =>
    setCategories(prev => prev.map((c, i) => i === ci ? { ...c, items: c.items.filter((_, j) => j !== ii) } : c));
  const updateItem = (ci: number, ii: number, field: keyof DiscrepancyItem, value: string) =>
    setCategories(prev => prev.map((c, i) => i === ci
      ? { ...c, items: c.items.map((item, j) => j === ii ? { ...item, [field]: value } : item) }
      : c
    ));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLabelUrl) { alert('Please upload the Current Version Label image.'); return; }
    if (!newLabelUrl)     { alert('Please upload the New Version Label image.'); return; }
    // Regenerate report ID if the date portion is outdated
    const now = new Date();
    const ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
    const todayPrefix = `${ist.getUTCFullYear()}${String(ist.getUTCMonth() + 1).padStart(2, '0')}${String(ist.getUTCDate()).padStart(2, '0')}`;
    const id = reportId.slice(0, 8) !== todayPrefix
      ? generateReportId(drafts.map(d => d.id))
      : reportId;
    if (id !== reportId) setReportId(id);
    // Auto-save draft on generate so data is never lost; clean up stale draft if date changed
    buildDraftData().then(async ({ data: draftData }) => {
      if (selectedDraftId && selectedDraftId !== id) await deleteDraft(selectedDraftId);
      await persistDraft(id, { ...draftData, reportId: id });
    }).catch(() => {});
    onSubmit({
      reportId: id,
      crNumber,
      sku,
      currentRevision,
      newRevision,
      currentLabelName,
      newLabelName,
      currentLabelUrl,
      newLabelUrl,
      currentBoxes,
      newBoxes,
      requirements: requirements.map((r, i) => ({ ...r, id: i + 1 })),
      discrepancyCategories: categories.filter(c => c.title || c.items.length > 0),
    });
  };

  const input = "w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500 bg-white";
  const lbl   = "block text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1";
  const sec   = "bg-white border border-gray-300 p-6 space-y-4";
  const secH  = "text-xs uppercase tracking-wide font-bold text-gray-700 pb-3 border-b border-gray-200";
  const fileInput = "block w-full text-xs text-gray-600 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:border file:border-gray-300 file:text-xs file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 file:cursor-pointer";

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {/* Header bar */}
      <div className="w-full px-8 py-4" style={{ backgroundColor: '#D71500' }}>
        <h1 className="text-white text-lg font-semibold">Label Proofing Report — Setup</h1>
        <p className="text-white/70 text-xs mt-0.5">
          {isEditing ? 'Edit report details, then click Update Report.' : 'Fill in the details below, then click Generate Report.'}
        </p>
      </div>

      {/* Drafts bar */}
      <div className="w-full px-8 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500 shrink-0">Drafts</span>
        <select
          className="border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-gray-500 min-w-[220px]"
          value={selectedDraftId}
          onChange={e => handleSelectDraft(e.target.value)}
        >
          <option value="">— select a draft —</option>
          {drafts.map(d => (
            <option key={d.id} value={d.id}>
              {d.label} &nbsp;·&nbsp; {new Date(d.savedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!selectedDraftId}
          onClick={handleDeleteDraft}
          className="px-3 py-1.5 text-xs border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Delete
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleCreateNew}
          disabled={savingDraft}
          className="px-4 py-1.5 text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          + Create New
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={savingDraft}
          className="px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-60"
          style={{ backgroundColor: '#D71500' }}
        >
          {savingDraft ? 'Saving...' : 'Save Draft'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-[1200px] mx-auto p-8 space-y-6">

        {/* 1. Metadata */}
        <div className={sec}>
          <div className={secH}>1. Report Metadata</div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Report ID (LPR)</label>
              <input className={input} value={reportId} onChange={e => setReportId(e.target.value)} placeholder="e.g. 202603180001" />
            </div>
            <div>
              <label className={lbl}>CR Number (Optional)</label>
              <input className={input} value={crNumber} onChange={e => setCrNumber(e.target.value)} placeholder="-" />
            </div>
            <div>
              <label className={lbl}>SKU</label>
              <input className={input} value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. 187301111" required />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={lbl}>Current Revision</label>
              <input className={input} value={currentRevision} onChange={e => setCurrentRevision(e.target.value)} placeholder="e.g. Rev-D" required />
            </div>
            <div>
              <label className={lbl}>New Revision</label>
              <input className={input} value={newRevision} onChange={e => setNewRevision(e.target.value)} placeholder="e.g. Rev-E" required />
            </div>
            <div>
              <label className={lbl}>Current Version Label Name</label>
              <input className={input} value={currentLabelName} onChange={e => setCurrentLabelName(e.target.value)} placeholder="e.g. LCN-187301111_1_Rev-D" required />
            </div>
            <div>
              <label className={lbl}>New Version Label Name</label>
              <input className={input} value={newLabelName} onChange={e => setNewLabelName(e.target.value)} placeholder="e.g. LCN-187301111_1_Rev-E" required />
            </div>
          </div>
        </div>

        {/* 2. Images + bounding boxes */}
        <div className={sec}>
          <div className={secH}>2. Label Images &amp; Bounding Boxes</div>
          <p className="text-xs text-gray-500">
            Upload both label images. After uploading, click and drag on each image to draw bounding boxes marking the changes.
          </p>
          <div className="grid grid-cols-2 gap-8">
            {/* Current label */}
            <div className="space-y-3">
              <label className={lbl}>Current Version Label</label>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                className={fileInput}
                onChange={e => e.target.files?.[0] && handleImageUpload('current', e.target.files[0])}
              />
              {currentLabelUrl
                ? <BoundingBoxDrawer imageUrl={currentLabelUrl} imageLabel="Current Version Label" boxes={currentBoxes} onChange={setCurrentBoxes} />
                : <div className="border border-dashed border-gray-300 h-32 flex items-center justify-center text-xs text-gray-400">No image uploaded</div>
              }
            </div>
            {/* New label */}
            <div className="space-y-3">
              <label className={lbl}>New Version Label</label>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                className={fileInput}
                onChange={e => e.target.files?.[0] && handleImageUpload('new', e.target.files[0])}
              />
              {newLabelUrl
                ? <BoundingBoxDrawer imageUrl={newLabelUrl} imageLabel="New Version Label" boxes={newBoxes} onChange={setNewBoxes} />
                : <div className="border border-dashed border-gray-300 h-32 flex items-center justify-center text-xs text-gray-400">No image uploaded</div>
              }
            </div>
          </div>
        </div>

        {/* 3. Requirements Summary */}
        <div className={sec}>
          <div className={secH}>3. Requirements Summary</div>
          <p className="text-xs text-gray-500">Each row appears as a line in the Requirements Summary table in the report.</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '3%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '6%' }} />
              </colgroup>
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold">#</th>
                  <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold">Element</th>
                  <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold">Change Type</th>
                  <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold">Requirement</th>
                  <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold">Expected Value</th>
                  <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold">Actual Value</th>
                  <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold">Status</th>
                  <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((req, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                    <td className="px-2 py-1">
                      <select className="w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none bg-white" value={req.elementType} onChange={e => updateReq(i, 'elementType', e.target.value)}>
                        {ELEMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select className="w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none bg-white" value={req.changeType} onChange={e => updateReq(i, 'changeType', e.target.value)}>
                        {CHANGE_TYPES_REQ.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input className="w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none" value={req.description}    onChange={e => updateReq(i, 'description',    e.target.value)} placeholder="Description" />
                    </td>
                    <td className="px-2 py-1">
                      <input className="w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none" value={req.expectedValue}  onChange={e => updateReq(i, 'expectedValue',  e.target.value)} placeholder="Expected" />
                    </td>
                    <td className="px-2 py-1">
                      <input className="w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none" value={req.actualValue}    onChange={e => updateReq(i, 'actualValue',    e.target.value)} placeholder="Actual" />
                    </td>
                    <td className="px-2 py-1">
                      <select className="w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none bg-white" value={req.status} onChange={e => updateReq(i, 'status', e.target.value)}>
                        {REQ_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button type="button" onClick={() => deleteReq(i)} className="text-gray-400 hover:text-red-500 font-bold text-base leading-none">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addRequirement} className="text-xs border border-gray-300 px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors">
            + Add Requirement
          </button>
        </div>

        {/* 4. Changes Made */}
        <div className={sec}>
          <div className={secH}>4. Changes Made</div>
          <p className="text-xs text-gray-500">Group changes by category (e.g. TEXT, SYMBOLS, IMAGE). Each category becomes a collapsible section in the report.</p>
          <div className="space-y-4">
            {categories.map((cat, ci) => (
              <div key={ci} className="border border-gray-200 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    className="border border-gray-300 px-2 py-1 text-xs font-bold uppercase w-48 focus:outline-none bg-white"
                    value={cat.title}
                    onChange={e => updateCatTitle(ci, e.target.value)}
                    placeholder="CATEGORY NAME (e.g. TEXT)"
                  />
                  <button type="button" onClick={() => deleteCategory(ci)} className="text-xs text-gray-400 hover:text-red-500">
                    Remove category
                  </button>
                </div>

                {cat.items.length > 0 && (
                  <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '74%' }} />
                      <col style={{ width: '6%' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-2 py-1.5 text-left text-[10px] uppercase text-gray-500 font-bold">Change Type</th>
                        <th className="px-2 py-1.5 text-left text-[10px] uppercase text-gray-500 font-bold">Description</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.items.map((item, ii) => (
                        <tr key={ii} className="border-b border-gray-100">
                          <td className="px-2 py-1">
                            <select className="w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none bg-white" value={item.changeType} onChange={e => updateItem(ci, ii, 'changeType', e.target.value)}>
                              {CHANGE_TYPES_DISC.map(t => <option key={t}>{t}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1">
                            <input className="w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none" value={item.value} onChange={e => updateItem(ci, ii, 'value', e.target.value)} placeholder="Description of change" />
                          </td>
                          <td className="px-2 py-1 text-center">
                            <button type="button" onClick={() => deleteItem(ci, ii)} className="text-gray-400 hover:text-red-500 font-bold text-base leading-none">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <button type="button" onClick={() => addItem(ci)} className="text-xs border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-50">
                  + Add Item
                </button>
              </div>
            ))}
            <button type="button" onClick={addCategory} className="text-xs border border-gray-300 px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors">
              + Add Category
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pb-8">
          <button
            type="submit"
            className="px-8 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: '#D71500' }}
          >
            {isEditing ? 'Update Report →' : 'Generate Report →'}
          </button>
        </div>
      </form>
    </div>
  );
}
