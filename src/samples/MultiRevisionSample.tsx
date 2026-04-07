/**
 * SAMPLE — Multi-Revision Label Proofing Report
 *
 *   View 1 — Accordion : one collapsible section per revision
 *   View 2 — Matrix    : requirements pivot table + label comparisons
 *
 * PDF behaviour:
 *   • A modal lets the user pick which revision(s) to include.
 *   • Each selected revision starts on its own page with a full
 *     header (logo, report ID) and metadata row, then its content.
 *   • For Matrix view, the pivot table gets its own header page too.
 *
 * To preview: npm run dev → open http://localhost:5173/sample.html
 */

import { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from '../app/contexts/ThemeContext';
import { MissingChanges } from '../app/components/MissingChanges';
import { LabelComparison } from '../app/components/LabelComparison';
import { InspectionSummary } from '../app/components/InspectionSummary';
import { DiscrepancyDetails } from '../app/components/DiscrepancyDetails';
import { ExpectedChanges } from '../app/components/ExpectedChanges';
import { Badge } from '../app/components/Badge';
import type { Requirement, DiscrepancyCategory, DrawnBox } from '../app/types';
import type { ExpectedChangesData } from '../app/components/ExpectedChanges';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LabelRevision {
  revisionName: string;
  labelName: string;
  labelType: string;
  stockNumber: string;
  labelUrl: string;
  boxes: DrawnBox[];
  hasChanges: boolean;
  requirements: Requirement[];
  discrepancyCategories: DiscrepancyCategory[];
  expectedChanges?: ExpectedChangesData;
}

interface MultiRevisionReport {
  reportId: string;
  crNumber: string;
  sku: string;
  currentRevision: string;
  /** Filename of the uploaded base PDF (e.g. "LCN-187301111_Rev-D.pdf") */
  currentLabelName: string;
  currentLabelUrl: string;
  currentBoxes: DrawnBox[];
  /** Filename of the uploaded revised PDF (e.g. "LCN-187301111_Rev-E.pdf") */
  revisedFileName: string;
  revisions: LabelRevision[];
}

type ViewMode = 'accordion' | 'matrix';
type ComparisonMode = 'input-form' | 'base-vs-revised';

// ─── Stub data ────────────────────────────────────────────────────────────────

const REPORT: MultiRevisionReport = {
  reportId:         '202603190005',
  crNumber:         'CR-2026-042',
  sku:              '187301111',
  currentRevision:  'Rev-D',
  currentLabelName: 'LCN-187301111_1_Rev-D',
  currentLabelUrl:  '/label-rev-d.png',
  currentBoxes:     [],
  revisions: [
    {
      revisionName:  'Rev-E',
      labelName:     'LCN-187301111_1_Rev-E',
      labelType:     'OUTER / INNER',
      stockNumber:   '0900-00-133',
      hasChanges:    true,
      labelUrl:      '/label-rev-e.png',
      boxes:         [],
      requirements: [
        { id: 1, elementType: 'Text',   changeType: 'Modified', description: 'Trademark ® change to ™',                            expectedValue: '™',                            actualValue: '™',                            status: 'Match'   },
        { id: 2, elementType: 'Symbol', changeType: 'Deleted',  description: 'Remove CE mark',                                      expectedValue: 'CE mark removed',               actualValue: 'CE mark removed',               status: 'Match'   },
        { id: 3, elementType: 'Text',   changeType: 'Modified', description: 'All Revisions change to next consecutive character',   expectedValue: 'Next consecutive character',    actualValue: 'Next consecutive character',    status: 'Match'   },
        { id: 4, elementType: 'Symbol', changeType: 'Deleted',  description: 'Remove EC REP symbol from labels where applicable',    expectedValue: 'EC REP symbol removed',         actualValue: 'EC REP symbol removed',         status: 'Match'   },
        { id: 5, elementType: 'Symbol', changeType: 'Deleted',  description: 'Remove EC REP address from labels where applicable',   expectedValue: 'EC REP address removed',        actualValue: 'EC REP address removed',        status: 'Match'   },
        { id: 6, elementType: 'Symbol', changeType: 'Added',    description: 'Add MR Conditional symbol',                           expectedValue: 'MR Conditional symbol present', actualValue: 'MR Conditional symbol present', status: 'Match'   },
        { id: 7, elementType: 'Text',   changeType: 'Modified', description: 'Change e-IFU symbol to e-IFU for US/Canada only',      expectedValue: 'e-IFU for US/Canada only',      actualValue: 'e-IFU for US/Canada only',      status: 'Match'   },
        { id: 8, elementType: 'Text',   changeType: 'Modified', description: 'Change the manufacturing date',                       expectedValue: 'Updated manufacturing date',    actualValue: 'Outdated date still present',   status: 'Unmatch' },
      ],
      discrepancyCategories: [
        { title: 'TEXT', items: [
          { changeType: 'Modified', value: 'Trademark has been changed to ™' },
          { changeType: 'Modified', value: 'The Revision was changed to the next consecutive character.' },
          { changeType: 'Modified', value: 'The e-IFU symbol has been changed to e-IFU for US/Canada only.' },
        ]},
        { title: 'SYMBOLS', items: [
          { changeType: 'Deleted', value: 'CE mark has been removed' },
          { changeType: 'Deleted', value: 'EC REP symbol from labels has been removed.' },
          { changeType: 'Deleted', value: 'EC REP address from labels has been removed.' },
          { changeType: 'Added',   value: 'MR Conditional symbol has been added' },
        ]},
      ],
      expectedChanges: {
        text: {
          expected: [
            { category: 'Product Identification', items: [
              { attribute: 'Trademark',  changeType: 'Modified', value: '™' },
              { attribute: 'Revision',   changeType: 'Modified', value: 'Rev-E (next consecutive character)' },
            ]},
            { category: 'Regulatory Text', items: [
              { attribute: 'e-IFU Reference', changeType: 'Modified', value: 'e-IFU for US/Canada only' },
              { attribute: 'Manufacturing Date', changeType: 'Modified', value: 'Updated manufacturing date' },
            ]},
          ],
          actual: [
            { category: 'Product Identification', items: [
              { attribute: 'Trademark',  changeType: 'Modified', value: '™' },
              { attribute: 'Revision',   changeType: 'Modified', value: 'Rev-E (next consecutive character)' },
            ]},
            { category: 'Regulatory Text', items: [
              { attribute: 'e-IFU Reference', changeType: 'Modified', value: 'e-IFU for US/Canada only' },
              { attribute: 'Manufacturing Date', changeType: 'Modified', value: '— NOT FOUND —' },
            ]},
          ],
        },
        symbols: {
          expected: [
            { category: 'Regulatory Symbols', items: [
              { attribute: 'CE Mark',          changeType: 'Deleted', value: 'CE mark removed' },
              { attribute: 'EC REP Symbol',    changeType: 'Deleted', value: 'EC REP symbol removed' },
              { attribute: 'EC REP Address',   changeType: 'Deleted', value: 'EC REP address removed' },
              { attribute: 'MR Conditional',   changeType: 'Added',   value: 'MR Conditional symbol present' },
            ]},
          ],
          actual: [
            { category: 'Regulatory Symbols', items: [
              { attribute: 'CE Mark',          changeType: 'Deleted', value: 'CE mark removed' },
              { attribute: 'EC REP Symbol',    changeType: 'Deleted', value: 'EC REP symbol removed' },
              { attribute: 'EC REP Address',   changeType: 'Deleted', value: 'EC REP address removed' },
              { attribute: 'MR Conditional',   changeType: 'Added',   value: 'MR Conditional symbol present' },
            ]},
          ],
        },
      },
    },
    {
      revisionName:  'Rev-F',
      labelName:     'LCN-187301111_1_Rev-F',
      labelType:     'INNER / PATIENT',
      stockNumber:   '0900-00-128',
      hasChanges:    true,
      labelUrl:      '/label-rev-e.png',
      boxes:         [],
      requirements: [
        { id: 1, elementType: 'Text',   changeType: 'Modified', description: 'Trademark ® change to ™',                            expectedValue: '™',                            actualValue: '™',                            status: 'Match'   },
        { id: 2, elementType: 'Symbol', changeType: 'Deleted',  description: 'Remove CE mark',                                      expectedValue: 'CE mark removed',               actualValue: 'CE mark removed',               status: 'Match'   },
        { id: 3, elementType: 'Text',   changeType: 'Modified', description: 'All Revisions change to next consecutive character',   expectedValue: 'Next consecutive character',    actualValue: 'Next consecutive character',    status: 'Match'   },
        { id: 4, elementType: 'Symbol', changeType: 'Deleted',  description: 'Remove EC REP symbol from labels where applicable',    expectedValue: 'EC REP symbol removed',         actualValue: 'EC REP symbol removed',         status: 'Match'   },
        { id: 5, elementType: 'Symbol', changeType: 'Deleted',  description: 'Remove EC REP address from labels where applicable',   expectedValue: 'EC REP address removed',        actualValue: 'EC REP address removed',        status: 'Match'   },
        { id: 6, elementType: 'Symbol', changeType: 'Added',    description: 'Add MR Conditional symbol',                           expectedValue: 'MR Conditional symbol present', actualValue: 'MR Conditional symbol present', status: 'Match'   },
        { id: 7, elementType: 'Text',   changeType: 'Modified', description: 'Change e-IFU symbol to e-IFU for US/Canada only',      expectedValue: 'e-IFU for US/Canada only',      actualValue: 'e-IFU for US/Canada only',      status: 'Match'   },
        { id: 8, elementType: 'Text',   changeType: 'Modified', description: 'Change the manufacturing date',                       expectedValue: 'Updated manufacturing date',    actualValue: 'Updated manufacturing date',    status: 'Match'   },
        { id: 9, elementType: 'Image',  changeType: 'Added',    description: 'Add RoHS logo',                                       expectedValue: 'RoHS logo present',             actualValue: 'RoHS logo absent',             status: 'Unmatch' },
      ],
      discrepancyCategories: [
        { title: 'TEXT', items: [
          { changeType: 'Modified', value: 'Trademark has been changed to ™' },
          { changeType: 'Modified', value: 'The Revision was changed to the next consecutive character.' },
          { changeType: 'Modified', value: 'Manufacturing date updated.' },
          { changeType: 'Modified', value: 'The e-IFU symbol has been changed to e-IFU for US/Canada only.' },
        ]},
        { title: 'SYMBOLS', items: [
          { changeType: 'Deleted', value: 'CE mark has been removed' },
          { changeType: 'Deleted', value: 'EC REP symbol from labels has been removed.' },
          { changeType: 'Deleted', value: 'EC REP address from labels has been removed.' },
          { changeType: 'Added',   value: 'MR Conditional symbol has been added' },
        ]},
        { title: 'IMAGE', items: [
          { changeType: 'Added', value: 'RoHS logo to be added — not found on submitted label' },
        ]},
      ],
      expectedChanges: {
        text: {
          expected: [
            { category: 'Product Identification', items: [
              { attribute: 'Trademark',  changeType: 'Modified', value: '™' },
              { attribute: 'Revision',   changeType: 'Modified', value: 'Rev-F (next consecutive character)' },
            ]},
            { category: 'Regulatory Text', items: [
              { attribute: 'e-IFU Reference',    changeType: 'Modified', value: 'e-IFU for US/Canada only' },
              { attribute: 'Manufacturing Date', changeType: 'Modified', value: 'Updated manufacturing date' },
            ]},
          ],
          actual: [
            { category: 'Product Identification', items: [
              { attribute: 'Trademark',  changeType: 'Modified', value: '™' },
              { attribute: 'Revision',   changeType: 'Modified', value: 'Rev-F (next consecutive character)' },
            ]},
            { category: 'Regulatory Text', items: [
              { attribute: 'e-IFU Reference',    changeType: 'Modified', value: 'e-IFU for US/Canada only' },
              { attribute: 'Manufacturing Date', changeType: 'Modified', value: 'Updated manufacturing date' },
            ]},
          ],
        },
        symbols: {
          expected: [
            { category: 'Regulatory Symbols', items: [
              { attribute: 'CE Mark',        changeType: 'Deleted', value: 'CE mark removed' },
              { attribute: 'EC REP Symbol',  changeType: 'Deleted', value: 'EC REP symbol removed' },
              { attribute: 'EC REP Address', changeType: 'Deleted', value: 'EC REP address removed' },
              { attribute: 'MR Conditional', changeType: 'Added',   value: 'MR Conditional symbol present' },
            ]},
          ],
          actual: [
            { category: 'Regulatory Symbols', items: [
              { attribute: 'CE Mark',        changeType: 'Deleted', value: 'CE mark removed' },
              { attribute: 'EC REP Symbol',  changeType: 'Deleted', value: 'EC REP symbol removed' },
              { attribute: 'EC REP Address', changeType: 'Deleted', value: 'EC REP address removed' },
              { attribute: 'MR Conditional', changeType: 'Added',   value: 'MR Conditional symbol present' },
            ]},
          ],
        },
        images: {
          expected: [
            { category: 'Logos', items: [
              { attribute: 'RoHS Logo', changeType: 'Added', value: 'RoHS logo present' },
            ]},
          ],
          actual: [
            { category: 'Logos', items: [
              { attribute: 'RoHS Logo', changeType: 'Added', value: '— NOT FOUND —' },
            ]},
          ],
        },
      },
    },
    {
      revisionName:  'Rev-F',
      labelName:     'LCN-187301111_2_Rev-F',
      labelType:     'DTPL',
      stockNumber:   '100041435',
      labelUrl:      '/label-rev-e.png',
      boxes:         [],
      hasChanges:    false,
      requirements:        [],
      discrepancyCategories: [],
    },
    {
      revisionName:  'Rev-F',
      labelName:     'LCN-187301111_3_Rev-F',
      labelType:     'OUTER',
      stockNumber:   '0900-00-140',
      labelUrl:      '/label-rev-e.png',
      boxes:         [],
      hasChanges:    false,
      requirements:        [],
      discrepancyCategories: [],
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SummaryData = {
  deleted:  { text: number; symbol: number; barcode: number; image: number };
  added:    { text: number; symbol: number; barcode: number; image: number };
  modified: { text: number; symbol: number; barcode: number; image: number };
  misplaced:{ text: number; symbol: number; barcode: number; image: number };
};

function computeSummaryData(requirements: Requirement[]): SummaryData {
  const data: SummaryData = {
    deleted:  { text: 0, symbol: 0, barcode: 0, image: 0 },
    added:    { text: 0, symbol: 0, barcode: 0, image: 0 },
    modified: { text: 0, symbol: 0, barcode: 0, image: 0 },
    misplaced:{ text: 0, symbol: 0, barcode: 0, image: 0 },
  };
  for (const req of requirements) {
    const ctKey = req.changeType.toLowerCase() as keyof SummaryData;
    const etKey = req.elementType.toLowerCase() as 'text' | 'symbol' | 'image';
    if (ctKey in data && etKey in data[ctKey]) {
      (data[ctKey] as Record<string, number>)[etKey]++;
    }
  }
  return data;
}

function matchCount(rev: LabelRevision) {
  if (!rev.hasChanges) return { matched: 0, total: 0 };
  const matched = rev.requirements.filter(r => r.status === 'Match').length;
  return { matched, total: rev.requirements.length };
}

// ─── Shared content block (what FrameA renders today) ────────────────────────

function NoChangesContent({ revision }: { revision: LabelRevision }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-5 py-4 bg-green-50 border border-green-200">
        <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
        </svg>
        <div>
          <div className="text-sm font-semibold text-green-800">No Changes Made</div>
          <div className="text-xs text-green-600 mt-0.5">This label requires no modifications in this revision.</div>
        </div>
      </div>
      <LabelComparison
        show="master"
        newLabelUrl={revision.labelUrl}
        newLabelName={revision.labelName}
        newBoxes={revision.boxes}
      />
    </div>
  );
}

function RevisionContent({ report, revision, comparisonMode }: {
  report: MultiRevisionReport;
  revision: LabelRevision;
  comparisonMode: ComparisonMode;
}) {
  if (!revision.hasChanges) {
    return <NoChangesContent revision={revision} />;
  }

  return (
    <div className="space-y-6">
      {comparisonMode === 'input-form' && (
        <ExpectedChanges data={revision.expectedChanges} />
      )}
      <MissingChanges requirements={revision.requirements} />
      <div className="print-break-before">
        <LabelComparison
          show={comparisonMode === 'input-form' ? 'master' : 'both'}
          currentLabelUrl={report.currentLabelUrl}
          currentLabelName={report.currentLabelName}
          newLabelUrl={revision.labelUrl}
          newLabelName={revision.labelName}
          currentBoxes={report.currentBoxes}
          newBoxes={revision.boxes}
        />
      </div>
      <div className="print-break-before space-y-6">
        <InspectionSummary data={computeSummaryData(revision.requirements)} />
        <DiscrepancyDetails categories={revision.discrepancyCategories} />
      </div>
    </div>
  );
}

// ─── Shared: card header row ──────────────────────────────────────────────────
// SKU is the primary bold identifier; revision name + label name follow.

function RevisionCardHeader({
  sku, revision, interactive, open, onToggle,
}: {
  sku: string;
  revision: LabelRevision;
  interactive: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const { matched, total } = matchCount(revision);
  const inner = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        {interactive && (
          <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
        <span className="text-sm font-bold text-gray-900">{sku}</span>
        <span className="text-xs font-semibold text-gray-500">{revision.revisionName}</span>
        {revision.labelType && (
          <span className="text-[10px] font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 uppercase tracking-wide shrink-0">{revision.labelType}</span>
        )}
        <span className="text-xs text-gray-400 truncate">{revision.labelName}</span>
      </div>
      {revision.hasChanges
        ? <span className={`text-xs font-semibold px-2 py-0.5 shrink-0 ${matched === total ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {matched}/{total} Match
          </span>
        : <span className="text-xs font-semibold px-2 py-0.5 shrink-0 bg-green-50 text-green-700">
            No Changes
          </span>
      }
    </>
  );

  if (interactive) {
    return (
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200 text-left"
      >
        {inner}
      </button>
    );
  }
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
      {inner}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 1 — Accordion
// ═══════════════════════════════════════════════════════════════════════════════

function AccordionCard({ report, revision, defaultOpen, comparisonMode }: {
  report: MultiRevisionReport; revision: LabelRevision; defaultOpen: boolean; comparisonMode: ComparisonMode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-300 bg-white">
      <RevisionCardHeader sku={report.sku} revision={revision} interactive open={open} onToggle={() => setOpen(o => !o)} />
      {open && <div className="p-8"><RevisionContent report={report} revision={revision} comparisonMode={comparisonMode} /></div>}
    </div>
  );
}

function AccordionView({ report, comparisonMode }: { report: MultiRevisionReport; comparisonMode: ComparisonMode }) {
  return (
    <div className="space-y-4">
      {report.revisions.map((rev, i) => (
        <AccordionCard key={rev.labelName} report={report} revision={rev} defaultOpen={i === 0} comparisonMode={comparisonMode} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 2 — Matrix
// ═══════════════════════════════════════════════════════════════════════════════

function MatrixTable({ report }: { report: MultiRevisionReport }) {
  const allDescs = Array.from(new Set(report.revisions.flatMap(r => r.requirements.map(req => req.description))));
  const lookup: Record<string, Record<string, Requirement | null>> = {};
  for (const desc of allDescs) {
    lookup[desc] = {};
    for (const rev of report.revisions) lookup[desc][rev.revisionName] = rev.requirements.find(r => r.description === desc) ?? null;
  }
  const firstMatch = (desc: string): Requirement | null =>
    report.revisions.map(r => lookup[desc][r.revisionName]).find(Boolean) ?? null;

  return (
    <div className="bg-white border border-gray-300">
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">Requirements Matrix</span>
        <span className="text-[10px] text-gray-400">{allDescs.length} requirements · {report.revisions.length} revisions</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300">
              <th className="px-3 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200 w-6">#</th>
              <th className="px-3 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200 w-20">Element</th>
              <th className="px-3 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200 w-24">Change</th>
              <th className="px-3 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200">Requirement</th>
              {report.revisions.map(rev => {
                const { matched, total } = matchCount(rev);
                return (
                  <th key={rev.revisionName} className="px-4 py-2.5 text-center text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200 last:border-r-0 min-w-[90px]">
                    <div className="font-bold text-gray-800">{report.sku}</div>
                    <div className="text-gray-500 font-normal">{rev.revisionName}</div>
                    <div className={`mt-0.5 font-bold ${matched === total ? 'text-green-600' : 'text-red-600'}`}>{matched}/{total}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {allDescs.map((desc, i) => {
              const base = firstMatch(desc);
              const anyFail = report.revisions.some(rev => lookup[desc][rev.revisionName]?.status === 'Unmatch');
              return (
                <tr key={i} className={`border-b border-gray-100 last:border-0 ${anyFail ? 'bg-red-50/40' : ''}`}>
                  <td className="px-3 py-2 text-gray-400 border-r border-gray-100">{i + 1}</td>
                  <td className="px-3 py-2 text-gray-700 border-r border-gray-100">{base?.elementType ?? '—'}</td>
                  <td className="px-3 py-2 border-r border-gray-100">
                    {base ? <Badge type={base.changeType as 'Modified' | 'Added' | 'Deleted'} /> : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-900 border-r border-gray-100">{desc}</td>
                  {report.revisions.map(rev => {
                    const req = lookup[desc][rev.revisionName];
                    if (!req) return <td key={rev.revisionName} className="px-4 py-2 text-center text-gray-300 border-r border-gray-100 last:border-r-0">—</td>;
                    return (
                      <td key={rev.revisionName} className="px-4 py-2 text-center border-r border-gray-100 last:border-r-0">
                        <span className={`text-xs font-bold ${req.status === 'Match' ? 'text-green-700' : 'text-red-700'}`}>{req.status}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatrixView({ report, comparisonMode }: { report: MultiRevisionReport; comparisonMode: ComparisonMode }) {
  const [openCards, setOpenCards] = useState<Set<number>>(new Set([0]));
  const toggle = (i: number) => setOpenCards(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });

  return (
    <div className="space-y-6">
      <MatrixTable report={report} />
      <div className="space-y-4">
        <h3 className="text-sm uppercase tracking-wide font-bold text-gray-700">Label Comparisons</h3>
        {report.revisions.map((rev, i) => (
          <div key={rev.revisionName} className="border border-gray-300 bg-white">
            <RevisionCardHeader sku={report.sku} revision={rev} interactive open={openCards.has(i)} onToggle={() => toggle(i)} />
            {openCards.has(i) && (
              <div className="p-8">
                <RevisionContent report={report} revision={rev} comparisonMode={comparisonMode} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRINT LAYOUT  (hidden on screen, always shown in PDF)
//
// Each revision gets its own page starting with a full header + metadata row.
// Matrix section also starts on its own page with a header.
// Only the selected revisions are rendered.
// ═══════════════════════════════════════════════════════════════════════════════

// Repeatable page header — printed at the top of each revision's page
function PrintPageHeader({ report, revision }: { report: MultiRevisionReport; revision: LabelRevision }) {
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
      {/* Per-revision metadata strip */}
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

// Repeatable page header for the matrix section
function PrintMatrixPageHeader({ report }: { report: MultiRevisionReport }) {
  const revNames = report.revisions.map(r => r.revisionName).join(', ');
  return (
    <div>
      <div className="px-8 py-5 flex items-start justify-between" style={{ backgroundColor: '#D71500' }}>
        <div className="space-y-1">
          <h1 className="text-white text-2xl leading-tight">Label Proofing Report — Requirements Matrix</h1>
          <div className="text-white text-xs">Report ID: {report.reportId}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <img src="/novintix-logo.png" alt="Novintix" className="h-7 w-auto" />
          <div className="text-white/70 text-xs">{report.currentRevision} → {revNames}</div>
        </div>
      </div>
      <div className="bg-white border border-gray-300 grid" style={{ gridTemplateColumns: '0.7fr 0.7fr 1fr 1.5fr 1.5fr' }}>
        {[
          { label: 'CR Number', value: report.crNumber || '-' },
          { label: 'SKU',       value: report.sku },
          { label: 'Label Revision', value: `${report.currentRevision} → ${revNames}` },
          { label: 'Current Version Label', value: report.currentLabelName },
          { label: 'New Version Labels',    value: report.revisions.map(r => r.labelName).join(', ') },
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

// Compact strip used on content pages 2+ (no red banner, just the metadata row)
function PrintCompactHeader({ report, revision }: { report: MultiRevisionReport; revision: LabelRevision }) {
  return (
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
  );
}

// Cover page — always the first printed page, shows summary of all selected labels
function PrintCoverPage({ report, selectedRevisions }: { report: MultiRevisionReport; selectedRevisions: LabelRevision[] }) {
  const revNames = [...new Set(selectedRevisions.map(r => r.revisionName))].join(', ');
  // Changed labels first, then no-change labels
  const ordered = [
    ...selectedRevisions.filter(r => r.hasChanges),
    ...selectedRevisions.filter(r => !r.hasChanges),
  ];

  return (
    <div>
      {/* Red banner */}
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

      {/* Metadata strip */}
      <div className="bg-white border border-gray-300 grid" style={{ gridTemplateColumns: '0.7fr 0.7fr 1fr 1.5fr 1.5fr' }}>
        {[
          { label: 'CR Number',             value: report.crNumber || '-' },
          { label: 'SKU',                   value: report.sku },
          { label: 'Label Revision',        value: `${report.currentRevision} → ${revNames}` },
          { label: 'Current Version Label', value: report.currentLabelName },
          { label: 'New Version Labels',    value: selectedRevisions.map(r => r.labelName).join(', ') },
        ].map((cell, i, arr) => (
          <div key={i} className={`px-3 py-1.5 ${i < arr.length - 1 ? 'border-r border-gray-300' : ''}`}>
            <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">{cell.label}</div>
            <div className="text-xs text-gray-900 break-all">{cell.value}</div>
          </div>
        ))}
      </div>

      {/* Label summary table */}
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
              {ordered.map((rev, i) => {
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

function PrintContent({ report, selectedRevNames, viewMode, comparisonMode }: { report: MultiRevisionReport; selectedRevNames: string[]; viewMode: ViewMode; comparisonMode: ComparisonMode }) {
  const selectedRevisions = report.revisions.filter(r => selectedRevNames.includes(r.labelName));
  const allDescs = Array.from(new Set(selectedRevisions.flatMap(r => r.requirements.map(req => req.description))));
  const lookup: Record<string, Record<string, Requirement | null>> = {};
  for (const desc of allDescs) {
    lookup[desc] = {};
    for (const rev of selectedRevisions) lookup[desc][rev.revisionName] = rev.requirements.find(r => r.description === desc) ?? null;
  }
  const firstMatch = (desc: string) => selectedRevisions.map(r => lookup[desc][r.revisionName]).find(Boolean) ?? null;

  // Print order: changed labels first, unchanged after
  const orderedRevisions = [
    ...selectedRevisions.filter(r => r.hasChanges),
    ...selectedRevisions.filter(r => !r.hasChanges),
  ];

  return (
    <div>
      {/* ── Cover page: always first ── */}
      <div className="print-break-before" style={{ pageBreakBefore: 'avoid' }}>
        <PrintCoverPage report={report} selectedRevisions={orderedRevisions} />
      </div>

      {/* ── Accordion view ── */}
      {viewMode === 'accordion' && (() => {
        const changedRevs   = orderedRevisions.filter(r => r.hasChanges);
        const noChangeRevs  = orderedRevisions.filter(r => !r.hasChanges);
        // Group no-change revisions into pairs for 2-column pages
        const noChangePairs: LabelRevision[][] = [];
        for (let i = 0; i < noChangeRevs.length; i += 2) {
          noChangePairs.push(noChangeRevs.slice(i, i + 2));
        }

        return (
          <>
            {/* One full page per changed label */}
            {changedRevs.map((rev) => (
              <div key={rev.labelName} style={{ pageBreakBefore: 'always' }}>
                <PrintPageHeader report={report} revision={rev} />

                {/* Page 1 cont: Requirements Summary */}
                <div className="p-8">
                  <MissingChanges requirements={rev.requirements} />
                </div>

                {/* Next page (input-form only): Expected Changes */}
                {comparisonMode === 'input-form' && (
                  <div className="print-break-before p-8">
                    <ExpectedChanges data={rev.expectedChanges} />
                  </div>
                )}

                {/* Next page: Label Comparison */}
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

                {/* Next page: Inspection Summary + Changes Made */}
                <div className="print-break-before p-8 space-y-6">
                  <InspectionSummary data={computeSummaryData(rev.requirements)} />
                  <DiscrepancyDetails categories={rev.discrepancyCategories} />
                </div>
              </div>
            ))}

            {/* No-change labels: 2 per page in a grid */}
            {noChangePairs.map((pair, pi) => (
              <div key={pi} style={{ pageBreakBefore: 'always' }}>
                {/* Section header row */}
                <div className="px-8 py-3 flex items-center justify-between border-b border-gray-300 bg-gray-50">
                  <span className="text-[10px] uppercase tracking-wide font-bold text-gray-600">
                    Labels — No Changes Required
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {pair.map(r => r.revisionName).join(' · ')}
                  </span>
                </div>

                {/* 2-column grid */}
                <div className={`p-8 grid gap-6 ${pair.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {pair.map((rev) => (
                    <div key={rev.labelName} className="border border-gray-200 bg-white">
                      {/* Per-label mini header */}
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
                      {/* Label image */}
                      <div className="p-4">
                        <img src={rev.labelUrl} alt={rev.labelName} className="w-full h-auto block" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        );
      })()}

      {/* ── Matrix view ── */}
      {viewMode === 'matrix' && orderedRevisions.length > 0 && (
        <>
          {/* Matrix requirements table */}
          <div style={{ pageBreakBefore: 'always' }}>
            {orderedRevisions.length === 1
              ? <PrintPageHeader report={report} revision={orderedRevisions[0]} />
              : <PrintMatrixPageHeader report={{ ...report, revisions: orderedRevisions }} />
            }
            <div className="p-8">
              <div className="bg-white border border-gray-300">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-300">
                        <th className="px-3 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200 w-6">#</th>
                        <th className="px-3 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200 w-20">Element</th>
                        <th className="px-3 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200 w-24">Change</th>
                        <th className="px-3 py-2.5 text-left text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200">Requirement</th>
                        {orderedRevisions.map(rev => {
                          const { matched, total } = matchCount(rev);
                          return (
                            <th key={rev.labelName} className="px-4 py-2.5 text-center text-[10px] uppercase text-gray-600 font-bold border-r border-gray-200 last:border-r-0 min-w-[90px]">
                              <div className="font-bold text-gray-800">{report.sku}</div>
                              <div className="text-gray-500 font-normal">{rev.revisionName}</div>
                              <div className={`mt-0.5 font-bold ${matched === total ? 'text-green-600' : 'text-red-600'}`}>{matched}/{total}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {allDescs.map((desc, i) => {
                        const base = firstMatch(desc);
                        const anyFail = orderedRevisions.some(rev => lookup[desc][rev.revisionName]?.status === 'Unmatch');
                        return (
                          <tr key={i} className={`border-b border-gray-100 last:border-0 ${anyFail ? 'bg-red-50/40' : ''}`}>
                            <td className="px-3 py-2 text-gray-400 border-r border-gray-100">{i + 1}</td>
                            <td className="px-3 py-2 text-gray-700 border-r border-gray-100">{base?.elementType ?? '—'}</td>
                            <td className="px-3 py-2 border-r border-gray-100">
                              {base ? <Badge type={base.changeType as 'Modified' | 'Added' | 'Deleted'} /> : '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-900 border-r border-gray-100">{desc}</td>
                            {orderedRevisions.map(rev => {
                              const req = lookup[desc][rev.revisionName];
                              if (!req) return <td key={rev.labelName} className="px-4 py-2 text-center text-gray-300 border-r border-gray-100 last:border-r-0">—</td>;
                              return (
                                <td key={rev.labelName} className="px-4 py-2 text-center border-r border-gray-100 last:border-r-0">
                                  <span className={`text-xs font-bold ${req.status === 'Match' ? 'text-green-700' : 'text-red-700'}`}>{req.status}</span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Changed labels: one full page each */}
          {orderedRevisions.filter(r => r.hasChanges).map((rev) => (
            <div key={rev.labelName} style={{ pageBreakBefore: 'always' }}>
              <PrintPageHeader report={report} revision={rev} />
              <div className="p-8">
                <MissingChanges requirements={rev.requirements} />
              </div>
              {comparisonMode === 'input-form' && (
                <div className="print-break-before p-8">
                  <ExpectedChanges data={rev.expectedChanges} />
                </div>
              )}
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
              <div className="print-break-before p-8 space-y-6">
                <InspectionSummary data={computeSummaryData(rev.requirements)} />
                <DiscrepancyDetails categories={rev.discrepancyCategories} />
              </div>
            </div>
          ))}

          {/* No-change labels: 2 per page in a grid */}
          {(() => {
            const noChangeRevs = orderedRevisions.filter(r => !r.hasChanges);
            const pairs: LabelRevision[][] = [];
            for (let i = 0; i < noChangeRevs.length; i += 2) pairs.push(noChangeRevs.slice(i, i + 2));
            return pairs.map((pair, pi) => (
              <div key={pi} style={{ pageBreakBefore: 'always' }}>
                <div className="px-8 py-3 flex items-center justify-between border-b border-gray-300 bg-gray-50">
                  <span className="text-[10px] uppercase tracking-wide font-bold text-gray-600">Labels — No Changes Required</span>
                  <span className="text-[10px] text-gray-400">{pair.map(r => r.revisionName).join(' · ')}</span>
                </div>
                <div className={`p-8 grid gap-6 ${pair.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {pair.map((rev) => (
                    <div key={rev.labelName} className="border border-gray-200 bg-white">
                      <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {rev.labelType && <span className="text-[10px] font-bold uppercase tracking-wide text-gray-700">{rev.labelType}</span>}
                            {rev.stockNumber && <span className="text-[10px] font-mono text-gray-500">{rev.stockNumber}</span>}
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
            ));
          })()}
        </>
      )}
    </div>
  );
}

// ─── PDF revision selector modal ──────────────────────────────────────────────

function PdfModal({
  report,
  onClose,
  onConfirm,
}: {
  report: MultiRevisionReport;
  onClose: () => void;
  onConfirm: (selected: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(report.revisions.map(r => r.labelName)));

  const toggle = (name: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s; });

  const toggleAll = () =>
    setSelected(selected.size === report.revisions.length ? new Set() : new Set(report.revisions.map(r => r.labelName)));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 print:hidden">
      <div className="bg-white border border-gray-200 shadow-lg w-96">
        {/* Modal header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">Download PDF</h2>
          <p className="text-xs text-gray-500 mt-0.5">Select which revisions to include in the PDF.</p>
        </div>

        {/* Revision checkboxes */}
        <div className="px-6 py-4 space-y-3">
          {/* Select all toggle */}
          <label className="flex items-center gap-3 text-xs cursor-pointer text-gray-500 border-b border-gray-100 pb-3">
            <input
              type="checkbox"
              checked={selected.size === report.revisions.length}
              onChange={toggleAll}
              className="w-3.5 h-3.5 accent-[#D71500]"
            />
            <span className="font-semibold uppercase tracking-wide">All Revisions</span>
          </label>

          {report.revisions.map(rev => {
            const { matched, total } = matchCount(rev);
            return (
              <label key={rev.labelName} className="flex items-center gap-3 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(rev.labelName)}
                  onChange={() => toggle(rev.labelName)}
                  className="w-3.5 h-3.5 accent-[#D71500]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{report.sku}</span>
                    <span className="text-gray-500">{rev.revisionName}</span>
                    {rev.hasChanges
                      ? <span className={`text-[10px] font-semibold px-1.5 py-0.5 ${matched === total ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {matched}/{total}
                        </span>
                      : <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-green-50 text-green-700">No Changes</span>
                    }
                  </div>
                  <div className="text-gray-400 truncate">{rev.labelName}</div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-400">{selected.size} of {report.revisions.length} selected</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(Array.from(selected))}
              disabled={selected.size === 0}
              className="px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              style={{ backgroundColor: '#D71500' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="square" strokeLinejoin="miter" d="M12 3v13M7 11l5 5 5-5M3 21h18" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── View navigation ──────────────────────────────────────────────────────────

const VIEW_OPTIONS: { id: ViewMode; label: string; description: string }[] = [
  { id: 'accordion', label: '1 · Accordion', description: 'One collapsible section per revision' },
  { id: 'matrix',    label: '2 · Matrix',    description: 'Requirements pivot table across all revisions' },
];

const COMPARISON_OPTIONS: { id: ComparisonMode; label: string }[] = [
  { id: 'base-vs-revised', label: 'Base vs Revised' },
  { id: 'input-form',      label: 'Input Form vs Revised' },
];

function ViewNav({
  active, onChange, comparisonMode, onComparisonChange,
}: {
  active: ViewMode; onChange: (v: ViewMode) => void;
  comparisonMode: ComparisonMode; onComparisonChange: (m: ComparisonMode) => void;
}) {
  const current = VIEW_OPTIONS.find(v => v.id === active)!;
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-3 print:hidden flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mr-1">View</span>
      {VIEW_OPTIONS.map(v => (
        <button key={v.id} onClick={() => onChange(v.id)}
          className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
            v.id === active ? 'text-white border-[#D71500]' : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900'
          }`}
          style={v.id === active ? { backgroundColor: '#D71500' } : {}}
        >
          {v.label}
        </button>
      ))}
      <span className="ml-2 text-[11px] text-gray-400 italic">{current.description}</span>

      {/* Divider */}
      <span className="mx-3 h-4 border-l border-gray-300" />

      <span className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mr-1">Compare</span>
      {COMPARISON_OPTIONS.map(c => (
        <button key={c.id} onClick={() => onComparisonChange(c.id)}
          className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
            c.id === comparisonMode ? 'text-white border-[#064b75]' : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900'
          }`}
          style={c.id === comparisonMode ? { backgroundColor: '#064b75' } : {}}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function SampleHeader({ report, onPdfClick }: { report: MultiRevisionReport; onPdfClick: () => void }) {
  const revNames = report.revisions.map(r => r.revisionName).filter(Boolean).join(', ');
  return (
    <header className="print:hidden w-full px-8 py-5" style={{ backgroundColor: '#D71500' }}>
      <div className="max-w-[1600px] mx-auto flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-white text-2xl leading-tight">Label Proofing Report</h1>
          <div className="text-white text-xs">Report ID: {report.reportId}</div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <img src="/novintix-logo.png" alt="Novintix" className="h-7 w-auto" />
          <div className="print:hidden flex gap-2 items-center">
            <div className="text-white/60 text-xs">
              Base: <span className="text-white font-semibold">{report.currentRevision}</span>
              &nbsp;→&nbsp;
              <span className="text-white font-semibold">{revNames}</span>
            </div>
            <button
              onClick={onPdfClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors border-2"
              style={{ backgroundColor: '#a61000', borderColor: '#a61000', color: '#fff' }}
              title="Download as PDF"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="square" strokeLinejoin="miter" d="M12 3v13M7 11l5 5 5-5M3 21h18" />
              </svg>
              PDF
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Metadata row ─────────────────────────────────────────────────────────────

function SampleMetadataRow({ report }: { report: MultiRevisionReport }) {
  const revNames  = report.revisions.map(r => r.revisionName).filter(Boolean).join(', ') || '—';
  const newLabels = report.revisions.map(r => r.labelName).filter(Boolean);
  const cells = [
    { label: 'CR Number (Optional)', value: report.crNumber || '-' },
    { label: 'SKU',                  value: report.sku },
    { label: 'Label Revision',       value: (
      <span className="flex items-center gap-1.5">
        <span>{report.currentRevision}</span>
        <span className="text-[#D71500]">→</span>
        <span>{revNames}</span>
      </span>
    )},
    { label: 'Current Version Label', value: report.currentLabelName },
    { label: newLabels.length > 1 ? 'New Version Labels' : 'New Version Label',
      value: newLabels.length > 1
        ? <span className="flex flex-col gap-0.5">{newLabels.map((n, i) => <span key={i}>{n}</span>)}</span>
        : newLabels[0] ?? '—'
    },
  ];
  return (
    <div className="print:hidden bg-white border border-gray-300 grid" style={{ gridTemplateColumns: '0.7fr 0.7fr 1fr 1.5fr 1.5fr' }}>
      {cells.map((cell, i) => (
        <div key={i} className={`px-3 py-1.5 ${i < cells.length - 1 ? 'border-r border-gray-300' : ''}`}>
          <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">{cell.label}</div>
          <div className="text-xs text-gray-900 break-all">{cell.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function MultiRevisionSample() {
  const [viewMode,          setViewMode]          = useState<ViewMode>('accordion');
  const [comparisonMode,    setComparisonMode]    = useState<ComparisonMode>('base-vs-revised');
  const [showPdfModal,      setShowPdfModal]      = useState(false);
  const [selectedRevNames,  setSelectedRevNames]  = useState<string[]>(REPORT.revisions.map(r => r.labelName));
  const [triggerPrint,      setTriggerPrint]      = useState(false);
  // Refs so the print effect always reads the latest values (no stale closure)
  const selectedRevNamesRef  = useRef(selectedRevNames);
  const viewModeRef          = useRef(viewMode);
  const comparisonModeRef    = useRef(comparisonMode);

  // Fire window.print() after React has re-rendered PrintContent with the new selection
  useEffect(() => {
    if (!triggerPrint) return;
    const now = new Date();
    const ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
    const yyyy = ist.getUTCFullYear();
    const mm   = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const dd   = String(ist.getUTCDate()).padStart(2, '0');
    const hh   = String(ist.getUTCHours()).padStart(2, '0');
    const min  = String(ist.getUTCMinutes()).padStart(2, '0');
    const style = document.createElement('style');
    style.id = '__print-footer__';
    style.textContent = `
      @page {
        @bottom-left   { content: "LPR: ${REPORT.reportId}"; font-size: 7pt; color: #666; font-family: sans-serif; }
        @bottom-center { content: "Page " counter(page); font-size: 7pt; color: #666; font-family: sans-serif; }
        @bottom-right  { content: "${yyyy}-${mm}-${dd} ${hh}:${min} IST"; font-size: 7pt; color: #666; font-family: sans-serif; }
      }
    `;
    document.head.appendChild(style);
    const prevTitle = document.title;
    document.title = REPORT.reportId;
    window.print();
    document.title = prevTitle;
    document.head.removeChild(style);
    setTriggerPrint(false);
  }, [triggerPrint]);

  const handlePdfConfirm = (selected: string[]) => {
    selectedRevNamesRef.current  = selected;
    viewModeRef.current          = viewMode;
    comparisonModeRef.current    = comparisonMode;
    setSelectedRevNames(selected);
    setShowPdfModal(false);
    // Let React re-render PrintContent with the new selection, then print
    setTimeout(() => setTriggerPrint(true), 80);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#f3f4f6]">

        <SampleHeader report={REPORT} onPdfClick={() => setShowPdfModal(true)} />

        {showPdfModal && (
          <PdfModal
            report={REPORT}
            onClose={() => setShowPdfModal(false)}
            onConfirm={handlePdfConfirm}
          />
        )}

        <div className="max-w-[1600px] mx-auto">
          <SampleMetadataRow report={REPORT} />

          {/* Screen: view toggle + active view */}
          <div className="print:hidden">
            <ViewNav
              active={viewMode} onChange={setViewMode}
              comparisonMode={comparisonMode} onComparisonChange={setComparisonMode}
            />
            <div className="p-8">
              {viewMode === 'accordion' && <AccordionView report={REPORT} comparisonMode={comparisonMode} />}
              {viewMode === 'matrix'    && <MatrixView    report={REPORT} comparisonMode={comparisonMode} />}
            </div>
          </div>

          {/* Print only: active view only, selected revisions only */}
          <div className="hidden print:block">
            <PrintContent report={REPORT} selectedRevNames={selectedRevNamesRef.current} viewMode={viewModeRef.current} comparisonMode={comparisonModeRef.current} />
          </div>
        </div>

      </div>
    </ThemeProvider>
  );
}
