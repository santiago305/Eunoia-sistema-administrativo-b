import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, DocumentProps } from "@react-pdf/renderer";
import { InvoicePdfData } from "src/modules/pdf-generated/domain/ports/pdf-renderer.port";

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 10,
    color: "#333",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  companyBlock: {
    flexGrow: 1,
  },
  docBlock: {
    width: 200,
    textAlign: "center",
    border: "1pt solid #000",
    padding: 8,
  },
  title: {
    fontWeight: 700,
    textTransform: "uppercase",
  },
  logo: {
    width: 120,
    height: 60,
    objectFit: "contain",
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #000",
  },
  th: {
    fontWeight: 700,
    backgroundColor: "#e0e0e0",
  },
  cell: {
    flexGrow: 1,
    padding: 4,
  },
  cellRight: {
    textAlign: "right",
  },
  totals: {
    alignSelf: "flex-end",
    width: 220,
    marginTop: 10,
  },
  totalsRow: {
    flexDirection: "row",
  },
  totalsLabel: {
    flexGrow: 1,
    fontWeight: 700,
    padding: 3,
  },
  totalsValue: {
    width: 80,
    textAlign: "right",
    padding: 3,
  },
  legend: {
    marginTop: 10,
    fontSize: 9,
    fontStyle: "italic",
  },
});

const formatDate = (date: Date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const InvoicePdf = ({ data }: { data: InvoicePdfData }): React.ReactElement<DocumentProps> => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.headerRow}>
        <View style={styles.companyBlock}>
          {data.company.logoUrl ? <Image style={styles.logo} src={data.company.logoUrl} /> : null}
          <Text style={styles.title}>{data.company.name}</Text>
          {data.company.address ? <Text>{data.company.address}</Text> : null}
        </View>
        <View style={styles.docBlock}>
          {data.company.ruc ? <Text style={styles.title}>R.U.C: {data.company.ruc}</Text> : null}
          <Text style={styles.title}>{data.document.type}</Text>
          <Text>
            {data.document.serie}-{data.document.number}
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: 10 }}>
        <Text>
          CLIENTE: {data.client.name} {data.client.document ? `(${data.client.document})` : ""}
        </Text>
        <Text>FECHA DE EMISION: {formatDate(data.document.issuedAt)}</Text>
        <Text>MONEDA: {data.document.currency}</Text>
      </View>

      <View style={styles.tableRow}>
        <Text style={[styles.cell, styles.th]}>DESCRIPCION</Text>
        <Text style={[styles.cell, styles.th]}>UNIDAD</Text>
        <Text style={[styles.cell, styles.th, styles.cellRight]}>CANTIDAD</Text>
        <Text style={[styles.cell, styles.th, styles.cellRight]}>P. UNITARIO</Text>
        <Text style={[styles.cell, styles.th, styles.cellRight]}>TOTAL</Text>
      </View>

      {data.items.map((item, idx) => (
        <View key={idx} style={styles.tableRow}>
          <Text style={styles.cell}>{item.description}</Text>
          <Text style={styles.cell}>{item.unit}</Text>
          <Text style={[styles.cell, styles.cellRight]}>{item.quantity}</Text>
          <Text style={[styles.cell, styles.cellRight]}>{item.unitPrice.toFixed(2)}</Text>
          <Text style={[styles.cell, styles.cellRight]}>{item.total.toFixed(2)}</Text>
        </View>
      ))}

      <View style={styles.totals}>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>OPER. GRAVADAS</Text>
          <Text style={styles.totalsValue}>{data.totals.taxed.toFixed(2)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>IGV ({data.totals.igvPercentage}%)</Text>
          <Text style={styles.totalsValue}>{data.totals.igv.toFixed(2)}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>TOTAL</Text>
          <Text style={styles.totalsValue}>{data.totals.total.toFixed(2)}</Text>
        </View>
      </View>

      {data.totals.legend ? (
        <Text style={styles.legend}>IMPORTE EN LETRAS: {data.totals.legend}</Text>
      ) : null}
      {data.totals.additionalInfo ? (
        <Text style={styles.legend}>OTROS: {data.totals.additionalInfo}</Text>
      ) : null}
    </Page>
  </Document>
);
