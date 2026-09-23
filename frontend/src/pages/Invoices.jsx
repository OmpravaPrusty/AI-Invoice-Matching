import { useEffect, useMemo, useState } from "react";
import { Eye, FileText, Search, X } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import DocumentPreviewModal from "../components/ui/DocumentPreviewModal";
import DocumentDetailsModal from "../components/ui/DocumentDetailsModal";
import api from "../services/api.ts";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);
  const [selectedDocForDetails, setSelectedDocForDetails] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    api
      .get("/api/invoices")
      .then(({ data }) => setInvoices(data.invoices || []))
      .catch((error) =>
        setLoadError(
          error.response?.data?.detail || "Could not load invoices.",
        ),
      );
  }, []);

  const uniqueVendors = useMemo(() => {
    return [
      ...new Set(invoices.map((invoice) => invoice.vendor || "Not detected")),
    ].sort();
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return invoices.filter((invoice) => {
      const matchesSearch = [
        invoice.invoice_number,
        invoice.vendor,
        invoice.file_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      const matchesVendor =
        vendorFilter === "all" ||
        (invoice.vendor || "Not detected") === vendorFilter;

      return matchesSearch && matchesVendor;
    });
  }, [invoices, searchTerm, vendorFilter]);

  return (
    <MainLayout breadcrumbs="Home > Invoices" pageTitle="Invoices Directory">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="relative max-w-xl flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search invoices or vendors..."
                className="input-base w-full pl-10"
              />
            </div>
            <div className="lg:flex-shrink-0">
              <label
                htmlFor="invoice-vendor-filter"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Vendors
              </label>
              <select
                id="invoice-vendor-filter"
                value={vendorFilter}
                onChange={(event) => setVendorFilter(event.target.value)}
                className="input-base"
              >
                <option value="all">All Vendors</option>
                {uniqueVendors.map((vendor) => (
                  <option key={vendor} value={vendor}>
                    {vendor}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(searchTerm || vendorFilter !== "all") && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-600">
                Active Filters:
              </span>
              {searchTerm && (
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm("")}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              {vendorFilter !== "all" && (
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                  Vendor: {vendorFilter}
                  <button
                    onClick={() => setVendorFilter("all")}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setSearchTerm("");
                  setVendorFilter("all");
                }}
                className="text-sm font-medium text-slate-600 underline hover:text-slate-900"
              >
                Reset all
              </button>
            </div>
          )}
        </div>
        {loadError && (
          <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-3">Invoice Number</th>
                <th className="px-5 py-3">PO Number</th>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Date Issued</th>
                <th className="px-5 py-3">Line Items</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {invoice.invoice_number || invoice.file_name}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {invoice.po_number || "Not detected"}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {invoice.vendor || "Not detected"}
                  </td>
                  <td className="px-5 py-4 text-slate-700 font-semibold">
                    {invoice.total_amount
                      ? new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          minimumFractionDigits: 2,
                        }).format(invoice.total_amount)
                      : "-"}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {invoice.created_at
                      ? new Date(invoice.created_at).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "short", day: "numeric" },
                        )
                      : "-"}
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {invoice.extracted_data?.line_items?.length ||
                      invoice.extracted_data?.items?.length ||
                      0}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setSelectedDocForDetails(invoice)}
                      className="mr-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      aria-label="View details"
                      title="View details"
                    >
                      <FileText size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDocForPreview(invoice)}
                      disabled={!invoice.file_url}
                      className="rounded-lg p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="View PDF"
                      title={
                        invoice.file_url ? "View PDF" : "PDF URL unavailable"
                      }
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <DocumentPreviewModal
        document={selectedDocForPreview}
        onClose={() => setSelectedDocForPreview(null)}
        type="Invoice"
      />
      <DocumentDetailsModal
        document={selectedDocForDetails}
        onClose={() => setSelectedDocForDetails(null)}
        type="Invoice"
      />
    </MainLayout>
  );
}
