import { InspectionSummary } from './InspectionSummary';
import { ExpectedChanges } from './ExpectedChanges';
import { LabelComparison } from './LabelComparison';
import { DiscrepancyDetails } from './DiscrepancyDetails';
import { MissingChanges } from './MissingChanges';

export function FrameB() {
  return (
    <div className="space-y-6">
      <ExpectedChanges />
      <LabelComparison show="master" />
      <InspectionSummary />
      <DiscrepancyDetails />
      <MissingChanges />
    </div>
  );
}
