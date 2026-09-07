import { GoogleGenAI } from "@google/genai";
import { fileToInlineData } from "../utils/fileHelpers";

const responseSchema = /** @type {import("@google/genai").Schema} */ ({
  type: "object",
  properties: {
    matchStatus: {
      type: "string",
      enum: ["MATCHED", "PARTIAL_MATCH", "MISMATCH"],
    },
    confidenceScore: { type: "number" },
    summary: { type: "string" },
    poNumber: { type: "string" },
    invoiceNumber: { type: "string" },
    vendorName: { type: "string" },
    poTotal: { type: "string" },
    invoiceTotal: { type: "string" },
    discrepancyMatrix: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          poValue: { type: "string" },
          invoiceValue: { type: "string" },
          variance: { type: "string" },
          status: { type: "string", enum: ["MATCH", "DISCREPANCY"] },
        },
        required: ["field", "poValue", "invoiceValue", "variance", "status"],
      },
    },
  },
  required: [
    "matchStatus",
    "confidenceScore",
    "summary",
    "poNumber",
    "invoiceNumber",
    "vendorName",
    "poTotal",
    "invoiceTotal",
    "discrepancyMatrix",
  ],
});

const auditPrompt = `You are a meticulous invoice matching auditor. The first attached document is the purchase order and the second is the vendor invoice. Extract the relevant fields from both documents and compare them. Check identifiers, vendor, dates, line-item quantities, unit prices, subtotal, tax, shipping, and totals. Use empty strings when a value is not present. Calculate monetary variance as invoice value minus purchase order value. Return only JSON matching the supplied response schema. Do not include markdown or additional keys.`;

function parseResponse(response) {
  const raw =
    typeof response.text === "function" ? response.text() : response.text;
  const jsonText = String(raw || "")
    .replace(/^```json\s*|\s*```$/g, "")
    .trim();
  const result = JSON.parse(jsonText);
  if (!result.summary || !Array.isArray(result.discrepancyMatrix)) {
    throw new Error("Gemini returned an incomplete comparison.");
  }
  return result;
}

export async function compareDocumentsWithGemini(poFile, invoiceFile) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini is not configured. Add VITE_GEMINI_API_KEY and restart the Vite server.",
    );
  }
  if (!poFile || !invoiceFile) {
    throw new Error("Both a purchase order and vendor invoice are required.");
  }

  const [poDocument, invoiceDocument] = await Promise.all([
    fileToInlineData(poFile),
    fileToInlineData(invoiceFile),
  ]);
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: auditPrompt },
          { text: "PURCHASE ORDER" },
          poDocument,
          { text: "VENDOR INVOICE" },
          invoiceDocument,
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  return parseResponse(response);
}
