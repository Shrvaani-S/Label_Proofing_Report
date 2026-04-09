import { InspectionSummary } from '@/components/InspectionSummary';
import { LabelComparison } from '@/components/LabelComparison';
import { DiscrepancyDetails } from '@/components/DiscrepancyDetails';
import { MissingChanges } from '@/components/MissingChanges';
import { ExpectedChanges } from '@/components/ExpectedChanges';
import { requirementsToExpectedChanges } from '@/utils/requirementsToExpectedChanges';
import type { ReportData } from '@/common/types';

export function FrameB({ data }: { data?: ReportData }) {
  return (
    <div className="space-y-6">
      <LabelComparison show="master" currentLabelUrl={data?.currentLabelUrl} currentLabelName={data?.currentLabelName} newLabelUrl={data?.newLabelUrl} newLabelName={data?.newLabelName} currentBoxes={data?.currentBoxes} newBoxes={data?.newBoxes} />
      <InspectionSummary />
      <DiscrepancyDetails categories={data?.discrepancyCategories} />
      <MissingChanges requirements={data?.requirements} />
      {data?.requirements?.length ? (
        <ExpectedChanges data={requirementsToExpectedChanges(data.requirements)} />
      ) : null}
    </div>
  );
}
