/**
 * Multi-Revision Print Layout
 *
 * Unified page structure for all modes and all labels (changed + no-change):
 *   Page 1 — Requirements table (5 cols: #, Element, Change Type, Requirements, Expected)
 *   Page 2 — Labels stacked vertically (Mode B: new label only; Mode A/C: current then new)
 *   Page 3 — Report Table: Expected Changes (7 cols) + Unexpected Changes (6 cols)
 *   Page 4 — Inspection Summary + Changes Made (no-change: zero + dotted placeholder)
 */

import { InspectionSummary }               from '@/components/InspectionSummary';
import { DiscrepancyDetails }              from '@/components/DiscrepancyDetails';
import { Badge }                           from '@/components/Badge';
import type { MultiRevisionReport, LabelRevision, UnexpectedChange, Requirement } from '@/common/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ZERO_SUMMARY = {
  deleted:   { text: 0, symbol: 0, barcode: 0, image: 0 },
  added:     { text: 0, symbol: 0, barcode: 0, image: 0 },
  modified:  { text: 0, symbol: 0, barcode: 0, image: 0 },
  misplaced: { text: 0, symbol: 0, barcode: 0, image: 0 },
};

function matchCount(rev: LabelRevision) {
  if (!rev.hasChanges) return { matched: 0, total: 0 };
  const matched = rev.requirements.filter(r => r.status === 'Match').length;
  return { matched, total: rev.requirements.length };
}

function computeSummaryData(
  requirements: LabelRevision['requirements'],
  unexpectedChanges: LabelRevision['unexpectedChanges'] = [],
) {
  const data = {
    deleted:   { text: 0, symbol: 0, barcode: 0, image: 0 },
    added:     { text: 0, symbol: 0, barcode: 0, image: 0 },
    modified:  { text: 0, symbol: 0, barcode: 0, image: 0 },
    misplaced: { text: 0, symbol: 0, barcode: 0, image: 0 },
  };
  for (const item of [...requirements, ...unexpectedChanges]) {
    const ctKey = item.changeType.toLowerCase() as keyof typeof data;
    const etKey = item.elementType.toLowerCase() as 'text' | 'symbol' | 'image';
    if (ctKey in data && etKey in data[ctKey]) {
      (data[ctKey] as Record<string, number>)[etKey]++;
    }
  }
  return data;
}

// ─── Label image with bounding box overlays ───────────────────────────────────

const BOX_COLORS: Record<string, string> = {
  Modified:     '#2563eb',
  Added:        '#15803d',
  Deleted:      '#de2626',
  Misplaced:    '#f5a30a',
  Repositioned: '#f5a30a',
};

function LabelWithBoxes({ src, alt, boxes, maxHeight }: { src: string; alt: string; boxes: import('@/common/types').DrawnBox[]; maxHeight?: string }) {
  return (
    <div className="flex justify-center">
      <div className="relative" style={{ display: 'inline-block' }}>
      <img src={src} alt={alt} style={maxHeight ? { maxHeight, width: 'auto', maxWidth: '100%', display: 'block' } : { width: '100%', height: 'auto', display: 'block' }} />
      {boxes?.map(box => {
        const color = BOX_COLORS[box.type] ?? '#2563eb';
        return (
          <div key={box.id}>
            <div
              className="absolute pointer-events-none"
              style={{
                top:             `${box.top}%`,
                left:            `${box.left}%`,
                width:           `${box.width}%`,
                height:          `${box.height}%`,
                border:          `2px solid ${color}`,
                backgroundColor: 'transparent',
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                top:       `${box.top}%`,
                left:      `${box.left}%`,
                transform: 'translateY(calc(-100% - 2px))',
              }}
            >
              <span className="font-semibold whitespace-nowrap block" style={{ color, fontSize: '9px', lineHeight: 1 }}>
                {box.text || box.type}
              </span>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ─── Page 1: Requirements table (5 columns) ──────────────────────────────────

function RequirementsTablePrint({ requirements }: { requirements: Requirement[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-wide font-bold text-gray-700">Requirements Summary</h3>
        <span className="px-2 py-1 bg-gray-100 text-gray-600 font-semibold text-xs">
          {requirements.length} Requirements
        </span>
      </div>
      <div className="bg-white border border-gray-300 overflow-hidden print-table-flow">
        <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '35%' }} />
            <col style={{ width: '35%' }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              {['#', 'Element', 'Change Type', 'Requirements', 'Expected'].map((h, i, arr) => (
                <th key={h} className={`px-2 py-2 text-left text-xs uppercase text-gray-900 font-bold ${i < arr.length - 1 ? 'border-r border-gray-200' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requirements.map((req) => (
              <tr key={req.id} className="border-b border-gray-200 last:border-0 text-xs">
                <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 whitespace-nowrap">{req.id}</td>
                <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200" style={{ wordBreak: 'break-word' }}>{req.elementType}</td>
                <td className="px-2 py-1.5 border-r border-gray-200">
                  <Badge type={req.changeType as 'Modified' | 'Added' | 'Deleted'} />
                </td>
                <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200" style={{ wordBreak: 'break-word' }}>{req.description}</td>
                <td className="px-2 py-1.5 text-gray-900" style={{ wordBreak: 'break-word' }}>{req.expectedValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page 3: Report Table (Expected + Unexpected Changes) ─────────────────────

function ReportTable({
  requirements,
  unexpectedChanges,
}: {
  requirements: Requirement[];
  unexpectedChanges: UnexpectedChange[];
}) {
  const statusColor = (s: string) => s === 'Match' ? '#16a34a' : '#dc2626';

  return (
    <div className="space-y-8">
      <h3 className="text-sm uppercase tracking-wide font-bold text-gray-700">Report Details</h3>

      {/* Expected Changes */}
      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-wide font-bold text-gray-600">Expected Changes</h4>
        <div className="bg-white border border-gray-300 overflow-hidden">
          <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                {['#', 'Element', 'Change Type', 'Requirements', 'Expected', 'Actual', 'Status'].map((h, i, arr) => (
                  <th key={h} className={`px-2 py-2 text-left text-xs uppercase text-gray-900 font-bold whitespace-nowrap ${i < arr.length - 1 ? 'border-r border-gray-200' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requirements.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 text-xs">No expected changes</td></tr>
              ) : requirements.map((req) => (
                <tr key={req.id} className="border-b border-gray-200 last:border-0 text-xs">
                  <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 whitespace-nowrap">{req.id}</td>
                  <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 whitespace-nowrap">{req.elementType}</td>
                  <td className="px-2 py-1.5 border-r border-gray-200"><Badge type={req.changeType as 'Modified' | 'Added' | 'Deleted'} /></td>
                  <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200" style={{ wordBreak: 'break-word' }}>{req.description}</td>
                  <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200" style={{ wordBreak: 'break-word' }}>{req.expectedValue}</td>
                  <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200" style={{ wordBreak: 'break-word' }}>{req.actualValue}</td>
                  <td className="px-2 py-1.5 font-semibold whitespace-nowrap" style={{ color: statusColor(req.status) }}>{req.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unexpected Changes */}
      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-wide font-bold text-gray-600">Unexpected Changes</h4>
        {unexpectedChanges.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 py-8 flex items-center justify-center">
            <span className="text-gray-400 text-xs font-medium tracking-wide uppercase">No unexpected changes</span>
          </div>
        ) : (
          <div className="bg-white border border-gray-300 overflow-hidden">
            <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '38%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  {['#', 'Element', 'Change Type', 'Requirements', 'Actual'].map((h, i, arr) => (
                    <th key={h} className={`px-2 py-2 text-left text-xs uppercase text-gray-900 font-bold whitespace-nowrap ${i < arr.length - 1 ? 'border-r border-gray-200' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unexpectedChanges.map((uc) => (
                  <tr key={uc.id} className="border-b border-gray-200 last:border-0 text-xs">
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 whitespace-nowrap">{uc.id}</td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200 whitespace-nowrap">{uc.elementType}</td>
                    <td className="px-2 py-1.5 border-r border-gray-200"><Badge type={uc.changeType as 'Modified' | 'Added' | 'Deleted'} /></td>
                    <td className="px-2 py-1.5 text-gray-900 border-r border-gray-200" style={{ wordBreak: 'break-word' }}>{uc.description}</td>
                    <td className="px-2 py-1.5 text-gray-900" style={{ wordBreak: 'break-word' }}>{uc.actualValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Per-revision page header ─────────────────────────────────────────────────

function PrintPageHeader({
  report, revision, noChanges = false,
}: {
  report: MultiRevisionReport;
  revision: LabelRevision;
  noChanges?: boolean;
}) {
  const basePage  = report.currentLabelPages[revision.pageIndex];
  const reportId  = revision.reportId ?? report.reportId;
  return (
    <div>
      <div className="px-8 py-5 flex items-start justify-between" style={{ backgroundColor: '#D71500' }}>
        <div className="space-y-1">
          <h1 className="text-white text-2xl leading-tight">Label Proofing Report</h1>
          <div className="text-white text-xs">Report ID: {reportId}</div>
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

// ─── Unified revision body (all modes, changed + no-change) ──────────────────

function RevisionBody({
  report, rev,
}: {
  report: MultiRevisionReport;
  rev: LabelRevision;
}) {
  const mode      = report.mode;
  const basePage  = report.currentLabelPages[rev.pageIndex];
  const baseUrl   = basePage?.url  ?? report.currentLabelUrl;
  const baseName  = basePage?.name ?? report.currentLabelName;
  const isNoChange = !rev.hasChanges;

  // Requirements for page 1 — no-change labels show Mismatch so auditors can see what was required
  const reqsForPage1 = rev.requirements;

  return (
    <>
      {/* Page 1: Requirements table (5 cols) */}
      <div className="p-8">
        <RequirementsTablePrint requirements={reqsForPage1} />
      </div>

      {/* Page 2: Labels stacked vertically */}
      <div className="print-break-before px-8 pt-6 pb-4 space-y-4">
        {/* Current version — shown in Mode A and C */}
        {mode !== 'B' && (
          <div className="bg-white border border-gray-200">
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Current Version</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{baseName}</div>
              </div>
              {isNoChange && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                  </svg>
                  No Changes
                </span>
              )}
            </div>
            <div className="p-4">
              <LabelWithBoxes src={baseUrl} alt={baseName} boxes={basePage?.boxes ?? []} maxHeight="105mm" />
            </div>
          </div>
        )}

        {/* New version — always shown */}
        <div className="bg-white border border-gray-200">
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">New Version</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{rev.labelName}</div>
            </div>
            {isNoChange && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                </svg>
                No Changes
              </span>
            )}
          </div>
          <div className="p-4">
            <LabelWithBoxes src={rev.labelUrl} alt={rev.labelName} boxes={rev.boxes ?? []} maxHeight={mode !== 'B' ? '105mm' : undefined} />
          </div>
        </div>
      </div>

      {/* Page 3: Report Table */}
      <div className="print-break-before p-8">
        <ReportTable
          requirements={rev.requirements}
          unexpectedChanges={rev.unexpectedChanges}
        />
      </div>

      {/* Page 4: Inspection Summary + Changes Made */}
      <div className="print-break-before p-8 space-y-6">
        <InspectionSummary data={isNoChange ? ZERO_SUMMARY : computeSummaryData(rev.requirements, rev.unexpectedChanges)} />
        {isNoChange ? (
          <div className="space-y-4">
            <h3 className="text-sm uppercase tracking-wide font-bold text-gray-700">Changes Made</h3>
            <div className="border-2 border-dashed border-gray-300 py-10 flex items-center justify-center">
              <span className="text-gray-400 text-xs font-medium tracking-widest uppercase">No Changes</span>
            </div>
          </div>
        ) : (
          <DiscrepancyDetails categories={rev.discrepancyCategories} />
        )}
      </div>
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function MultiRevisionPrintLayout({ report }: { report: MultiRevisionReport }) {
  // Changed labels first, no-change labels after
  const ordered = [
    ...report.revisions.filter(r => r.hasChanges),
    ...report.revisions.filter(r => !r.hasChanges),
  ];

  return (
    <div>
      {/* Cover page — only shown when more than one label is being downloaded */}
      {report.revisions.length > 1 && (
        <PrintCoverPage report={report} selectedRevisions={report.revisions} />
      )}

      {/* All labels — unified structure */}
      {ordered.map((rev) => (
        <div key={`${rev.fileIndex}-${rev.pageIndex}`} style={{ pageBreakBefore: 'always' }}>
          <PrintPageHeader report={report} revision={rev} noChanges={!rev.hasChanges} />
          <RevisionBody report={report} rev={rev} />
        </div>
      ))}
    </div>
  );
}
