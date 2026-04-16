import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Invoice, InvoiceLineItem, Agency } from "@prisma/client";

type InvoiceWithLines = Invoice & { lineItems: InvoiceLineItem[] };

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#0B0B0C" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  agencyName: { fontSize: 18, fontFamily: "Times-Roman" },
  agencyAddr: { fontSize: 8, color: "#54545A", marginTop: 3, textAlign: "right" },
  title: { fontSize: 9, letterSpacing: 2, color: "#8A8A92", textTransform: "uppercase" },
  invoiceNumber: { fontSize: 16, fontFamily: "Courier", marginTop: 3 },
  billTo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  label: { fontSize: 8, color: "#8A8A92", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 },
  strong: { fontSize: 11 },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1px solid #E7E5DF",
    paddingBottom: 4,
    marginBottom: 6,
    fontSize: 8,
    color: "#8A8A92",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  row: { flexDirection: "row", paddingVertical: 4, borderBottom: "1px solid #E7E5DF" },
  desc: { flex: 1 },
  qty: { width: 40, textAlign: "right" },
  unit: { width: 70, textAlign: "right" },
  tot: { width: 70, textAlign: "right" },
  totalsBlock: { marginTop: 16, alignSelf: "flex-end", width: 180 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTop: "1px solid #0B0B0C",
    marginTop: 4,
    fontSize: 12,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#8A8A92",
    lineHeight: 1.5,
  },
});

export function InvoicePDF({
  invoice,
  agency,
}: {
  invoice: InvoiceWithLines;
  agency: Agency;
}) {
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <Document author={agency.name} title={`Facture ${invoice.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Facture</Text>
            <Text style={styles.invoiceNumber}>{invoice.number}</Text>
            <Text style={{ fontSize: 9, color: "#54545A", marginTop: 6 }}>
              Émise le {fmtDate(invoice.issuedAt)}
            </Text>
            {invoice.dueAt && (
              <Text style={{ fontSize: 9, color: "#54545A" }}>
                Échéance : {fmtDate(invoice.dueAt)}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.agencyName}>{agency.name}</Text>
            <Text style={styles.agencyAddr}>
              {agency.legalName ?? agency.name}
              {"\n"}
              {agency.addressLine ?? ""}
              {"\n"}
              {(agency.postalCode ?? "") + " " + (agency.city ?? "")}
              {"\n"}
              {agency.siret ? `SIRET ${agency.siret}\n` : ""}
              {agency.vatNumber ? `TVA ${agency.vatNumber}` : ""}
            </Text>
          </View>
        </View>

        <View style={styles.billTo}>
          <View>
            <Text style={styles.label}>Client</Text>
            <Text style={styles.strong}>{invoice.clientName}</Text>
            {invoice.clientCompany ? <Text>{invoice.clientCompany}</Text> : null}
            {invoice.clientAddress ? <Text>{invoice.clientAddress}</Text> : null}
            {invoice.clientVatNumber ? <Text>TVA {invoice.clientVatNumber}</Text> : null}
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.desc}>Description</Text>
          <Text style={styles.qty}>Qté</Text>
          <Text style={styles.unit}>PU HT</Text>
          <Text style={styles.tot}>Total HT</Text>
        </View>

        {invoice.lineItems.map((li) => (
          <View style={styles.row} key={li.id}>
            <Text style={styles.desc}>{li.description}</Text>
            <Text style={styles.qty}>{li.quantity}</Text>
            <Text style={styles.unit}>{invoice.currency} {li.unitPrice.toFixed(2)}</Text>
            <Text style={styles.tot}>{invoice.currency} {li.total.toFixed(2)}</Text>
          </View>
        ))}

        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={{ color: "#54545A" }}>Sous-total HT</Text>
            <Text>{invoice.currency} {invoice.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ color: "#54545A" }}>TVA ({invoice.taxRate}%)</Text>
            <Text>{invoice.currency} {invoice.taxAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text>Total TTC</Text>
            <Text>{invoice.currency} {invoice.total.toFixed(2)}</Text>
          </View>
        </View>

        {invoice.notes ? (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.label}>Notes</Text>
            <Text style={{ fontSize: 9, lineHeight: 1.4 }}>{invoice.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text>
            En cas de retard de paiement, pénalités au taux de 3 fois le taux d&apos;intérêt
            légal (Code de commerce, art. L. 441-10). Indemnité forfaitaire pour frais
            de recouvrement : 40 € (art. D. 441-5).
          </Text>
          {(agency.iban || agency.bic) && (
            <Text style={{ marginTop: 4 }}>
              Règlement par virement · IBAN {agency.iban ?? "—"} · BIC {agency.bic ?? "—"}
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
