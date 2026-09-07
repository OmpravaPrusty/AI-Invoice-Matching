const SUPPORTED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

export function fileToInlineData(file) {
  if (!(file instanceof File)) {
    return Promise.reject(new Error("A valid browser file is required."));
  }

  if (!SUPPORTED_DOCUMENT_TYPES.has(file.type)) {
    return Promise.reject(
      new Error("Only PDF, PNG, and JPEG documents are supported."),
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const separatorIndex = result.indexOf(",");
      if (separatorIndex === -1) {
        reject(new Error(`Could not encode ${file.name}.`));
        return;
      }
      resolve({
        inlineData: {
          data: result.slice(separatorIndex + 1),
          mimeType: file.type,
        },
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
