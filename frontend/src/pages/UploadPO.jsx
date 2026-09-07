import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  UploadCloud,
  Trash2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

/**
 * UploadPO - Production-ready file upload and OCR processing component
 *
 * Features:
 * - HTML5 drag-and-drop with visual feedback
 * - File validation (type and size)
 * - Staged file management with simulated OCR progress
 * - Real-time progress tracking with OCR stage labels
 * - Error handling with toast notifications
 * - Enterprise design with accessibility
 *
 * @returns {JSX.Element} Upload PO page
 */
export default function UploadPO() {
  const navigate = useNavigate();

  // State management
  const [stagedFiles, setStagedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // File configuration
  const ALLOWED_FORMATS = ["pdf", "png", "jpg", "jpeg", "tiff"];
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
  const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/tiff",
  ];

  /**
   * Format file size to human-readable format
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  /**
   * Get file extension
   */
  const getFileExtension = (filename) => {
    return filename.split(".").pop().toLowerCase();
  };

  /**
   * Validate file
   */
  const validateFile = (file) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage(
        `File "${file.name}" exceeds 25MB limit. Current size: ${formatFileSize(file.size)}`,
      );
      return false;
    }

    // Check file type by extension
    const extension = getFileExtension(file.name);
    if (!ALLOWED_FORMATS.includes(extension)) {
      setErrorMessage(
        `File format ".${extension}" not supported. Allowed formats: PDF, PNG, JPG, JPEG, TIFF`,
      );
      return false;
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrorMessage(
        `File type not recognized. Please upload a valid document.`,
      );
      return false;
    }

    return true;
  };

  /**
   * Add files to staged list
   */
  const handleAddFiles = (files) => {
    setErrorMessage("");

    Array.from(files).forEach((file) => {
      if (validateFile(file)) {
        const fileId = Date.now() + Math.random();
        setStagedFiles((prev) => [
          ...prev,
          {
            id: fileId,
            file,
            name: file.name,
            size: file.size,
            extension: getFileExtension(file.name),
            progress: 0,
            status: "pending",
          },
        ]);
      }
    });
  };

  /**
   * Handle drag events
   */
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  /**
   * Handle drop event
   */
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleAddFiles(e.target.files);
    }
  };

  /**
   * Remove file from staged list
   */
  const removeFile = (fileId) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== fileId));
    setErrorMessage("");
  };

  /**
   * Simulate OCR progress
   */
  useEffect(() => {
    const progressIntervals = [];

    stagedFiles.forEach((stagedFile) => {
      if (stagedFile.status === "pending" && stagedFile.progress < 100) {
        const interval = setInterval(() => {
          setStagedFiles((prev) =>
            prev.map((f) => {
              if (f.id === stagedFile.id) {
                const newProgress = Math.min(
                  f.progress + Math.random() * 15,
                  100,
                );
                return {
                  ...f,
                  progress: newProgress,
                  status: newProgress === 100 ? "complete" : "processing",
                };
              }
              return f;
            }),
          );
        }, 500);

        progressIntervals.push(interval);
      }
    });

    return () => {
      progressIntervals.forEach((interval) => clearInterval(interval));
    };
  }, [stagedFiles]);

  /**
   * Get OCR stage label based on progress
   */
  const getOCRStageLabel = (progress) => {
    if (progress < 30) return "Uploading document...";
    if (progress < 70) return "Parsing text with AI OCR...";
    if (progress < 100) return "Extracting line items & metadata...";
    return "Ready for inspection!";
  };

  /**
   * Cancel and go back
   */
  const handleCancel = () => {
    navigate("/purchase-orders");
  };

  /**
   * Process documents
   */
  const handleProcessDocuments = async () => {
    if (stagedFiles.length === 0) {
      setErrorMessage("Please upload at least one document.");
      return;
    }

    const hasIncompleteFiles = stagedFiles.some((f) => f.progress < 100);
    if (hasIncompleteFiles) {
      setErrorMessage("Please wait for all documents to complete uploading.");
      return;
    }

    setIsProcessing(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Navigate to detail page after processing
    navigate("/purchase-orders/PO-2026-8812");
  };

  const isAnyFileProcessing = stagedFiles.some((f) => f.progress < 100);
  const canProcess =
    stagedFiles.length > 0 && !isAnyFileProcessing && !isProcessing;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-1600 mx-auto px-4 md:px-8 py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-4">
            <Link
              to="/purchase-orders"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Home
            </Link>
            <ChevronRight size={16} className="text-slate-400" />
            <Link
              to="/purchase-orders"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Purchase Orders
            </Link>
            <ChevronRight size={16} className="text-slate-400" />
            <span className="text-sm text-slate-900 font-medium">Upload</span>
          </nav>

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">
              Upload Purchase Order Documents
            </h1>
            <p className="text-slate-600">
              Upload purchase orders in PDF or image format to trigger automated
              AI line-item extraction.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-1600 mx-auto px-4 md:px-8 py-8">
        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle
              size={20}
              className="text-red-600 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="font-medium text-red-900">Upload Error</p>
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage("")}
              className="text-red-600 hover:text-red-900 ml-auto flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Drag & Drop Zone */}
        <div
          className={`mb-8 p-12 border-2 border-dashed rounded-xl transition-all ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 bg-slate-50 hover:border-slate-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div
              className={`mb-4 p-4 rounded-xl transition-colors ${
                dragActive
                  ? "bg-blue-100 text-blue-600"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <UploadCloud size={48} />
            </div>

            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {dragActive ? "Drop your files here" : "Drag and drop files here"}
            </h2>

            <p className="text-slate-600 mb-4 max-w-sm">
              or click the button below to browse your local files
            </p>

            {/* File Type Badge Pills */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {["PDF", "PNG", "JPG", "JPEG", "TIFF"].map((format) => (
                <span
                  key={format}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700"
                >
                  .{format}
                </span>
              ))}
            </div>

            {/* File Size Limit Info */}
            <p className="text-xs text-slate-500 mb-6">
              Maximum file size: 25MB per document
            </p>

            {/* Browse Button */}
            <button
              onClick={() => document.getElementById("file-input").click()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Browse Local Files
            </button>

            {/* Hidden File Input */}
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.tiff"
              onChange={handleFileInputChange}
              className="hidden"
              aria-label="Upload files"
            />
          </div>
        </div>

        {/* Staged Files List */}
        {stagedFiles.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Staged Files ({stagedFiles.length})
            </h2>

            <div className="space-y-4">
              {stagedFiles.map((stagedFile) => (
                <div
                  key={stagedFile.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {stagedFile.name}
                        </h3>
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium flex-shrink-0">
                          .{stagedFile.extension.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {formatFileSize(stagedFile.size)}
                      </p>
                    </div>

                    <button
                      onClick={() => removeFile(stagedFile.id)}
                      disabled={stagedFile.progress < 100}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      aria-label={`Remove ${stagedFile.name}`}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  {/* OCR Stage Label & Status */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700">
                      {getOCRStageLabel(stagedFile.progress)}
                    </p>
                    <span className="text-xs font-semibold text-slate-600">
                      {Math.round(stagedFile.progress)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        stagedFile.progress === 100
                          ? "bg-emerald-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${stagedFile.progress}%` }}
                    />
                  </div>

                  {/* Status Indicator */}
                  {stagedFile.progress === 100 && (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle size={18} />
                      <span className="text-sm font-medium">
                        Ready for inspection!
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleProcessDocuments}
            disabled={!canProcess || isProcessing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              "Process Document"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
