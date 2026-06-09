import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, DocumentProps } from "@react-pdf/renderer";
import { SaleOrderPdfData } from "src/modules/pdf-generated/domain/ports/pdf-renderer.port";

const MM_TO_PT = 72 / 25.4;
const TICKET_WIDTH = 73 * MM_TO_PT;
const TICKET_HEIGHT = 260 * MM_TO_PT;

const styles = StyleSheet.create({
  page: {
    padding: 10,
    fontSize: 8,
    color: "#333",
  },
  headerRow: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 8,
    textAlign: "center",
  },
  companyBlock: {
    alignItems: "center",
    textAlign: "center",
  },
  docBlock: {
    width: "100%",
    textAlign: "center",
    border: "1pt solid #000",
    padding: 6,
    marginTop: 6,
  },
  title: {
    fontWeight: 700,
    textTransform: "uppercase",
  },
  logo: {
    width: 120,
    height: 60,
    objectFit: "contain",
    marginBottom: 0,
  },
  infoBlock: {
    marginBottom: 10,
  },
  label: {
    fontWeight: 700,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1pt solid #000",
    paddingBottom: 2,
    marginBottom: 2,
  },
  headerCell: {
    fontWeight: 700,
    fontSize: 7,
    flexGrow: 1,
  },
  headerRight: {
    textAlign: "right",
  },
  itemBlock: {
    borderBottom: "1pt solid #000",
    paddingVertical: 2,
  },
  itemDesc: {
    fontWeight: 700,
  },
  itemMetaRow: {
    flexDirection: "row",
    marginTop: 1,
  },
  metaCell: {
    flexGrow: 1,
    fontSize: 7,
  },
  metaRight: {
    textAlign: "right",
  },
  componentLine: {
    fontSize: 6,
    marginTop: 1,
    marginLeft: 6,
  },
  totals: {
    alignSelf: "stretch",
    width: "100%",
    marginTop: 6,
  },
  totalsRow: {
    flexDirection: "row",
  },
  totalsLabel: {
    flexGrow: 1,
    fontWeight: 700,
    padding: 2,
  },
  totalsValue: {
    width: 60,
    textAlign: "right",
    padding: 2,
  },
  legend: {
    marginTop: 6,
    fontSize: 7,
    fontStyle: "italic",
  },
});

const formatDate = (date?: Date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatCurrency = (value: number | string | null | undefined) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num.toFixed(2) : "0.00";
};

export const SaleOrderPdf = ({ data }: { data: SaleOrderPdfData }): React.ReactElement<DocumentProps> => (
  <Document>
    <Page size={{ width: TICKET_WIDTH, height: TICKET_HEIGHT }} style={styles.page}>
      <View style={styles.headerRow}>
        <View style={styles.companyBlock}>
          {data.company.logoUrl ? <Image style={styles.logo} src={data.company.logoUrl} /> : null}
          {data.company.address ? <Text>{data.company.address}</Text> : null}
        </View>
        <View style={styles.docBlock}>
          {data.company.ruc ? <Text style={styles.title}>R.U.C: {data.company.ruc}</Text> : null}
          <Text style={styles.title}>{data.order.documentType}</Text>
          <Text style={styles.title}>
            {data.order.serie ?? ""}
            {data.order.serie && data.order.number ? data.order.separator ?? "-" : ""}
            {data.order.number ?? ""}
          </Text>
        </View>
      </View>

      <View style={styles.infoBlock}>
        <Text>
          <Text style={styles.label}>FECHA:</Text> {formatDate(data.order.issuedAt)}
        </Text>
        <Text>
          <Text style={styles.label}>CLIENTE:</Text> {data.client.name}
        </Text>
        {data.client.document ? (
          <Text>
            <Text style={styles.label}>DOC:</Text> {data.client.document}
          </Text>
        ) : data.client.reference ? (
          <Text>
            <Text style={styles.label}>REF:</Text> {data.client.reference}
          </Text>
        ) : null}
        <Text>
          <Text style={styles.label}>ALMACEN:</Text> {data.warehouse.name}
        </Text>
        {data.order.scheduleDate ? (
          <Text>
            <Text style={styles.label}>AGENDA:</Text> {data.order.scheduleDate}
          </Text>
        ) : null}
        {data.order.deliveryDate ? (
          <Text>
            <Text style={styles.label}>ENTREGA:</Text> {data.order.deliveryDate}
          </Text>
        ) : null}
      </View>

      <View style={styles.tableHeader}>
        <Text style={styles.headerCell}>DESC</Text>
        <Text style={[styles.headerCell, styles.headerRight]}>CANT</Text>
        <Text style={[styles.headerCell, styles.headerRight]}>P.U</Text>
        <Text style={[styles.headerCell, styles.headerRight]}>TOTAL</Text>
      </View>

      {data.items.map((item, idx) => (
        <View key={idx} style={styles.itemBlock}>
          <View style={styles.itemMetaRow}>
            <Text style={styles.metaCell}>{item.description}</Text>
            <Text style={[styles.metaCell, styles.metaRight]}>{item.quantity}</Text>
            <Text style={[styles.metaCell, styles.metaRight]}>{formatCurrency(item.unitPrice)}</Text>
            <Text style={[styles.metaCell, styles.metaRight]}>{formatCurrency(item.total)}</Text>
          </View>
        </View>
      ))}

      <View style={styles.totals}>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>SUBTOTAL</Text>
          <Text style={styles.totalsValue}>{formatCurrency(data.totals.subTotal)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>DELIVERY</Text>
          <Text style={styles.totalsValue}>{formatCurrency(data.totals.deliveryCost)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>TOTAL</Text>
          <Text style={styles.totalsValue}>{formatCurrency(data.totals.total)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>PAGADO</Text>
          <Text style={styles.totalsValue}>{formatCurrency(data.totals.totalPaid)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>PENDIENTE</Text>
          <Text style={styles.totalsValue}>{formatCurrency(data.totals.pendingAmount)}</Text>
        </View>
      </View>
      {data.order.note ? <Text style={styles.legend}>NOTA: {data.order.note}</Text> : null}
    </Page>
  </Document>
);

