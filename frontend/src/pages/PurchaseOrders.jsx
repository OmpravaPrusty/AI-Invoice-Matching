import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Upload,
  Plus,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";

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

  // Mock data - Realistic enterprise PO records
  const mockPOs = [
    {
      id: "PO-2026-8812",
      vendorName: "Acme Supply Corp",
      amount: 45200.0,
      dateIssued: "2026-08-28",
      lineItems: 12,
      status: "processed",
    },
    {
      id: "PO-2026-8811",
      vendorName: "Global Logistics Ltd",
      amount: 12850.5,
      dateIssued: "2026-08-27",
      lineItems: 5,
      status: "pending",
    },
    {
      id: "PO-2026-8810",
      vendorName: "Nexus Systems Inc",
      amount: 108000.0,
      dateIssued: "2026-08-26",
      lineItems: 28,
      status: "processed",
    },
    {
      id: "PO-2026-8809",
      vendorName: "TechVendor Solutions",
      amount: 67500.75,
      dateIssued: "2026-08-25",
      lineItems: 18,
      status: "pending",
    },
    {
      id: "PO-2026-8808",
      vendorName: "Premier Consulting Group",
      amount: 23400.0,
      dateIssued: "2026-08-24",
      lineItems: 8,
      status: "draft",
    },
    {
      id: "PO-2026-8807",
      vendorName: "Enterprise IT Solutions",
      amount: 156750.25,
      dateIssued: "2026-08-23",
      lineItems: 42,
      status: "processed",
    },
    {
      id: "PO-2026-8806",
      vendorName: "Global Logistics Ltd",
      amount: 9200.0,
      dateIssued: "2026-08-22",
      lineItems: 3,
      status: "draft",
    },
    {
      id: "PO-2026-8805",
      vendorName: "Acme Supply Corp",
      amount: 34567.89,
      dateIssued: "2026-08-21",
      lineItems: 15,
      status: "pending",
    },
    {
      id: "PO-2026-8804",
      vendorName: "Digital Services Partners",
      amount: 78900.0,
      dateIssued: "2026-08-20",
      lineItems: 22,
      status: "processed",
    },
    {
      id: "PO-2026-8803",
      vendorName: "Supply Chain Experts",
      amount: 45000.0,
      dateIssued: "2026-08-19",
      lineItems: 11,
      status: "pending",
    },
  ];

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [selectedPos, setSelectedPos] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get unique vendors for dropdown
  const uniqueVendors = useMemo(() => {
    return [...new Set(mockPOs.map((po) => po.vendorName))].sort();
  }, []);

  // Filter logic
  const filteredPOs = useMemo(() => {
    return mockPOs.filter((po) => {
      const matchesSearch =
        po.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.vendorName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || po.status === statusFilter;

      const matchesVendor =
        vendorFilter === "all" || po.vendorName === vendorFilter;

      return matchesSearch && matchesStatus && matchesVendor;
    });
  }, [searchTerm, statusFilter, vendorFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredPOs.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedPOs = filteredPOs.slice(startIdx, startIdx + itemsPerPage);

  /**
   * Toggle individual PO selection
   */
  const togglePoSelection = (poId) => {
    setSelectedPos((prev) =>
      prev.includes(poId) ? prev.filter((id) => id !== poId) : [...prev, poId],
    );
  };

  /**
   * Toggle select all for current page
   */
  const toggleSelectAll = () => {
    const currentPageIds = paginatedPOs.map((po) => po.id);
    const allSelected = currentPageIds.every((id) => selectedPos.includes(id));

    if (allSelected) {
      setSelectedPos((prev) =>
        prev.filter((id) => !currentPageIds.includes(id)),
      );
    } else {
      setSelectedPos((prev) => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  /**
   * Get status badge styling
   */
  const getStatusBadge = (status) => {
    const badges = {
      processed: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        label: "Processed",
        dot: "bg-emerald-500",
      },
      pending: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        label: "Pending",
        dot: "bg-amber-500",
      },
      draft: {
        bg: "bg-slate-50",
        text: "text-slate-700",
        border: "border-slate-200",
        label: "Draft",
        dot: "bg-slate-500",
      },
    };
    return badges[status] || badges.draft;
  };

  /**
   * Format currency
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
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
      <button
        onClick={() => navigate("/purchase-orders/upload")}
        className="px-4 py-2 bg-slate-200 text-slate-900 rounded-lg font-medium hover:bg-slate-300 transition-colors inline-flex items-center gap-2"
      >
        <Upload size={18} />
        Batch Import
      </button>
      <button
        onClick={() => navigate("/purchase-orders/upload")}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
      >
        <Plus size={18} />
        New PO
      </button>
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
            <div className="flex-1 min-w-0">
              <label
                htmlFor="search-po"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Search POs
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

            {/* Status Dropdown */}
            <div className="lg:flex-shrink-0">
              <label
                htmlFor="status-filter"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-base"
              >
                <option value="all">All Statuses</option>
                <option value="processed">Processed</option>
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
              </select>
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
          {(searchTerm || statusFilter !== "all" || vendorFilter !== "all") && (
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
              {statusFilter !== "all" && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  Status: {statusFilter}
                  <button
                    onClick={() => setStatusFilter("all")}
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
                  setStatusFilter("all");
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
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      paginatedPOs.length > 0 &&
                      paginatedPOs.every((po) => selectedPos.includes(po.id))
                    }
                    onChange={toggleSelectAll}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedPOs.length > 0 ? (
                paginatedPOs.map((po) => {
                  const badge = getStatusBadge(po.status);
                  const isSelected = selectedPos.includes(po.id);

                  return (
                    <tr
                      key={po.id}
                      className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                        isSelected ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePoSelection(po.id)}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-900">
                        {po.id}
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
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${badge.dot}`}
                          />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              navigate(`/purchase-orders/${po.id}`)
                            }
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            aria-label="View details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete ${po.id}?`)) {
                                // Handle delete
                                console.log(`Deleted ${po.id}`);
                              }
                            }}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label="Delete PO"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center">
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

        {/* Selection Summary */}
        {selectedPos.length > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-sm font-semibold text-blue-900">
              {selectedPos.length} item{selectedPos.length !== 1 ? "s" : ""}{" "}
              selected
            </div>
            <button
              onClick={() => setSelectedPos([])}
              className="text-sm text-blue-600 hover:text-blue-900 font-medium underline"
            >
              Clear selection
            </button>
          </div>
        )}

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
    </MainLayout>
  );
}
