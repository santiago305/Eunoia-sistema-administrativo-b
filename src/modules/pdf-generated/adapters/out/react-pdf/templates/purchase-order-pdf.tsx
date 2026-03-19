import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, DocumentProps } from "@react-pdf/renderer";
import { PurchaseOrderPdfData } from "src/modules/pdf-generated/domain/ports/pdf-renderer.port";

const MM_TO_PT = 72 / 25.4;
const TICKET_WIDTH = 80 * MM_TO_PT;
const TICKET_HEIGHT = 200 * MM_TO_PT;

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
  companyName: {
    fontWeight: 700,
    textTransform: "uppercase",
    fontSize:25
  },
  logo: {
    width: 120,
    height: 60,
    objectFit: "contain",
    marginBottom: 0,
  },
  infoBlock: {
    marginBottom: 11,
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
  headerUnit: {
    flexGrow: 2,
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
  metaUnit: {
    flexGrow: 2,
  },
  metaRight: {
    textAlign: "right",
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

const formatCurrency = (value: number) => value.toFixed(2);

export const PurchaseOrderPdf = ({ data }: { data: PurchaseOrderPdfData }): React.ReactElement<DocumentProps> => (
  <Document>
    <Page size={{ width: TICKET_WIDTH, height: TICKET_HEIGHT }} style={styles.page}>
      <View style={styles.headerRow}>
        <View style={styles.companyBlock}>
          {data.company.logoUrl ? <Image style={styles.logo} src={data.company.logoUrl} /> : null}
          {/* <Text style={styles.companyName}>{data.company.name}</Text> */}
          {data.company.address ? <Text>{data.company.address}</Text> : null}
        </View>
        <View style={styles.docBlock}>
          {data.company.ruc ? <Text style={styles.title}>R.U.C: {data.company.ruc}</Text> : null}
          <Text style={styles.title}>{data.order.documentType}</Text>
          <Text style={styles.title}>
            {data.order.serie ?? ""}{data.order.serie && data.order.number ? "-" : ""}{data.order.number ?? ""}
          </Text>
        </View>
      </View>

      <View style={styles.infoBlock}>
        <Text>
          <Text style={styles.label}>PROVEEDOR:</Text> {data.supplier.name}
        </Text>
        <Text>
          <Text style={styles.label}>{data.supplier.documentType}:</Text> {data.supplier.document}
        </Text>
        {data.supplier.address ? (
          <Text>
            <Text style={styles.label}>DIRECCION:</Text> {data.supplier.address}
          </Text>
        ) : null}
        <Text>
          <Text style={styles.label}>FECHA DE EMISION:</Text> {formatDate(data.order.issuedAt)}
        </Text>
        {data.order.creditDays ? (
          <Text>
            <Text style={styles.label}>CREDITO:</Text> {data.order.creditDays} DIAS
          </Text>
        ) : null}
        {data.order.paymentForm ? (
          <Text>
            <Text style={styles.label}>FORMA DE PAGO:</Text> {data.order.paymentForm}
          </Text>
        ) : null}
        <Text>
          <Text style={styles.label}>MONEDA:</Text> {data.order.currency ?? ""}
        </Text>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.headerUnit]}>UND</Text>
        <Text style={[styles.headerCell, styles.headerRight]}>CANT</Text>
        <Text style={[styles.headerCell, styles.headerRight]}>P.U</Text>
        <Text style={[styles.headerCell, styles.headerRight]}>TOTAL</Text>
      </View>

      {data.items.map((item, idx) => (
        <View key={idx} style={styles.itemBlock}>
          <Text style={styles.itemDesc}>{item.description}</Text>
          <View style={styles.itemMetaRow}>
            <Text style={[styles.metaCell, styles.metaUnit]}>{item.unit}</Text>
            <Text style={[styles.metaCell, styles.metaRight]}>{item.quantity}</Text>
            <Text style={[styles.metaCell, styles.metaRight]}>{formatCurrency(item.unitPrice)}</Text>
            <Text style={[styles.metaCell, styles.metaRight]}>{formatCurrency(item.total)}</Text>
          </View>
        </View>
      ))}

      <View style={styles.totals}>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>OPER. GRAVADAS</Text>
          <Text style={styles.totalsValue}>{formatCurrency(data.totals.taxed)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>OPER. EXONERADAS</Text>
          <Text style={styles.totalsValue}>{formatCurrency(data.totals.exempted)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>
            IGV{data.totals.igvPercentage !== undefined ? ` (${data.totals.igvPercentage}%)` : ""}
          </Text>
          <Text style={styles.totalsValue}>{formatCurrency(data.totals.igv)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>TOTAL</Text>
          <Text style={styles.totalsValue}>{formatCurrency(data.totals.total)}</Text>
        </View>
      </View>

      {data.note ? <Text style={styles.legend}>NOTA: {data.note}</Text> : null}
    </Page>
  </Document>
);

