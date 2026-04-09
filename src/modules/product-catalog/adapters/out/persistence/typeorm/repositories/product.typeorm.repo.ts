import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductCatalogProduct } from "src/modules/product-catalog/domain/entities/product";
import { ProductCatalogProductRepository } from "src/modules/product-catalog/domain/ports/product.repository";
import { ProductCatalogProductEntity } from "../entities/product.entity";

@Injectable()
export class ProductCatalogProductTypeormRepository implements ProductCatalogProductRepository {
  constructor(
    @InjectRepository(ProductCatalogProductEntity)
    private readonly repo: Repository<ProductCatalogProductEntity>,
  ) {}

  private toDomain(row: ProductCatalogProductEntity): ProductCatalogProduct {
    return new ProductCatalogProduct(
      row.id,
      row.name,
      row.description ?? null,
      row.category ?? null,
      row.brand ?? null,
      row.baseUnitId ?? null,
      row.isActive,
      row.createdAt,
      row.updatedAt,
    );
  }

  async create(product: ProductCatalogProduct): Promise<ProductCatalogProduct> {
    const saved = await this.repo.save({
      name: product.name,
      description: product.description,
      category: product.category,
      brand: product.brand,
      baseUnitId: product.baseUnitId,
      isActive: product.isActive,
    });
    return this.toDomain(saved);
  }

  async update(
    id: string,
    patch: Partial<Pick<ProductCatalogProduct, "name" | "description" | "category" | "brand" | "baseUnitId" | "isActive">>,
  ): Promise<ProductCatalogProduct | null> {
    await this.repo.update({ id }, patch);
    const updated = await this.repo.findOne({ where: { id } });
    return updated ? this.toDomain(updated) : null;
  }

  async findById(id: string): Promise<ProductCatalogProduct | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async list(params: {
    page: number;
    limit: number;
    q?: string;
    isActive?: boolean;
  }): Promise<{ items: ProductCatalogProduct[]; total: number }> {
    const qb = this.repo.createQueryBuilder("p");
    if (params.isActive !== undefined) {
      qb.andWhere("p.is_active = :isActive", { isActive: params.isActive });
    }
    if (params.q?.trim()) {
      qb.andWhere("(LOWER(p.name) LIKE :q OR LOWER(COALESCE(p.description, '')) LIKE :q)", {
        q: `%${params.q.trim().toLowerCase()}%`,
      });
    }

    const page = params.page > 0 ? params.page : 1;
    const limit = params.limit > 0 ? params.limit : 10;
    const [rows, total] = await qb
      .orderBy("p.created_at", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: rows.map((row) => this.toDomain(row)), total };
  }
}
