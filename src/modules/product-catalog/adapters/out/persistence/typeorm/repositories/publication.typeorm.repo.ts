import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ProductCatalogChannelPublication,
  ProductCatalogPublicationRepository,
  ProductCatalogPublishedSku,
} from "src/modules/product-catalog/domain/ports/publication.repository";
import { ProductCatalogAttributeEntity } from "../entities/attribute.entity";
import { ProductCatalogPublicationEntity } from "../entities/catalog-publication.entity";
import { ProductCatalogProductEntity } from "../entities/product.entity";
import { ProductCatalogSkuAttributeValueEntity } from "../entities/sku-attribute-value.entity";
import { ProductCatalogSkuEntity } from "../entities/sku.entity";

@Injectable()
export class ProductCatalogPublicationTypeormRepository implements ProductCatalogPublicationRepository {
  constructor(
    @InjectRepository(ProductCatalogPublicationEntity)
    private readonly repo: Repository<ProductCatalogPublicationEntity>,
  ) {}

  private toPublication(row: ProductCatalogPublicationEntity): ProductCatalogChannelPublication {
    return {
      id: row.id,
      channelCode: row.channelCode,
      skuId: row.skuId,
      isVisible: row.isVisible,
      sortOrder: row.sortOrder,
      priceOverride: row.priceOverride !== null && row.priceOverride !== undefined ? Number(row.priceOverride) : null,
      displayNameOverride: row.displayNameOverride ?? null,
      createdAt: row.createdAt,
    };
  }

  async create(input: {
    channelCode: string;
    skuId: string;
    isVisible: boolean;
    sortOrder: number;
    priceOverride: number | null;
    displayNameOverride: string | null;
  }): Promise<ProductCatalogChannelPublication> {
    const saved = await this.repo.save(input);
    return this.toPublication(saved);
  }

  async update(
    id: string,
    patch: Partial<Pick<ProductCatalogChannelPublication, "isVisible" | "sortOrder" | "priceOverride" | "displayNameOverride">>,
  ): Promise<ProductCatalogChannelPublication | null> {
    await this.repo.update({ id }, patch);
    const updated = await this.repo.findOne({ where: { id } });
    return updated ? this.toPublication(updated) : null;
  }

  async findByChannelAndSku(channelCode: string, skuId: string): Promise<ProductCatalogChannelPublication | null> {
    const row = await this.repo.findOne({ where: { channelCode, skuId } });
    return row ? this.toPublication(row) : null;
  }

  async listByChannel(params: {
    channelCode: string;
    page: number;
    limit: number;
    q?: string;
    isActive?: boolean;
  }): Promise<{ items: ProductCatalogPublishedSku[]; total: number }> {
    const page = params.page > 0 ? params.page : 1;
    const limit = params.limit > 0 ? params.limit : 10;
    const qb = this.repo
      .createQueryBuilder("cp")
      .innerJoin(ProductCatalogSkuEntity, "s", "s.sku_id = cp.sku_id")
      .innerJoin(ProductCatalogProductEntity, "p", "p.product_id = s.product_id")
      .where("cp.channel_code = :channelCode", { channelCode: params.channelCode });

    if (params.isActive !== undefined) {
      qb.andWhere("s.is_active = :isActive", { isActive: params.isActive });
    }
    if (params.q?.trim()) {
      const q = `%${params.q.trim().toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(p.name) LIKE :q OR LOWER(s.name) LIKE :q OR LOWER(s.backend_sku) LIKE :q OR LOWER(COALESCE(s.custom_sku, '')) LIKE :q)",
        { q },
      );
    }

    const total = await qb.clone().getCount();
    const rows = await qb
      .select([
        "cp.publication_id AS publication_id",
        "cp.channel_code AS channel_code",
        "cp.is_visible AS is_visible",
        "cp.sort_order AS sort_order",
        "cp.price_override AS price_override",
        "cp.display_name_override AS display_name_override",
        "s.sku_id AS sku_id",
        "s.product_id AS product_id",
        "s.name AS sku_name",
        "s.backend_sku AS backend_sku",
        "s.custom_sku AS custom_sku",
        "s.barcode AS barcode",
        "s.price AS sku_price",
        "s.cost AS sku_cost",
        "s.is_active AS sku_is_active",
        "p.name AS product_name",
      ])
      .orderBy("cp.sort_order", "ASC")
      .addOrderBy("s.created_at", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getRawMany<{
        publication_id: string;
        channel_code: string;
        is_visible: boolean;
        sort_order: number;
        price_override: string | null;
        display_name_override: string | null;
        sku_id: string;
        product_id: string;
        sku_name: string;
        backend_sku: string;
        custom_sku: string | null;
        barcode: string | null;
        sku_price: string;
        sku_cost: string;
        sku_is_active: boolean;
        product_name: string;
      }>();

    const skuIds = rows.map((row) => row.sku_id);
    const attributeRows = skuIds.length
      ? await this.repo.manager
          .getRepository(ProductCatalogSkuAttributeValueEntity)
          .createQueryBuilder("sav")
          .innerJoin(ProductCatalogAttributeEntity, "a", "a.attribute_id = sav.attribute_id")
          .where("sav.sku_id IN (:...skuIds)", { skuIds })
          .select([
            "sav.sku_id AS sku_id",
            "sav.value AS value",
            "a.code AS code",
            "a.name AS name",
          ])
          .orderBy("a.code", "ASC")
          .getRawMany<{ sku_id: string; code: string; name: string | null; value: string }>()
      : [];

    const attributesMap = new Map<string, Array<{ code: string; name: string | null; value: string }>>();
    for (const row of attributeRows) {
      const list = attributesMap.get(row.sku_id) ?? [];
      list.push({ code: row.code, name: row.name, value: row.value });
      attributesMap.set(row.sku_id, list);
    }

    const buildDisplayName = (productName: string, skuName: string, override: string | null) => {
      if (override?.trim()) return override.trim();
      return skuName.trim() === productName.trim() ? skuName : `${productName} - ${skuName}`;
    };

    return {
      total,
      items: rows.map((row) => ({
        publicationId: row.publication_id,
        channelCode: row.channel_code,
        skuId: row.sku_id,
        productId: row.product_id,
        productName: row.product_name,
        skuName: row.sku_name,
        backendSku: row.backend_sku,
        customSku: row.custom_sku,
        barcode: row.barcode,
        displayName: buildDisplayName(row.product_name, row.sku_name, row.display_name_override),
        isVisible: row.is_visible,
        sortOrder: row.sort_order,
        price: row.price_override !== null ? Number(row.price_override) : Number(row.sku_price),
        cost: Number(row.sku_cost),
        isActive: row.sku_is_active,
        attributes: attributesMap.get(row.sku_id) ?? [],
      })),
    };
  }
}
