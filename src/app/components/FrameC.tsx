import { InspectionSummary } from './InspectionSummary';
import { ExpectedChanges } from './ExpectedChanges';
import { LabelComparison } from './LabelComparison';
import { DiscrepancyDetails } from './DiscrepancyDetails';
import { MissingChanges } from './MissingChanges';

export function FrameC() {
  return (
    <div className="space-y-6">
      <ExpectedChanges />
      <LabelComparison />
      <InspectionSummary />
      <DiscrepancyDetails />
      <MissingChanges />
    </div>
  );
}
