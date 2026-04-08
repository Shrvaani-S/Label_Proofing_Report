import { InspectionSummary } from './InspectionSummary';
import { LabelComparison } from './LabelComparison';
import { DiscrepancyDetails } from './DiscrepancyDetails';
import { MissingChanges } from './MissingChanges';
import { ExpectedChanges } from './ExpectedChanges';
import { requirementsToExpectedChanges } from '../utils/requirementsToExpectedChanges';
import type { ReportData, Requirement } from '../types';

interface SummaryData {
  deleted:  { text: number; symbol: number; barcode: number; image: number };
  added:    { text: number; symbol: number; barcode: number; image: number };
  modified: { text: number; symbol: number; barcode: number; image: number };
  misplaced:{ text: number; symbol: number; barcode: number; image: number };
}

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

interface FrameAProps {
  data?: ReportData;
}

export function FrameA({ data }: FrameAProps) {
  const summaryData = data ? computeSummaryData(data.requirements) : undefined;

  return (
    <div className="space-y-6">
      <MissingChanges requirements={data?.requirements} />
      {data?.requirements?.length ? (
        <ExpectedChanges data={requirementsToExpectedChanges(data.requirements)} />
      ) : null}
      <div className="print-break-before">
        <LabelComparison
          show={data?.currentLabelUrl ? 'both' : 'master'}
          currentLabelUrl={data?.currentLabelUrl}
          currentLabelName={data?.currentLabelName}
          newLabelUrl={data?.newLabelUrl}
          newLabelName={data?.newLabelName}
          currentBoxes={data?.currentBoxes}
          newBoxes={data?.newBoxes}
        />
      </div>
      <div className="print-break-before space-y-6">
        <InspectionSummary data={summaryData} />
        <DiscrepancyDetails categories={data?.discrepancyCategories} />
      </div>
    </div>
  );
}
