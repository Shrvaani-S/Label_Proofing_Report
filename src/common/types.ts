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

export interface RevisedLabelPage {
  url: string;
  name: string;
  sku: string;
  labelType: string;
  stockNumber: string;
  status: 'changed' | 'no-changes';
  boxes: DrawnBox[];
  requirements: Requirement[];
  discrepancyCategories: DiscrepancyCategory[];
}

export interface RevisedFile {
  fileName: string;
  pages: RevisedLabelPage[];
}

export interface LabelRevision {
  revisionName: string;
  labelName: string;
  fileName: string;
  fileIndex: number;
  pageIndex: number;
  sku: string;
  labelType: string;
  stockNumber: string;
  labelUrl: string;
  boxes: DrawnBox[];
  hasChanges: boolean;
  requirements: Requirement[];
  discrepancyCategories: DiscrepancyCategory[];
}

export type ReportMode = 'A' | 'B' | 'C';

export interface MultiRevisionReport {
  reportId: string;
  crNumber: string;
  sku: string;
  currentRevision: string;
  currentLabelName: string;
  currentLabelUrl: string;
  currentLabelPages: { url: string; name: string; boxes: DrawnBox[] }[];
  currentBoxes: DrawnBox[];
  revisedFileName: string;
  /** All uploaded revised file names — one entry per file. */
  revisedFileNames: string[];
  revisions: LabelRevision[];
  mode: ReportMode;
}

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
  /** Common requirements that apply to every changed label across all revised files. */
  commonRequirements?: Requirement[];
  /** Structured revised files with per-page status, boxes, requirements. */
  revisedFiles?: RevisedFile[];
  /** Report mode: A = purely visual, B = requirements-based, C = full comparison. */
  reportMode?: ReportMode;
  /** All pages of the base/current label PDF (for Mode A and C multi-page comparison). */
  currentLabelPages?: { url: string; name: string; boxes: DrawnBox[] }[];
}
