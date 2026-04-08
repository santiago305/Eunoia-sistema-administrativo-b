import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogPublicationEntity } from '../entities/catalog-publication.entity';
import { CatalogPublicationRepository } from 'src/modules/catalog/application/ports/catalog-publication.repository';
import { TransactionContext } from 'src/shared/domain/ports/unit-of-work.port';
import { TypeormTransactionContext } from 'src/shared/domain/ports/typeorm-transaction-context';
import { ChannelCatalogItemOutput } from 'src/modules/catalog/application/dto/catalog-publications/output/channel-catalog-item-out';
import { CatalogPublicationOutput } from 'src/modules/catalog/application/dto/catalog-publications/output/catalog-publication-out';
import { ProductType } from 'src/modules/catalog/domain/value-object/productType';
import { StockItemType } from 'src/modules/inventory/domain/value-objects/stock-item-type';

@Injectable()
export class CatalogPublicationTypeormRepository implements CatalogPublicationRepository {
  constructor(
    @InjectRepository(CatalogPublicationEntity)
    private readonly repo: Repository<CatalogPublicationEntity>,
  ) {}

  private getManager(tx?: TransactionContext) {
    if (tx && (tx as TypeormTransactionContext).manager) {
      return (tx as TypeormTransactionContext).manager;
    }
    return this.repo.manager;
  }

  private getRepo(tx?: TransactionContext) {
    return this.getManager(tx).getRepository(CatalogPublicationEntity);
  }

  private toOutput(row: CatalogPublicationEntity): CatalogPublicationOutput {
    return {
      id: row.id,
      channelCode: row.channelCode,
      sourceType: row.sourceType,
      itemId: row.itemId,
      isVisible: row.isVisible,
      sortOrder: row.sortOrder,
      priceOverride: row.priceOverride !== null && row.priceOverride !== undefined ? Number(row.priceOverride) : null,
      displayNameOverride: row.displayNameOverride ?? null,
      createdAt: row.createdAt,
    };
  }

  async create(params: {
    channelCode: string;
    sourceType: StockItemType;
    itemId: string;
    isVisible: boolean;
    sortOrder: number;
    priceOverride: number | null;
    displayNameOverride: string | null;
  }, tx?: TransactionContext): Promise<CatalogPublicationOutput> {
    const saved = await this.getRepo(tx).save({
      channelCode: params.channelCode,
      sourceType: params.sourceType,
      itemId: params.itemId,
      isVisible: params.isVisible,
      sortOrder: params.sortOrder,
      priceOverride: params.priceOverride,
      displayNameOverride: params.displayNameOverride,
    });
    return this.toOutput(saved);
  }

  async update(params: {
    id: string;
    isVisible?: boolean;
    sortOrder?: number;
    priceOverride?: number | null;
    displayNameOverride?: string | null;
  }, tx?: TransactionContext): Promise<CatalogPublicationOutput | null> {
    const patch: Partial<CatalogPublicationEntity> = {};
    if (params.isVisible !== undefined) patch.isVisible = params.isVisible;
    if (params.sortOrder !== undefined) patch.sortOrder = params.sortOrder;
    if (params.priceOverride !== undefined) patch.priceOverride = params.priceOverride;
    if (params.displayNameOverride !== undefined) patch.displayNameOverride = params.displayNameOverride;
    await this.getRepo(tx).update({ id: params.id }, patch);
    const updated = await this.getRepo(tx).findOne({ where: { id: params.id } });
    return updated ? this.toOutput(updated) : null;
  }

  async findById(id: string, tx?: TransactionContext): Promise<CatalogPublicationOutput | null> {
    const row = await this.getRepo(tx).findOne({ where: { id } });
    return row ? this.toOutput(row) : null;
  }

  async findByChannelAndItem(
    channelCode: string,
    sourceType: StockItemType,
    itemId: string,
    tx?: TransactionContext,
  ): Promise<CatalogPublicationOutput | null> {
    const row = await this.getRepo(tx).findOne({ where: { channelCode, sourceType, itemId } });
    return row ? this.toOutput(row) : null;
  }

  async searchPublishedFlat(
    params: {
      channelCode: string;
      isActive?: boolean;
      type?: ProductType;
      q?: string;
      page: number;
      limit: number;
    },
    tx?: TransactionContext,
  ): Promise<{ items: ChannelCatalogItemOutput[]; total: number }> {
    const manager = this.getManager(tx);
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 10;
    const offset = (page - 1) * limit;
    const search = params.q?.trim().toLowerCase();

    const values: Array<string | number | boolean> = [];
    const pushParam = (value: string | number | boolean) => {
      values.push(value);
      return `$${values.length}`;
    };

    const channelParam = pushParam(params.channelCode);
    const filters = [`cp.channel_code = ${channelParam}`, `cp.is_visible = true`];

    if (params.isActive !== undefined) {
      const p = pushParam(params.isActive);
      filters.push(`flat."isActive" = ${p}`);
    }
    if (params.type) {
      const p = pushParam(params.type);
      filters.push(`flat.type = ${p}`);
    }
    if (search) {
      const p = pushParam(`%${search}%`);
      filters.push(`(
        LOWER(flat.name) LIKE ${p}
        OR LOWER(flat."displayName") LIKE ${p}
        OR LOWER(flat.sku) LIKE ${p}
        OR LOWER(COALESCE(flat."customSku", '')) LIKE ${p}
      )`);
    }

    const flatSql = `
      SELECT
        p.product_id AS id,
        'PRODUCT'::text AS "sourceType",
        p.product_id AS "familyProductId",
        p.product_id AS "productId",
        NULL::uuid AS "parentProductId",
        true AS "isGroupRoot",
        true AS "isOperationalItem",
        p.base_unit_id AS "baseUnitId",
        p.name AS name,
        p.description AS description,
        p.sku AS sku,
        p.custom_sku AS "customSku",
        p.barcode AS barcode,
        p.price::numeric AS price,
        p.cost::numeric AS cost,
        p.attributes AS attributes,
        u.name AS "baseUnitName",
        u.code AS "baseUnitCode",
        p.is_active AS "isActive",
        p.type AS type,
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt"
      FROM products p
      INNER JOIN units u ON u.unit_id = p.base_unit_id
      UNION ALL
      SELECT
        v.variant_id AS id,
        'VARIANT'::text AS "sourceType",
        p.product_id AS "familyProductId",
        p.product_id AS "productId",
        p.product_id AS "parentProductId",
        false AS "isGroupRoot",
        true AS "isOperationalItem",
        p.base_unit_id AS "baseUnitId",
        p.name AS name,
        p.description AS description,
        v.sku AS sku,
        v.custom_sku AS "customSku",
        v.barcode AS barcode,
        v.price::numeric AS price,
        COALESCE(v.cost, 0)::numeric AS cost,
        v.attributes AS attributes,
        u.name AS "baseUnitName",
        u.code AS "baseUnitCode",
        v.is_active AS "isActive",
        p.type AS type,
        v.created_at AS "createdAt",
        NULL::timestamp AS "updatedAt"
      FROM product_variants v
      INNER JOIN products p ON p.product_id = v.product_id
      INNER JOIN units u ON u.unit_id = p.base_unit_id
    `;

    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const totalRows = await manager.query(
      `
        SELECT COUNT(*)::int AS total
        FROM catalog_publications cp
        INNER JOIN (${flatSql}) flat
          ON flat.id = cp.item_id
         AND flat."sourceType" = cp.source_type
        ${whereSql}
      `,
      values,
    );

    const pagingValues = [...values];
    const limitParam = `$${pagingValues.push(limit)}`;
    const offsetParam = `$${pagingValues.push(offset)}`;

    const rows = await manager.query(
      `
        SELECT
          cp.publication_id AS "publicationId",
          cp.channel_code AS "channelCode",
          cp.is_visible AS "isVisible",
          cp.sort_order AS "sortOrder",
          cp.price_override AS "priceOverride",
          cp.display_name_override AS "displayNameOverride",
          flat.*
        FROM catalog_publications cp
        INNER JOIN (${flatSql}) flat
          ON flat.id = cp.item_id
         AND flat."sourceType" = cp.source_type
        ${whereSql}
        ORDER BY cp.sort_order ASC, flat."familyProductId" DESC, CASE WHEN flat."sourceType" = 'PRODUCT' THEN 0 ELSE 1 END ASC
        LIMIT ${limitParam}
        OFFSET ${offsetParam}
      `,
      pagingValues,
    );

    const familyCounts = new Map<string, number>();
    for (const row of rows as Array<Record<string, unknown>>) {
      const familyId = String(row.familyProductId);
      if (String(row.sourceType) === 'VARIANT') {
        familyCounts.set(familyId, (familyCounts.get(familyId) ?? 0) + 1);
      } else if (!familyCounts.has(familyId)) {
        familyCounts.set(familyId, 0);
      }
    }

    const buildDisplayName = (name: string, attributes: Record<string, unknown>, override?: string | null) => {
      if (override?.trim()) return override.trim();
      const parts = [
        typeof attributes.variant === 'string' ? attributes.variant.trim() : '',
        typeof attributes.color === 'string' ? attributes.color.trim() : '',
        typeof attributes.presentation === 'string' ? attributes.presentation.trim() : '',
      ].filter(Boolean);
      return parts.length ? `${name} - ${parts.join(' - ')}` : name;
    };

    return {
      items: rows.map((row: Record<string, unknown>) => {
        const attributes = (row.attributes as Record<string, unknown>) ?? {};
        const familyId = String(row.familyProductId);
        return {
          id: String(row.id),
          publicationId: String(row.publicationId),
          channelCode: String(row.channelCode),
          sourceType: row.sourceType as "PRODUCT" | "VARIANT",
          familyProductId: familyId,
          productId: String(row.productId),
          parentProductId: row.parentProductId ? String(row.parentProductId) : null,
          isGroupRoot: Boolean(row.isGroupRoot),
          isOperationalItem: Boolean(row.isOperationalItem),
          displayName: buildDisplayName(String(row.name), attributes, row.displayNameOverride ? String(row.displayNameOverride) : null),
          hasVariants: (familyCounts.get(familyId) ?? 0) > 0,
          variantsCount: familyCounts.get(familyId) ?? 0,
          isVisible: Boolean(row.isVisible),
          sortOrder: Number(row.sortOrder ?? 0),
          priceOverride: row.priceOverride !== null && row.priceOverride !== undefined ? Number(row.priceOverride) : null,
          baseUnitId: String(row.baseUnitId),
          name: String(row.name),
          description: row.description ? String(row.description) : null,
          sku: String(row.sku),
          customSku: row.customSku ? String(row.customSku) : null,
          barcode: row.barcode ? String(row.barcode) : null,
          price: Number(row.price),
          cost: Number(row.cost ?? 0),
          attributes,
          baseUnitName: String(row.baseUnitName),
          baseUnitCode: String(row.baseUnitCode),
          isActive: Boolean(row.isActive),
          type: row.type as ProductType,
          createdAt: new Date(String(row.createdAt)),
          updatedAt: row.updatedAt ? new Date(String(row.updatedAt)) : null,
        };
      }),
      total: Number(totalRows[0]?.total ?? 0),
    };
  }
}
