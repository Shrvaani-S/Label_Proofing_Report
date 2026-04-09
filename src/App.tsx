import { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from '@/common/ThemeContext';
import { Header } from '@/layouts/Header';
import { MetadataRow } from '@/layouts/MetadataRow';
import { FrameA } from '@/pages/FrameA';
import { FrameB } from '@/pages/FrameB';
import { FrameC } from '@/pages/FrameC';
import { SetupForm } from '@/pages/SetupForm';
import { MultiRevisionPrintLayout } from '@/pages/MultiRevisionPrint';
import type { ReportData, MultiRevisionReport } from '@/common/types';

/** Converts ReportData into a MultiRevisionReport.
 *  Uses revisedFiles (new model) when available, falls back to legacy flat fields.
 */
function adaptToMultiRevision(data: ReportData): MultiRevisionReport {
  const commonReqs = data.commonRequirements ?? data.requirements ?? [];
  let revisions: MultiRevisionReport['revisions'] = [];

  if (data.revisedFiles?.length) {
    // New model: iterate all files → all pages
    for (let fi = 0; fi < data.revisedFiles.length; fi++) {
      const file = data.revisedFiles[fi];
      for (let pi = 0; pi < file.pages.length; pi++) {
        const page = file.pages[pi];
        if (page.status === 'changed') {
          revisions.push({
            revisionName:          data.newRevision,
            labelName:             page.name || file.fileName,
            fileName:              file.fileName,
            fileIndex:             fi,
            pageIndex:             pi,
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
            revisionName:          data.newRevision,
            labelName:             page.name || file.fileName,
            fileName:              file.fileName,
            fileIndex:             fi,
            pageIndex:             pi,
            labelType:             page.labelType,
            stockNumber:           page.stockNumber,
            labelUrl:              page.url,
            boxes:                 [],
            hasChanges:            false,
            requirements:          [],
            discrepancyCategories: [],
          });
        }
      }
    }
  } else {
    // Legacy fallback: single label + optional extra pages
    const page0 = data.newLabelPages?.[0];
    revisions.push({
      revisionName:          data.newRevision,
      labelName:             page0?.name ?? data.newLabelName,
      fileName:              data.newLabelName,
      fileIndex:             0,
      pageIndex:             0,
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
        labelType: page.labelType, stockNumber: page.stockNumber,
        labelUrl: page.url, boxes: [], hasChanges: false,
        requirements: [], discrepancyCategories: [],
      });
    }
  }

  const firstFile = data.revisedFiles?.[0];
  return {
    reportId:           data.reportId,
    crNumber:           data.crNumber,
    sku:                data.sku,
    currentRevision:    data.currentRevision,
    currentLabelName:   data.currentLabelName,
    currentLabelUrl:    data.currentLabelUrl,
    currentLabelPages:  (data.currentLabelPages ?? (data.currentLabelUrl ? [{ url: data.currentLabelUrl, name: data.currentLabelName, boxes: data.currentBoxes ?? [] }] : [])).map(p => ({ ...p, boxes: p.boxes ?? [] })),
    currentBoxes:       data.currentBoxes,
    revisedFileName:    firstFile?.fileName ?? data.newLabelName,
    revisedFileNames:   data.revisedFiles?.map(f => f.fileName) ?? [data.newLabelName],
    revisions,
    mode:               data.reportMode ?? 'B',
  };
}

export default function App() {
  const [activeScenario, setActiveScenario] = useState<'A' | 'B' | 'C'>('A');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [editing, setEditing] = useState(false);
  const [printMode, setPrintMode] = useState<'standard' | 'multi'>('standard');
  const triggerMultiPrint = useRef(false);

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

  // Active scenario tab drives both the on-screen view and the Multi-Rev PDF mode.
  const multiRevisionData = { ...adaptToMultiRevision(reportData), mode: activeScenario };
  console.log('[MultiRev] revisions:', multiRevisionData.revisions.length, multiRevisionData.revisions.map(r => `${r.labelName} hasChanges=${r.hasChanges}`));

  const totalLabels   = multiRevisionData.revisions.length;
  const changedLabels = multiRevisionData.revisions.filter(r => r.hasChanges).length;

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#f3f4f6]">

        {/* ── Standard report (screen + standard PDF) ── */}
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
            <div id="report-body" className="p-8">
              {activeScenario === 'A' && <FrameA data={reportData} />}
              {activeScenario === 'B' && <FrameB data={reportData} />}
              {activeScenario === 'C' && <FrameC data={reportData} />}
            </div>
          </div>
        </div>

        {/* ── Multi-revision print area (hidden on screen, prints when printMode === 'multi') ── */}
        <div className={printMode === 'multi' ? 'hidden print:block' : 'hidden'}>
          <MultiRevisionPrintLayout report={multiRevisionData} />
        </div>

      </div>
    </ThemeProvider>
  );
}
