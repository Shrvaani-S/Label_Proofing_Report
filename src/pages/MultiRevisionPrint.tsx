/**
 * Multi-Revision Print Layout
 *
 * Renders the printable report for all three modes:
 *   A — Existing + Master: purely visual side-by-side comparison, no requirements tables.
 *   B — Supportive + Master: revised label only with full requirements / discrepancy detail.
 *   C — Full Comparison: side-by-side images + full requirements / discrepancy detail.
 */

import { MissingChanges }                  from '@/components/MissingChanges';
import { LabelComparison }                 from '@/components/LabelComparison';
import { InspectionSummary }               from '@/components/InspectionSummary';
import { DiscrepancyDetails }              from '@/components/DiscrepancyDetails';
import { ExpectedChanges }                 from '@/components/ExpectedChanges';
import { requirementsToExpectedChanges }   from '@/utils/requirementsToExpectedChanges';
import type { MultiRevisionReport, LabelRevision } from '@/common/types';

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
  const basePage = report.currentLabelPages[revision.pageIndex];
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
          { label: 'SKU',                   value: report.mode === 'A' ? report.sku : (revision.sku || '—') },
          { label: 'Label Revision',        value: `${report.currentRevision} → ${revision.revisionName}` },
          { label: 'Current Version Label', value: basePage?.name ?? report.currentLabelName },
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
  return (
    <div>
      {/* Red banner — title, report ID, logo only */}
      <div className="px-8 py-5 flex items-start justify-between" style={{ backgroundColor: '#D71500' }}>
        <div className="space-y-1">
          <h1 className="text-white text-2xl leading-tight">Label Proofing Report</h1>
          <div className="text-white text-xs">
            Report ID: {report.reportId}
            {report.crNumber && <span className="ml-4 opacity-70">CR: {report.crNumber}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <img src="/novintix-logo.png" alt="Novintix" className="h-7 w-auto" />
        </div>
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
                <th className="px-4 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200">Revised Label File</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200">SKU</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200">Label Type</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200">Stock Number</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200">Label Revision</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold">Change Status</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Group by fileIndex — keeps each uploaded file as its own group
                const groups: { fileIndex: number; fileName: string; revs: LabelRevision[] }[] = [];
                for (const rev of selectedRevisions) {
                  const existing = groups.find(g => g.fileIndex === rev.fileIndex);
                  if (existing) { existing.revs.push(rev); }
                  else { groups.push({ fileIndex: rev.fileIndex, fileName: rev.fileName, revs: [rev] }); }
                }
                const lastGroupIdx = groups.length - 1;
                return groups.map((group, gi) => {
                  const span = group.revs.length;
                  const isLastGroup = gi === lastGroupIdx;
                  return group.revs.map((rev, ri) => {
                    const { matched, total } = matchCount(rev);
                    const isFirst = ri === 0;
                    const isLastInGroup = ri === span - 1;
                    const rowBorder = isLastInGroup
                      ? (isLastGroup ? '' : 'border-b border-gray-300')
                      : 'border-b border-gray-100';
                    // SKU: global for Mode A, per-revision for B & C
                    const skuValue = report.mode === 'A' ? report.sku : (rev.sku || '—');
                    return (
                      <tr key={`${group.fileIndex}-${ri}`}>
                        {isFirst && (
                          <>
                            <td rowSpan={span} className={`px-4 py-2.5 text-gray-400 border-r border-gray-200 align-top ${isLastGroup ? '' : 'border-b border-gray-300'}`}>{gi + 1}</td>
                            <td rowSpan={span} className={`px-4 py-2.5 text-gray-700 border-r border-gray-200 break-all align-top ${isLastGroup ? '' : 'border-b border-gray-300'}`}>{group.fileName}</td>
                          </>
                        )}
                        <td className={`px-4 py-2.5 text-gray-900 border-r border-gray-200 ${rowBorder}`}>{skuValue}</td>
                        <td className={`px-4 py-2.5 text-gray-800 font-semibold border-r border-gray-200 ${rowBorder}`}>{rev.labelType || '—'}</td>
                        <td className={`px-4 py-2.5 text-gray-700 font-mono border-r border-gray-200 ${rowBorder}`}>{rev.stockNumber || '—'}</td>
                        <td className={`px-4 py-2.5 text-gray-700 border-r border-gray-200 ${rowBorder}`}>{report.currentRevision} → {rev.revisionName}</td>
                        <td className={`px-4 py-2.5 ${rowBorder}`}>
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
                  });
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Per-changed-revision body sections ───────────────────────────────────────

function RevisionBody({
  report, rev,
}: {
  report: MultiRevisionReport;
  rev: LabelRevision;
}) {
  const mode = report.mode;
  const basePage  = report.currentLabelPages[rev.pageIndex];
  const baseUrl   = basePage?.url   ?? report.currentLabelUrl;
  const baseName  = basePage?.name  ?? report.currentLabelName;
  const baseBoxes = basePage?.boxes ?? report.currentBoxes;

  if (mode === 'A') {
    // Base vs revised side-by-side + requirements summary + changes made
    return (
      <>
        <div className="p-8">
          <LabelComparison
            show="both"
            currentLabelUrl={baseUrl}
            currentLabelName={baseName}
            newLabelUrl={rev.labelUrl}
            newLabelName={rev.labelName}
            currentBoxes={baseBoxes}
            newBoxes={rev.boxes}
          />
        </div>
        <div className="print-break-before p-8">
          <MissingChanges requirements={rev.requirements} />
        </div>
        <div className="print-break-before p-8 space-y-6">
          <InspectionSummary data={computeSummaryData(rev.requirements)} />
          <DiscrepancyDetails categories={rev.discrepancyCategories} />
        </div>
      </>
    );
  }

  if (mode === 'B') {
    // Requirements-based — revised label only + all detail sections
    return (
      <>
        <div className="p-8">
          <MissingChanges requirements={rev.requirements} />
        </div>
        <div className="print-break-before p-8">
          <ExpectedChanges data={requirementsToExpectedChanges(rev.requirements)} />
        </div>
        <div className="print-break-before p-8">
          <LabelComparison
            show="master"
            currentLabelUrl={baseUrl}
            currentLabelName={baseName}
            newLabelUrl={rev.labelUrl}
            newLabelName={rev.labelName}
            currentBoxes={baseBoxes}
            newBoxes={rev.boxes}
          />
        </div>
        <div className="print-break-before p-8 space-y-6">
          <InspectionSummary data={computeSummaryData(rev.requirements)} />
          <DiscrepancyDetails categories={rev.discrepancyCategories} />
        </div>
      </>
    );
  }

  // Mode C — full comparison: requirements + both images + detail
  return (
    <>
      <div className="p-8">
        <MissingChanges requirements={rev.requirements} />
      </div>
      <div className="print-break-before p-8">
        <ExpectedChanges data={requirementsToExpectedChanges(rev.requirements)} />
      </div>
      <div className="print-break-before p-8">
        <LabelComparison
          show="both"
          currentLabelUrl={baseUrl}
          currentLabelName={baseName}
          newLabelUrl={rev.labelUrl}
          newLabelName={rev.labelName}
          currentBoxes={baseBoxes}
          newBoxes={rev.boxes}
        />
      </div>
      <div className="print-break-before p-8 space-y-6">
        <InspectionSummary data={computeSummaryData(rev.requirements)} />
        <DiscrepancyDetails categories={rev.discrepancyCategories} />
      </div>
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function MultiRevisionPrintLayout({ report }: { report: MultiRevisionReport }) {
  // Changed labels first, no-change labels after (for the detail pages)
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
      {/* Cover page — pass original file-ordered revisions so grouping is correct */}
      <PrintCoverPage report={report} selectedRevisions={report.revisions} />

      {/* Changed labels — one full report section per label */}
      {changedRevs.map((rev) => (
        <div key={`${rev.fileIndex}-${rev.pageIndex}`} style={{ pageBreakBefore: 'always' }}>
          <PrintPageHeader report={report} revision={rev} />
          <RevisionBody report={report} rev={rev} />
        </div>
      ))}

      {/* No-change labels */}
      {report.mode === 'C' ? (
        // Mode C — one label per page, base + revised side by side
        noChangeRevs.map((rev) => {
          const basePage  = report.currentLabelPages[rev.pageIndex];
          const baseUrl   = basePage?.url  ?? report.currentLabelUrl;
          const baseName  = basePage?.name ?? report.currentLabelName;
          return (
            <div key={`${rev.fileIndex}-${rev.pageIndex}`} style={{ pageBreakBefore: 'always' }}>
              <div className="px-8 py-3 flex items-center justify-between border-b border-gray-300 bg-gray-50">
                <div className="flex items-center gap-3">
                  {rev.sku && <span className="text-xs font-bold text-gray-900">{rev.sku}</span>}
                  <span className="text-[10px] uppercase tracking-wide font-bold text-gray-600">No Changes Required</span>
                </div>
                <div className="flex items-center gap-3">
                  {rev.labelType && <span className="text-[10px] font-bold uppercase text-gray-500">{rev.labelType}</span>}
                  {rev.stockNumber && <span className="text-[10px] font-mono text-gray-400">{rev.stockNumber}</span>}
                  <span className="text-[10px] text-gray-400">{rev.revisionName}</span>
                </div>
              </div>
              <div className="p-8 grid grid-cols-2 gap-6">
                <div className="border border-gray-200 bg-white">
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Current Version</div>
                    <div className="text-[10px] text-gray-400 truncate mt-0.5">{baseName}</div>
                  </div>
                  <div className="p-4">
                    <img src={baseUrl} alt={baseName} className="w-full h-auto block" />
                  </div>
                </div>
                <div className="border border-gray-200 bg-white">
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">New Version</div>
                    <div className="text-[10px] text-gray-400 truncate mt-0.5">{rev.labelName}</div>
                  </div>
                  <div className="p-4">
                    <img src={rev.labelUrl} alt={rev.labelName} className="w-full h-auto block" />
                  </div>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        // Mode A & B — 2 labels per page, revised image only
        noChangePairs.map((pair, pi) => (
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
                <div key={`${rev.fileIndex}-${rev.pageIndex}`} className="border border-gray-200 bg-white">
                  <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      {report.mode !== 'A' && rev.sku && (
                        <div className="text-xs font-bold text-gray-900 mb-1">{rev.sku}</div>
                      )}
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
        ))
      )}
    </div>
  );
}
