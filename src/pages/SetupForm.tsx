import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
import type { ReportData, Requirement, UnexpectedChange, DiscrepancyCategory, DiscrepancyItem, ElementType, ChangeType, RequirementStatus, DrawnBox, RevisedFile, RevisedLabelPage, ReportMode } from '@/common/types';
import { BoundingBoxDrawer } from '@/components/BoundingBoxDrawer';
import { getDrafts, loadDraft, saveDraft, deleteDraft, toDataUrl, type Draft } from '@/services/drafts';

interface SetupFormProps {
  initialData?: ReportData;
  onSubmit: (data: ReportData) => void;
}

// ─── Local form state for a revised page (adds 'pending' status) ──────────────
interface RevisedPageState extends Omit<RevisedLabelPage, 'status'> {
  status: 'pending' | 'changed' | 'no-changes';
  unexpectedChanges: UnexpectedChange[];
}
interface RevisedFileState {
  fileName: string;
  pages: RevisedPageState[];
}

const ELEMENT_TYPES: ElementType[] = ['Text', 'Symbol', 'Barcode', 'Image'];
const CHANGE_TYPES_REQ: ChangeType[] = ['Modified', 'Added', 'Deleted'];
const CHANGE_TYPES_DISC: ChangeType[] = ['Modified', 'Added', 'Deleted', 'Misplaced', 'Repositioned'];
const REQ_STATUSES: RequirementStatus[] = ['Match', 'Unmatch'];

function makeRequirement(id: number): Requirement {
  return { id, elementType: 'Text', changeType: 'Modified', description: '', expectedValue: '', actualValue: '', status: 'Match' };
}

function makeUnexpectedChange(id: number): UnexpectedChange {
  return { id, elementType: 'Text', changeType: 'Modified', description: '', actualValue: '', status: 'Match' };
}

function makeCategory(): DiscrepancyCategory {
  return { title: '', items: [] };
}

function makeItem(): DiscrepancyItem {
  return { changeType: 'Modified', value: '' };
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

const AUTO_SAVE_KEY = 'setupFormAutoSave';

function readAutoSave(): ReportData | null {
  try {
    const raw = localStorage.getItem(AUTO_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReportData;
    // Discard auto-saves from the old form version that don't have revisedFiles.
    // They would incorrectly pre-populate Section 4 with a stale label image.
    if (!parsed.revisedFiles?.length) return null;
    return parsed;
  } catch { return null; }
}

// ─── Render all pages from a PDF file, returning data URLs ───────────────────
async function renderPdfPages(file: File): Promise<string[]> {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      try {
        const typedArray = new Uint8Array(reader.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        const urls: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d')!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          urls.push(canvas.toDataURL('image/png'));
        }
        resolve(urls);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ─── Requirements table (reusable for common + per-page) ─────────────────────
function RequirementsTable({
  requirements,
  onAdd,
  onUpdate,
  onDelete,
}: {
  requirements: Requirement[];
  onAdd: () => void;
  onUpdate: (i: number, field: keyof Requirement, value: string) => void;
  onDelete: (i: number) => void;
}) {
  const inp = "w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none";
  const sel = "w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none bg-white";
  return (
    <div className="space-y-2">
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
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((req, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                <td className="px-2 py-1">
                  <select className={sel} value={req.elementType} onChange={e => onUpdate(i, 'elementType', e.target.value)}>
                    {ELEMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select className={sel} value={req.changeType} onChange={e => onUpdate(i, 'changeType', e.target.value)}>
                    {CHANGE_TYPES_REQ.map(t => <option key={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1"><input className={inp} value={req.description} onChange={e => onUpdate(i, 'description', e.target.value)} placeholder="Description" /></td>
                <td className="px-2 py-1"><input className={inp} value={req.expectedValue} onChange={e => onUpdate(i, 'expectedValue', e.target.value)} placeholder="Expected" /></td>
                <td className="px-2 py-1"><input className={inp} value={req.actualValue} onChange={e => onUpdate(i, 'actualValue', e.target.value)} placeholder="Actual" /></td>
                <td className="px-2 py-1">
                  <select className={sel} value={req.status} onChange={e => onUpdate(i, 'status', e.target.value)}>
                    {REQ_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1 text-center">
                  <button type="button" onClick={() => onDelete(i)} className="text-gray-400 hover:text-red-500 font-bold text-base leading-none">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={onAdd} className="text-xs border border-gray-300 px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors">
        + Add Requirement
      </button>
    </div>
  );
}

// ─── Unexpected changes table ─────────────────────────────────────────────────
function UnexpectedChangesTable({
  items,
  onAdd,
  onUpdate,
  onDelete,
}: {
  items: UnexpectedChange[];
  onAdd: () => void;
  onUpdate: (i: number, field: keyof UnexpectedChange, value: string) => void;
  onDelete: (i: number) => void;
}) {
  const inp = "w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none";
  const sel = "w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none bg-white";
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '3%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '32%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '6%' }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold">#</th>
              <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold">Element</th>
              <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold">Change Type</th>
              <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold">Requirements</th>
              <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold">Actual Value</th>
              <th className="px-2 py-2 text-left text-[10px] uppercase text-gray-600 font-bold">Status</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                <td className="px-2 py-1">
                  <select className={sel} value={item.elementType} onChange={e => onUpdate(i, 'elementType', e.target.value)}>
                    {ELEMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select className={sel} value={item.changeType} onChange={e => onUpdate(i, 'changeType', e.target.value)}>
                    {CHANGE_TYPES_REQ.map(t => <option key={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1"><input className={inp} value={item.description} onChange={e => onUpdate(i, 'description', e.target.value)} placeholder="Description" /></td>
                <td className="px-2 py-1"><input className={inp} value={item.actualValue} onChange={e => onUpdate(i, 'actualValue', e.target.value)} placeholder="Actual" /></td>
                <td className="px-2 py-1">
                  <select className={sel} value={item.status} onChange={e => onUpdate(i, 'status', e.target.value)}>
                    {REQ_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1 text-center">
                  <button type="button" onClick={() => onDelete(i)} className="text-gray-400 hover:text-red-500 font-bold text-base leading-none">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={onAdd} className="text-xs border border-gray-300 px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors">
        + Add Unexpected Change
      </button>
    </div>
  );
}

// ─── Discrepancy categories (reusable) ───────────────────────────────────────
function DiscrepancySection({
  categories,
  onAddCategory,
  onDeleteCategory,
  onUpdateTitle,
  onAddItem,
  onDeleteItem,
  onUpdateItem,
}: {
  categories: DiscrepancyCategory[];
  onAddCategory: () => void;
  onDeleteCategory: (ci: number) => void;
  onUpdateTitle: (ci: number, title: string) => void;
  onAddItem: (ci: number) => void;
  onDeleteItem: (ci: number, ii: number) => void;
  onUpdateItem: (ci: number, ii: number, field: keyof DiscrepancyItem, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      {categories.map((cat, ci) => (
        <div key={ci} className="border border-gray-200 p-3 space-y-2">
          <div className="flex items-center gap-3">
            <input
              className="border border-gray-300 px-2 py-1 text-xs font-bold uppercase w-48 focus:outline-none bg-white"
              value={cat.title}
              onChange={e => onUpdateTitle(ci, e.target.value)}
              placeholder="CATEGORY NAME"
            />
            <button type="button" onClick={() => onDeleteCategory(ci)} className="text-xs text-gray-400 hover:text-red-500">Remove</button>
          </div>
          {cat.items.length > 0 && (
            <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
              <colgroup><col style={{ width: '20%' }} /><col style={{ width: '74%' }} /><col style={{ width: '6%' }} /></colgroup>
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
                      <select className="w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none bg-white" value={item.changeType} onChange={e => onUpdateItem(ci, ii, 'changeType', e.target.value)}>
                        {CHANGE_TYPES_DISC.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input className="w-full border border-gray-300 px-1 py-1 text-xs focus:outline-none" value={item.value} onChange={e => onUpdateItem(ci, ii, 'value', e.target.value)} placeholder="Description of change" />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button type="button" onClick={() => onDeleteItem(ci, ii)} className="text-gray-400 hover:text-red-500 font-bold text-base leading-none">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button type="button" onClick={() => onAddItem(ci)} className="text-xs border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-50">+ Add Item</button>
        </div>
      ))}
      <button type="button" onClick={onAddCategory} className="text-xs border border-gray-300 px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors">
        + Add Category
      </button>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function SetupForm({ initialData, onSubmit }: SetupFormProps) {
  const isEditing = !!initialData;
  const auto = !isEditing ? readAutoSave() : null;

  // ── Mode ──
  const [reportMode, setReportMode] = useState<ReportMode>(initialData?.reportMode ?? auto?.reportMode ?? 'B');

  // ── Metadata ──
  const [reportId,        setReportId]        = useState(initialData?.reportId ?? auto?.reportId ?? generateReportId());
  const [crNumber,        setCrNumber]        = useState(initialData?.crNumber ?? auto?.crNumber ?? '');
  const [sku,             setSku]             = useState(initialData?.sku ?? auto?.sku ?? '');
  const [currentRevision, setCurrentRevision] = useState(initialData?.currentRevision ?? auto?.currentRevision ?? '');
  const [newRevision,     setNewRevision]     = useState(initialData?.newRevision ?? auto?.newRevision ?? '');

  // ── Base label ──
  const [currentLabelName,  setCurrentLabelName]  = useState(initialData?.currentLabelName ?? auto?.currentLabelName ?? '');
  const [currentLabelUrl,   setCurrentLabelUrl]   = useState(initialData?.currentLabelUrl  ?? auto?.currentLabelUrl  ?? '');
  const [currentLabelPages, setCurrentLabelPages] = useState<{ url: string; name: string; boxes: DrawnBox[] }[]>(() => {
    const saved = initialData?.currentLabelPages ?? auto?.currentLabelPages;
    if (saved?.length) return saved.map(p => ({ ...p, boxes: p.boxes ?? [] }));
    // Fall back to single URL from old data
    const url   = initialData?.currentLabelUrl ?? auto?.currentLabelUrl ?? '';
    const name  = initialData?.currentLabelName ?? auto?.currentLabelName ?? '';
    const boxes = initialData?.currentBoxes ?? auto?.currentBoxes ?? [];
    return url ? [{ url, name, boxes }] : [];
  });
  const [currentBoxes,      setCurrentBoxes]      = useState<DrawnBox[]>(initialData?.currentBoxes ?? auto?.currentBoxes ?? []);

  // ── Common requirements ──
  const [commonRequirements, setCommonRequirements] = useState<Requirement[]>(
    (initialData?.commonRequirements ?? initialData?.requirements ?? auto?.requirements)?.length
      ? (initialData?.commonRequirements ?? initialData?.requirements ?? auto?.requirements)!.map(r => ({
          ...r,
          status: (r.status === 'Matched' ? 'Match' : r.status === 'Unmatched' ? 'Unmatch' : r.status) as RequirementStatus,
        }))
      : [makeRequirement(1)]
  );

  // ── Common unexpected changes ──
  const [commonUnexpectedChanges, setCommonUnexpectedChanges] = useState<UnexpectedChange[]>(
    (initialData?.commonUnexpectedChanges ?? auto?.commonUnexpectedChanges) ?? []
  );

  // ── Common discrepancy categories ──
  const [commonCategories, setCommonCategories] = useState<DiscrepancyCategory[]>(
    (initialData?.discrepancyCategories ?? auto?.discrepancyCategories)?.length
      ? (initialData?.discrepancyCategories ?? auto?.discrepancyCategories)!
      : [makeCategory()]
  );

  // ── Revised files ──
  // Only convert legacy flat fields when explicitly editing (initialData), not from auto-save.
  // Auto-save only restores revisedFiles if it was saved by the new form (has revisedFiles key).
  const [revisedFiles, setRevisedFiles] = useState<RevisedFileState[]>(() => {
    // New format: revisedFiles array exists
    if (initialData?.revisedFiles?.length) {
      return initialData.revisedFiles.map(f => ({ ...f, pages: f.pages.map(p => ({ ...p })) }));
    }
    if (auto?.revisedFiles?.length) {
      return auto.revisedFiles.map(f => ({ ...f, pages: f.pages.map(p => ({ ...p })) }));
    }

    // Legacy conversion only for explicit editing (not auto-save)
    if (initialData) {
      if (initialData.newLabelPages?.length) {
        return [{
          fileName: initialData.newLabelName ?? 'Revised Label',
          pages: initialData.newLabelPages.map((p, i) => ({
            url: p.url, name: p.name, sku: '', revisionName: '', labelType: p.labelType, stockNumber: p.stockNumber,
            status: i === 0 ? 'changed' : 'no-changes',
            boxes: i === 0 ? (initialData.newBoxes ?? []) : [],
            requirements: [],
            discrepancyCategories: [],
          } as RevisedPageState)),
        }];
      }
      if (initialData.newLabelUrl) {
        return [{
          fileName: initialData.newLabelName ?? 'Revised Label',
          pages: [{
            url: initialData.newLabelUrl,
            name: initialData.newLabelName ?? '',
            sku: '', revisionName: '', labelType: '', stockNumber: '',
            status: 'changed',
            boxes: initialData.newBoxes ?? [],
            requirements: [],
            discrepancyCategories: [],
          }],
        }];
      }
    }

    return [];
  });

  // ── Drafts ──
  const [drafts,          setDrafts]          = useState<Draft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [savingDraft,     setSavingDraft]     = useState(false);

  // ── Auto-save ──
  useEffect(() => {
    if (isEditing) return;
    try {
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify({
        reportMode,
        reportId, crNumber, sku, currentRevision, newRevision,
        currentLabelName, currentLabelUrl, currentLabelPages, currentBoxes,
        commonRequirements,
        commonUnexpectedChanges,
        revisedFiles,
        ...deriveLegacyFields(),
        discrepancyCategories: commonCategories,
      }));
    } catch { /* quota */ }
  }, [reportMode, reportId, crNumber, sku, currentRevision, newRevision,
      currentLabelName, currentLabelUrl, currentLabelPages, currentBoxes,
      commonRequirements, commonUnexpectedChanges, commonCategories, revisedFiles, isEditing]);

  useEffect(() => {
    getDrafts().then(list => {
      setDrafts(list);
      const last = localStorage.getItem('lastDraftId');
      if (last && list.some(d => d.id === last)) {
        setSelectedDraftId(last);
        loadDraft(last).then(draft => { if (draft.data) loadDraftData(draft.data); }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const refreshDrafts = () => getDrafts().then(setDrafts);

  // ── Derive legacy flat fields from first changed page ──────────────────────
  function deriveLegacyFields() {
    for (const file of revisedFiles) {
      const changed = file.pages.find(p => p.status === 'changed');
      if (changed) {
        return {
          newLabelName: changed.name || file.fileName,
          newRevision,
          newLabelUrl: changed.url,
          newBoxes: changed.boxes,
          requirements: [...commonRequirements, ...changed.requirements].map((r, i) => ({ ...r, id: i + 1 })),
          discrepancyCategories: changed.discrepancyCategories.length
            ? changed.discrepancyCategories
            : commonCategories.filter(c => c.title || c.items.length),
          newLabelPages: revisedFiles.flatMap(f =>
            f.pages.map(p => ({ url: p.url, name: p.name, labelType: p.labelType, stockNumber: p.stockNumber }))
          ),
        };
      }
    }
    return {
      newLabelName: '', newRevision, newLabelUrl: '', newBoxes: [],
      requirements: commonRequirements.map((r, i) => ({ ...r, id: i + 1 })),
      discrepancyCategories: commonCategories.filter(c => c.title || c.items.length),
      newLabelPages: undefined,
    };
  }

  // ── Draft handlers ──────────────────────────────────────────────────────────
  const loadDraftData = (d: ReportData) => {
    if (d.reportMode) setReportMode(d.reportMode);
    setReportId(d.reportId);
    setCrNumber(d.crNumber);
    setSku(d.sku);
    setCurrentRevision(d.currentRevision);
    setNewRevision(d.newRevision);
    setCurrentLabelName(d.currentLabelName);
    setCurrentLabelUrl(d.currentLabelUrl);
    const draftPages = d.currentLabelPages;
    setCurrentLabelPages(
      draftPages?.length
        ? draftPages.map(p => ({ ...p, boxes: p.boxes ?? [] }))
        : d.currentLabelUrl ? [{ url: d.currentLabelUrl, name: d.currentLabelName ?? '', boxes: d.currentBoxes ?? [] }] : []
    );
    setCurrentBoxes(d.currentBoxes);
    setCommonRequirements(
      (d.commonRequirements ?? d.requirements)?.length
        ? (d.commonRequirements ?? d.requirements).map(r => ({ ...r, status: (r.status === 'Matched' ? 'Match' : r.status === 'Unmatched' ? 'Unmatch' : r.status) as RequirementStatus }))
        : [makeRequirement(1)]
    );
    setCommonCategories(d.discrepancyCategories?.length ? d.discrepancyCategories : [makeCategory()]);
    setCommonUnexpectedChanges(d.commonUnexpectedChanges ?? []);
    if (d.revisedFiles?.length) {
      setRevisedFiles(d.revisedFiles.map(f => ({ ...f, pages: f.pages.map(p => ({ ...p })) })));
    } else if (d.newLabelPages?.length) {
      setRevisedFiles([{
        fileName: d.newLabelName ?? 'Revised Label',
        pages: d.newLabelPages.map((p, i) => ({
          url: p.url, name: p.name, sku: '', revisionName: '', labelType: p.labelType, stockNumber: p.stockNumber,
          status: i === 0 ? 'changed' : 'no-changes',
          boxes: i === 0 ? d.newBoxes : [],
          requirements: [],
          discrepancyCategories: [],
        } as RevisedPageState)),
      }]);
    } else if (d.newLabelUrl) {
      setRevisedFiles([{
        fileName: d.newLabelName ?? 'Revised Label',
        pages: [{ url: d.newLabelUrl, name: d.newLabelName ?? '', sku: '', revisionName: '', labelType: '', stockNumber: '', status: 'changed', boxes: d.newBoxes ?? [], requirements: [], discrepancyCategories: [] }],
      }]);
    } else {
      setRevisedFiles([]);
    }
  };

  const handleSelectDraft = async (id: string) => {
    setSelectedDraftId(id);
    if (!id) return;
    try {
      const draft = await loadDraft(id);
      if (draft.data) { loadDraftData(draft.data); localStorage.setItem('lastDraftId', id); }
    } catch (e) { alert(`Failed to load draft: ${e instanceof Error ? e.message : 'unknown error'}`); }
  };

  const buildReportData = async (): Promise<ReportData> => {
    const resolvedCurrentUrl = await toDataUrl(currentLabelUrl);
    const legacy = deriveLegacyFields();
    return {
      reportMode,
      reportId, crNumber, sku, currentRevision, newRevision: legacy.newRevision,
      currentLabelName, currentLabelUrl: resolvedCurrentUrl,
      currentLabelPages,
      newLabelName: legacy.newLabelName,
      newLabelUrl: legacy.newLabelUrl,
      currentBoxes, newBoxes: legacy.newBoxes,
      requirements: legacy.requirements,
      discrepancyCategories: legacy.discrepancyCategories,
      newLabelPages: legacy.newLabelPages,
      commonRequirements: commonRequirements.map((r, i) => ({ ...r, id: i + 1 })),
      commonUnexpectedChanges: commonUnexpectedChanges.map((r, i) => ({ ...r, id: i + 1 })),
      revisedFiles: revisedFiles.map(f => ({
        fileName: f.fileName,
        pages: f.pages
          .filter(p => p.status !== 'pending')
          .map(p => ({
            url: p.url, name: p.name, sku: p.sku ?? '', revisionName: p.revisionName ?? '', labelType: p.labelType, stockNumber: p.stockNumber,
            status: p.status as 'changed' | 'no-changes',
            boxes: p.boxes,
            requirements: p.requirements.map((r, i) => ({ ...r, id: i + 1 })),
            unexpectedChanges: (p.unexpectedChanges ?? []).map((r, i) => ({ ...r, id: i + 1 })),
            discrepancyCategories: p.discrepancyCategories.filter(c => c.title || c.items.length),
          })),
      })),
    };
  };

  const persistDraft = async (id: string, data: ReportData) => {
    // For Mode B & C the global sku is empty — fall back to first per-page SKU, then report ID
    const draftLabel =
      data.sku ||
      data.revisedFiles?.flatMap(f => f.pages).find(p => p.sku)?.sku ||
      data.reportId;
    await saveDraft({ id, label: draftLabel, savedAt: new Date().toISOString(), data });
    setSelectedDraftId(id);
    localStorage.setItem('lastDraftId', id);
    await refreshDrafts();
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const now = new Date();
      const ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
      const todayPrefix = `${ist.getUTCFullYear()}${String(ist.getUTCMonth() + 1).padStart(2, '0')}${String(ist.getUTCDate()).padStart(2, '0')}`;
      const id = reportId.slice(0, 8) !== todayPrefix ? generateReportId(drafts.map(d => d.id)) : reportId;
      if (id !== reportId) setReportId(id);
      const data = await buildReportData();
      if (selectedDraftId && selectedDraftId !== id) await deleteDraft(selectedDraftId);
      await persistDraft(id, { ...data, reportId: id });
      alert(`Draft "${id}" saved.`);
    } catch (err) {
      alert(`Failed to save draft: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally { setSavingDraft(false); }
  };

  const handleCreateNew = () => {
    localStorage.removeItem(AUTO_SAVE_KEY);
    localStorage.removeItem('lastDraftId');
    setSelectedDraftId('');
    setReportId(generateReportId(drafts.map(d => d.id)));
    setReportMode('B');
    setCrNumber(''); setSku(''); setCurrentRevision(''); setNewRevision('');
    setCurrentLabelName(''); setCurrentLabelUrl(''); setCurrentLabelPages([]); setCurrentBoxes([]);
    setCommonRequirements([makeRequirement(1)]);
    setCommonCategories([makeCategory()]);
    setRevisedFiles([]);
  };

  const handleDeleteDraft = async () => {
    if (!selectedDraftId) return;
    if (!confirm(`Delete draft "${selectedDraftId}"?`)) return;
    await deleteDraft(selectedDraftId);
    setSelectedDraftId('');
    localStorage.removeItem('lastDraftId');
    refreshDrafts();
  };

  // ── Base label upload ───────────────────────────────────────────────────────
  const handleBaseUpload = (file: File) => {
    const name = file.name.replace(/\.[^.]+$/, '');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      renderPdfPages(file).then(urls => {
        setCurrentLabelUrl(urls[0]);
        setCurrentLabelName(name);
        setCurrentLabelPages(urls.map((url, i) => ({
          url,
          name: urls.length > 1 ? `${name} (Page ${i + 1})` : name,
          boxes: [],
        })));
      }).catch(err => alert(`Failed to process PDF: ${err instanceof Error ? err.message : String(err)}`));
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setCurrentLabelUrl(url);
        setCurrentLabelName(name);
        setCurrentLabelPages([{ url, name, boxes: [] }]);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Base page box updater ───────────────────────────────────────────────────
  const updateBasePageBoxes = (pi: number, boxes: DrawnBox[]) =>
    setCurrentLabelPages(prev => prev.map((p, i) => i === pi ? { ...p, boxes } : p));

  // ── Build a RevisedFileState from a File ───────────────────────────────────
  const buildRevisedFileState = async (file: File): Promise<RevisedFileState> => {
    const fileName = file.name;
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const urls = isPdf
      ? await renderPdfPages(file)
      : await new Promise<string[]>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve([reader.result as string]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
    return {
      fileName,
      pages: urls.map((url, i) => ({
        url,
        name: urls.length > 1 ? `${baseName} (Page ${i + 1})` : baseName,
        sku: '', revisionName: '',
        labelType: '', stockNumber: '',
        status: 'pending' as const,
        boxes: [], requirements: [], unexpectedChanges: [], discrepancyCategories: [],
      })),
    };
  };

  // Upload handler for the primary revised file (Section 2 right side)
  const handlePrimaryRevisedUpload = async (file: File) => {
    try {
      const newFile = await buildRevisedFileState(file);
      setRevisedFiles(prev => [newFile, ...prev.slice(1)]);
    } catch (err) {
      alert(`Failed to process file: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // ── Revised file upload (additional files, Section 4) ──────────────────────
  const handleAddRevisedFile = async (file: File) => {
    try {
      const newFile = await buildRevisedFileState(file);
      setRevisedFiles(prev => [...prev, newFile]);
    } catch (err) {
      alert(`Failed to process file: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // ── Revised file/page updaters ──────────────────────────────────────────────
  const removeRevisedFile = (fi: number) =>
    setRevisedFiles(prev => prev.filter((_, i) => i !== fi));

  const updatePage = <K extends keyof RevisedPageState>(fi: number, pi: number, field: K, value: RevisedPageState[K]) =>
    setRevisedFiles(prev => prev.map((f, i) => i !== fi ? f : {
      ...f,
      pages: f.pages.map((p, j) => j !== pi ? p : { ...p, [field]: value }),
    }));

  const addPageRequirement = (fi: number, pi: number) =>
    setRevisedFiles(prev => prev.map((f, i) => i !== fi ? f : {
      ...f,
      pages: f.pages.map((p, j) => j !== pi ? p : {
        ...p,
        requirements: [...p.requirements, makeRequirement(p.requirements.length ? p.requirements[p.requirements.length - 1].id + 1 : 1)],
      }),
    }));

  const updatePageReq = (fi: number, pi: number, ri: number, field: keyof Requirement, value: string) =>
    setRevisedFiles(prev => prev.map((f, i) => i !== fi ? f : {
      ...f,
      pages: f.pages.map((p, j) => j !== pi ? p : {
        ...p,
        requirements: p.requirements.map((r, k) => k !== ri ? r : { ...r, [field]: value }),
      }),
    }));

  const deletePageReq = (fi: number, pi: number, ri: number) =>
    setRevisedFiles(prev => prev.map((f, i) => i !== fi ? f : {
      ...f,
      pages: f.pages.map((p, j) => j !== pi ? p : {
        ...p,
        requirements: p.requirements.filter((_, k) => k !== ri).map((r, k) => ({ ...r, id: k + 1 })),
      }),
    }));

  const addPageUnexpectedChange = (fi: number, pi: number) =>
    setRevisedFiles(prev => prev.map((f, i) => i !== fi ? f : {
      ...f,
      pages: f.pages.map((p, j) => j !== pi ? p : {
        ...p,
        unexpectedChanges: [...(p.unexpectedChanges ?? []), makeUnexpectedChange((p.unexpectedChanges?.length ?? 0) + 1)],
      }),
    }));

  const updatePageUnexpectedChange = (fi: number, pi: number, ri: number, field: keyof UnexpectedChange, value: string) =>
    setRevisedFiles(prev => prev.map((f, i) => i !== fi ? f : {
      ...f,
      pages: f.pages.map((p, j) => j !== pi ? p : {
        ...p,
        unexpectedChanges: (p.unexpectedChanges ?? []).map((r, k) => k !== ri ? r : { ...r, [field]: value }),
      }),
    }));

  const deletePageUnexpectedChange = (fi: number, pi: number, ri: number) =>
    setRevisedFiles(prev => prev.map((f, i) => i !== fi ? f : {
      ...f,
      pages: f.pages.map((p, j) => j !== pi ? p : {
        ...p,
        unexpectedChanges: (p.unexpectedChanges ?? []).filter((_, k) => k !== ri).map((r, k) => ({ ...r, id: k + 1 })),
      }),
    }));

  const addPageCategory = (fi: number, pi: number) =>
    setRevisedFiles(prev => prev.map((f, i) => i !== fi ? f : {
      ...f,
      pages: f.pages.map((p, j) => j !== pi ? p : { ...p, discrepancyCategories: [...p.discrepancyCategories, makeCategory()] }),
    }));

  const deletePageCategory = (fi: number, pi: number, ci: number) =>
    setRevisedFiles(prev => prev.map((f, i) => i !== fi ? f : {
      ...f,
      pages: f.pages.map((p, j) => j !== pi ? p : { ...p, discrepancyCategories: p.discrepancyCategories.filter((_, k) => k !== ci) }),
    }));

  const updatePageCatTitle = (fi: number, pi: number, ci: number, title: string) =>
    setRevisedFiles(prev => prev.map((f, i) => i !== fi ? f : {
      ...f,
      pages: f.pages.map((p, j) => j !== pi ? p : {
        ...p,
        discrepancyCategories: p.discrepancyCategories.map((c, k) => k !== ci ? c : { ...c, title }),
      }),
    }));

  const addPageItem = (fi: number, pi: number, ci: number) =>
    setRevisedFiles(prev => prev.map((f, i) => i !== fi ? f : {
      ...f,
      pages: f.pages.map((p, j) => j !== pi ? p : {
        ...p,
        discrepancyCategories: p.discrepancyCategories.map((c, k) => k !== ci ? c : { ...c, items: [...c.items, makeItem()] }),
      }),
    }));

  const deletePageItem = (fi: number, pi: number, ci: number, ii: number) =>
    setRevisedFiles(prev => prev.map((f, i) => i !== fi ? f : {
      ...f,
      pages: f.pages.map((p, j) => j !== pi ? p : {
        ...p,
        discrepancyCategories: p.discrepancyCategories.map((c, k) => k !== ci ? c : { ...c, items: c.items.filter((_, l) => l !== ii) }),
      }),
    }));

  const updatePageItem = (fi: number, pi: number, ci: number, ii: number, field: keyof DiscrepancyItem, value: string) =>
    setRevisedFiles(prev => prev.map((f, i) => i !== fi ? f : {
      ...f,
      pages: f.pages.map((p, j) => j !== pi ? p : {
        ...p,
        discrepancyCategories: p.discrepancyCategories.map((c, k) => k !== ci ? c : {
          ...c,
          items: c.items.map((item, l) => l !== ii ? item : { ...item, [field]: value }),
        }),
      }),
    }));

  // ── Common requirements handlers ────────────────────────────────────────────
  const addCommonReq = () =>
    setCommonRequirements(prev => [...prev, makeRequirement(prev.length ? prev[prev.length - 1].id + 1 : 1)]);
  const updateCommonReq = (i: number, field: keyof Requirement, value: string) =>
    setCommonRequirements(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  const deleteCommonReq = (i: number) =>
    setCommonRequirements(prev => prev.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, id: idx + 1 })));

  // ── Common unexpected changes handlers ─────────────────────────────────────
  const addCommonUnexpected = () =>
    setCommonUnexpectedChanges(prev => [...prev, makeUnexpectedChange(prev.length + 1)]);
  const updateCommonUnexpected = (i: number, field: keyof UnexpectedChange, value: string) =>
    setCommonUnexpectedChanges(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  const deleteCommonUnexpected = (i: number) =>
    setCommonUnexpectedChanges(prev => prev.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, id: idx + 1 })));

  // ── Common categories handlers ──────────────────────────────────────────────
  const addCommonCat    = () => setCommonCategories(prev => [...prev, makeCategory()]);
  const deleteCommonCat = (ci: number) => setCommonCategories(prev => prev.filter((_, i) => i !== ci));
  const updateCommonCatTitle = (ci: number, title: string) =>
    setCommonCategories(prev => prev.map((c, i) => i === ci ? { ...c, title } : c));
  const addCommonItem = (ci: number) =>
    setCommonCategories(prev => prev.map((c, i) => i === ci ? { ...c, items: [...c.items, makeItem()] } : c));
  const deleteCommonItem = (ci: number, ii: number) =>
    setCommonCategories(prev => prev.map((c, i) => i === ci ? { ...c, items: c.items.filter((_, j) => j !== ii) } : c));
  const updateCommonItem = (ci: number, ii: number, field: keyof DiscrepancyItem, value: string) =>
    setCommonCategories(prev => prev.map((c, i) => i === ci
      ? { ...c, items: c.items.map((item, j) => j === ii ? { ...item, [field]: value } : item) }
      : c
    ));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasAnyRevisedPage = revisedFiles.some(f => f.pages.some(p => p.status !== 'pending'));
    if (!hasAnyRevisedPage) { alert('Please upload at least one revised version file and mark each page.'); return; }
    const pendingPages = revisedFiles.flatMap((f, fi) =>
      f.pages.map((p, pi) => p.status === 'pending' ? `File ${fi + 1} Page ${pi + 1}` : null).filter(Boolean)
    );
    if (pendingPages.length) {
      if (!confirm(`${pendingPages.length} page(s) are still marked as Pending and will be excluded. Continue?`)) return;
    }
    const now = new Date();
    const ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
    const todayPrefix = `${ist.getUTCFullYear()}${String(ist.getUTCMonth() + 1).padStart(2, '0')}${String(ist.getUTCDate()).padStart(2, '0')}`;
    const id = reportId.slice(0, 8) !== todayPrefix ? generateReportId(drafts.map(d => d.id)) : reportId;
    if (id !== reportId) setReportId(id);
    const data = await buildReportData();
    const finalData = { ...data, reportId: id };
    buildReportData().then(async d => {
      if (selectedDraftId && selectedDraftId !== id) await deleteDraft(selectedDraftId);
      await persistDraft(id, { ...d, reportId: id });
    }).catch(() => {});
    onSubmit(finalData);
  };

  // ── CSS shortcuts ───────────────────────────────────────────────────────────
  const input    = "w-full border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500 bg-white";
  const lbl      = "block text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1";
  const sec      = "bg-white border border-gray-300 p-6 space-y-4";
  const secH     = "text-xs uppercase tracking-wide font-bold text-gray-700 pb-3 border-b border-gray-200";
  const fileInput = "block w-full text-xs text-gray-600 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:border file:border-gray-300 file:text-xs file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 file:cursor-pointer";

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {/* Header */}
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
        <button type="button" disabled={!selectedDraftId} onClick={handleDeleteDraft}
          className="px-3 py-1.5 text-xs border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          Delete
        </button>
        <div className="flex-1" />
        <button type="button" onClick={handleCreateNew} disabled={savingDraft}
          className="px-4 py-1.5 text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">
          + Create New
        </button>
        <button type="button" onClick={handleSaveDraft} disabled={savingDraft}
          className="px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-60"
          style={{ backgroundColor: '#D71500' }}>
          {savingDraft ? 'Saving...' : 'Save Draft'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-[1200px] mx-auto p-8 space-y-6">

        {/* 0. Report Mode */}
        <div className={sec}>
          <div className={secH}>Report Mode</div>
          <p className="text-xs text-gray-500">Select the type of report you are generating.</p>
          <div className="flex gap-3 pt-1">
            {([
              { id: 'A' as ReportMode, label: 'Existing + Master', desc: 'Base label vs revised label side by side, with requirements summary and changes made.' },
              { id: 'B' as ReportMode, label: 'Supportive + Master', desc: 'Revised label only with requirements and changes detail.' },
              { id: 'C' as ReportMode, label: 'Full Comparison',    desc: 'Side-by-side images plus full requirements and changes detail.' },
            ] as { id: ReportMode; label: string; desc: string }[]).map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setReportMode(m.id)}
                className={`flex-1 border-2 px-4 py-3 text-left transition-colors ${reportMode === m.id ? 'border-[#D71500] bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
              >
                <div className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${reportMode === m.id ? 'text-[#D71500]' : 'text-gray-700'}`}>
                  {m.label}
                </div>
                <div className="text-[11px] text-gray-500">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 1. Metadata */}
        <div className={sec}>
          <div className={secH}>1. Report Metadata</div>
          <div className={`grid gap-4 ${reportMode === 'A' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div><label className={lbl}>Report ID (LPR)</label>
              <input className={input} value={reportId} onChange={e => setReportId(e.target.value)} placeholder="e.g. 202603180001" /></div>
            <div><label className={lbl}>CR Number (Optional)</label>
              <input className={input} value={crNumber} onChange={e => setCrNumber(e.target.value)} placeholder="-" /></div>
            {reportMode === 'A' && (
              <div><label className={lbl}>SKU</label>
                <input className={input} value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. 187301111" required /></div>
            )}
          </div>
          <div className={`grid gap-4 ${reportMode === 'A' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div><label className={lbl}>Current Revision</label>
              <input className={input} value={currentRevision} onChange={e => setCurrentRevision(e.target.value)} placeholder="e.g. Rev-D" /></div>
            {reportMode === 'A' && (
              <div><label className={lbl}>New Revision</label>
                <input className={input} value={newRevision} onChange={e => setNewRevision(e.target.value)} placeholder="e.g. Rev-E" required /></div>
            )}
            <div><label className={lbl}>Current Version Label Name</label>
              <input className={input} value={currentLabelName} onChange={e => setCurrentLabelName(e.target.value)} placeholder="e.g. LCN-187301111_1_Rev-D" /></div>
          </div>
        </div>

        {/* 2. Label Images */}
        <div className={sec}>
          <div className={secH}>2. Label Images</div>
          <p className="text-xs text-gray-500">
            {reportMode === 'A' && 'Upload the base PDF and the revised PDF. Mark each revised page as changed or no-changes.'}
            {reportMode === 'B' && 'Upload the revised PDF(s). Mark each page, then fill in requirements and changes below.'}
            {reportMode === 'C' && 'Upload the base PDF and the revised PDF(s). Mark each revised page, then fill in requirements and changes below.'}
          </p>
          <div className={reportMode === 'B' ? '' : 'grid grid-cols-2 gap-8'}>

            {/* Left: Base label — hidden for Mode B */}
            {reportMode !== 'B' && (
              <div className="space-y-3">
                <label className={lbl}>
                  Current Version Label (Base)
                  {currentLabelPages.length > 1 && <span className="ml-2 text-gray-400 normal-case font-normal">({currentLabelPages.length} pages)</span>}
                </label>
                <input type="file" accept="image/*,.pdf,application/pdf" className={fileInput}
                  onChange={e => e.target.files?.[0] && handleBaseUpload(e.target.files[0])} />
                {currentLabelPages.length > 0 ? (
                  <div className="space-y-4">
                    {currentLabelPages.map((page, pi) => (
                      <div key={pi} className="border border-gray-200">
                        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Page {pi + 1}</span>
                          <span className="text-[10px] text-gray-400 truncate">{page.name}</span>
                        </div>
                        <div className="p-2">
                          <BoundingBoxDrawer
                            imageUrl={page.url}
                            imageLabel={page.name || `Page ${pi + 1}`}
                            boxes={page.boxes}
                            onChange={boxes => updateBasePageBoxes(pi, boxes)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-gray-300 h-32 flex items-center justify-center text-xs text-gray-400">No image uploaded</div>
                )}
              </div>
            )}

            {/* Right (or full-width for B): Revised files */}
            <div className="space-y-3">
              <label className={lbl}>Revised Label(s)</label>

              {revisedFiles.length > 0 ? (
                <div className="space-y-4">
                  {revisedFiles.map((rFile, fi) => (
                    <div key={fi} className="border border-gray-200">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                        <span className="text-[11px] font-bold text-gray-600 truncate">{rFile.fileName}</span>
                        <button type="button" onClick={() => removeRevisedFile(fi)}
                          className="text-xs text-red-400 hover:text-red-600 shrink-0 ml-2">Remove</button>
                      </div>
                      {rFile.pages.map((page, pi) => (
                        <div key={pi} className="border-b last:border-b-0 border-gray-200">
                          <div className="flex gap-3 p-3 items-start">
                            <div className="shrink-0">
                              <div className="text-[10px] text-gray-400 font-bold mb-1">Pg {pi + 1}</div>
                              <img src={page.url} alt={`Page ${pi + 1}`} className="w-20 h-auto border border-gray-100 block" />
                            </div>
                            <div className="flex-1 space-y-2 min-w-0">
                              <input className="w-full border border-gray-300 px-2 py-1 text-xs focus:outline-none"
                                value={page.name} placeholder="LCN / Label Name"
                                onChange={e => updatePage(fi, pi, 'name', e.target.value)} />
                              <div className={`grid gap-2 ${reportMode !== 'A' ? 'grid-cols-4' : 'grid-cols-2'}`}>
                                {reportMode !== 'A' && (
                                  <input className="w-full border border-gray-300 px-2 py-1 text-xs focus:outline-none"
                                    value={page.sku ?? ''} placeholder="SKU"
                                    onChange={e => updatePage(fi, pi, 'sku', e.target.value)} />
                                )}
                                {reportMode !== 'A' && (
                                  <input className="w-full border border-gray-300 px-2 py-1 text-xs focus:outline-none"
                                    value={page.revisionName ?? ''} placeholder="New Revision (e.g. Rev-E)"
                                    onChange={e => updatePage(fi, pi, 'revisionName', e.target.value)} />
                                )}
                                <input className="w-full border border-gray-300 px-2 py-1 text-xs focus:outline-none"
                                  value={page.labelType} placeholder="Label Type"
                                  onChange={e => updatePage(fi, pi, 'labelType', e.target.value)} />
                                <input className="w-full border border-gray-300 px-2 py-1 text-xs focus:outline-none"
                                  value={page.stockNumber} placeholder="Stock Number"
                                  onChange={e => updatePage(fi, pi, 'stockNumber', e.target.value)} />
                              </div>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => updatePage(fi, pi, 'status', 'changed')}
                                  className={`px-2 py-0.5 text-xs font-semibold border transition-colors ${page.status === 'changed' ? 'bg-[#064b75] text-white border-[#064b75]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                                  Has Changes
                                </button>
                                <button type="button" onClick={() => updatePage(fi, pi, 'status', 'no-changes')}
                                  className={`px-2 py-0.5 text-xs font-semibold border transition-colors ${page.status === 'no-changes' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                                  No Changes ✓
                                </button>
                                {page.status === 'pending' && <span className="text-[10px] text-amber-500 font-semibold">— pending —</span>}
                              </div>
                            </div>
                          </div>
                          {/* Expanded section — bounding boxes + requirements/discrepancy for all modes */}
                          {page.status === 'changed' && (
                            <div className="border-t border-gray-200 p-3 space-y-4">
                              <BoundingBoxDrawer imageUrl={page.url} imageLabel={page.name || `Page ${pi + 1}`}
                                boxes={page.boxes} onChange={boxes => updatePage(fi, pi, 'boxes', boxes)} />
                              <div>
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-2">
                                  Label-Specific Requirements
                                  <span className="ml-1 text-gray-400 normal-case font-normal">(adds to common requirements)</span>
                                </div>
                                <RequirementsTable requirements={page.requirements}
                                  onAdd={() => addPageRequirement(fi, pi)}
                                  onUpdate={(ri, field, value) => updatePageReq(fi, pi, ri, field, value)}
                                  onDelete={ri => deletePageReq(fi, pi, ri)} />
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-2">
                                  Label-Specific Unexpected Changes
                                  <span className="ml-1 text-gray-400 normal-case font-normal">(adds to common unexpected changes)</span>
                                </div>
                                <UnexpectedChangesTable
                                  items={page.unexpectedChanges ?? []}
                                  onAdd={() => addPageUnexpectedChange(fi, pi)}
                                  onUpdate={(ri, field, value) => updatePageUnexpectedChange(fi, pi, ri, field, value)}
                                  onDelete={ri => deletePageUnexpectedChange(fi, pi, ri)}
                                />
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-2">Changes Made</div>
                                <DiscrepancySection categories={page.discrepancyCategories}
                                  onAddCategory={() => addPageCategory(fi, pi)}
                                  onDeleteCategory={ci => deletePageCategory(fi, pi, ci)}
                                  onUpdateTitle={(ci, title) => updatePageCatTitle(fi, pi, ci, title)}
                                  onAddItem={ci => addPageItem(fi, pi, ci)}
                                  onDeleteItem={(ci, ii) => deletePageItem(fi, pi, ci, ii)}
                                  onUpdateItem={(ci, ii, field, value) => updatePageItem(fi, pi, ci, ii, field, value)} />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-gray-300 h-32 flex items-center justify-center text-xs text-gray-400">No file uploaded</div>
              )}

              <label className="block border border-dashed border-gray-400 px-4 py-3 text-center text-xs text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors">
                <input type="file" accept="image/*,.pdf,application/pdf" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) { handleAddRevisedFile(e.target.files[0]); e.target.value = ''; } }} />
                + Upload Revised File (supports multi-page PDFs)
              </label>
            </div>
          </div>
        </div>

        {/* 3. Common Requirements */}
        <div className={sec}>
          <div className={secH}>3. Common Requirements</div>
          <p className="text-xs text-gray-500">Requirements that apply to <strong>all</strong> revised labels. Enter once — they appear in every changed label's report section.</p>
          <RequirementsTable
            requirements={commonRequirements}
            onAdd={addCommonReq}
            onUpdate={updateCommonReq}
            onDelete={deleteCommonReq}
          />
        </div>

        {/* 4. Common Unexpected Changes */}
        <div className={sec}>
          <div className={secH}>4. Common Unexpected Changes</div>
          <p className="text-xs text-gray-500">Changes that occurred but were <strong>not</strong> in the requirements. Apply across all revised labels. Label-specific unexpected changes can be added per page above.</p>
          <UnexpectedChangesTable
            items={commonUnexpectedChanges}
            onAdd={addCommonUnexpected}
            onUpdate={updateCommonUnexpected}
            onDelete={deleteCommonUnexpected}
          />
        </div>

        {/* 5. Common Changes Made */}
        <div className={sec}>
          <div className={secH}>5. Common Changes Made</div>
          <p className="text-xs text-gray-500">Changes that apply across all revised labels. Group by category (e.g. TEXT, SYMBOLS). Label-specific changes can be added per page above.</p>
          <DiscrepancySection
            categories={commonCategories}
            onAddCategory={addCommonCat}
            onDeleteCategory={deleteCommonCat}
            onUpdateTitle={updateCommonCatTitle}
            onAddItem={addCommonItem}
            onDeleteItem={deleteCommonItem}
            onUpdateItem={updateCommonItem}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pb-8">
          <button type="submit" className="px-8 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: '#D71500' }}>
            {isEditing ? 'Update Report →' : 'Generate Report →'}
          </button>
        </div>

      </form>
    </div>
  );
}
