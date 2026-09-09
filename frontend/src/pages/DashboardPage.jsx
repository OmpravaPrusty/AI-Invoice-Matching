import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MoreVertical, AlertCircle, TrendingUp } from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import api from "../services/api.ts";

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
  const [overview, setOverview] = useState({
    metrics: {
      total_purchase_orders: 0,
      total_invoices: 0,
      total_comparisons: 0,
      matched_rate_percentage: 0,
      discrepancies_count: 0,
      po_growth_percentage: 0,
      invoice_growth_percentage: 0,
    },
    recent_runs: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError("");
    api
      .get("/api/dashboard/overview", { params: { status: statusFilter } })
      .then(({ data }) => {
        if (active) setOverview(data);
      })
      .catch((error) => {
        if (active) {
          setLoadError(
            error.response?.data?.detail || "Could not load dashboard data.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [statusFilter]);

  const metrics = overview.metrics;
  const kpiMetrics = [
    {
      id: "total-pos",
      label: "Total Purchase Orders",
      value: metrics.total_purchase_orders,
      icon: "📋",
      trend: metrics.po_growth_percentage,
      trendPositive: metrics.po_growth_percentage >= 0,
    },
    {
      id: "total-invoices",
      label: "Total Invoices",
      value: metrics.total_invoices,
      icon: "🧾",
      trend: metrics.invoice_growth_percentage,
      trendPositive: metrics.invoice_growth_percentage >= 0,
    },
    {
      id: "total-comparisons",
      label: "Total Comparisons",
      value: metrics.total_comparisons,
      icon: "🔄",
      trend: null,
      trendPositive: true,
    },
    {
      id: "match-rate",
      label: "Matched Rate",
      value: `${metrics.matched_rate_percentage}%`,
      icon: "✓",
      trend: null,
      trendPositive: true,
      badge: "success",
    },
    {
      id: "discrepancies",
      label: "Discrepancies",
      value: metrics.discrepancies_count,
      icon: "⚠️",
      trend: null,
      trendPositive: false,
      badge: "warning",
    },
  ];

  const filteredData = useMemo(() => {
    return overview.recent_runs.filter((item) => {
      const matchesSearch =
        item.po_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.invoice_reference
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.vendor_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [overview.recent_runs, searchTerm]);

  /**
   * Get status badge styling based on match rate
   */
  const getStatusBadge = (status) => {
    const normalizedStatus = String(status || "")
      .toLowerCase()
      .replace("partial match", "partial")
      .replace("discrepancy_found", "mismatch");
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
    return badges[normalizedStatus] || badges.mismatch;
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
                {metric.trend !== null && (
                  <p
                    className={`text-sm font-medium ${
                      metric.trendPositive
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {metric.trend >= 0 ? "+" : ""}
                    {metric.trend}% from last month
                  </p>
                )}
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

        {loadError && (
          <div className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        )}

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
              {isLoading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Loading comparison runs...
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((row) => {
                  const badge = getStatusBadge(row.status);
                  return (
                    <tr
                      key={row.run_id}
                      className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-mono text-slate-900">
                        {row.run_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {row.po_reference}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {row.invoice_reference}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                        {row.vendor_name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                row.match_rate === 100
                                  ? "bg-emerald-500"
                                  : row.match_rate >= 70
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                              }`}
                              style={{
                                width: `${row.match_rate}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900">
                            {row.match_rate}%
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
            of{" "}
            <span className="font-medium">{overview.recent_runs.length}</span>{" "}
            recent runs
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
