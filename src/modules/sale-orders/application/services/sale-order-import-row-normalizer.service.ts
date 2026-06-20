import { Inject, Injectable } from "@nestjs/common";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import { CLIENT_REPOSITORY, ClientRepository } from "src/modules/clients/domain/ports/client.repository";
import { TELEPHONE_REPOSITORY, TelephoneRepository } from "src/modules/clients/domain/ports/telephone.repository";
import { UBIGEO_REPOSITORY, UbigeoRepository } from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import { SaleOrderImportPreviewCleanRow } from "src/modules/sale-orders/application/dtos/import-preview/create-sale-orders-from-preview.input";
import {
  fixMojibake,
  normalizePhone,
  normalizeTextForMatch,
  parseNumber,
} from "src/modules/excel/application/orders-import/normalization";
import { parseProductCodes } from "src/modules/excel/application/orders-import/product-codes";

export type NormalizedSaleOrderImportPreviewRow = {
  rowNumber: number;
  productName: string | null;
  orderDate: string | null;
  deliveryDate: string | null;
  workflowName: string | null;
  departmentName: string;
  provinceName: string;
  districtName: string;
  recipientName: string;
  address: string | null;
  deliveryNote: string | null;
  normalizedPhone: string;
  couponCode: string | null;
  productCodesText: string;
  quantity: number;
  total: number;
  advance: number;
  codAmount: number;
  internalNote: string | null;
  confirmedBy: string | null;
  clientType: ClientType;
  parsedDocument: {
    docType: ClientDocType;
    docNumber: string;
    reference: string | null;
  };
  clientResolution: {
    clientId: string | null;
    matchedBy: "PHONE" | "DNI" | "REFERENCE" | null;
  };
  ubigeo: {
    departmentId: string;
    provinceId: string;
    districtId: string;
  } | null;
  parsedSkus: ReturnType<typeof parseProductCodes>;
  deliveryCost?: number;
};

export type RowNormalizationResult =
  | { ok: true; row: NormalizedSaleOrderImportPreviewRow }
  | { ok: false; rowNumber: number; errors: string[] };

@Injectable()
export class SaleOrderImportRowNormalizerService {
  constructor(
    @Inject(UBIGEO_REPOSITORY) private readonly ubigeoRepo: UbigeoRepository,
    @Inject(CLIENT_REPOSITORY) private readonly clientRepo: ClientRepository,
    @Inject(TELEPHONE_REPOSITORY) private readonly telephoneRepo: TelephoneRepository,
  ) {}

  async normalize(cleanRow: SaleOrderImportPreviewCleanRow, rowNumber: number): Promise<RowNormalizationResult> {
    const errors: string[] = [];

    const recipientName = this.toText(cleanRow.recipientName);
    const phoneRaw = cleanRow.phone;
    const departmentName = this.toText(cleanRow.departmentName);
    const provinceName = this.toText(cleanRow.provinceName);
    const districtName = this.toText(cleanRow.districtName);
    const productCodesText = this.toText(cleanRow.productCodes);

    if (!recipientName) errors.push("Nombre del destinatario es obligatorio");
    if (!this.toText(phoneRaw)) errors.push("Numero de telefono es obligatorio");
    if (!departmentName) errors.push("Departamento es obligatorio");
    if (!provinceName) errors.push("Provincia es obligatorio");
    if (!districtName) errors.push("Distrito es obligatorio");
    if (!productCodesText) errors.push("Incluye codigos de producto es obligatorio");

    const normalizedPhone = this.normalizePhone(phoneRaw);
    if (!normalizedPhone) errors.push("Numero de telefono no es valido");

    const total = this.toNumber(cleanRow.total);
    if (!(total >= 0)) errors.push("Total es obligatorio");

    if (errors.length > 0) return { ok: false, rowNumber, errors };

    const orderDate = this.toDateOnly(cleanRow.orderDate);
    const deliveryDate = this.toDateOnly(cleanRow.deliveryDate);
    const workflowName = this.toText(cleanRow.workflowName) || null;
    const address = this.toText(cleanRow.address) || null;
    const deliveryNote = this.toText(cleanRow.deliveryNote) || null;
    const couponCode = this.toText(cleanRow.couponCode) || null;
    const quantity = this.toNumber(cleanRow.quantity) || 1;
    const advance = this.toNumber(cleanRow.advance) || 0;
    const codAmount = this.toNumber(cleanRow.codAmount) || 0;
    const internalNote = this.toText(cleanRow.internalNote) || null;
    const confirmedBy = this.toText(cleanRow.confirmedBy) || null;
    const productName = this.toText(cleanRow.productName) || null;
    const deliveryCost = this.toNumber(cleanRow.deliveryCost) || 0;

    const ubigeo = await this.resolveUbigeo(departmentName, provinceName, districtName);
    const parsedDocument = this.parseDocumentFromDeliveryNote(deliveryNote);
    const clientType = this.getClientType(internalNote);
    const clientResolution = await this.resolveClient({
      phone: normalizedPhone,
      parsedDocument,
    });

    const parsedSkus = parseProductCodes(productCodesText, (code) => {
      const { rawCode, ...rest } = this.parseExternalProductCode(code) as any;
      return rest;
    });

    return {
      ok: true,
      row: {
        rowNumber,
        productName,
        orderDate,
        deliveryDate,
        workflowName,
        departmentName,
        provinceName,
        districtName,
        recipientName,
        address,
        deliveryNote,
        normalizedPhone,
        couponCode,
        productCodesText,
        quantity,
        total,
        advance,
        codAmount,
        internalNote,
        confirmedBy,
        clientType,
        parsedDocument,
        clientResolution,
        ubigeo: ubigeo
          ? { departmentId: ubigeo.department.id, provinceId: ubigeo.province.id, districtId: ubigeo.district.id }
          : null,
        parsedSkus,
        deliveryCost
      },
    };
  }

  private toText(value: unknown) {
    return fixMojibake(String(value ?? "")).trim();
  }

  private normalizeText(value: unknown) {
    return normalizeTextForMatch(value);
  }

  private normalizePhone(value: unknown) {
    return normalizePhone(value);
  }

  private toNumber(value: unknown) {
    return parseNumber(value);
  }

  private toDateOnly(value: unknown): string | null {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);

    const text = this.toText(value);
    if (!text) return null;

    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

    const dmyMatch = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;

    return null;
  }

  private async resolveClient(input: {
    phone: string;
    parsedDocument: { docType: ClientDocType; docNumber: string; reference: string | null };
  }): Promise<{ clientId: string | null; matchedBy: "PHONE" | "DNI" | "REFERENCE" | null }> {
    if (input.parsedDocument.docType === ClientDocType.DNI && input.parsedDocument.docNumber) {
      const byDni = await this.clientRepo.findByDocument(ClientDocType.DNI, input.parsedDocument.docNumber);
      if (byDni) return { clientId: byDni.clientId.value, matchedBy: "DNI" };
    }

    const reference = this.sanitizeReference(input.parsedDocument.reference);
    if (reference) {
      const byReference = await this.clientRepo.findByReference(reference);
      if (byReference) return { clientId: byReference.clientId.value, matchedBy: "REFERENCE" };
    }

    if (input.phone) {
      const byPhone = await this.telephoneRepo.findByNumber(input.phone);
      if (byPhone) {
        const clientId = typeof byPhone.clientId === "string" ? byPhone.clientId : byPhone.clientId.value;
        return { clientId, matchedBy: "PHONE" };
      }
    }

    return { clientId: null, matchedBy: null };
  }

  private sanitizeReference(value: string | null | undefined): string | undefined {
    const text = String(value ?? "").trim();
    if (!text) return undefined;

    const cleaned = text
      .replace(/[^a-zA-Z0-9\s\-_.]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return text.slice(0, 80);
    return cleaned.slice(0, 80);
  }

  private async resolveUbigeo(departmentName: unknown, provinceName: unknown, districtName: unknown) {
    const departmentNormalizedName = this.normalizeText(departmentName);
    const provinceNormalizedName = this.normalizeText(provinceName);
    const districtNormalizedName = this.normalizeText(districtName);
    if (!departmentNormalizedName || !provinceNormalizedName || !districtNormalizedName) return null;

    const departments = await this.ubigeoRepo.listDepartments();
    const department = departments.find((item) => this.normalizeText(item.name) === departmentNormalizedName);
    if (!department) return null;

    const provinces = await this.ubigeoRepo.listProvincesByDepartmentIds([department.id]);
    const province = provinces.find((item) => this.normalizeText(item.name) === provinceNormalizedName);
    if (!province) return null;

    const districts = await this.ubigeoRepo.listDistrictsByProvinceIds([province.id]);
    const district = districts.find((item) => this.normalizeText(item.name) === districtNormalizedName);
    if (!district) return null;

    return { department, province, district };
  }

  private getClientType(note: unknown) {
    const text = this.normalizeText(note);
    const repurchaseWords = ["recompra", "recoompra", "reecompra", "recompr", "recomp", "reco"];
    const laggingWords = ["rezagado", "rez", "rezag", "reza"];
    const newWords = ["nuevo", "nueevo", "nuev", "nue", "nvo"];

    if (repurchaseWords.some((word) => text.includes(word))) return ClientType.REPURCHASE;
    if (laggingWords.some((word) => text.includes(word))) return ClientType.LAGGING;
    if (newWords.some((word) => text.includes(word))) return ClientType.NEW;
    return ClientType.UNDEFINED;
  }

  private parseDocumentFromDeliveryNote(note: unknown) {
    const text = this.toText(note);
    const dniMatch = text.match(/DNI\s*[:\-]?\s*(\d{8})/i);

    if (dniMatch?.[1]) {
      return { docType: ClientDocType.DNI, docNumber: dniMatch[1], reference: null };
    }

    return { docType: ClientDocType.NONE, docNumber: "", reference: text || null };
  }

  private parseExternalProductCode(rawCode: string) {
    const clean = fixMojibake(String(rawCode ?? "")).trim().toUpperCase();

    const parts = clean
      .split("-")
      .map((part) => part.trim())
      .filter(Boolean);

    const evaCode = parts.find((part) => part.startsWith("EVA"));
    if (!evaCode) throw new Error(`Código EVA no encontrado en: ${rawCode}`);

    const productName = parts[0];
    if (!productName) throw new Error(`Producto no encontrado en: ${rawCode}`);

    const variantParts = parts.filter((part) => part !== productName && part !== evaCode);
    const variantName = variantParts.length ? variantParts.join(" ") : null;
    const skuName = variantName ? `${productName} ${variantName}` : productName;

    return { rawCode: clean, productName, variantName, skuName, customSku: evaCode };
  }
}
