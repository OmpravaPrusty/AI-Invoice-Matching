import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    color: "#111827",
    fontFamily: "Helvetica",
    fontSize: 9,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    marginBottom: 14,
    paddingBottom: 10,
  },
  title: { fontSize: 17, fontFamily: "Helvetica-Bold", color: "#111827" },
  generated: { color: "#6B7280", marginTop: 4, fontSize: 8 },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusRed: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
    padding: 6,
    fontFamily: "Helvetica-Bold",
    borderRadius: 3,
  },
  statusGreen: {
    backgroundColor: "#D1FAE5",
    color: "#065F46",
    padding: 6,
    fontFamily: "Helvetica-Bold",
    borderRadius: 3,
  },
  reportId: { color: "#6B7280", fontSize: 8 },
  summaryCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
  },
  summaryGrid: { flexDirection: "row", justifyContent: "space-between" },
  summaryColumn: { width: "48%" },
  label: { color: "#6B7280", fontSize: 8, marginBottom: 2 },
  value: { fontFamily: "Helvetica-Bold", marginBottom: 7 },
  executiveBox: {
    backgroundColor: "#EFF6FF",
    borderLeftWidth: 3,
    borderLeftColor: "#2563EB",
    padding: 9,
    marginBottom: 14,
    lineHeight: 1.35,
  },
  successBox: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    color: "#065F46",
    padding: 10,
    marginBottom: 14,
    fontFamily: "Helvetica-Bold",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: "#374151",
  },
  sectionTitleRed: { color: "#991B1B" },
  sectionTitleGreen: { color: "#065F46" },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  headerRow: { backgroundColor: "#F3F4F6", fontFamily: "Helvetica-Bold" },
  mismatchRow: { backgroundColor: "#FFF7F7" },
  item: { width: "24%" },
  qty: { width: "8%", textAlign: "right" },
  rate: { width: "11%", textAlign: "right" },
  total: { width: "12%", textAlign: "right" },
  variance: {
    width: "14%",
    textAlign: "right",
    color: "#B91C1C",
    fontFamily: "Helvetica-Bold",
  },
  headerItem: { width: "35%" },
  headerValue: { width: "25%" },
  confidence: { width: "15%", textAlign: "right" },
  empty: { color: "#6B7280", fontStyle: "italic", padding: 8 },
  signoff: {
    borderTopWidth: 1,
    borderTopColor: "#D1D5DB",
    marginTop: 18,
    paddingTop: 10,
    color: "#4B5563",
  },
});

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return `Rs. ${numberValue(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value) {
  return value === "" || value === null || value === undefined ? "-" : String(value);
}

function varianceFor(item) {
  return numberValue(item.invoiceTotal) - numberValue(item.poTotal);
}

function reportStatus(data) {
  return data.matchStatus === "MATCHED" || data.matchStatus === "EXACT_MATCH"
    ? "EXACT MATCH"
    : "DISCREPANCY FOUND";
}

export default function AuditReportPDF({ data }) {
  const status = reportStatus(data);
  const isMatched = status === "EXACT MATCH";
  const mismatches = data.discrepancyMatrix.filter(
    (item) => item.status === "DISCREPANCY",
  );
  const matches = data.discrepancyMatrix.filter(
    (item) => item.status === "MATCH",
  );
  const netVariance = numberValue(data.invoiceTotal) - numberValue(data.poTotal);
  const reportId = data.reportId || "Not assigned";
  const generatedAt = data.generatedAt || "Not assigned";

  return (
    <Document title="PO vs. Invoice Reconciliation Audit Report">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <Text style={styles.title}>PO vs. INVOICE RECONCILIATION AUDIT REPORT</Text>
          <Text style={styles.generated}>Generated on: {generatedAt}</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={isMatched ? styles.statusGreen : styles.statusRed}>
            STATUS: {status}
          </Text>
          <Text style={styles.reportId}>Report ID: {reportId}</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryColumn}>
              <Text style={styles.label}>PO Number</Text>
              <Text style={styles.value}>{data.poNumber || "Not detected"}</Text>
              <Text style={styles.label}>PO Total Amount</Text>
              <Text style={styles.value}>{formatCurrency(data.poTotal)}</Text>
              <Text style={styles.label}>Vendor Name</Text>
              <Text style={styles.value}>{data.vendorName || "Not detected"}</Text>
            </View>
            <View style={styles.summaryColumn}>
              <Text style={styles.label}>Invoice Number</Text>
              <Text style={styles.value}>{data.invoiceNumber || "Not detected"}</Text>
              <Text style={styles.label}>Invoice Total Amount</Text>
              <Text style={styles.value}>{formatCurrency(data.invoiceTotal)}</Text>
              <Text style={styles.label}>Net Variance Amount</Text>
              <Text style={styles.value}>{formatCurrency(netVariance)}</Text>
            </View>
          </View>
        </View>

        {isMatched ? (
          <Text style={styles.successBox}>
            All line items, header values, and totals match perfectly across Purchase Order and Invoice.
          </Text>
        ) : (
          <View style={styles.executiveBox}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
              Executive Summary
            </Text>
            <Text>{data.summary || "Discrepancies were identified during reconciliation."}</Text>
            <Text style={{ marginTop: 4 }}>
              {mismatches.length} affected line item(s); net variance: {formatCurrency(netVariance)}.
            </Text>
          </View>
        )}

        {!isMatched && (
          <View>
            <Text style={[styles.sectionTitle, styles.sectionTitleRed]}>Discrepancy Matrix</Text>
            <View style={styles.table}>
              <View style={[styles.row, styles.headerRow]}>
                <Text style={styles.item}>Item Name / Description</Text>
                <Text style={styles.qty}>PO Qty</Text>
                <Text style={styles.qty}>Inv Qty</Text>
                <Text style={styles.rate}>PO Rate</Text>
                <Text style={styles.rate}>Inv Rate</Text>
                <Text style={styles.total}>PO Total</Text>
                <Text style={styles.total}>Inv Total</Text>
                <Text style={styles.variance}>Variance</Text>
              </View>
              {mismatches.length === 0 ? (
                <Text style={styles.empty}>No individual discrepancy rows were returned.</Text>
              ) : (
                mismatches.map((item, index) => (
                  <View key={`mismatch-${index}`} style={[styles.row, styles.mismatchRow]} wrap={false}>
                    <Text style={styles.item}>{item.itemName}</Text>
                    <Text style={styles.qty}>{formatNumber(item.poQty)}</Text>
                    <Text style={styles.qty}>{formatNumber(item.invoiceQty)}</Text>
                    <Text style={styles.rate}>{formatCurrency(item.poRate)}</Text>
                    <Text style={styles.rate}>{formatCurrency(item.invoiceRate)}</Text>
                    <Text style={styles.total}>{formatCurrency(item.poTotal)}</Text>
                    <Text style={styles.total}>{formatCurrency(item.invoiceTotal)}</Text>
                    <Text style={styles.variance}>{formatCurrency(varianceFor(item))}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        <View>
          <Text style={[styles.sectionTitle, styles.sectionTitleGreen]}>Similarity Matrix</Text>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={styles.headerItem}>Matched Field / Item</Text>
              <Text style={styles.headerValue}>PO Value</Text>
              <Text style={styles.headerValue}>Invoice Value</Text>
              <Text style={styles.confidence}>Confidence</Text>
            </View>
            {data.matchedHeaders.map((header, index) => (
              <View key={`header-${index}`} style={styles.row} wrap={false}>
                <Text style={styles.headerItem}>{header.field}</Text>
                <Text style={styles.headerValue}>{String(header.poValue)}</Text>
                <Text style={styles.headerValue}>{String(header.invoiceValue)}</Text>
                <Text style={styles.confidence}>{header.confidence || "MATCH"}</Text>
              </View>
            ))}
            {matches.map((item, index) => (
              <View key={`match-${index}`} style={styles.row} wrap={false}>
                <Text style={styles.headerItem}>{item.itemName}</Text>
                <Text style={styles.headerValue}>{formatNumber(item.poQty)}</Text>
                <Text style={styles.headerValue}>{formatNumber(item.invoiceQty)}</Text>
                <Text style={styles.confidence}>VERIFIED</Text>
              </View>
            ))}
            {data.matchedHeaders.length === 0 && matches.length === 0 && (
              <Text style={styles.empty}>No matched headers or line items were returned.</Text>
            )}
          </View>
        </View>

        {isMatched && (
          <View style={styles.signoff}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>Audit Approval</Text>
            <Text>Verification result: APPROVED - exact match confirmed.</Text>
            <Text>Generated by: AI Invoice Matching Audit System</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
