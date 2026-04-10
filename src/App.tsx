import { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from '@/common/ThemeContext';
import { Header } from '@/layouts/Header';
import { MetadataRow } from '@/layouts/MetadataRow';
import { FrameA } from '@/pages/FrameA';
import { SetupForm } from '@/pages/SetupForm';
import { MultiRevisionPrintLayout } from '@/pages/MultiRevisionPrint';
import { MissingChanges }          from '@/components/MissingChanges';
import { LabelComparison }         from '@/components/LabelComparison';
import { InspectionSummary }       from '@/components/InspectionSummary';
import { DiscrepancyDetails }      from '@/components/DiscrepancyDetails';
import { ExpectedChanges }         from '@/components/ExpectedChanges';
import { requirementsToExpectedChanges } from '@/utils/requirementsToExpectedChanges';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { ReportData, MultiRevisionReport, LabelRevision } from '@/common/types';

// ─── Sequential report ID generator ──────────────────────────────────────────

function generateSequentialIds(baseId: string, count: number, offset: number): string[] {
  const datePrefix  = baseId.slice(0, 8);
  const baseCounter = parseInt(baseId.slice(8), 10) || 1;
  return Array.from({ length: count }, (_, i) =>
    `${datePrefix}${String(baseCounter + offset + i).padStart(4, '0')}`
  );
}

// ─── adaptToMultiRevision ─────────────────────────────────────────────────────

function adaptToMultiRevision(data: ReportData): MultiRevisionReport {
  const commonReqs = data.commonRequirements ?? data.requirements ?? [];
  let revisions: MultiRevisionReport['revisions'] = [];

  if (data.revisedFiles?.length) {
    for (let fi = 0; fi < data.revisedFiles.length; fi++) {
      const file = data.revisedFiles[fi];
      for (let pi = 0; pi < file.pages.length; pi++) {
        const page = file.pages[pi];
        if (page.status === 'changed') {
          revisions.push({
            revisionName:          page.revisionName || data.newRevision,
            labelName:             page.name || file.fileName,
            fileName:              file.fileName,
            fileIndex:             fi,
            pageIndex:             pi,
            sku:                   page.sku ?? '',
            labelType:             page.labelType,
            stockNumber:           page.stockNumber,
            labelUrl:              page.url,
            boxes:                 page.boxes,
            hasChanges:            true,
            requirements:          [...commonReqs, ...page.requirements].map((r, i) => ({ ...r, id: i + 1 })),
            discrepancyCategories: page.discrepancyCategories.length
              ? page.discrepancyCategories
              : (data.discrepancyCategories ?? []),
          });
        } else {
          revisions.push({
            revisionName:          page.revisionName || data.newRevision,
            labelName:             page.name || file.fileName,
            fileName:              file.fileName,
            fileIndex:             fi,
            pageIndex:             pi,
            sku:                   page.sku ?? '',
            labelType:             page.labelType,
            stockNumber:           page.stockNumber,
            labelUrl:              page.url,
            boxes:                 [],
            hasChanges:            false,
            requirements:          commonReqs.map((r, i) => ({ ...r, id: i + 1, status: 'Mismatch' as const })),
            discrepancyCategories: [],
          });
        }
      }
    }
  } else {
    const page0 = data.newLabelPages?.[0];
    revisions.push({
      revisionName:          data.newRevision,
      labelName:             page0?.name ?? data.newLabelName,
      fileName:              data.newLabelName,
      fileIndex:             0,
      pageIndex:             0,
      sku:                   '',
      labelType:             page0?.labelType ?? '',
      stockNumber:           page0?.stockNumber ?? '',
      labelUrl:              data.newLabelUrl,
      boxes:                 data.newBoxes,
      hasChanges:            true,
      requirements:          data.requirements,
      discrepancyCategories: data.discrepancyCategories,
    });
    for (let pi = 0; pi < (data.newLabelPages ?? []).slice(1).length; pi++) {
      const page = (data.newLabelPages ?? []).slice(1)[pi];
      revisions.push({
        revisionName: data.newRevision, labelName: page.name,
        fileName: data.newLabelName, fileIndex: 0, pageIndex: pi + 1,
        sku: '', labelType: page.labelType, stockNumber: page.stockNumber,
        labelUrl: page.url, boxes: [], hasChanges: false,
        requirements: commonReqs.map((r, i) => ({ ...r, id: i + 1, status: 'Match' as const })),
        discrepancyCategories: [],
      });
    }
  }

  const firstFile = data.revisedFiles?.[0];
  return {
    reportId:          data.reportId,
    crNumber:          data.crNumber,
    sku:               data.sku,
    currentRevision:   data.currentRevision,
    currentLabelName:  data.currentLabelName,
    currentLabelUrl:   data.currentLabelUrl,
    currentLabelPages: (data.currentLabelPages ?? (data.currentLabelUrl ? [{ url: data.currentLabelUrl, name: data.currentLabelName, boxes: data.currentBoxes ?? [] }] : [])).map(p => ({ ...p, boxes: p.boxes ?? [] })),
    currentBoxes:      data.currentBoxes,
    revisedFileName:   firstFile?.fileName ?? data.newLabelName,
    revisedFileNames:  data.revisedFiles?.map(f => f.fileName) ?? [data.newLabelName],
    revisions,
    mode:              data.reportMode ?? 'B',
  };
}

// ─── computeSummaryData ───────────────────────────────────────────────────────

function computeSummaryData(requirements: LabelRevision['requirements']) {
  const data = {
    deleted:   { text: 0, symbol: 0, barcode: 0, image: 0 },
    added:     { text: 0, symbol: 0, barcode: 0, image: 0 },
    modified:  { text: 0, symbol: 0, barcode: 0, image: 0 },
    misplaced: { text: 0, symbol: 0, barcode: 0, image: 0 },
  };
  for (const req of requirements) {
    const ctKey = req.changeType.toLowerCase() as keyof typeof data;
    const etKey = req.elementType.toLowerCase() as 'text' | 'symbol' | 'image';
    if (ctKey in data && etKey in data[ctKey]) {
      (data[ctKey] as Record<string, number>)[etKey]++;
    }
  }
  return data;
}

// ─── Accordion content for a single revision (B & C) ─────────────────────────

function RevisionAccordionContent({
  report, rev,
}: {
  report: MultiRevisionReport;
  rev: LabelRevision;
}) {
  if (!rev.hasChanges) {
    const zeroSummary = {
      deleted:   { text: 0, symbol: 0, barcode: 0, image: 0 },
      added:     { text: 0, symbol: 0, barcode: 0, image: 0 },
      modified:  { text: 0, symbol: 0, barcode: 0, image: 0 },
      misplaced: { text: 0, symbol: 0, barcode: 0, image: 0 },
    };
    return (
      <div className="border-t border-gray-200 divide-y divide-gray-100">
        <div className="p-6">
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-700">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
              </svg>
              No Changes Required
            </span>
          </div>
          <img src={rev.labelUrl} alt={rev.labelName} className="max-w-md h-auto border border-gray-200 block" />
        </div>
        {rev.requirements.length > 0 && (
          <>
            <div className="p-6">
              <MissingChanges requirements={rev.requirements} />
            </div>
            <div className="p-6">
              <ExpectedChanges data={requirementsToExpectedChanges(rev.requirements)} />
            </div>
            <div className="p-6">
              <InspectionSummary data={zeroSummary} />
            </div>
          </>
        )}
      </div>
    );
  }

  const basePage  = report.currentLabelPages[rev.pageIndex];
  const baseUrl   = basePage?.url   ?? report.currentLabelUrl;
  const baseName  = basePage?.name  ?? report.currentLabelName;
  const baseBoxes = basePage?.boxes ?? report.currentBoxes;
  const mode      = report.mode;

  return (
    <div className="border-t border-gray-200 divide-y divide-gray-100">
      <div className="p-6">
        <MissingChanges requirements={rev.requirements} />
      </div>
      <div className="p-6">
        <ExpectedChanges data={requirementsToExpectedChanges(rev.requirements)} />
      </div>
      <div className="p-6">
        <LabelComparison
          show={mode === 'B' ? 'master' : 'both'}
          currentLabelUrl={baseUrl}
          currentLabelName={baseName}
          newLabelUrl={rev.labelUrl}
          newLabelName={rev.labelName}
          currentBoxes={baseBoxes}
          newBoxes={rev.boxes}
        />
      </div>
      <div className="p-6 space-y-6">
        <InspectionSummary data={computeSummaryData(rev.requirements)} />
        <DiscrepancyDetails categories={rev.discrepancyCategories} />
      </div>
    </div>
  );
}

// ─── Accordion preview (Mode B & C) ──────────────────────────────────────────

function MultiRevisionAccordionView({ report }: { report: MultiRevisionReport }) {
  const changed  = report.revisions.filter(r =>  r.hasChanges);
  const noChange = report.revisions.filter(r => !r.hasChanges);

  const renderItems = (revs: LabelRevision[]) =>
    revs.map((rev) => {
      const key = `${rev.fileIndex}-${rev.pageIndex}`;
      return (
        <AccordionItem key={key} value={key} className="border-b border-gray-200 last:border-b-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 data-[state=open]:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <span className="text-sm font-bold text-gray-900 shrink-0">
                {rev.sku || <span className="text-gray-400 font-normal italic text-xs">No SKU</span>}
              </span>
              <span className="text-xs text-gray-400 truncate">{rev.labelName}</span>
              {rev.hasChanges ? (
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 bg-red-50 text-red-700">Changes Made</span>
              ) : (
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 bg-green-50 text-green-700">No Changes</span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            <RevisionAccordionContent report={report} rev={rev} />
          </AccordionContent>
        </AccordionItem>
      );
    });

  return (
    <div className="max-w-[1600px] mx-auto p-8">
      <Accordion type="multiple" className="bg-white border border-gray-300">
        {changed.length > 0 && (
          <>
            <div className="px-6 py-2.5 bg-gray-100 border-b border-gray-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Changed Labels</span>
              <span className="ml-2 text-[10px] text-gray-400">({changed.length})</span>
            </div>
            {renderItems(changed)}
          </>
        )}
        {noChange.length > 0 && (
          <>
            <div className={`px-6 py-2.5 bg-gray-100 border-b border-gray-200 ${changed.length > 0 ? 'border-t border-gray-300' : ''}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">No Change Labels</span>
              <span className="ml-2 text-[10px] text-gray-400">({noChange.length})</span>
            </div>
            {renderItems(noChange)}
          </>
        )}
      </Accordion>
    </div>
  );
}

// ─── PDF page-selection dialog (Mode B & C) ───────────────────────────────────

function PdfSelectionDialog({
  open,
  onOpenChange,
  revisions,
  onDownload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisions: LabelRevision[];
  onDownload: (selectedKeys: Set<string>) => void;
}) {
  const makeKey = (r: LabelRevision) => `${r.fileIndex}-${r.pageIndex}`;
  const [selected, setSelected] = useState<Set<string>>(() => new Set(revisions.map(makeKey)));

  useEffect(() => {
    if (open) setSelected(new Set(revisions.map(makeKey)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const allKeys    = revisions.map(makeKey);
  const allSelected = allKeys.length > 0 && allKeys.every(k => selected.has(k));

  const toggleKey = (key: string) =>
    setSelected(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase tracking-wide text-gray-700">Select Pages to Download</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border border-gray-200">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="px-3 py-2.5 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(allKeys))}
                    className="cursor-pointer w-3.5 h-3.5"
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold">SKU</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold">Page</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold">File</th>
                <th className="px-3 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((rev) => {
                const key = makeKey(rev);
                return (
                  <tr
                    key={key}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleKey(key)}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => {}}
                        className="cursor-pointer w-3.5 h-3.5"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900">{rev.sku || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">Page {rev.pageIndex + 1}</td>
                    <td className="px-3 py-2.5 text-gray-500 max-w-[180px] truncate">{rev.fileName}</td>
                    <td className="px-3 py-2.5">
                      {rev.hasChanges ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-red-50 text-red-700">Changes Made</span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 bg-green-50 text-green-700">No Change</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <DialogFooter className="border-t border-gray-200 pt-4 flex items-center">
          <span className="text-xs text-gray-400 mr-auto">{selected.size} of {revisions.length} selected</span>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors mr-2"
          >
            Cancel
          </button>
          <button
            disabled={selected.size === 0}
            onClick={() => onDownload(selected)}
            className="px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#D71500' }}
          >
            Download ({selected.size})
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeScenario, setActiveScenario] = useState<'A' | 'B' | 'C'>('A');
  const [reportData, setReportData]         = useState<ReportData | null>(null);
  const [editing, setEditing]               = useState(false);
  const [printMode, setPrintMode]           = useState<'standard' | 'multi'>('standard');
  const triggerMultiPrint                   = useRef(false);

  // PDF selection dialog state
  const [showPdfDialog, setShowPdfDialog]         = useState(false);
  const [filteredRevisions, setFilteredRevisions] = useState<LabelRevision[] | null>(null);

  // Fire window.print() after React re-renders with printMode === 'multi'
  useEffect(() => {
    if (!triggerMultiPrint.current) return;
    triggerMultiPrint.current = false;
    const now = new Date();
    const ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
    const yyyy = ist.getUTCFullYear();
    const mm   = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const dd   = String(ist.getUTCDate()).padStart(2, '0');
    const hh   = String(ist.getUTCHours()).padStart(2, '0');
    const min  = String(ist.getUTCMinutes()).padStart(2, '0');
    const style = document.createElement('style');
    style.id = '__print-footer-multi__';
    style.textContent = `
      @page {
        @bottom-left   { content: "LPR: ${reportData?.reportId ?? ''}"; font-size: 7pt; color: #666; font-family: sans-serif; }
        @bottom-center { content: "Page " counter(page); font-size: 7pt; color: #666; font-family: sans-serif; }
        @bottom-right  { content: "${yyyy}-${mm}-${dd} ${hh}:${min} IST"; font-size: 7pt; color: #666; font-family: sans-serif; }
      }
    `;
    document.head.appendChild(style);
    const prevTitle = document.title;
    document.title = reportData?.reportId ?? 'Label Proofing Report';
    window.print();
    document.title = prevTitle;
    document.head.removeChild(style);
    setPrintMode('standard');
  }, [printMode, reportData]);

  const handleMultiRevPdf = () => {
    if (activeScenario === 'A') {
      // Mode A: direct print, no dialog
      setFilteredRevisions(null);
      triggerMultiPrint.current = true;
      setPrintMode('multi');
    } else {
      // Mode B & C: show page-selection dialog
      setShowPdfDialog(true);
    }
  };

  const handleDownloadSelected = (selectedKeys: Set<string>) => {
    const filtered = multiRevisionData.revisions.filter(r =>
      selectedKeys.has(`${r.fileIndex}-${r.pageIndex}`)
    );
    const ids = generateSequentialIds(reportData!.reportId, filtered.length, 0);
    const filteredWithIds = filtered.map((rev, i) => ({ ...rev, reportId: ids[i] }));
    setFilteredRevisions(filteredWithIds);
    setShowPdfDialog(false);
    triggerMultiPrint.current = true;
    setPrintMode('multi');
  };

  if (!reportData || editing) {
    return (
      <ThemeProvider>
        <SetupForm
          initialData={reportData ?? undefined}
          onSubmit={(data) => { setReportData(data); setEditing(false); }}
        />
      </ThemeProvider>
    );
  }

  const multiRevisionData = { ...adaptToMultiRevision(reportData), mode: activeScenario };
  console.log('[MultiRev] revisions:', multiRevisionData.revisions.length, multiRevisionData.revisions.map(r => `${r.labelName} hasChanges=${r.hasChanges}`));

  // For printing: use filtered subset if a selection was made
  const printReport = filteredRevisions
    ? { ...multiRevisionData, revisions: filteredRevisions }
    : multiRevisionData;

  const totalLabels   = multiRevisionData.revisions.length;
  const changedLabels = multiRevisionData.revisions.filter(r => r.hasChanges).length;

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#f3f4f6]">

        {/* ── Standard report (screen) ── */}
        <div className={printMode === 'multi' ? 'print:hidden' : ''}>
          <Header
            activeScenario={activeScenario}
            onScenarioChange={setActiveScenario}
            onEdit={() => setEditing(true)}
            reportId={reportData.reportId}
            onMultiRevPdf={handleMultiRevPdf}
            multiRevLabelCount={totalLabels}
            multiRevChangedCount={changedLabels}
          />
          <div id="report-content" className="max-w-[1600px] mx-auto">
            <MetadataRow data={reportData} />
            <div id="report-body">
              {activeScenario === 'A' && (
                <div className="p-8">
                  <FrameA data={reportData} />
                </div>
              )}
              {(activeScenario === 'B' || activeScenario === 'C') && (
                <MultiRevisionAccordionView report={multiRevisionData} />
              )}
            </div>
          </div>
        </div>

        {/* ── Multi-revision print area ── */}
        <div className={printMode === 'multi' ? 'hidden print:block' : 'hidden'}>
          <MultiRevisionPrintLayout report={printReport} />
        </div>

        {/* ── PDF selection dialog (B & C) ── */}
        <PdfSelectionDialog
          open={showPdfDialog}
          onOpenChange={setShowPdfDialog}
          revisions={multiRevisionData.revisions}
          onDownload={handleDownloadSelected}
        />

      </div>
    </ThemeProvider>
  );
}
