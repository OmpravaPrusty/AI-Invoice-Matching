export type MatchStatus = "MATCH" | "PARTIAL_MATCH" | "MISMATCH";
export type DiscrepancySeverity = "HIGH" | "MEDIUM" | "LOW";

export interface ExtractedData {
  [key: string]: string | number | null | undefined;
}

export interface Discrepancy {
  field: string;
  po_value: string;
  invoice_value: string;
  variance: string;
  severity: DiscrepancySeverity;
  status: "MATCH" | "DISCREPANCY";
  recommendation: string;
}

export interface ComparisonResult {
  comparison_id: string;
  run_number: number;
  match_status: MatchStatus;
  summary: string;
  discrepancies: Discrepancy[];
  po_extracted: ExtractedData;
  invoice_extracted: ExtractedData;
  manual_review_recommended: boolean;
}
