import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { WarehouseEntity } from "src/modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse";
import { SubsidiaryEntity } from "src/modules/agencies/adapters/out/persistence/typeorm/entities/subsidiary.entity";
import { SourceEntity } from "src/modules/sources/adapters/out/persistence/typeorm/entities/source.entity";
import { WorkflowEntity } from "src/modules/workflow/adapters/out/persistence/typeorm/entities/workflow.entity";
import { AdviserEntity } from "src/modules/advisers/adapters/out/persistence/typeorm/entities/adviser.entity";
import { User } from "src/modules/users/adapters/out/persistence/typeorm/entities/user.entity";
import { CompanyMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/company-method.entity";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";

type Input = {
  companyId?: string;
};

@Injectable()
export class GetSaleOrderEditorCatalogsUsecase {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly clients: Repository<ClientEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehouses: Repository<WarehouseEntity>,
    @InjectRepository(SubsidiaryEntity)
    private readonly subsidiaries: Repository<SubsidiaryEntity>,
    @InjectRepository(SourceEntity)
    private readonly sources: Repository<SourceEntity>,
    @InjectRepository(WorkflowEntity)
    private readonly workflows: Repository<WorkflowEntity>,
    @InjectRepository(AdviserEntity)
    private readonly advisers: Repository<AdviserEntity>,
    @InjectRepository(CompanyMethodEntity)
    private readonly companyMethods: Repository<CompanyMethodEntity>,
    @InjectRepository(CompanyPaymentAccountEntity)
    private readonly companyPaymentAccounts: Repository<CompanyPaymentAccountEntity>,
  ) {}

  async execute(input: Input = {}) {
    const companyId = input.companyId?.trim() || "";

    const [
      clients,
      warehouses,
      subsidiaries,
      sources,
      workflows,
      advisers,
      paymentMethods,
      companyPaymentAccounts,
    ] = await Promise.all([
      this.clients.find({ where: { isActive: true }, order: { fullName: "ASC" }, take: 25 }),
      this.warehouses.find({ where: { isActive: true }, order: { name: "ASC" }, take: 100 }),
      this.subsidiaries.find({ where: { isActive: true }, order: { alias: "ASC" }, take: 25 }),
      this.sources.find({ where: { isActive: true }, order: { name: "ASC" }, take: 100 }),
      this.workflows.find({ where: { isActive: true }, order: { name: "ASC" } }),
      this.advisers
        .createQueryBuilder("adviser")
        .innerJoin(User, "user", `"user"."user_id" = "adviser"."user_id"`)
        .where(`"user"."deleted" = false`)
        .select([
          `"adviser"."user_id" as "id"`,
          `"user"."name" as "name"`,
          `"user"."email" as "email"`,
        ])
        .orderBy(`"user"."name"`, "ASC")
        .getRawMany<{ id: string; name: string; email: string }>(),
      companyId
        ? this.companyMethods.find({
            where: { companyId },
            relations: { method: true },
            order: { method: { name: "ASC" } },
          })
        : Promise.resolve([]),
      companyId
        ? this.companyPaymentAccounts.find({
            where: { companyId },
            order: { isDefault: "DESC", name: "ASC" },
          })
        : Promise.resolve([]),
    ]);

    return {
      clients: clients.map((client) => ({
        id: client.id,
        fullName: client.fullName,
        docNumber: client.docNumber ?? null,
      })),
      warehouses: warehouses.map((warehouse) => ({
        warehouseId: warehouse.id,
        name: warehouse.name,
      })),
      subsidiaries: subsidiaries.map((subsidiary) => ({
        id: subsidiary.id,
        alias: subsidiary.alias,
        address: subsidiary.address ?? null,
        basePrice: Number(subsidiary.basePrice || 0),
      })),
      sources: sources.map((source) => ({
        id: source.id,
        name: source.name,
      })),
      workflows: workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        isActive: workflow.isActive,
      })),
      advisers,
      paymentMethods: paymentMethods
        .filter((row) => row.method?.isActive)
        .map((row) => ({
          companyMethodId: row.id,
          companyId: row.companyId,
          methodId: row.methodId,
          name: row.method.name,
          number: row.number ?? undefined,
          isActive: row.method.isActive,
          requiresVoucher: row.requiresVoucher,
        })),
      companyPaymentAccounts: companyPaymentAccounts.map((account) => ({
        id: account.id,
        companyId: account.companyId,
        type: account.type,
        name: account.name,
        bankName: account.bankName ?? null,
        accountNumber: account.accountNumber ?? null,
        accountLastFour: account.accountLastFour ?? null,
        cardLastFour: account.cardLastFour ?? null,
        walletName: account.walletName ?? null,
        currency: account.currency,
        isActive: account.isActive,
        isDefault: account.isDefault,
      })),
    };
  }
}
