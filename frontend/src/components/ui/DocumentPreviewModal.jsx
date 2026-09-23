import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function DocumentPreviewModal({ document, onClose, type }) {
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    setPreviewFailed(false);
  }, [document]);

  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-preview-title"
        className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2
              id="document-preview-title"
              className="truncate text-lg font-semibold text-slate-900"
            >
              {document.file_name || `${type} document`}
            </h2>
            <p className="truncate text-xs text-slate-500">
              {document.file_path || "Stored document"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close PDF preview"
            title="Close PDF preview"
          >
            <X size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 bg-slate-100 p-3">
          {document.file_url && !previewFailed ? (
            <iframe
              src={document.file_url}
              className="h-full min-h-[80vh] w-full rounded border-0 bg-white"
              title={`${type} PDF Preview`}
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <div className="flex h-full min-h-[80vh] flex-col items-center justify-center gap-3 text-sm text-slate-500">
              <span>
                {document.file_url
                  ? "PDF preview could not be loaded."
                  : "No preview URL is available for this document."}
              </span>
              {document.file_url && (
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noreferrer"
                  download={document.file_name}
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Open or download PDF
                </a>
              )}
            </div>
          )}
        </div>
        <footer className="flex justify-end border-t border-slate-200 px-5 py-3">
          {document.file_url && (
            <a
              href={document.file_url}
              target="_blank"
              rel="noreferrer"
              download={document.file_name}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Download PDF
            </a>
          )}
        </footer>
      </section>
    </div>
  );
}
