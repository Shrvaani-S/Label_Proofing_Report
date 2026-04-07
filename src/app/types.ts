export type ChangeType = 'Modified' | 'Added' | 'Deleted' | 'Misplaced' | 'Repositioned';
export type ElementType = 'Text' | 'Symbol' | 'Image';

export interface DrawnBox {
  id: string;
  type: 'Modified' | 'Added' | 'Deleted' | 'Misplaced';
  top: number;    // percentage 0-100
  left: number;
  width: number;
  height: number;
  text?: string;  // optional label text shown above the box
}

export type RequirementStatus = 'Match' | 'Unmatch';

export interface Requirement {
  id: number;
  elementType: ElementType;
  changeType: ChangeType;
  description: string;
  expectedValue: string;
  actualValue: string;
  status: RequirementStatus;
}

export interface DiscrepancyItem {
  changeType: ChangeType;
  value: string;
}

export interface DiscrepancyCategory {
  title: string;
  items: DiscrepancyItem[];
}

// ─── Multi-revision types ─────────────────────────────────────────────────────

export interface LabelRevision {
  revisionName: string;
  labelName: string;
  labelType: string;
  stockNumber: string;
  labelUrl: string;
  boxes: DrawnBox[];
  hasChanges: boolean;
  requirements: Requirement[];
  discrepancyCategories: DiscrepancyCategory[];
}

export interface MultiRevisionReport {
  reportId: string;
  crNumber: string;
  sku: string;
  currentRevision: string;
  currentLabelName: string;
  currentLabelUrl: string;
  currentBoxes: DrawnBox[];
  revisedFileName: string;
  revisions: LabelRevision[];
}

export type MultiRevisionComparisonMode = 'base-vs-revised' | 'input-form';

// ─────────────────────────────────────────────────────────────────────────────

export interface ReportData {
  reportId: string;
  crNumber: string;
  sku: string;
  currentRevision: string;
  newRevision: string;
  currentLabelName: string;
  newLabelName: string;
  currentLabelUrl: string;
  newLabelUrl: string;
  currentBoxes: DrawnBox[];
  newBoxes: DrawnBox[];
  requirements: Requirement[];
  discrepancyCategories: DiscrepancyCategory[];
  /** All pages extracted from the uploaded revised PDF (index 0 = page 1 = newLabelUrl). */
  newLabelPages?: { url: string; name: string; labelType: string; stockNumber: string }[];
}
