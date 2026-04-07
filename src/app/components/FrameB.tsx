import { InspectionSummary } from './InspectionSummary';
import { LabelComparison } from './LabelComparison';
import { DiscrepancyDetails } from './DiscrepancyDetails';
import { MissingChanges } from './MissingChanges';
import type { ReportData } from '../types';

export function FrameB({ data }: { data?: ReportData }) {
  return (
    <div className="space-y-6">
      <LabelComparison show="master" currentLabelUrl={data?.currentLabelUrl} currentLabelName={data?.currentLabelName} newLabelUrl={data?.newLabelUrl} newLabelName={data?.newLabelName} currentBoxes={data?.currentBoxes} newBoxes={data?.newBoxes} />
      <InspectionSummary />
      <DiscrepancyDetails categories={data?.discrepancyCategories} />
      <MissingChanges requirements={data?.requirements} />
    </div>
  );
}
