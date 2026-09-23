import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Upload,
  Plus,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import api from "../services/api.ts";
import DocumentPreviewModal from "../components/ui/DocumentPreviewModal";
import DocumentDetailsModal from "../components/ui/DocumentDetailsModal";

/**
 * PurchaseOrders - Enterprise purchase orders repository page
 *
 * Features:
 * - Advanced search and multi-column filtering
 * - Multi-select with batch operations
 * - Status badges with semantic coloring
 * - Responsive data table with pagination
 * - Real-time filter state management
 *
 * @returns {JSX.Element} Purchase orders page
 */
export default function PurchaseOrders() {
  const navigate = useNavigate();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [storedPOs, setStoredPOs] = useState([]);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);
  const [selectedDocForDetails, setSelectedDocForDetails] = useState(null);
  const [loadError, setLoadError] = useState("");
  const itemsPerPage = 10;

  useEffect(() => {
    api
      .get("/api/purchase-orders")
      .then(({ data }) => {
        setStoredPOs(
          (data.purchase_orders || []).map((item) => ({
            ...item,
            poId: item.id,
            vendorName: item.vendor || "Not detected",
            amount: item.total_amount || 0,
            dateIssued: item.created_at,
            lineItems:
              item.extracted_data?.line_items?.length ||
              item.extracted_data?.items?.length ||
              0,
          })),
        );
      })
      .catch((error) =>
        setLoadError(
          error.response?.data?.detail || "Could not load purchase orders.",
        ),
      );
  }, []);

  // Get unique vendors for dropdown
  const uniqueVendors = useMemo(() => {
    return [...new Set(storedPOs.map((po) => po.vendorName))].sort();
  }, [storedPOs]);

  // Filter logic
  const filteredPOs = useMemo(() => {
    return storedPOs.filter((po) => {
      const matchesSearch =
        (po.po_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.vendorName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesVendor =
        vendorFilter === "all" || po.vendorName === vendorFilter;

      return matchesSearch && matchesVendor;
    });
  }, [searchTerm, vendorFilter, storedPOs]);

  // Pagination logic
  const totalPages = Math.ceil(filteredPOs.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedPOs = filteredPOs.slice(startIdx, startIdx + itemsPerPage);

  /**
   * Format currency
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  /**
   * Page actions
   */
  const pageActions = (
    <div className="flex gap-3">
      {/* <button
        onClick={() => navigate("/purchase-orders/upload")}
        className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-300 transition-colors inline-flex items-center gap-2"
      >
        <Upload size={18} />
        Batch Import
      </button> */}
      {/* <button
        onClick={() => navigate("/purchase-orders/upload")}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
      >
        <Plus size={18} />
        New PO
      </button> */}
    </div>
  );

  return (
    <MainLayout
      breadcrumbs="Home > Purchase Orders"
      pageTitle="Purchase Orders Directory"
      pageActions={pageActions}
    >
      {/* Search & Filter Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
            {/* Search Input */}
            <div className="relative max-w-xl flex-1">
              <label
                htmlFor="search-po"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                {/* Search POs */}
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="search-po"
                  type="text"
                  placeholder="Search by PO Number, Vendor, or Line Items..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="input-base pl-10 w-full"
                />
              </div>
            </div>

            {/* Vendor Dropdown */}
            <div className="lg:flex-shrink-0">
              <label
                htmlFor="vendor-filter"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Vendor
              </label>
              <select
                id="vendor-filter"
                value={vendorFilter}
                onChange={(e) => {
                  setVendorFilter(e.target.value);
                  setCurrentPage(1);
                }}
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

          {/* Active Filters Display */}
          {(searchTerm || vendorFilter !== "all") && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-slate-600">
                Active Filters:
              </span>
              {searchTerm && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
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
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
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
                  setCurrentPage(1);
                }}
                className="text-sm text-slate-600 hover:text-slate-900 font-medium underline"
              >
                Reset all
              </button>
            </div>
          )}
        </div>

        {/* Results Counter */}
        {loadError && (
          <div className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        )}
        <div className="px-6 py-3 border-b border-slate-200 text-sm text-slate-600">
          Showing{" "}
          <span className="font-semibold">
            {paginatedPOs.length === 0 ? 0 : startIdx + 1}-
            {Math.min(startIdx + itemsPerPage, filteredPOs.length)}
          </span>{" "}
          of <span className="font-semibold">{filteredPOs.length}</span> POs
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Vendor Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Date Issued
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Line Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedPOs.length > 0 ? (
                paginatedPOs.map((po) => {
                  return (
                    <tr
                      key={po.poId}
                      className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-900">
                        {po.po_number || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                        {po.vendorName}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {formatCurrency(po.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(po.dateIssued)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold">
                          {po.lineItems}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDocForPreview(po)}
                            disabled={!po.file_url}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="View PDF"
                            title={
                              po.file_url ? "View PDF" : "PDF URL unavailable"
                            }
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedDocForDetails(po)}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            aria-label="View details"
                            title="View details"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <p className="text-slate-600">No purchase orders found.</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Try adjusting your search or filter criteria.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Page <span className="font-semibold">{currentPage}</span> of{" "}
            <span className="font-semibold">{totalPages || 1}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <ChevronLeft size={18} />
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              Next
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
      <DocumentPreviewModal
        document={selectedDocForPreview}
        onClose={() => setSelectedDocForPreview(null)}
        type="Purchase Order"
      />
      <DocumentDetailsModal
        document={selectedDocForDetails}
        onClose={() => setSelectedDocForDetails(null)}
        type="Purchase Order"
      />
    </MainLayout>
  );
}
