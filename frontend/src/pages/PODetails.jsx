import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Download,
  FileText,
  Maximize2,
  Plus,
  Printer,
  RotateCw,
  Save,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";

const initialOverview = {
  poNumber: "PO-2026-8812",
  vendor: "Acme Supply Corp",
  issueDate: "Aug 28, 2026",
  paymentTerms: "Net 30",
  currency: "USD",
};

const initialItems = [
  {
    id: 1,
    description: "Industrial Grade Steel Fasteners",
    quantity: 100,
    unitPrice: 120,
  },
  {
    id: 2,
    description: "Precision Assembly Components",
    quantity: 240,
    unitPrice: 75,
  },
  {
    id: 3,
    description: "Protective Equipment Kits",
    quantity: 60,
    unitPrice: 150,
  },
  {
    id: 4,
    description: "Freight and Handling Materials",
    quantity: 30,
    unitPrice: 100,
  },
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatMoney(value) {
  return currency.format(Number(value) || 0);
}

function LoadingSkeleton() {
  return (
    <div
      className="space-y-6 animate-pulse"
      aria-label="Loading purchase order"
    >
      <div className="h-20 rounded-xl bg-slate-200" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[620px] rounded-xl bg-slate-200" />
        <div className="h-[620px] rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, readOnly = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className={`w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${readOnly ? "bg-slate-50" : "bg-white"}`}
      />
    </label>
  );
}

export default function PODetails() {
  const { id = "PO-2026-8812" } = useParams();
  const navigate = useNavigate();
  const previewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState(initialOverview);
  const [items, setItems] = useState(initialItems);
  const [taxRate, setTaxRate] = useState(7.5);
  const [shipping, setShipping] = useState(450);
  const [activeTab, setActiveTab] = useState("data");
  const [activeItem, setActiveItem] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 650);
    return () => window.clearTimeout(timer);
  }, [id]);

  const subtotal = useMemo(
    () =>
      items.reduce((total, item) => total + item.quantity * item.unitPrice, 0),
    [items],
  );
  const tax = (subtotal * (Number(taxRate) || 0)) / 100;
  const grandTotal = subtotal + tax + (Number(shipping) || 0);
  const updateOverview = (key, value) => {
    setIsDirty(true);
    setOverview((current) => ({ ...current, [key]: value }));
  };

  const updateItem = (idToUpdate, key, value) => {
    setIsDirty(true);
    setItems((current) =>
      current.map((item) =>
        item.id === idToUpdate
          ? {
              ...item,
              [key]:
                key === "description" ? value : Math.max(0, Number(value) || 0),
            }
          : item,
      ),
    );
  };

  const addItem = () => {
    setIsDirty(true);
    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        description: "New line item",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removeItem = (idToRemove) => {
    setIsDirty(true);
    setItems((current) => current.filter((item) => item.id !== idToRemove));
    setActiveItem(null);
  };

  const downloadPdf = () => {
    const content = `Purchase Order ${overview.poNumber}\nVendor: ${overview.vendor}\nGrand Total: ${formatMoney(grandTotal)}`;
    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${overview.poNumber}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2500);
  };

  const toggleFullscreen = async () => {
    if (!previewRef.current) return;
    if (!document.fullscreenElement) {
      await previewRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        title="Print purchase order"
      >
        <Printer size={16} /> Print
      </button>
      <button
        onClick={downloadPdf}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        title="Download PDF"
      >
        {downloaded ? (
          <Check size={16} className="text-emerald-600" />
        ) : (
          <Download size={16} />
        )}
        {downloaded ? "Downloaded" : "Download PDF"}
      </button>
      <button
        onClick={() => navigate("/comparisons/CMP-9041")}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        <Sparkles size={16} /> Run AI Match
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <MainLayout
        breadcrumbs={[
          { label: "Home", to: "/dashboard" },
          { label: "Purchase Orders", to: "/purchase-orders" },
          { label: "PO-2026-8812" },
        ]}
        pageTitle="Purchase Order: PO-2026-8812"
      >
        {" "}
        <LoadingSkeleton />{" "}
      </MainLayout>
    );
  }

  return (
    <MainLayout
      breadcrumbs={[
        { label: "Home", to: "/dashboard" },
        { label: "Purchase Orders", to: "/purchase-orders" },
        { label: id },
      ]}
      pageTitle={`Purchase Order: ${id}`}
      pageActions={actions}
    >
      <div className="space-y-6">
        <nav
          className="flex items-center gap-1 text-sm text-slate-500 lg:hidden"
          aria-label="Breadcrumb"
        >
          <Link to="/dashboard" className="hover:text-blue-600">
            Home
          </Link>
          <ChevronRight size={14} />
          <Link to="/purchase-orders" className="hover:text-blue-600">
            Purchase Orders
          </Link>
          <ChevronRight size={14} />
          <span className="font-medium text-slate-700">{id}</span>
        </nav>

        <div
          className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm lg:hidden"
          role="tablist"
          aria-label="Inspector panels"
        >
          <button
            onClick={() => setActiveTab("data")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${activeTab === "data" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            role="tab"
            aria-selected={activeTab === "data"}
          >
            Extracted Data
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${activeTab === "preview" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            role="tab"
            aria-selected={activeTab === "preview"}
          >
            Document Preview
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section
            className={`${activeTab === "preview" ? "hidden lg:block" : ""} space-y-6`}
          >
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Extracted metadata
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    Document Overview
                  </h2>
                </div>
                <div
                  className="group relative flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
                  title="Confidence reflects the model's certainty across the extracted document fields."
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  99.4% AI Confidence Score
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="PO Number"
                  value={overview.poNumber}
                  onChange={(value) => updateOverview("poNumber", value)}
                />
                <Field
                  label="Vendor"
                  value={overview.vendor}
                  onChange={(value) => updateOverview("vendor", value)}
                />
                <Field
                  label="Issue Date"
                  value={overview.issueDate}
                  onChange={(value) => updateOverview("issueDate", value)}
                />
                <Field
                  label="Payment Terms"
                  value={overview.paymentTerms}
                  onChange={(value) => updateOverview("paymentTerms", value)}
                />
                <Field label="Currency" value={overview.currency} readOnly />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Parsed contents
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    Line Items
                  </h2>
                </div>
                <button
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  <Plus size={16} /> Add Line Item
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">
                        Item Description
                      </th>
                      <th className="w-24 px-3 py-3 font-semibold">Quantity</th>
                      <th className="w-32 px-3 py-3 font-semibold">
                        Unit Price ($)
                      </th>
                      <th className="w-32 px-3 py-3 font-semibold">
                        Line Total ($)
                      </th>
                      <th className="w-16 px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        onMouseEnter={() => setActiveItem(item.id)}
                        onMouseLeave={() => setActiveItem(null)}
                        className={`transition ${activeItem === item.id ? "bg-blue-50" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-5 py-3">
                          <input
                            value={item.description}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "description",
                                event.target.value,
                              )
                            }
                            className="w-full border-0 bg-transparent p-0 text-sm text-slate-800 outline-none focus:ring-0"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "quantity",
                                event.target.value,
                              )
                            }
                            className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) =>
                              updateItem(
                                item.id,
                                "unitPrice",
                                event.target.value,
                              )
                            }
                            className="w-28 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-3 py-3 font-semibold tabular-nums text-slate-900">
                          {formatMoney(item.quantity * item.unitPrice)}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="rounded-md p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Delete ${item.description}`}
                            title="Delete line item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-200 bg-slate-50 p-5">
                <div className="ml-auto max-w-sm space-y-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {formatMoney(subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-slate-600">
                    <label htmlFor="tax-rate">
                      Tax <span className="text-xs">(%)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="tax-rate"
                        type="number"
                        min="0"
                        step="0.1"
                        value={taxRate}
                        onChange={(event) => {
                          setIsDirty(true);
                          setTaxRate(event.target.value);
                        }}
                        className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-sm outline-none focus:border-blue-500"
                      />
                      <span className="w-24 text-right font-semibold tabular-nums text-slate-900">
                        {formatMoney(tax)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-slate-600">
                    <label htmlFor="shipping">Shipping</label>
                    <input
                      id="shipping"
                      type="number"
                      min="0"
                      value={shipping}
                      onChange={(event) => {
                        setIsDirty(true);
                        setShipping(event.target.value);
                      }}
                      className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
                    <span>Grand Total</span>
                    <span className="tabular-nums">
                      {formatMoney(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            className={`${activeTab === "data" ? "hidden lg:block" : ""} min-w-0`}
          >
            <div
              ref={previewRef}
              className="sticky top-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <FileText size={17} className="text-blue-600" /> Original
                  document
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoom((value) => Math.max(60, value - 10))}
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="Zoom out"
                    title="Zoom out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="w-12 text-center text-xs font-semibold text-slate-500">
                    {zoom}%
                  </span>
                  <button
                    onClick={() =>
                      setZoom((value) => Math.min(140, value + 10))
                    }
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="Zoom in"
                    title="Zoom in"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    onClick={() => setRotation((value) => value + 90)}
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="Rotate document"
                    title="Rotate document"
                  >
                    <RotateCw size={16} />
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                    aria-label={
                      isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                    }
                    title="Toggle fullscreen"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
              <div className="max-h-[760px] overflow-auto p-5 sm:p-8">
                <article
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transformOrigin: "top center",
                  }}
                  className="mx-auto min-h-[780px] max-w-[620px] bg-white p-8 text-slate-800 shadow-md transition-transform sm:p-12"
                >
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-xl font-bold">
                        <span className="flex h-8 w-8 items-center justify-center bg-blue-600 text-sm text-white">
                          A
                        </span>{" "}
                        ACME
                      </div>
                      <p className="text-xs text-slate-500">
                        Acme Supply Corporation
                        <br />
                        1450 Industrial Park Drive
                        <br />
                        Chicago, IL 60606
                      </p>
                    </div>
                    <div className="text-right">
                      <h3 className="text-lg font-bold uppercase">
                        Purchase Order
                      </h3>
                      <p className="mt-1 font-mono text-sm">
                        {overview.poNumber}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Issued {overview.issueDate}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 py-7 text-xs">
                    <div>
                      <p className="mb-1 font-bold uppercase text-slate-400">
                        Vendor
                      </p>
                      <p className="font-semibold">{overview.vendor}</p>
                      <p>Account #AC-2048</p>
                    </div>
                    <div>
                      <p className="mb-1 font-bold uppercase text-slate-400">
                        Payment Terms
                      </p>
                      <p className="font-semibold">{overview.paymentTerms}</p>
                      <p>Currency: {overview.currency}</p>
                    </div>
                  </div>
                  <table className="mb-8 w-full text-xs">
                    <thead>
                      <tr className="border-y border-slate-300 text-left uppercase text-slate-500">
                        <th className="py-3">Description</th>
                        <th className="py-3 text-right">Qty</th>
                        <th className="py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className={`border-b border-slate-100 transition ${activeItem === item.id ? "bg-blue-100 ring-1 ring-inset ring-blue-300" : ""}`}
                        >
                          <td className="py-3">{item.description}</td>
                          <td className="py-3 text-right">{item.quantity}</td>
                          <td className="py-3 text-right font-medium">
                            {formatMoney(item.quantity * item.unitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="ml-auto w-56 space-y-2 border-t border-slate-300 pt-4 text-xs">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatMoney(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatMoney(tax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>{formatMoney(shipping)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-900 pt-3 text-sm font-bold">
                      <span>Total</span>
                      <span>{formatMoney(grandTotal)}</span>
                    </div>
                  </div>
                  <div className="mt-20 border-t border-slate-200 pt-4 text-[10px] text-slate-400">
                    This document was digitally extracted and verified by AI
                    Invoice Matching.
                  </div>
                </article>
              </div>
              <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                <AlertCircle size={14} className="text-blue-500" /> Hover a line
                item to locate its source region in the document.
              </div>
            </div>
          </section>
        </div>

        {isDirty && (
          <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-lg sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm text-blue-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                <Save size={15} />
              </span>
              <span>
                <strong>Unsaved changes</strong>
                <span className="ml-1 text-blue-700">
                  Review and save your manual corrections.
                </span>
              </span>
            </div>
            <button
              onClick={() => {
                setIsDirty(false);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
