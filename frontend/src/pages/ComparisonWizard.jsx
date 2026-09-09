import { useRef, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Download,
  FileText,
  RotateCw,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import AuditReportPDF from "../components/AuditReportPDF";
import {
  compareDirect,
  saveComparison,
} from "../services/api/comparisonService";
import { formatFileSize } from "../utils/fileHelpers";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const steps = [
  "Upload Purchase Order",
  "Upload Vendor Invoice",
  "AI Summary & Comparison Matrix",
];

const emptyResult = {
  matchStatus: "MATCHED",
  confidenceScore: 0,
  summary: "",
  poNumber: "",
  invoiceNumber: "",
  vendorName: "",
  poTotal: "",
  invoiceTotal: "",
  discrepancyMatrix: [],
  matchedHeaders: [],
};

function Stepper({ currentStep }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-3" aria-label="Comparison progress">
      {steps.map((label, index) => {
        const step = index + 1;
        const complete = step < currentStep;
        const current = step === currentStep;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${complete ? "border-emerald-500 bg-emerald-500 text-white" : current ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-500"}`}
            >
              {complete ? <Check size={17} /> : step}
            </span>
            <span
              className={`text-sm font-semibold ${current ? "text-slate-900" : "text-slate-500"}`}
            >
              {label}
            </span>
            {step < 3 && (
              <ChevronRight
                size={16}
                className="ml-auto hidden text-slate-300 sm:block"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function UploadZone({ kind, file, onFile, onRemove }) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const validate = (candidate) => {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setError("Use a PDF, PNG, or JPEG document.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setError("Documents must be smaller than 25 MB.");
      return;
    }
    setError("");
    onFile(candidate);
  };

  const drop = (event) => {
    event.preventDefault();
    setDragActive(false);
    validate(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={drop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition ${dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400"}`}
      >
        <UploadCloud className="mx-auto mb-3 text-blue-600" size={34} />
        <h2 className="text-lg font-semibold text-slate-900">Upload {kind}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Drag and drop your document here
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          className="hidden"
          onChange={(event) => validate(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Browse {kind} File
        </button>
        <p className="mt-3 text-xs text-slate-400">
          PDF, PNG, or JPEG up to 25 MB
        </p>
      </div>
      {error && (
        <p className="flex items-center gap-2 text-sm text-rose-600">
          <AlertCircle size={16} />
          {error}
        </p>
      )}
      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <FileText className="shrink-0 text-blue-600" size={22} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {file.name}
            </p>
            <p className="text-xs text-slate-500">
              {formatFileSize(file.size)}
            </p>
          </div>
          <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            Ready for {kind === "Purchase Order" ? "Invoice" : "AI Match"}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            aria-label={`Remove ${kind}`}
            title={`Remove ${kind}`}
          >
            <Trash2 size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

function SkeletonResults() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 h-16 w-16 animate-pulse rounded-full border-4 border-blue-200 border-t-blue-600" />
      <h2 className="text-xl font-semibold text-slate-900">
        AI is reviewing your documents
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        AI extracting line items and calculating variance...
      </p>
      <div className="mt-8 space-y-3">
        <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

function statusStyle(status) {
  if (status === "MATCHED") return "bg-emerald-50 text-emerald-700";
  if (status === "PARTIAL_MATCH") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function normalizeComparison(comparison) {
  const summary =
    comparison.summary && typeof comparison.summary === "object"
      ? comparison.summary
      : {};
  const rows = Array.isArray(comparison.discrepancies)
    ? comparison.discrepancies
    : Array.isArray(comparison.line_items)
      ? comparison.line_items
      : Array.isArray(comparison.discrepancyMatrix)
        ? comparison.discrepancyMatrix
        : [];

  const lineItems = rows.map((row) => {
    const status = String(row.status || "DISCREPANCY").toUpperCase();
    return {
      ...row,
      field:
        row.item_name ||
        row.field ||
        row.field_name ||
        row.fieldName ||
        row.name ||
        "Unknown field",
      itemName:
        row.item_name ||
        row.field ||
        row.field_name ||
        row.fieldName ||
        row.name ||
        "Unknown item",
      poQty: row.po_qty ?? "",
      invoiceQty: row.inv_qty ?? row.invoice_qty ?? "",
      poRate: row.po_rate ?? "",
      invoiceRate: row.inv_rate ?? row.invoice_rate ?? "",
      poTotal: row.po_total ?? row.poValue ?? row.po_value ?? "",
      invoiceTotal:
        row.inv_total ?? row.invoiceValue ?? row.invoice_value ?? "",
      poValue: row.poValue ?? row.po_value ?? "",
      invoiceValue: row.invoiceValue ?? row.invoice_value ?? "",
      variance: row.variance ?? row.difference ?? row.variance_reason ?? "",
      varianceReason: row.variance_reason ?? row.recommendation ?? "",
      status: status === "MATCH" ? "MATCH" : "DISCREPANCY",
    };
  });

  const matchedHeaders = Array.isArray(comparison.matched_headers)
    ? comparison.matched_headers.map((header) => ({
        field: header.field || "Unknown field",
        poValue: header.po_value ?? header.poValue ?? "",
        invoiceValue: header.invoice_value ?? header.invoiceValue ?? "",
        confidence: header.match_confidence ?? header.matchConfidence ?? "",
      }))
    : [];

  const matchStatus =
    comparison.match_status ||
    summary.overall_status ||
    (lineItems.some((row) => row.status === "DISCREPANCY")
      ? "DISCREPANCY_FOUND"
      : "MATCHED");

  return {
    matchStatus,
    summaryText:
      typeof comparison.summary === "string"
        ? comparison.summary
        : comparison.summary?.overall_status || "",
    poNumber: comparison.poNumber || summary.po_number || "",
    invoiceNumber: comparison.invoiceNumber || summary.invoice_number || "",
    vendorName: comparison.vendorName || summary.vendor_name || "",
    poTotal: comparison.poTotal ?? summary.po_total ?? "",
    invoiceTotal: comparison.invoiceTotal ?? summary.invoice_total ?? "",
    lineItems,
    matchedHeaders,
  };
}

export default function ComparisonWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [poFile, setPoFile] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(emptyResult);
  const [reportDownloaded, setReportDownloaded] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSimilarityOpen, setIsSimilarityOpen] = useState(false);

  const runMatch = async () => {
    if (!poFile || !invoiceFile) return;
    setError("");
    setIsAnalyzing(true);
    setCurrentStep(3);
    try {
      const comparison = await compareDirect(poFile, invoiceFile);
      const normalized = normalizeComparison(comparison);
      setComparisonData({
        ...comparison,
        match_status: normalized.matchStatus,
        summary: normalized.summaryText,
        discrepancies: normalized.lineItems,
      });
      setIsSimilarityOpen(false);
      setResult({
        ...emptyResult,
        matchStatus: normalized.matchStatus,
        summary: normalized.summaryText,
        poNumber: normalized.poNumber,
        invoiceNumber: normalized.invoiceNumber,
        vendorName: normalized.vendorName,
        poTotal: normalized.poTotal,
        invoiceTotal: normalized.invoiceTotal,
        discrepancyMatrix: normalized.lineItems,
        matchedHeaders: normalized.matchedHeaders,
      });
      setSaved(false);
    } catch (caught) {
      setError(
        caught?.response?.status === 401
          ? "Session expired. Please log in again."
          : caught?.response?.data?.detail ||
              (caught instanceof Error
                ? caught.message
                : "The AI comparison could not be completed."),
      );
      setCurrentStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setCurrentStep(1);
    setPoFile(null);
    setInvoiceFile(null);
    setResult(emptyResult);
    setError("");
    setReportDownloaded(false);
    setComparisonData(null);
    setSaved(false);
    setIsSimilarityOpen(false);
  };

  const handleSave = async () => {
    if (!comparisonData || !poFile || !invoiceFile) return;
    setIsSaving(true);
    setError("");
    try {
      await saveComparison({
        comparison_result: comparisonData,
        poFile,
        invoiceFile,
      });
      setSaved(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save comparison results.",
      );
    } finally {
      setIsSaving(false);
    }
  };
  const downloadReport = async () => {
    try {
      setError("");
      const reportData = {
        ...result,
        reportId: `AUDIT-${Date.now()}`,
        generatedAt: new Date().toLocaleString(),
      };
      const blob = await pdf(<AuditReportPDF data={reportData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-matching-audit-${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setReportDownloaded(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not generate the audit report PDF.",
      );
    }
  };

  const mismatchedRows = result.discrepancyMatrix.filter(
    (row) => row.status === "DISCREPANCY",
  );
  const matchedRows = result.discrepancyMatrix.filter(
    (row) => row.status === "MATCH",
  );
  const isMismatchedCase = [
    "MISMATCH",
    "PARTIAL_MATCH",
    "DISCREPANCY_FOUND",
  ].includes(result.matchStatus);

  const content =
    currentStep === 1 ? (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Step 1 of 3
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            Upload Purchase Order
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Add the original purchase order for the AI auditor to inspect.
          </p>
        </div>
        <UploadZone
          kind="Purchase Order"
          file={poFile}
          onFile={setPoFile}
          onRemove={() => setPoFile(null)}
        />
        <div className="mt-8 flex justify-end border-t border-slate-200 pt-5">
          <button
            disabled={!poFile}
            onClick={() => setCurrentStep(2)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next: Add Invoice <ArrowRight size={17} />
          </button>
        </div>
      </div>
    ) : currentStep === 2 ? (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-7">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Step 2 of 3
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              Upload Vendor Invoice
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Add the invoice that should be matched against your purchase
              order.
            </p>
          </div>
          <UploadZone
            kind="Vendor Invoice"
            file={invoiceFile}
            onFile={setInvoiceFile}
            onRemove={() => setInvoiceFile(null)}
          />
          <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <span className="block text-xs font-bold uppercase text-slate-500">
                Staged PO
              </span>
              <span className="mt-1 block truncate font-medium text-slate-800">
                {poFile?.name}
              </span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <span className="block text-xs font-bold uppercase text-slate-500">
                Staged Invoice
              </span>
              <span className="mt-1 block truncate font-medium text-slate-800">
                {invoiceFile?.name || "Awaiting document"}
              </span>
            </div>
          </div>
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={17} /> Back
            </button>
            <button
              disabled={!poFile || !invoiceFile || isAnalyzing}
              onClick={runMatch}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles size={17} /> Summarize &amp; Run AI Match
            </button>
          </div>
        </div>
      </div>
    ) : isAnalyzing ? (
      <SkeletonResults />
    ) : (
      <div className="space-y-6">
        <div
          className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-5 shadow-sm ${statusStyle(result.matchStatus)}`}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">
              Final audit status
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {result.matchStatus === "PARTIAL_MATCH"
                ? "PARTIAL MATCH"
                : result.matchStatus}
            </h2>
          </div>
          <span className="rounded-full bg-white/70 px-3 py-1.5 text-sm font-bold">
            {result.confidenceScore}% confidence
          </span>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 shrink-0 text-blue-600" size={21} />
            <div>
              <h2 className="font-semibold text-slate-900">
                AI Executive Summary
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                {result.summary}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
                <span>PO: {result.poNumber || "Not detected"}</span>
                <span>Invoice: {result.invoiceNumber || "Not detected"}</span>
                <span>Vendor: {result.vendorName || "Not detected"}</span>
                <span>PO total: {result.poTotal || "Not detected"}</span>
                <span>
                  Invoice total: {result.invoiceTotal || "Not detected"}
                </span>
              </div>
            </div>
          </div>
        </div>
        {isMismatchedCase && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-rose-700">
              <AlertTriangle className="text-rose-600" size={20} />
              <h2>Discrepancy Matrix</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-rose-700/70">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-3">
                      Item / Description
                    </th>
                    <th className="whitespace-nowrap px-4 py-3">PO Qty</th>
                    <th className="whitespace-nowrap px-4 py-3">Invoice Qty</th>
                    <th className="whitespace-nowrap px-4 py-3">PO Rate</th>
                    <th className="whitespace-nowrap px-4 py-3">
                      Invoice Rate
                    </th>
                    <th className="whitespace-nowrap px-4 py-3">PO Total</th>
                    <th className="whitespace-nowrap px-4 py-3">
                      Invoice Total
                    </th>
                    <th className="whitespace-nowrap px-4 py-3">Status</th>
                    <th className="whitespace-nowrap px-4 py-3">
                      Variance Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100">
                  {mismatchedRows.map((row, index) => (
                    <tr key={`${row.field}-${index}`}>
                      <td className="px-5 py-3 font-semibold text-slate-800">
                        {row.itemName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.poQty}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.invoiceQty}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.poRate}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.invoiceRate}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.poTotal}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.invoiceTotal}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                          {row.status}
                        </span>
                      </td>
                      <td className="max-w-sm px-4 py-3 font-medium text-rose-700">
                        {row.varianceReason || row.variance || "Value mismatch"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {(result.matchStatus === "MATCHED" ||
          result.matchStatus === "EXACT_MATCH") && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            <CheckCircle size={18} /> All line items matched successfully.
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setIsSimilarityOpen((open) => !open)}
            className="flex w-full items-center justify-between bg-slate-50 p-4 text-left transition hover:bg-slate-100"
            aria-expanded={isSimilarityOpen}
          >
            <span className="flex items-center gap-2 font-semibold text-slate-800">
              <CheckCircle className="text-emerald-600" size={19} />
              Similarity Matrix ({matchedRows.length} line items)
            </span>
            <span className="flex items-center gap-2 text-sm text-slate-500">
              {isSimilarityOpen ? "Hide Details" : "Show Details"}
              {isSimilarityOpen ? (
                <ChevronUp size={17} />
              ) : (
                <ChevronDown size={17} />
              )}
            </span>
          </button>
          {isSimilarityOpen && (
            <div className="overflow-x-auto border-t border-slate-200 p-4">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3">
                      Item / Description
                    </th>
                    <th className="whitespace-nowrap px-4 py-3">PO Qty</th>
                    <th className="whitespace-nowrap px-4 py-3">Invoice Qty</th>
                    <th className="whitespace-nowrap px-4 py-3">PO Rate</th>
                    <th className="whitespace-nowrap px-4 py-3">
                      Invoice Rate
                    </th>
                    <th className="whitespace-nowrap px-4 py-3">PO Total</th>
                    <th className="whitespace-nowrap px-4 py-3">
                      Invoice Total
                    </th>
                    <th className="whitespace-nowrap px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matchedRows.map((row, index) => (
                    <tr key={`${row.field}-${index}`}>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {row.itemName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.poQty}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.invoiceQty}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.poRate}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.invoiceRate}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.poTotal}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.invoiceTotal}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">
                        VERIFIED
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-2 sm:flex-row sm:justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || saved}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <Check size={17} />
            {saved
              ? "Saved to Database"
              : isSaving
                ? "Saving..."
                : "Save Comparison Results"}
          </button>
          <button
            onClick={downloadReport}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download size={17} />{" "}
            {reportDownloaded
              ? "Report Downloaded"
              : "Download Audit Report (PDF)"}
          </button>
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <RotateCw size={17} /> Start New Comparison
          </button>
        </div>
      </div>
    );

  return (
    <MainLayout
      breadcrumbs={[
        { label: "Home", to: "/dashboard" },
        { label: "Comparisons" },
      ]}
      pageTitle="New Comparison"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <Stepper currentStep={currentStep} />
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <span>{error}</span>
          </div>
        )}
        {content}
      </div>
    </MainLayout>
  );
}
