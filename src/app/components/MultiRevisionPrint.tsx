/**
 * Multi-Revision Print Layout
 *
 * A self-contained print-only component used by the main app when the user
 * clicks "Multi-Rev PDF". On screen it is always hidden; it becomes visible
 * only when the browser's print dialog is active AND App.tsx has set
 * printMode === 'multi'.
 *
 * It receives a MultiRevisionReport (adapted from ReportData, or built
 * directly from richer form data in the future).
 */

import { MissingChanges }      from './MissingChanges';
import { LabelComparison }     from './LabelComparison';
import { InspectionSummary }   from './InspectionSummary';
import { DiscrepancyDetails }  from './DiscrepancyDetails';
import { ExpectedChanges }                   from './ExpectedChanges';
import { requirementsToExpectedChanges }     from '../utils/requirementsToExpectedChanges';
import type {
  MultiRevisionReport,
  LabelRevision,
  MultiRevisionComparisonMode,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchCount(rev: LabelRevision) {
  if (!rev.hasChanges) return { matched: 0, total: 0 };
  const matched = rev.requirements.filter(r => r.status === 'Match').length;
  return { matched, total: rev.requirements.length };
}

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

// ─── Per-revision page header ─────────────────────────────────────────────────

function PrintPageHeader({
  report, revision,
}: {
  report: MultiRevisionReport;
  revision: LabelRevision;
}) {
  return (
    <div>
      <div className="px-8 py-5 flex items-start justify-between" style={{ backgroundColor: '#D71500' }}>
        <div className="space-y-1">
          <h1 className="text-white text-2xl leading-tight">Label Proofing Report</h1>
          <div className="text-white text-xs">Report ID: {report.reportId}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <img src="/novintix-logo.png" alt="Novintix" className="h-7 w-auto" />
          <div className="text-white/70 text-xs">
            {report.currentRevision} → {revision.revisionName}
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-300 grid" style={{ gridTemplateColumns: '0.7fr 0.7fr 1fr 1.5fr 1.5fr' }}>
        {[
          { label: 'CR Number',             value: report.crNumber || '-' },
          { label: 'SKU',                   value: report.sku },
          { label: 'Label Revision',        value: `${report.currentRevision} → ${revision.revisionName}` },
          { label: 'Current Version Label', value: report.currentLabelName },
          { label: 'New Version Label',     value: revision.labelName },
        ].map((cell, i, arr) => (
          <div key={i} className={`px-3 py-1.5 ${i < arr.length - 1 ? 'border-r border-gray-300' : ''}`}>
            <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">{cell.label}</div>
            <div className="text-xs text-gray-900 break-all">{cell.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cover page ───────────────────────────────────────────────────────────────

function PrintCoverPage({
  report, selectedRevisions,
}: {
  report: MultiRevisionReport;
  selectedRevisions: LabelRevision[];
}) {
  const revNames = [...new Set(selectedRevisions.map(r => r.revisionName))].join(', ');

  return (
    <div>
      <div className="px-8 py-5 flex items-start justify-between" style={{ backgroundColor: '#D71500' }}>
        <div className="space-y-1">
          <h1 className="text-white text-2xl leading-tight">Label Proofing Report</h1>
          <div className="text-white text-xs">Report ID: {report.reportId}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <img src="/novintix-logo.png" alt="Novintix" className="h-7 w-auto" />
          <div className="text-white/70 text-xs">{report.currentRevision} → {revNames}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-300 grid" style={{ gridTemplateColumns: '0.7fr 0.7fr 1fr 1.5fr 1.5fr' }}>
        {[
          { label: 'CR Number',             value: report.crNumber || '-' },
          { label: 'SKU',                   value: report.sku },
          { label: 'Label Revision',        value: `${report.currentRevision} → ${revNames}` },
          { label: 'Current Version Label', value: report.currentLabelName },
          { label: 'Revised File',          value: report.revisedFileName },
        ].map((cell, i, arr) => (
          <div key={i} className={`px-3 py-1.5 ${i < arr.length - 1 ? 'border-r border-gray-300' : ''}`}>
            <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">{cell.label}</div>
            <div className="text-xs text-gray-900 break-all">{cell.value}</div>
          </div>
        ))}
      </div>

      <div className="p-8">
        <div className="bg-white border border-gray-300">
          <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-300">
            <span className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Label Summary</span>
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th className="px-4 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200 w-8">#</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200">Label Type</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200">Stock Number</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200">LCN (Label Name)</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold">Change Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedRevisions.map((rev, i) => {
                const { matched, total } = matchCount(rev);
                return (
                  <tr key={rev.labelName} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2.5 text-gray-400 border-r border-gray-100">{i + 1}</td>
                    <td className="px-4 py-2.5 text-gray-800 font-semibold border-r border-gray-100">{rev.labelType || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-700 font-mono border-r border-gray-100">{rev.stockNumber || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-700 border-r border-gray-100">{rev.labelName}</td>
                    <td className="px-4 py-2.5">
                      {rev.hasChanges ? (
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 ${matched === total ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          Changes Made
                          {total > 0 && <span className="opacity-70">({matched}/{total} match)</span>}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 bg-green-50 text-green-700">
                          No Changes
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function MultiRevisionPrintLayout({
  report,
  comparisonMode,
}: {
  report: MultiRevisionReport;
  comparisonMode: MultiRevisionComparisonMode;
}) {
  // Changed labels first, no-change labels after
  const ordered = [
    ...report.revisions.filter(r => r.hasChanges),
    ...report.revisions.filter(r => !r.hasChanges),
  ];

  const changedRevs  = ordered.filter(r => r.hasChanges);
  const noChangeRevs = ordered.filter(r => !r.hasChanges);

  // Group no-change revisions into pairs for 2-column pages
  const noChangePairs: LabelRevision[][] = [];
  for (let i = 0; i < noChangeRevs.length; i += 2) {
    noChangePairs.push(noChangeRevs.slice(i, i + 2));
  }

  return (
    <div>
      {/* Cover page */}
      <PrintCoverPage report={report} selectedRevisions={ordered} />

      {/* Changed labels: one full report per label */}
      {changedRevs.map((rev) => (
        <div key={rev.labelName} style={{ pageBreakBefore: 'always' }}>
          <PrintPageHeader report={report} revision={rev} />

          {/* Requirements Summary */}
          <div className="p-8">
            <MissingChanges requirements={rev.requirements} />
          </div>

          {/* Expected Changes vs Changes Done */}
          <div className="print-break-before p-8">
            <ExpectedChanges data={requirementsToExpectedChanges(rev.requirements)} />
          </div>

          {/* Label Comparison */}
          <div className="print-break-before p-8">
            <LabelComparison
              show={comparisonMode === 'input-form' ? 'master' : 'both'}
              currentLabelUrl={report.currentLabelUrl}
              currentLabelName={report.currentLabelName}
              newLabelUrl={rev.labelUrl}
              newLabelName={rev.labelName}
              currentBoxes={report.currentBoxes}
              newBoxes={rev.boxes}
            />
          </div>

          {/* Inspection Summary + Changes Made */}
          <div className="print-break-before p-8 space-y-6">
            <InspectionSummary data={computeSummaryData(rev.requirements)} />
            <DiscrepancyDetails categories={rev.discrepancyCategories} />
          </div>
        </div>
      ))}

      {/* No-change labels: 2 per page in a grid */}
      {noChangePairs.map((pair, pi) => (
        <div key={pi} style={{ pageBreakBefore: 'always' }}>
          <div className="px-8 py-3 flex items-center justify-between border-b border-gray-300 bg-gray-50">
            <span className="text-[10px] uppercase tracking-wide font-bold text-gray-600">
              Labels — No Changes Required
            </span>
            <span className="text-[10px] text-gray-400">
              {pair.map(r => r.revisionName).join(' · ')}
            </span>
          </div>
          <div className={`p-8 grid gap-6 ${pair.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {pair.map((rev) => (
              <div key={rev.labelName} className="border border-gray-200 bg-white">
                <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {rev.labelType && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-700">{rev.labelType}</span>
                      )}
                      {rev.stockNumber && (
                        <span className="text-[10px] font-mono text-gray-500">{rev.stockNumber}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate mt-0.5">{rev.labelName}</div>
                  </div>
                  <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-green-50 text-green-700">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                    </svg>
                    No Changes
                  </span>
                </div>
                <div className="p-4">
                  <img src={rev.labelUrl} alt={rev.labelName} className="w-full h-auto block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
