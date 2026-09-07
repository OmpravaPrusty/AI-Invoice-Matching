import api from "../api.ts";

export type MatchStatus = "MATCH" | "PARTIAL_MATCH" | "MISMATCH";

export interface ComparisonSummary {
  po_number: string;
  invoice_number: string;
  vendor_name: string;
  po_total: number;
  invoice_total: number;
  overall_status: "MATCHED" | "PARTIAL_MATCH" | "DISCREPANCY_FOUND";
}

export interface LineItemComparison {
  item_name: string;
  po_qty: number;
  inv_qty: number;
  po_rate: number;
  inv_rate: number;
  po_total: number;
  inv_total: number;
  status: "MATCH" | "DISCREPANCY";
  variance_reason: string;
}

export interface MatchedHeader {
  field: string;
  po_value: string;
  invoice_value: string;
  match_confidence: string;
}

export interface Discrepancy {
  field: string;
  po_value: string;
  invoice_value: string;
  variance: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  status: "MATCH" | "DISCREPANCY";
  recommendation: string;
}

export interface ExtractedData {
  [key: string]: unknown;
}

export interface ComparisonData {
  summary?: ComparisonSummary;
  line_items?: LineItemComparison[];
  matched_headers?: MatchedHeader[];
  match_status: MatchStatus;
  summary: string;
  po_extracted: ExtractedData;
  invoice_extracted: ExtractedData;
  discrepancies: Discrepancy[];
  manual_review_recommended: boolean;
  total_variance?: number | string;
}

export interface SaveComparisonPayload {
  comparison_result: ComparisonData;
  poFile: File;
  invoiceFile: File;
}

export async function compareDirect(
  poFile: File,
  invoiceFile: File,
): Promise<ComparisonData> {
  const storedToken =
    localStorage.getItem("token") || localStorage.getItem("accessToken");
  const token = storedToken?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new Error("Session expired. Please log in again.");
  }

  const formData = new FormData();
  formData.append("po_file", poFile);
  formData.append("invoice_file", invoiceFile);
  const { data } = await api.post<ComparisonData>(
    "/api/ai/compare-direct",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return data;
}

export async function saveComparison(
  payload: SaveComparisonPayload,
): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append(
    "comparison_result",
    JSON.stringify(payload.comparison_result),
  );
  formData.append("po_file", payload.poFile);
  formData.append("invoice_file", payload.invoiceFile);
  const { data } = await api.post<Record<string, unknown>>(
    "/api/comparisons/save",
    formData,
  );
  return data;
}
