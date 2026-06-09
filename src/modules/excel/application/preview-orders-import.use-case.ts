import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CreateClientUsecase } from "src/modules/clients/application/usecases/client/create.usecase";
import { ClientDocType } from "src/modules/clients/domain/object-values/client-doc-type";
import { ClientType } from "src/modules/clients/domain/object-values/client-type";
import {
  CLIENT_REPOSITORY,
  ClientRepository,
} from "src/modules/clients/domain/ports/client.repository";
import {
  TELEPHONE_REPOSITORY,
  TelephoneRepository,
} from "src/modules/clients/domain/ports/telephone.repository";
import {
  PRODUCT_CATALOG_PRODUCT_REPOSITORY,
  ProductCatalogProductRepository,
} from "src/modules/product-catalog/domain/ports/product.repository";
import {
  PRODUCT_CATALOG_SKU_REPOSITORY,
  ProductCatalogSkuRepository,
} from "src/modules/product-catalog/domain/ports/sku.repository";
import {
  PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY,
  ProductCatalogStockItemRepository,
} from "src/modules/product-catalog/domain/ports/stock-item.repository";
import { CreateProductCatalogProduct } from "src/modules/product-catalog/application/usecases/create-product.usecase";
import { CreateProductCatalogSku } from "src/modules/product-catalog/application/usecases/create-sku.usecase";
import { CreateProductCatalogStockItem } from "src/modules/product-catalog/application/usecases/create-stock-item.usecase";
import { ProductCatalogProductType } from "src/modules/product-catalog/domain/value-objects/product-type";
import {
  PRODUCT_CATALOG_INVENTORY_REPOSITORY,
  ProductCatalogInventoryRepository,
} from "src/modules/product-catalog/domain/ports/inventory.repository";
import { ProductCatalogInventoryBalance } from "src/modules/product-catalog/domain/entities/inventory-balance";
import { CreateSourceUsecase } from "src/modules/sources/application/usecases/source/create.usecase";
import {
  UBIGEO_REPOSITORY,
  UbigeoRepository,
} from "src/modules/ubigeo/domain/ports/ubigeo.repository";
import {
  EXCEL_READER,
  ExcelReaderPort,
  ExcelRow,
} from "src/shared/domain/ports/excel-reader.port";
import {
  UNIT_OF_WORK,
  UnitOfWork,
  TransactionContext,
} from "src/shared/domain/ports/unit-of-work.port";
import { TypeormTransactionContext } from "src/shared/domain/ports/typeorm-transaction-context";
import {
  SALE_ORDER_REPOSITORY,
  SaleOrderRepository,
} from "src/modules/sale-orders/domain/ports/sale-order.repository";
import {
  SALE_ORDER_ITEM_REPOSITORY,
  SaleOrderItemRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-item.repository";
import {
  SALE_ORDER_ITEM_COMPONENT_REPOSITORY,
  SaleOrderItemComponentRepository,
} from "src/modules/sale-orders/domain/ports/sale-order-item-component.repository";
import {
  SALE_PAYMENT_REPOSITORY,
  SalePaymentRepository,
} from "src/modules/sale-orders/domain/ports/sale-payment.repository";
import { ExcelRowAccessor } from "src/modules/excel/application/orders-import/excel-row-accessor";
import { fixMojibake, normalizePhone, normalizeTextForMatch, parseNumber } from "src/modules/excel/application/orders-import/normalization";
import { parseProductCodes } from "src/modules/excel/application/orders-import/product-codes";
import { SaleOrderImportClientResolverService } from "src/modules/sale-orders/application/services/sale-order-import-client-resolver.service";
import { SaleOrderImportSkuResolverService } from "src/modules/sale-orders/application/services/sale-order-import-sku-resolver.service";
import { SaleOrderImportSourceResolverService } from "src/modules/sale-orders/application/services/sale-order-import-source-resolver.service";

type ClientPreviewStatus =
  | "EXISTS_BY_PHONE"
  | "EXISTS_BY_DNI"
  | "EXISTS_BY_REFERENCE"
  | "WOULD_CREATE";

@Injectable()
export class PreviewOrdersImportUseCase {
  constructor(
    @Inject(EXCEL_READER)
    private readonly excelReader: ExcelReaderPort,

    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepo: ClientRepository,

    @Inject(TELEPHONE_REPOSITORY)
    private readonly telephoneRepo: TelephoneRepository,

    @Inject(UBIGEO_REPOSITORY)
    private readonly ubigeoRepo: UbigeoRepository,

    @Inject(PRODUCT_CATALOG_PRODUCT_REPOSITORY)
    private readonly productRepo: ProductCatalogProductRepository,

    @Inject(PRODUCT_CATALOG_SKU_REPOSITORY)
    private readonly skuRepo: ProductCatalogSkuRepository,

    @Inject(PRODUCT_CATALOG_STOCK_ITEM_REPOSITORY)
    private readonly stockItemRepo: ProductCatalogStockItemRepository,

    @Inject(PRODUCT_CATALOG_INVENTORY_REPOSITORY)
    private readonly inventoryRepo: ProductCatalogInventoryRepository,

    @Inject(UNIT_OF_WORK)
    private readonly uow: UnitOfWork,

    @Inject(SALE_ORDER_REPOSITORY)
    private readonly saleOrderRepo: SaleOrderRepository,

    @Inject(SALE_ORDER_ITEM_REPOSITORY)
    private readonly saleOrderItemRepo: SaleOrderItemRepository,

    @Inject(SALE_ORDER_ITEM_COMPONENT_REPOSITORY)
    private readonly saleOrderItemComponentRepo: SaleOrderItemComponentRepository,

    @Inject(SALE_PAYMENT_REPOSITORY)
    private readonly salePaymentRepo: SalePaymentRepository,

    private readonly importClientResolver: SaleOrderImportClientResolverService,
    private readonly importSourceResolver: SaleOrderImportSourceResolverService,
    private readonly importSkuResolver: SaleOrderImportSkuResolverService,

    private readonly createClientUsecase: CreateClientUsecase,
    private readonly createProductCatalogProduct: CreateProductCatalogProduct,
    private readonly createProductCatalogSku: CreateProductCatalogSku,
    private readonly createSourceUsecase: CreateSourceUsecase,
    private readonly createProductCatalogStockItem: CreateProductCatalogStockItem,
  ) {}

  async execute(file: Express.Multer.File, userId: string) {
    this.debug("PREVIEW_START", {
      fileName: file?.originalname,
      userId,
    });

    const rawRows = await this.excelReader.read(file.buffer);

    this.debug("EXCEL_ROWS_READ", {
      rawRowsLength: rawRows.length,
      firstRow: rawRows[0],
    });

    const rows = rawRows.filter((row) => this.isImportableRow(row));

    this.debug("IMPORTABLE_ROWS", {
      totalRows: rows.length,
    });

    const previewRows = await Promise.all(
      rows.map((row, index) => this.buildPreviewRow(row, index + 2)),
    );

    const response = {
      userId,
      totalRows: rows.length,
      validRows: previewRows.filter((row) => row.errors.length === 0).length,
      invalidRows: previewRows.filter((row) => row.errors.length > 0).length,
      rows: previewRows,
    };

    this.debug("PREVIEW_END", {
      totalRows: response.totalRows,
      validRows: response.validRows,
      invalidRows: response.invalidRows,
    });

    return response;
  }

  async createClientsFromPreview(file: Express.Multer.File, userId: string) {
    this.debug("IMPORT_START", {
      fileName: file?.originalname,
      userId,
    });

    const preview = await this.execute(file, userId);

    const errors: Array<{ rowNumber: number; message: string }> = [];
    const createdRows: Array<{
      rowNumber: number;
      clientId: string;
      sourceId: string;
      saleOrderId: string;
      skus: any[];
    }> = [];

    for (const row of preview.rows) {
      this.debug("ROW_START", {
        rowNumber: row.rowNumber,
        isValid: row.isValid,
        errors: row.errors,
        recipientName: row.recipientName,
        sourceName: row.sourceName,
        workflowName: row.workflowName,
        productCodes: row.productCodes,
        parsedProducts: row.parsedProducts,
      });

      if (!row.isValid) {
        errors.push({
          rowNumber: row.rowNumber,
          message: row.errors.join(" | "),
        });
        continue;
      }

      try {
        const result = await this.uow.runInTransaction(async (tx) => {
          this.debug("TX_START", { rowNumber: row.rowNumber });

          const clientId = await this.resolveOrCreateClient(row, tx);

          this.debug("CLIENT_RESOLVED", {
            rowNumber: row.rowNumber,
            clientId,
          });

          const sourceId = await this.resolveOrCreateSource(row.sourceName, tx);

          this.debug("SOURCE_RESOLVED", {
            rowNumber: row.rowNumber,
            sourceId,
            sourceName: row.sourceName,
          });

          const skus = await this.resolveOrCreateSkus(row.parsedProducts, tx);

          this.debug("SKUS_RESOLVED", {
            rowNumber: row.rowNumber,
            skus,
          });

          const saleOrderId = await this.createSaleOrderFromImportRow({
            row,
            clientId,
            sourceId,
            userId,
            skus,
            tx,
          });

          this.debug("SALE_ORDER_CREATED", {
            rowNumber: row.rowNumber,
            saleOrderId,
          });

          this.debug("TX_END", { rowNumber: row.rowNumber });

          return {
            clientId,
            sourceId,
            saleOrderId,
            skus,
          };
        });

        createdRows.push({
          rowNumber: row.rowNumber,
          clientId: result.clientId,
          sourceId: result.sourceId,
          saleOrderId: result.saleOrderId,
          skus: result.skus,
        });

        this.debug("ROW_IMPORTED_OK", {
          rowNumber: row.rowNumber,
          result,
        });
      } catch (error) {
        this.debug("ROW_IMPORT_ERROR", {
          rowNumber: row.rowNumber,
          message: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          row,
        });

        errors.push({
          rowNumber: row.rowNumber,
          message: error instanceof Error ? error.message : "Error al importar fila",
        });
      }
    }

    const response = {
      totalRows: preview.totalRows,
      processedRows: preview.validRows,
      importedRows: createdRows.length,
      failedRows: errors.length,
      rows: createdRows,
      errors,
    };

    this.debug("IMPORT_END", response);

    return response;
  }

  private async createSaleOrderFromImportRow(input: {
    row: Awaited<ReturnType<PreviewOrdersImportUseCase["buildPreviewRow"]>>;
    clientId: string;
    sourceId: string;
    userId: string;
    skus: Array<{
      productId: string;
      skuId: string;
      skuName: string;
      customSku: string;
      quantity: number;
    }>;
    tx: TransactionContext;
  }): Promise<string> {
    this.debug("CREATE_SALE_ORDER_START", {
      rowNumber: input.row.rowNumber,
      clientId: input.clientId,
      sourceId: input.sourceId,
      userId: input.userId,
      skus: input.skus,
      totalRaw: input.row.total,
      advanceRaw: input.row.advance,
      workflowNameRaw: input.row.workflowName,
      deliveryDateRaw: input.row.deliveryDate,
    });

    const warehouseId = null;

    const total = this.toNumber(input.row.total);
    const advance = this.toNumber(input.row.advance);

    const deliveryCost = 0;
    const subTotal = Math.max(total - deliveryCost, 0);
    const serie = "PE";
    const correlative = await this.reserveNextSaleOrderCorrelative(input.tx);

    const deliveryDate = this.toDateOnly(input.row.deliveryDate);

    const saleOrderInput = {
      serie,
      correlative,
      warehouseId,
      clientId: input.clientId,
      agencyDetail: this.toText(input.row.address) || null,
      sourceId: input.sourceId,
      scheduleDate: deliveryDate,
      deliveryDate,
      subTotal,
      deliveryCost,
      total,
      note: this.toText(input.row.internalNote),
      createdBy: input.userId,
      isActive: true,
    };

    this.debug("SALE_ORDER_INPUT", {
      rowNumber: input.row.rowNumber,
      saleOrderInput,
    });

    const saleOrder = await this.saleOrderRepo.create(saleOrderInput, input.tx);

    this.debug("SALE_ORDER_REPO_RESPONSE", {
      rowNumber: input.row.rowNumber,
      saleOrder,
    });

    const saleOrderId = this.getEntityId(
      (saleOrder as any).saleOrderId ?? (saleOrder as any).id,
      "saleOrder.saleOrderId/id",
    );

    const itemDescription = input.skus
      .map((item) => `${item.skuName} x ${item.quantity}`)
      .join(", ");

    const saleOrderItemInput = [
      {
        saleOrderId,
        referencePackId: null,
        description: itemDescription,
        quantity: 1,
        unitPrice: subTotal,
        total: subTotal,
      },
    ];

    this.debug("SALE_ORDER_ITEM_INPUT", {
      rowNumber: input.row.rowNumber,
      saleOrderItemInput,
    });

    const items = await this.saleOrderItemRepo.bulkCreate(saleOrderItemInput, input.tx);

    this.debug("SALE_ORDER_ITEM_REPO_RESPONSE", {
      rowNumber: input.row.rowNumber,
      items,
    });

    const saleOrderItemId = this.getEntityId(
      (items[0] as any)?.saleOrderItemId ?? (items[0] as any)?.id,
      "saleOrderItem.saleOrderItemId/id",
    );

    const totalUnits = input.skus.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    const unitComponentPrice = totalUnits > 0 ? subTotal / totalUnits : 0;

    const componentsInput = input.skus.map((sku) => ({
      saleOrderItemId,
      skuId: sku.skuId,
      referencePackItemId: null,
      quantity: sku.quantity,
      unitPrice: unitComponentPrice,
      total: unitComponentPrice * sku.quantity,
    }));

    this.debug("SALE_ORDER_COMPONENTS_INPUT", {
      rowNumber: input.row.rowNumber,
      componentsInput,
    });

    const components = await this.saleOrderItemComponentRepo.bulkCreate(
      componentsInput,
      input.tx,
    );

    this.debug("SALE_ORDER_COMPONENTS_REPO_RESPONSE", {
      rowNumber: input.row.rowNumber,
      components,
    });

    if (advance > 0) {
      const paymentsInput = [
        {
          saleOrderId,
          bankAccountId: null,
          date: new Date(),
          method: "import_adelanto" as any,
          operationNumber: null,
          amount: advance,
          note: "ADELANTO",
        },
      ];

      this.debug("SALE_PAYMENT_INPUT", {
        rowNumber: input.row.rowNumber,
        paymentsInput,
      });

      const payments = await this.salePaymentRepo.bulkCreate(paymentsInput, input.tx);

      this.debug("SALE_PAYMENT_REPO_RESPONSE", {
        rowNumber: input.row.rowNumber,
        payments,
      });
    }

    this.debug("CREATE_SALE_ORDER_END", {
      rowNumber: input.row.rowNumber,
      saleOrderId,
    });

    return saleOrderId;
  }

  private async resolveOrCreateClient(
    row: Awaited<ReturnType<PreviewOrdersImportUseCase["buildPreviewRow"]>>,
    tx: TransactionContext,
  ): Promise<string> {
    return this.importClientResolver.resolveOrCreate(row as any, tx);
  }

  private buildClientReference(
    row: Awaited<ReturnType<PreviewOrdersImportUseCase["buildPreviewRow"]>>,
  ): string | undefined {
    if (row.parsedDocument.docType !== ClientDocType.NONE) return undefined;

    const sanitized = this.sanitizeReference(row.parsedDocument.reference);
    if (sanitized) return sanitized;

    const phone = this.toText(row.normalizedPhone);
    if (phone) return `TEL ${phone}`;

    const recipientName = this.toText(row.recipientName);
    if (recipientName) return recipientName.slice(0, 80);

    return "IMPORT";
  }

  private sanitizeReference(value: string | null | undefined): string | undefined {
    const text = this.toText(value);

    if (!text) return undefined;

    const cleaned = text
      .replace(/[^a-zA-Z0-9\s\-_.]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) {
      return text.slice(0, 80);
    }

    return cleaned.slice(0, 80);
  }
  private async resolveOrCreateSource(
    sourceName: string,
    tx: TransactionContext,
  ): Promise<string> {
    return this.importSourceResolver.resolveOrCreateByName(sourceName, tx);
  }

  private async buildPreviewRow(row: ExcelRow, rowNumber: number) {
    this.debug("BUILD_PREVIEW_ROW_START", {
      rowNumber,
      row,
    });

    const r = new ExcelRowAccessor(row);

    const productName = r.get(["Nombre del producto"]);
    const orderDate = r.get(["Día de creación", "Dia de creación", "Dia de creacion"]);
    const deliveryDate = r.get(["Fecha de entrega esperada", "Fecha entrega esperada"]);
    const workflowName = r.get(["Etiqueta"]);

    const departmentNameFromExcel = r.get(["Provincia/Ciudad", "Provincia / Ciudad"]);
    const provinceNameFromExcel = r.get(["Distrito"]);
    const districtNameFromExcel = r.get(["Comuna/Pueblo", "Comuna / Pueblo"]);

    const recipientName = r.get(["Nombre del destinatario", "Nombre destinatario", "Destinatario"]);
    const address = r.get(["Dirección detallada", "Direccion detallada"]);
    const deliveryNote = r.get(["Nota de envío", "Nota de envio"]);
    const phone = r.get([
      "Número de teléfono",
      "Numero de teléfono",
      "Numero de telefono",
      "NÃºmero de telÃ©fono",
    ]);
    const couponCode = r.get(["Código promocional", "Codigo promocional"]);
    const productCodes = r.get(["Incluye códigos de producto", "Incluye codigos de producto"]);
    const quantity = r.get(["Número de artículos", "Numero de artículos", "Numero de articulos"]);
    const total = r.get(["Importe a pagar"]);
    const advance = r.get(["Total del anticipo"]);
    const codAmount = r.get(["COD"]);
    const internalNote = r.get(["Nota interna"]);
    const confirmedBy = r.get(["Confirmado por"]);

    const normalizedPhone = this.normalizePhone(phone);
    const parsedDocument = this.parseDocumentFromDeliveryNote(deliveryNote);
    const clientType = this.getClientType(internalNote);
    const sourceName = this.getSourceName(internalNote);
    const parsedProducts = this.parseProductCodes(productCodes);

    const errors: string[] = [];

    if (!this.toText(recipientName)) errors.push("Nombre del destinatario es obligatorio");
    if (!normalizedPhone) errors.push("Número de teléfono es obligatorio");
    if (!this.toText(departmentNameFromExcel)) errors.push("Provincia/Ciudad es obligatoria");
    if (!this.toText(provinceNameFromExcel)) errors.push("Distrito es obligatorio");
    if (!this.toText(districtNameFromExcel)) errors.push("Comuna/Pueblo es obligatorio");
    if (!parsedProducts.length) errors.push("Incluye códigos de producto es obligatorio");

    const ubigeo = await this.resolveUbigeo(
      departmentNameFromExcel,
      provinceNameFromExcel,
      districtNameFromExcel,
    );

    if (!ubigeo) {
      errors.push(
        `Ubigeo no encontrado para Departamento: ${this.toText(
          departmentNameFromExcel,
        )}, Provincia: ${this.toText(provinceNameFromExcel)}, Distrito: ${this.toText(
          districtNameFromExcel,
        )}`,
      );
    }

    const clientResolution = await this.resolveClient({
      phone: normalizedPhone,
      parsedDocument,
    });

    const productResolution = await this.resolveProductsPreview(parsedProducts);

    const previewRow = {
      rowNumber,
      productName,
      orderDate,
      deliveryDate,
      workflowName,
      departmentNameFromExcel,
      provinceNameFromExcel,
      districtNameFromExcel,
      recipientName,
      address,
      deliveryNote,
      phone,
      normalizedPhone,
      couponCode,
      productCodes,
      parsedProducts,
      productResolution,
      quantity,
      total,
      advance,
      codAmount,
      internalNote,
      confirmedBy,
      clientType,
      sourceName,
      parsedDocument,
      ubigeo: ubigeo
        ? {
            departmentId: ubigeo.department.id,
            departmentName: ubigeo.department.name,
            provinceId: ubigeo.province.id,
            provinceName: ubigeo.province.name,
            districtId: ubigeo.district.id,
            districtName: ubigeo.district.name,
          }
        : null,
      clientResolution,
      isValid: errors.length === 0,
      errors,
    };

    this.debug("BUILD_PREVIEW_ROW_END", {
      rowNumber,
      previewRow,
    });

    return previewRow;
  }

  private getSourceName(note: unknown) {
    const text = this.normalizeText(note);
    const tokens = text.split(/[\s,.;:_\-]+/).filter(Boolean);

    let sourceName = "SIN CODIGO";

    if (tokens.includes("whatsapp") || tokens.includes("wsp") || tokens.includes("wa")) {
      sourceName = "WHATSAPP";
    } else if (tokens.includes("instagram") || tokens.includes("ig")) {
      sourceName = "INSTAGRAM";
    } else if (tokens.includes("facebook") || tokens.includes("fb")) {
      sourceName = "FACEBOOK";
    } else if (tokens.includes("shopify")) {
      sourceName = "SHOPIFY";
    } else if (tokens.includes("organico") || tokens.includes("org")) {
      sourceName = "ORGANICO";
    }

    this.debug("GET_SOURCE_NAME", {
      raw: note,
      normalized: text,
      tokens,
      sourceName,
    });

    return sourceName;
  }

  private async resolveProductsPreview(
    products: Array<{
      rawCode: string;
      productName: string;
      variantName: string | null;
      skuName: string;
      customSku: string;
      quantity: number;
    }>,
  ) {
    this.debug("RESOLVE_PRODUCTS_PREVIEW_START", {
      products,
    });

    const result = await Promise.all(
      products.map(async (item) => {
        this.debug("RESOLVE_PRODUCT_PREVIEW_ITEM_START", {
          item,
        });

        const existingSku = await this.skuRepo.findByCustomSku(item.customSku);
        const existingProduct = await this.productRepo.findByName(item.productName);

        this.debug("RESOLVE_PRODUCT_PREVIEW_ITEM_FOUND", {
          item,
          existingSku,
          existingProduct,
        });

        const output = {
          ...item,
          productExists: Boolean(existingProduct),
          skuExists: Boolean(existingSku),
          productId: existingProduct
            ? this.getEntityId((existingProduct as any).id, "preview.existingProduct.id")
            : null,
          skuId: existingSku
            ? this.getEntityId(
                (existingSku as any).sku?.id ??
                  (existingSku as any).sku?.skuId ??
                  (existingSku as any).skuId ??
                  (existingSku as any).id,
                "preview.existingSku.id",
              )
            : null,
          action: existingSku
            ? "USE_EXISTING_SKU"
            : existingProduct
              ? "CREATE_SKU"
              : "CREATE_PRODUCT_AND_SKU",
        };

        this.debug("RESOLVE_PRODUCT_PREVIEW_ITEM_END", {
          output,
        });

        return output;
      }),
    );

    this.debug("RESOLVE_PRODUCTS_PREVIEW_END", {
      result,
    });

    return result;
  }

  private async resolveOrCreateSkus(
    products: Array<{
      rawCode: string;
      productName: string;
      variantName: string | null;
      skuName: string;
      customSku: string;
      quantity: number;
    }>,
    tx?: TransactionContext,
  ) {
    return this.importSkuResolver.resolveOrCreateSkus(products, tx);
  }

  private async resolveOrCreateSku(
    input: {
      productName: string;
      variantName: string | null;
      skuName: string;
      customSku: string;
    },
    tx?: TransactionContext,
  ) {
    this.debug("RESOLVE_OR_CREATE_SKU_START", {
      input,
    });

    const existingSku = await this.skuRepo.findByCustomSku(input.customSku);

    this.debug("EXISTING_SKU_RESULT", {
      input,
      existingSku,
    });

    if (existingSku) {
      const productId = this.getEntityId(
        (existingSku as any).sku?.productId ??
          (existingSku as any).productId,
        "existingSku.productId",
      );

      const skuId = this.getEntityId(
        (existingSku as any).sku?.id ??
          (existingSku as any).sku?.skuId ??
          (existingSku as any).skuId ??
          (existingSku as any).id,
        "existingSku.skuId",
      );

      this.debug("EXISTING_SKU_USED", {
        input,
        productId,
        skuId,
      });

      await this.ensureStockItemAndSnapshots(skuId, tx);

      return { productId, skuId };
    }

    let product = await this.productRepo.findByName(input.productName);

    this.debug("EXISTING_PRODUCT_RESULT", {
      input,
      product,
    });

    if (!product) {
      const createProductInput = {
        name: input.productName,
        description: null,
        type: ProductCatalogProductType.PRODUCT,
        brand: null,
        baseUnitId: await this.getDefaultBaseUnitId(tx!),        
        isActive: true,
      };

      this.debug("CREATE_PRODUCT_INPUT", {
        input,
        createProductInput,
      });

      product = await this.createProductCatalogProduct.execute(createProductInput);

      this.debug("CREATE_PRODUCT_RESPONSE", {
        input,
        product,
      });
    }

    const productId = this.getEntityId(
      (product as any).id ?? (product as any).productId,
      "product.id/productId",
    );

    const createSkuInput = {
      productId,
      customSku: input.customSku,
      name: input.skuName,
      barcode: null,
      image: null,
      price: 0,
      cost: 0,
      isSellable: true,
      isPurchasable: false,
      isManufacturable: true,
      isStockTracked: true,
      isActive: true,
      attributes: input.variantName
        ? [
            {
              code: "variant",
              name: "variant",
              value: input.variantName,
            },
          ]
        : [],
    };

    this.debug("CREATE_SKU_INPUT", {
      input,
      createSkuInput,
    });

    let createdSku: any;

    try {
      createdSku = await this.createProductCatalogSku.execute(createSkuInput);
    } catch (error: any) {
      if (error?.code === "23505") {
        const raced = await this.skuRepo.findByCustomSku(input.customSku);
        if (raced) {
          const racedProductId = this.getEntityId(
            (raced as any).sku?.productId ?? (raced as any).productId,
            "racedSku.productId",
          );
          const racedSkuId = this.getEntityId(
            (raced as any).sku?.id ??
              (raced as any).sku?.skuId ??
              (raced as any).skuId ??
              (raced as any).id,
            "racedSku.skuId",
          );

          await this.ensureStockItemAndSnapshots(racedSkuId, tx);

          return { productId: racedProductId, skuId: racedSkuId };
        }
      }

      throw error;
    }

    this.debug("CREATE_SKU_RESPONSE", {
      input,
      createdSku,
    });

    const skuId = this.getEntityId(
      (createdSku as any).sku?.id ??
        (createdSku as any).sku?.skuId ??
        (createdSku as any).skuId ??
        (createdSku as any).id,
      "createdSku.skuId",
    );

    await this.ensureStockItemAndSnapshots(skuId, tx);

    return { productId, skuId };
  }

  private async ensureStockItemAndSnapshots(skuId: string, tx?: TransactionContext): Promise<void> {
    if (!tx) return;

    let stockItem = await this.stockItemRepo.findBySkuId(skuId, tx);

    if (!stockItem) {
      try {
        stockItem = await this.createProductCatalogStockItem.execute({ skuId, isActive: true }, tx);
      } catch (error: any) {
        stockItem = await this.stockItemRepo.findBySkuId(skuId, tx);
        if (!stockItem) throw error;
      }
    }

    await this.ensureZeroSnapshots(stockItem.id, tx);
  }

  private async listActiveWarehouseIds(tx: TransactionContext): Promise<string[]> {
    const manager = (tx as TypeormTransactionContext).manager;

    const rows = await manager.query(`
      SELECT id
      FROM warehouses
      WHERE is_active = true
    `);

    return (rows ?? []).map((row: any) => String(row.id)).filter(Boolean);
  }

  private async ensureZeroSnapshots(stockItemId: string, tx: TransactionContext): Promise<void> {
    const activeWarehouseIds = await this.listActiveWarehouseIds(tx);
    if (!activeWarehouseIds.length) return;

    const existing = await this.inventoryRepo.listByStockItemId(stockItemId, tx);
    const existingWarehouseIds = new Set(existing.map((balance) => balance.warehouseId));

    for (const warehouseId of activeWarehouseIds) {
      if (existingWarehouseIds.has(warehouseId)) continue;

      await this.inventoryRepo.upsert(
        new ProductCatalogInventoryBalance(warehouseId, stockItemId, null, 0, 0, 0),
        tx,
      );
    }
  }

  private parseProductCodes(value: unknown) {
    const result = parseProductCodes(value, (code) => {
      const { rawCode, ...rest } = this.parseExternalProductCode(code) as any;
      return rest;
    });

    this.debug("PARSE_PRODUCT_CODES_END", {
      result,
    });

    return result;
  }

  private parseExternalProductCode(rawCode: string) {
    const clean = fixMojibake(String(rawCode ?? "")).trim().toUpperCase();

    const parts = clean
      .split("-")
      .map((part) => part.trim())
      .filter(Boolean);

    const evaCode = parts.find((part) => part.startsWith("EVA"));

    if (!evaCode) {
      throw new BadRequestException(`Código EVA no encontrado en: ${rawCode}`);
    }

    const productName = parts[0];

    if (!productName) {
      throw new BadRequestException(`Producto no encontrado en: ${rawCode}`);
    }

    const variantParts = parts.filter(
      (part) => part !== productName && part !== evaCode,
    );

    const variantName = variantParts.length ? variantParts.join(" ") : null;
    const skuName = variantName ? `${productName} ${variantName}` : productName;

    const result = {
      rawCode: clean,
      productName,
      variantName,
      skuName,
      customSku: evaCode,
    };

    this.debug("PARSE_EXTERNAL_PRODUCT_CODE", {
      rawCode,
      clean,
      parts,
      result,
    });

    return result;
  }
  private async getDefaultBaseUnitId(tx: TransactionContext): Promise<string> {
    const manager = (tx as TypeormTransactionContext).manager;

    const rows = await manager.query(`
      SELECT unit_id AS id
      FROM pc_units
      ORDER BY name ASC
      LIMIT 1
    `);

    const id = rows?.[0]?.id;

    if (!id) {
      throw new BadRequestException("No existe unidad base registrada para crear productos");
    }

    return id;
  }

  private async resolveClient(input: {
    phone: string;
    parsedDocument: {
      docType: ClientDocType;
      docNumber: string;
      reference: string | null;
    };
  }): Promise<{
    status: ClientPreviewStatus;
    clientId: string | null;
    matchedBy: "PHONE" | "DNI" | "REFERENCE" | null;
  }> {
    this.debug("RESOLVE_CLIENT_START", input);

    if (input.phone) {
      const byPhone = await this.telephoneRepo.findByNumber(input.phone);

      this.debug("RESOLVE_CLIENT_BY_PHONE", {
        phone: input.phone,
        byPhone,
      });

      if (byPhone) {
        const clientId =
          typeof byPhone.clientId === "string"
            ? byPhone.clientId
            : byPhone.clientId.value;

        return {
          status: "EXISTS_BY_PHONE",
          clientId,
          matchedBy: "PHONE",
        };
      }
    }

    if (input.parsedDocument.docType === ClientDocType.DNI && input.parsedDocument.docNumber) {
      const byDni = await this.clientRepo.findByDocument(
        ClientDocType.DNI,
        input.parsedDocument.docNumber,
      );

      this.debug("RESOLVE_CLIENT_BY_DNI", {
        docNumber: input.parsedDocument.docNumber,
        byDni,
      });

      if (byDni) {
        return {
          status: "EXISTS_BY_DNI",
          clientId: byDni.clientId.value,
          matchedBy: "DNI",
        };
      }
    }

    if (input.parsedDocument.reference) {
      const byReference = await this.clientRepo.findByReference(input.parsedDocument.reference);

      this.debug("RESOLVE_CLIENT_BY_REFERENCE", {
        reference: input.parsedDocument.reference,
        byReference,
      });

      if (byReference) {
        return {
          status: "EXISTS_BY_REFERENCE",
          clientId: byReference.clientId.value,
          matchedBy: "REFERENCE",
        };
      }
    }

    const result = {
      status: "WOULD_CREATE" as const,
      clientId: null,
      matchedBy: null,
    };

    this.debug("RESOLVE_CLIENT_END", result);

    return result;
  }

  private async resolveUbigeo(
    departmentName: unknown,
    provinceName: unknown,
    districtName: unknown,
  ) {
    const departmentNormalizedName = this.normalizeText(departmentName);
    const provinceNormalizedName = this.normalizeText(provinceName);
    const districtNormalizedName = this.normalizeText(districtName);

    this.debug("RESOLVE_UBIGEO_START", {
      departmentName,
      provinceName,
      districtName,
      departmentNormalizedName,
      provinceNormalizedName,
      districtNormalizedName,
    });

    if (!departmentNormalizedName || !provinceNormalizedName || !districtNormalizedName) {
      return null;
    }

    const departments = await this.ubigeoRepo.listDepartments();

    const department = departments.find(
      (item) => this.normalizeText(item.name) === departmentNormalizedName,
    );

    this.debug("RESOLVE_UBIGEO_DEPARTMENT", {
      departmentNormalizedName,
      department,
    });

    if (!department) return null;

    const provinces = await this.ubigeoRepo.listProvincesByDepartmentIds([department.id]);

    const province = provinces.find(
      (item) => this.normalizeText(item.name) === provinceNormalizedName,
    );

    this.debug("RESOLVE_UBIGEO_PROVINCE", {
      provinceNormalizedName,
      province,
    });

    if (!province) return null;

    const districts = await this.ubigeoRepo.listDistrictsByProvinceIds([province.id]);

    const district = districts.find(
      (item) => this.normalizeText(item.name) === districtNormalizedName,
    );

    this.debug("RESOLVE_UBIGEO_DISTRICT", {
      districtNormalizedName,
      district,
    });

    if (!district) return null;

    const result = { department, province, district };

    this.debug("RESOLVE_UBIGEO_END", result);

    return result;
  }

  private getClientType(note: unknown) {
    const text = this.normalizeText(note);

    const repurchaseWords = ["recompra", "recoompra", "reecompra", "recompr", "recomp", "reco"];
    const laggingWords = ["rezagado", "rez", "rezag", "reza"];
    const newWords = ["nuevo", "nueevo", "nuev", "nue", "nvo"];

    let clientType = ClientType.UNDEFINED;

    if (repurchaseWords.some((word) => text.includes(word))) {
      clientType = ClientType.REPURCHASE;
    } else if (laggingWords.some((word) => text.includes(word))) {
      clientType = ClientType.LAGGING;
    } else if (newWords.some((word) => text.includes(word))) {
      clientType = ClientType.NEW;
    }

    this.debug("GET_CLIENT_TYPE", {
      raw: note,
      normalized: text,
      clientType,
    });

    return clientType;
  }

  private parseDocumentFromDeliveryNote(note: unknown) {
    const text = this.toText(note);
    const dniMatch = text.match(/DNI\s*[:\-]?\s*(\d{8})/i);

    let result: {
      docType: ClientDocType;
      docNumber: string;
      reference: string | null;
    };

    if (dniMatch?.[1]) {
      result = {
        docType: ClientDocType.DNI,
        docNumber: dniMatch[1],
        reference: null,
      };
    } else {
      result = {
        docType: ClientDocType.NONE,
        docNumber: "",
        reference: text || null,
      };
    }

    this.debug("PARSE_DOCUMENT_FROM_DELIVERY_NOTE", {
      raw: note,
      text,
      result,
    });

    return result;
  }

  private isImportableRow(row: ExcelRow) {
    const r = new ExcelRowAccessor(row);

    const result = Boolean(
      this.toText(r.get(["Nombre del destinatario", "Nombre destinatario", "Destinatario"])) ||
        this.toText(
          r.get([
            "Número de teléfono",
            "Numero de teléfono",
            "Numero de telefono",
            "NÃºmero de telÃ©fono",
          ]),
        ) ||
        this.toText(r.get(["Incluye códigos de producto", "Incluye codigos de producto"])),
    );

    this.debug("IS_IMPORTABLE_ROW", {
      result,
      recipientName: r.get(["Nombre del destinatario", "Nombre destinatario", "Destinatario"]),
      phone: r.get([
        "Número de teléfono",
        "Numero de teléfono",
        "Numero de telefono",
        "NÃºmero de telÃ©fono",
      ]),
      productCodes: r.get(["Incluye códigos de producto", "Incluye codigos de producto"]),
    });

    return result;
  }

  private normalizePhone(value: unknown) {
    const result = normalizePhone(value);

    this.debug("NORMALIZE_PHONE", {
      raw: value,
      result,
    });

    return result;
  }

  private toText(value: unknown) {
    return fixMojibake(String(value ?? "")).trim();
  }

  private normalizeText(value: unknown) {
    return normalizeTextForMatch(value);
  }

  private toNumber(value: unknown) {
    const result = parseNumber(value);

    this.debug("TO_NUMBER", {
      raw: value,
      result,
    });

    return result;
  }

  private toDateOnly(value: unknown): string | null {
    if (!value) {
      this.debug("TO_DATE_ONLY", {
        raw: value,
        result: null,
      });

      return null;
    }

    if (value instanceof Date) {
      const result = value.toISOString().slice(0, 10);

      this.debug("TO_DATE_ONLY", {
        raw: value,
        result,
      });

      return result;
    }

    const text = this.toText(value);

    if (!text) {
      this.debug("TO_DATE_ONLY", {
        raw: value,
        text,
        result: null,
      });

      return null;
    }

    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const result = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

      this.debug("TO_DATE_ONLY", {
        raw: value,
        text,
        result,
      });

      return result;
    }

    const dmyMatch = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const result = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;

      this.debug("TO_DATE_ONLY", {
        raw: value,
        text,
        result,
      });

      return result;
    }

    this.debug("TO_DATE_ONLY", {
      raw: value,
      text,
      result: null,
    });

    return null;
  }

  private getEntityId(value: any, context = "UNKNOWN_CONTEXT"): string {
    this.debug("GET_ENTITY_ID_START", {
      context,
      value,
      valueType: typeof value,
    });

    if (typeof value === "string") {
      this.debug("GET_ENTITY_ID_STRING_OK", {
        context,
        id: value,
      });

      return value;
    }

    if (value?.value) {
      this.debug("GET_ENTITY_ID_VALUE_OK", {
        context,
        id: value.value,
      });

      return value.value;
    }

    if (value?.id) {
      this.debug("GET_ENTITY_ID_ID_OK", {
        context,
        id: value.id,
      });

      return value.id;
    }

    this.debug("GET_ENTITY_ID_FAILED", {
      context,
      value,
    });

    throw new BadRequestException(
      `No se pudo resolver el ID de entidad en ${context}: ${this.safeJson(value)}`,
    );
  }

  private debug(label: string, payload: unknown) {
    console.log(`\n========== IMPORT_DEBUG: ${label} ==========`);
    console.log(this.safeJson(payload));
    console.log(`========== END_IMPORT_DEBUG: ${label} ==========\n`);
  }
  private async reserveNextSaleOrderCorrelative(tx: TransactionContext): Promise<number> {
  const manager = (tx as TypeormTransactionContext).manager;

  await manager.query(`
    SELECT pg_advisory_xact_lock(hashtext('sale_orders_pe_correlative'))
  `);

  const rows = await manager.query(`
    SELECT correlative
    FROM sale_orders
    WHERE serie = 'PE'
      AND correlative IS NOT NULL
    ORDER BY correlative DESC, created_at DESC
    LIMIT 1
  `);

  const lastCorrelative = Number(rows?.[0]?.correlative ?? 0);

  return lastCorrelative + 1;
}

  private safeJson(value: unknown) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
