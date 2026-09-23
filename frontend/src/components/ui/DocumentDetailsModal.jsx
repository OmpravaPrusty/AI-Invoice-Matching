import { X } from "lucide-react";

export default function DocumentDetailsModal({ document, onClose, type }) {
  if (!document) return null;
  const data = document.extracted_data || {};
  const lineItems = data.line_items || data.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-details-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white shadow-2xl"
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2
              id="document-details-title"
              className="text-lg font-semibold text-slate-900"
            >
              {type} Details
            </h2>
            <p className="text-sm text-slate-500">
              {document.file_name || "Stored document"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close details"
          >
            <X size={20} />
          </button>
        </header>
        <div className="space-y-5 p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Reference
              </dt>
              <dd className="mt-1 font-medium text-slate-900">
                {document.po_number ||
                  document.invoice_number ||
                  "Not detected"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Vendor
              </dt>
              <dd className="mt-1 font-medium text-slate-900">
                {document.vendor || "Not detected"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Total Amount
              </dt>
              <dd className="mt-1 font-medium text-slate-900">
                {document.total_amount
                  ? new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      minimumFractionDigits: 2,
                    }).format(document.total_amount)
                  : "Not detected"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Status
              </dt>
              <dd className="mt-1 font-medium text-slate-900">
                {document.status || "Not detected"}
              </dd>
            </div>
          </dl>
          <div>
            <h3 className="mb-2 font-semibold text-slate-900">Line Items</h3>
            {lineItems.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Unit Price</th>
                      <th className="px-4 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.map((item, index) => (
                      <tr
                        key={`line-item-${item.item_name || item.description || index}`}
                      >
                        <td className="px-4 py-3">
                          {item.item_name ||
                            item.description ||
                            item.name ||
                            "Not detected"}
                        </td>
                        <td className="px-4 py-3">
                          {item.quantity ?? item.qty ?? "-"}
                        </td>
                        <td className="px-4 py-3">
                          {item.unit_price ?? item.rate ?? "-"}
                        </td>
                        <td className="px-4 py-3">
                          {item.total ?? item.amount ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No extracted line items are available.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
