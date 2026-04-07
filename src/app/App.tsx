import { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/Header';
import { MetadataRow } from './components/MetadataRow';
import { FrameA } from './components/FrameA';
import { FrameB } from './components/FrameB';
import { FrameC } from './components/FrameC';
import { SetupForm } from './components/SetupForm';
import { MultiRevisionPrintLayout } from './components/MultiRevisionPrint';
import type { ReportData, MultiRevisionReport, MultiRevisionComparisonMode } from './types';

/** Converts flat ReportData into a MultiRevisionReport.
 *  - Page 1 of the revised PDF → hasChanges: true (carries requirements + discrepancies)
 *  - Pages 2+ (if a multi-page PDF was uploaded) → hasChanges: false
 */
function adaptToMultiRevision(data: ReportData): MultiRevisionReport {
  const page0 = data.newLabelPages?.[0];
  const mainRevision = {
    revisionName:          data.newRevision,
    labelName:             page0?.name ?? data.newLabelName,
    labelType:             page0?.labelType ?? '',
    stockNumber:           page0?.stockNumber ?? '',
    labelUrl:              data.newLabelUrl,
    boxes:                 data.newBoxes,
    hasChanges:            true  as const,
    requirements:          data.requirements,
    discrepancyCategories: data.discrepancyCategories,
  };

  // Pages 2+ from a multi-page PDF upload → no-change labels
  const extraRevisions = (data.newLabelPages ?? [])
    .slice(1)
    .map((page) => ({
      revisionName:          data.newRevision,
      labelName:             page.name,
      labelType:             page.labelType,
      stockNumber:           page.stockNumber,
      labelUrl:              page.url,
      boxes:                 [] as typeof data.currentBoxes,
      hasChanges:            false as const,
      requirements:          [] as typeof data.requirements,
      discrepancyCategories: [] as typeof data.discrepancyCategories,
    }));

  return {
    reportId:         data.reportId,
    crNumber:         data.crNumber,
    sku:              data.sku,
    currentRevision:  data.currentRevision,
    currentLabelName: data.currentLabelName,
    currentLabelUrl:  data.currentLabelUrl,
    currentBoxes:     data.currentBoxes,
    revisedFileName:  data.newLabelName,
    revisions:        [mainRevision, ...extraRevisions],
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

  const multiRevisionData = adaptToMultiRevision(reportData);
  console.log('[MultiRev] revisions:', multiRevisionData.revisions.length, multiRevisionData.revisions.map(r => `${r.labelName} hasChanges=${r.hasChanges}`));

  // Map active scenario → comparison mode for multi-rev layout
  const multiComparisonMode: MultiRevisionComparisonMode =
    activeScenario === 'A' ? 'base-vs-revised' : 'input-form';

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
          <MultiRevisionPrintLayout
            report={multiRevisionData}
            comparisonMode={multiComparisonMode}
          />
        </div>

      </div>
    </ThemeProvider>
  );
}
