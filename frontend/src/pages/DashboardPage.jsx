import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MoreVertical, AlertCircle, TrendingUp } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";

/**
 * Dashboard Page - Main application dashboard with KPI metrics and activity table
 *
 * Features:
 * - KPI metrics grid (5 cards): Total POs, Invoices, Comparisons, Match Rate, Discrepancies
 * - Searchable & filterable data table of AI comparison runs
 * - Semantic status badges (green/amber/red)
 * - Responsive design with mobile-friendly table
 *
 * @returns {JSX.Element} Dashboard page
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Mock data for KPI metrics
  const kpiMetrics = [
    {
      id: "total-pos",
      label: "Total Purchase Orders",
      value: 2847,
      icon: "📋",
      trend: "+12.5%",
      trendPositive: true,
    },
    {
      id: "total-invoices",
      label: "Total Invoices",
      value: 3156,
      icon: "🧾",
      trend: "+8.2%",
      trendPositive: true,
    },
    {
      id: "total-comparisons",
      label: "Total Comparisons",
      value: 4203,
      icon: "🔄",
      trend: "+15.1%",
      trendPositive: true,
    },
    {
      id: "match-rate",
      label: "Matched Rate",
      value: "94.2%",
      icon: "✓",
      trend: "+2.3%",
      trendPositive: true,
      badge: "success",
    },
    {
      id: "discrepancies",
      label: "Discrepancies",
      value: 245,
      icon: "⚠️",
      trend: "+5.8%",
      trendPositive: false,
      badge: "warning",
    },
  ];

  // Mock data for comparison runs
  const mockData = [
    {
      id: "RUN-2024-001",
      poReference: "PO-892374",
      invoiceReference: "INV-201024-567",
      vendorName: "Acme Corporation",
      matchRate: 100,
      status: "matched",
    },
    {
      id: "RUN-2024-002",
      poReference: "PO-892375",
      invoiceReference: "INV-201024-568",
      vendorName: "TechVendor Inc",
      matchRate: 87,
      status: "partial",
    },
    {
      id: "RUN-2024-003",
      poReference: "PO-892376",
      invoiceReference: "INV-201024-569",
      vendorName: "Global Supply Co",
      matchRate: 65,
      status: "mismatch",
    },
    {
      id: "RUN-2024-004",
      poReference: "PO-892377",
      invoiceReference: "INV-201024-570",
      vendorName: "Enterprise Solutions LLC",
      matchRate: 95,
      status: "matched",
    },
    {
      id: "RUN-2024-005",
      poReference: "PO-892378",
      invoiceReference: "INV-201024-571",
      vendorName: "Direct Trading Partners",
      matchRate: 72,
      status: "partial",
    },
  ];

  // Filter and search logic
  const filteredData = useMemo(() => {
    return mockData.filter((item) => {
      const matchesSearch =
        item.poReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.invoiceReference
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.vendorName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  /**
   * Get status badge styling based on match rate
   */
  const getStatusBadge = (status) => {
    const badges = {
      matched: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        label: "Matched",
      },
      partial: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        label: "Partial Match",
      },
      mismatch: {
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-200",
        label: "Mismatch",
      },
    };
    return badges[status] || badges.mismatch;
  };

  /**
   * Page action buttons
   */
  const pageActions = (
    <div className="flex gap-3">
      <button
        onClick={() => navigate("/purchase-orders/upload")}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
      >
        + Upload PO
      </button>
      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2">
        + Upload Invoice
      </button>
    </div>
  );

  return (
    <MainLayout
      breadcrumbs="Dashboard > Overview"
      pageTitle="Dashboard"
      pageActions={pageActions}
    >
      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {kpiMetrics.map((metric) => (
          <div
            key={metric.id}
            className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">
                  {metric.label}
                </p>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">
                  {metric.value}
                </h3>
                <p
                  className={`text-sm font-medium ${
                    metric.trendPositive ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {metric.trend} from last month
                </p>
              </div>
              <div className="text-3xl">{metric.icon}</div>
            </div>
            {metric.badge && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                {metric.badge === "success" && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
                    <span>✓</span> Healthy
                  </div>
                )}
                {metric.badge === "warning" && (
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-medium">
                    <AlertCircle size={14} /> Needs Review
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent Activity & AI Runs Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Recent AI Comparison Runs
          </h2>
          <span className="text-sm text-slate-500">
            {filteredData.length} results
          </span>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by PO, Invoice, or Vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-base pl-10 w-full"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {["all", "matched", "partial", "mismatch"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  statusFilter === status
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {status === "all"
                  ? "All"
                  : status === "matched"
                    ? "Matched"
                    : status === "partial"
                      ? "Partial"
                      : "Mismatch"}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Run ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  PO Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Invoice Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Vendor Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Match Rate
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
              {filteredData.length > 0 ? (
                filteredData.map((row) => {
                  const badge = getStatusBadge(row.status);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-mono text-slate-900">
                        {row.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {row.poReference}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {row.invoiceReference}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                        {row.vendorName}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                row.matchRate === 100
                                  ? "bg-emerald-500"
                                  : row.matchRate >= 70
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                              }`}
                              style={{
                                width: `${row.matchRate}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900">
                            {row.matchRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          aria-label="More actions"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    <p className="text-sm">No comparison runs found.</p>
                    <p className="text-xs text-slate-400">
                      Try adjusting your search or filter criteria.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
          <p>
            Showing <span className="font-medium">{filteredData.length}</span>{" "}
            of <span className="font-medium">{mockData.length}</span> runs
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              ← Previous
            </button>
            <button className="px-3 py-1 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              Next →
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
