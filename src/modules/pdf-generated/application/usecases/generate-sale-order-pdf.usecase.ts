import { BadRequestException, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { join } from "path";
import { pathToFileURL } from "url";
import sharp from "sharp";
import { COMPANY_REPOSITORY, CompanyRepository } from "src/modules/companies/domain/ports/company.repository";
import { PDF_RENDERER, PdfRendererPort } from "src/modules/pdf-generated/domain/ports/pdf-renderer.port";
import { SaleOrderPdfData } from "src/modules/pdf-generated/domain/interfaces/sale-order-data";
import { GenerateSaleOrderPdfInput } from "../dtos/sale-order/input/generate-sale-order.input";
import { PdfGeneratedValidationError } from "../errors/pdf-generated-validation.error";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { SaleOrderItemEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order-item.entity";
import { SaleOrderItemComponentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order-item-component.entity";
import { SalePaymentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { ProductCatalogSkuEntity } from "src/modules/product-catalog/adapters/out/persistence/typeorm/entities/sku.entity";

const resolveLogoUrl = async (logoPath?: string) => {
  if (!logoPath) return undefined;
  if (/^(https?:|data:|file:)/i.test(logoPath)) return logoPath;

  const normalized = logoPath.replace(/\\/g, "/");
  let relative = normalized;

  if (normalized.startsWith("/api/assets/")) {
    relative = normalized.replace(/^\/api\/assets\//, "");
  } else if (normalized.startsWith("/assets/")) {
    relative = normalized.replace(/^\/assets\//, "");
  } else {
    relative = normalized.replace(/^\/+/, "");
  }

  const absolutePath = join(process.cwd(), "assets", relative);

  if (/\.webp$/i.test(absolutePath)) {
    try {
      const pngBuffer = await sharp(absolutePath).png().toBuffer();
      return `data:image/png;base64,${pngBuffer.toString("base64")}`;
    } catch {
      return pathToFileURL(absolutePath).toString();
    }
  }

  return pathToFileURL(absolutePath).toString();
};

export class GenerateSaleOrderPdfUseCase {
  constructor(
    @InjectRepository(SaleOrderEntity)
    private readonly orderRepo: Repository<SaleOrderEntity>,
    @InjectRepository(SaleOrderItemEntity)
    private readonly itemRepo: Repository<SaleOrderItemEntity>,
    @InjectRepository(SaleOrderItemComponentEntity)
    private readonly componentRepo: Repository<SaleOrderItemComponentEntity>,
    @InjectRepository(SalePaymentEntity)
    private readonly paymentRepo: Repository<SalePaymentEntity>,
    @InjectRepository(ClientEntity)
    private readonly clientRepo: Repository<ClientEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepo: Repository<WarehouseEntity>,
    @InjectRepository(ProductCatalogSkuEntity)
    private readonly skuRepo: Repository<ProductCatalogSkuEntity>,
    @Inject(COMPANY_REPOSITORY)
    private readonly companyRepo: CompanyRepository,
    @Inject(PDF_RENDERER)
    private readonly pdfRenderer: PdfRendererPort,
  ) {}

  async execute(input: GenerateSaleOrderPdfInput): Promise<Buffer> {
    const order = await this.orderRepo.findOne({ where: { id: input.saleOrderId } });
    if (!order) {
      throw new BadRequestException(new PdfGeneratedValidationError("Pedido no encontrado").message);
    }

    const [company, client, warehouse, items, payments] = await Promise.all([
      this.companyRepo.findSingle(),
      this.clientRepo.findOne({ where: { id: order.clientId } }),
      this.warehouseRepo.findOne({ where: { id: order.warehouseId } }),
      this.itemRepo.find({ where: { saleOrderId: order.id }, order: { createdAt: "ASC" } }),
      this.paymentRepo.find({ where: { saleOrderId: order.id }, order: { createdAt: "ASC" } }),
    ]);

    if (!company) {
      throw new BadRequestException(new PdfGeneratedValidationError("Compañía inválida").message);
    }
    if (!client) {
      throw new BadRequestException(new PdfGeneratedValidationError("Cliente inválido").message);
    }
    if (!warehouse) {
      throw new BadRequestException(new PdfGeneratedValidationError("Almacén inválido").message);
    }

    const itemIds = items.map((row) => row.id);
    const components = itemIds.length
      ? await this.componentRepo.find({ where: { saleOrderItemId: In(itemIds) }, order: { createdAt: "ASC" } })
      : [];

    const skuIds = Array.from(new Set(components.map((c) => c.skuId)));
    const skus = skuIds.length ? await this.skuRepo.find({ where: { id: In(skuIds) } }) : [];
    const skuById = new Map(skus.map((row) => [row.id, row]));

    const compsByItemId = new Map<string, SaleOrderPdfData["items"][number]["components"]>();
    for (const c of components) {
      const sku = skuById.get(c.skuId);
      const description = sku?.name ?? c.skuId;
      const list = compsByItemId.get(c.saleOrderItemId) ?? [];
      list.push({ description, quantity: Number(c.quantity ?? 0) });
      compsByItemId.set(c.saleOrderItemId, list);
    }

    const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
    const total = Number(order.total ?? 0);
    const pendingAmount = Math.max(total - totalPaid, 0);

    const companyAddress =
      company?.address || [company?.department, company?.province, company?.district].filter(Boolean).join(" - ");

    const data: SaleOrderPdfData = {
      company: {
        name: company?.name ?? "N/A",
        ruc: company?.ruc ?? undefined,
        address: companyAddress || undefined,
        logoUrl: await resolveLogoUrl(company?.logoPath ?? undefined),
      },
      client: {
        name: client.fullName ?? "N/A",
        document: client.docNumber ?? undefined,
        reference: client.reference ?? undefined,
      },
      warehouse: {
        name: warehouse.name ?? "N/A",
      },
      order: {
        documentType: "PEDIDO",
        serie: order.serie ?? undefined,
        number: order.correlative !== null && order.correlative !== undefined ? String(order.correlative) : undefined,
        separator: "-",
        issuedAt: order.createdAt ?? undefined,
        scheduleDate: order.scheduleDate ?? null,
        deliveryDate: order.deliveryDate ?? null,
        note: order.note ?? undefined,
      },
      items: items.map((row) => ({
        description: row.description ?? row.referencePackId ?? "ITEM",
        quantity: Number(row.quantity ?? 0),
        unitPrice: Number(row.unitPrice ?? 0),
        total: Number(row.total ?? 0),
        components: compsByItemId.get(row.id) ?? [],
      })),
      totals: {
        subTotal: Number(order.subTotal ?? 0),
        deliveryCost: Number(order.deliveryCost ?? 0),
        total,
        totalPaid,
        pendingAmount,
      },
      payments: payments.map((p) => ({
        method: p.method,
        amount: Number(p.amount ?? 0),
        date: p.date,
        operationNumber: p.operationNumber ?? null,
      })),
    };

    return this.pdfRenderer.renderSaleOrder(data);
  }
}

