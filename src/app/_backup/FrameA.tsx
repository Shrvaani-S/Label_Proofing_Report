import { InspectionSummary } from './InspectionSummary';
import { LabelComparison } from './LabelComparison';
import { DiscrepancyDetails } from './DiscrepancyDetails';
import { MissingChanges } from './MissingChanges';

export function FrameA() {
  return (
    <div className="space-y-6">
      <MissingChanges />
      <LabelComparison />
      <div className="print-break-before space-y-6">
        <InspectionSummary />
        <DiscrepancyDetails />
      </div>
    </div>
  );
}
