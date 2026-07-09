import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import {
  SaleOrderSearchRepository,
  SaleOrderSearchStateRecord,
} from "src/modules/sale-orders/domain/ports/sale-order-search.repository";
import { SaleOrderSearchSnapshot } from "src/modules/sale-orders/application/dtos/sale-order-search/sale-order-search-snapshot";
import { WorkflowEntity } from "src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow.entity";
import { SaleOrderStatesEntity } from "src/modules/workflow/adapters/out/persistence/typeorm/entities/sale-order-states.entity";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { SourceEntity } from "src/modules/sources/adapters/out/persistence/typeorm/entities/source.entity";
import { UbigeoDepartmentEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-department.entity";
import { UbigeoProvinceEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-province.entity";
import { UbigeoDistrictEntity } from "src/modules/ubigeo/adapters/out/persistence/typeorm/entities/ubigeo-district.entity";
import { SaleOrderEntity } from "../entities/sale-order.entity";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";

@Injectable()
export class SaleOrderSearchTypeormRepository implements SaleOrderSearchRepository {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly storage: ListingSearchStorageRepository,

    @InjectRepository(ClientEntity)
    private readonly clientRepo: Repository<ClientEntity>,

    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepo: Repository<WarehouseEntity>,

    @InjectRepository(WorkflowEntity)
    private readonly workflowRepo: Repository<WorkflowEntity>,

    @InjectRepository(SaleOrderStatesEntity)
    private readonly stateRepo: Repository<SaleOrderStatesEntity>,

    @InjectRepository(CompanyPaymentAccountEntity)
    private readonly bankAccountRepo: Repository<CompanyPaymentAccountEntity>,
  ) {}

  async touchRecentSearch(params: Parameters<SaleOrderSearchRepository["touchRecentSearch"]>[0]): Promise<void> {
    await this.storage.touchRecentSearch(params);
  }

  async listState(params: { userId: string; tableKey: string }): Promise<SaleOrderSearchStateRecord> {
    const [state, clients, warehouses, workflows, saleOrderStates, bankAccounts, departments, provinces, districts, sources, saleOrders] = await Promise.all([
      this.storage.listState(params),
      this.clientRepo.find({ where: { isActive: true } }),
      this.warehouseRepo.find({ where: { isActive: true } }),
      this.workflowRepo.find({ where: { isActive: true } }),
      this.stateRepo.find({
        order: {
          name: "ASC",
        },
      }),
      this.bankAccountRepo.find({ where: { isActive: true } }),
      this.clientRepo.manager.getRepository(UbigeoDepartmentEntity).find({ order: { name: "ASC" } }),
      this.clientRepo.manager.getRepository(UbigeoProvinceEntity).find({ order: { name: "ASC" } }),
      this.clientRepo.manager.getRepository(UbigeoDistrictEntity).find({ order: { name: "ASC" } }),
      this.clientRepo.manager.getRepository(SourceEntity).find({ order: { name: "ASC" } }),
      this.clientRepo.manager.getRepository(SaleOrderEntity).find({
        select: {
          createdBy: true,
          assignedBy: true,
        },
      }),
    ]);

    const creatorIds = Array.from(new Set(saleOrders.map((row) => row.createdBy).filter(Boolean))) as string[];
    const assigneeIds = Array.from(new Set(saleOrders.map((row) => row.assignedBy).filter(Boolean))) as string[];
    const userIds = Array.from(new Set([...creatorIds, ...assigneeIds]));
    const users = userIds.length
      ? await this.clientRepo.manager.getRepository(User).find({ where: { id: In(userIds) } })
      : [];
    const userById = new Map(users.map((user) => [user.id, user]));
    const userLabel = (user: User) => `${user.name}${user.email ? ` (${user.email})` : ""}`.trim();
    const mapUserCatalog = (ids: string[]) =>
      ids
        .map((id) => {
          const user = userById.get(id);
          return user ? { userId: user.id, label: userLabel(user) } : null;
        })
        .filter((item): item is { userId: string; label: string } => Boolean(item))
        .sort((left, right) => left.label.localeCompare(right.label, "es", { sensitivity: "base" }));

    const orderedClients = [...clients].sort((left, right) =>
      left.fullName.localeCompare(right.fullName, "es", { sensitivity: "base" }),
    );

    const orderedWarehouses = [...warehouses].sort((left, right) =>
      left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
    );

    const orderedBankAccounts = [...bankAccounts].sort((left, right) =>
      left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
    );

    return {
      recent: state.recent.map((item) => ({
        recentId: item.recentId,
        snapshot: item.snapshot as SaleOrderSearchSnapshot,
        lastUsedAt: item.lastUsedAt,
      })),

      metrics: state.metrics.map((item) => ({
        metricId: item.metricId,
        name: item.name,
        snapshot: item.snapshot as SaleOrderSearchSnapshot,
        updatedAt: item.updatedAt,
      })),

      clients: orderedClients.map((row) => {
        const doc = row.docNumber ? ` (${row.docNumber})` : "";

        return {
          clientId: row.id,
          label: `${row.fullName}${doc}`.trim(),
        };
      }),

      warehouses: orderedWarehouses.map((row) => ({
        warehouseId: row.id,
        label: row.name,
      })),

      workflows: workflows.map((row) => ({
        workflowId: row.id,
        label: row.name,
      })),

      states: saleOrderStates.map((row) => ({
        saleOrderStateId: row.id,
        label: row.name,
      })),

      bankAccounts: orderedBankAccounts.map((row) => {
        const number = row.accountNumber ? ` (${row.accountNumber})` : "";

        return {
          bankAccountId: row.id,
          label: `${row.name}${number}`.trim(),
        };
      }),
      departments: departments.map((row) => ({ id: row.id, label: row.name })),
      provinces: provinces.map((row) => ({ id: row.id, label: row.name })),
      districts: districts.map((row) => ({ id: row.id, label: row.name })),
      sources: sources.map((row) => ({ id: row.id, label: row.name })),
      creators: mapUserCatalog(creatorIds),
      assignees: mapUserCatalog(assigneeIds),
    };
  }

  async createMetric(params: {
    userId: string;
    tableKey: string;
    name: string;
    snapshot: Parameters<SaleOrderSearchRepository["createMetric"]>[0]["snapshot"];
  }) {
    const metric = await this.storage.createMetric(params);

    return {
      metricId: metric.metricId,
      name: metric.name,
      snapshot: metric.snapshot as SaleOrderSearchSnapshot,
      updatedAt: metric.updatedAt,
    };
  }

  async deleteMetric(params: { userId: string; tableKey: string; metricId: string }) {
    return this.storage.deleteMetric(params);
  }
}
