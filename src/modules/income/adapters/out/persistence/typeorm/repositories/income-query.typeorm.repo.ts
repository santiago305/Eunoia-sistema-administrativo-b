import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository, SelectQueryBuilder } from "typeorm";
import { ClientEntity } from "src/modules/clients/adapters/out/persistence/typeorm/entities/client.entity";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { SalePaymentEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-payment.entity";
import { IncomeFilters } from "src/modules/income/application/dtos/income-filter.input";
import { IncomeListOutput, IncomeOutput, IncomeSummaryOutput } from "src/modules/income/application/dtos/income.output";
import { IncomeQueryRepository } from "src/modules/income/domain/ports/income-query.repository";

const numberFrom = (value: unknown): number => Number(value ?? 0);
const accountLabelSql = "COALESCE(cpa.name, cpa.bank_name, cpa.wallet_name, 'Sin cuenta')";

@Injectable()
export class IncomeQueryTypeormRepository implements IncomeQueryRepository {
  constructor(
    @InjectRepository(SalePaymentEntity)
    private readonly paymentRepo: Repository<SalePaymentEntity>,
    @InjectRepository(SaleOrderEntity)
    private readonly orderRepo: Repository<SaleOrderEntity>,
  ) {}

  async list(filters: IncomeFilters): Promise<IncomeListOutput> {
    const qb = this.applyFilters(
      this.paymentRepo
        .createQueryBuilder("sp")
        .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(CompanyPaymentAccountEntity, "cpa", "cpa.id = sp.bankAccountId")
        .select("sp.id", "incomeId")
        .addSelect("sp.saleOrderId", "saleOrderId")
        .addSelect("COALESCE(client.fullName, 'Cliente sin nombre')", "clientName")
        .addSelect("sp.amount", "amount")
        .addSelect("sp.method", "method")
        .addSelect("sp.bankAccountId", "companyPaymentAccountId")
        .addSelect(accountLabelSql, "companyPaymentAccountLabel")
        .addSelect("sp.operationNumber", "operationNumber")
        .addSelect("sp.date", "date")
        .addSelect("sp.createdAt", "createdAt")
        .addSelect("sp.paymentPhoto", "evidenceUrl"),
      filters,
    );

    const total = await qb.clone().getCount();
    const rows = await qb
      .orderBy("sp.date", "DESC")
      .addOrderBy("sp.createdAt", "DESC")
      .offset((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .getRawMany();

    return { items: rows.map(this.mapIncome), total };
  }

  async getSummary(filters: IncomeFilters): Promise<IncomeSummaryOutput> {
    const collectedQb = this.applyFilters(
      this.paymentRepo
        .createQueryBuilder("sp")
        .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(CompanyPaymentAccountEntity, "cpa", "cpa.id = sp.bankAccountId")
        .select("COALESCE(SUM(sp.amount), 0)", "totalCollected"),
      filters,
    );

    const pendingRows = await this.applyOrderFilters(
      this.orderRepo
        .createQueryBuilder("so")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(
          (subQb) =>
            subQb
              .select("sp.sale_order_id", "saleOrderId")
              .addSelect("COALESCE(SUM(sp.amount), 0)", "collected")
              .from(SalePaymentEntity, "sp")
              .groupBy("sp.sale_order_id"),
          "payments",
          '"payments"."saleOrderId" = so.id',
        )
        .select("COALESCE(SUM(GREATEST(so.total - COALESCE(payments.collected, 0), 0)), 0)", "totalPending")
        .addSelect("COUNT(CASE WHEN GREATEST(so.total - COALESCE(payments.collected, 0), 0) <= 0 THEN 1 END)", "ordersPaid")
        .addSelect("COUNT(CASE WHEN GREATEST(so.total - COALESCE(payments.collected, 0), 0) > 0 THEN 1 END)", "ordersPending"),
      filters,
    ).getRawOne();

    const byMethodRows = await this.applyFilters(
      this.paymentRepo
        .createQueryBuilder("sp")
        .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(CompanyPaymentAccountEntity, "cpa", "cpa.id = sp.bankAccountId")
        .select("COALESCE(sp.method, 'Sin metodo')", "method")
        .addSelect("COALESCE(SUM(sp.amount), 0)", "amount")
        .addSelect("COUNT(*)", "count")
        .groupBy("sp.method"),
      filters,
    ).getRawMany();

    const byAccountRows = await this.applyFilters(
      this.paymentRepo
        .createQueryBuilder("sp")
        .innerJoin(SaleOrderEntity, "so", "so.id = sp.saleOrderId")
        .leftJoin(ClientEntity, "client", "client.id = so.clientId")
        .leftJoin(CompanyPaymentAccountEntity, "cpa", "cpa.id = sp.bankAccountId")
        .select("sp.bankAccountId", "accountId")
        .addSelect(accountLabelSql, "label")
        .addSelect("COALESCE(SUM(sp.amount), 0)", "amount")
        .addSelect("COUNT(*)", "count")
        .groupBy("sp.bankAccountId")
        .addGroupBy("cpa.name")
        .addGroupBy("cpa.bank_name")
        .addGroupBy("cpa.wallet_name"),
      filters,
    ).getRawMany();

    const collected = await collectedQb.getRawOne();
    return {
      totalCollected: numberFrom(collected?.totalCollected),
      totalPending: numberFrom(pendingRows?.totalPending),
      ordersPaid: numberFrom(pendingRows?.ordersPaid),
      ordersPending: numberFrom(pendingRows?.ordersPending),
      byMethod: byMethodRows.map((row) => ({
        method: row.method,
        amount: numberFrom(row.amount),
        count: numberFrom(row.count),
      })),
      byAccount: byAccountRows.map((row) => ({
        accountId: row.accountId ?? null,
        label: row.label,
        amount: numberFrom(row.amount),
        count: numberFrom(row.count),
      })),
    };
  }

  private applyFilters<T>(qb: SelectQueryBuilder<T>, filters: IncomeFilters) {
    this.applyOrderFilters(qb, filters);
    if (filters.method) qb.andWhere("sp.method = :method", { method: filters.method });
    if (filters.companyPaymentAccountId) {
      qb.andWhere("sp.bankAccountId = :companyPaymentAccountId", {
        companyPaymentAccountId: filters.companyPaymentAccountId,
      });
    }
    if (filters.from) qb.andWhere("sp.date >= :from", { from: filters.from });
    if (filters.to) qb.andWhere("sp.date <= :to", { to: filters.to });
    if (filters.hasEvidence === true) qb.andWhere("sp.paymentPhoto IS NOT NULL AND sp.paymentPhoto <> ''");
    if (filters.hasEvidence === false) qb.andWhere("(sp.paymentPhoto IS NULL OR sp.paymentPhoto = '')");
    return qb;
  }

  private applyOrderFilters<T>(qb: SelectQueryBuilder<T>, filters: IncomeFilters) {
    qb.andWhere("so.isActive = true");
    if (filters.saleOrderId) qb.andWhere("so.id = :saleOrderId", { saleOrderId: filters.saleOrderId });
    if (filters.client) qb.andWhere("client.fullName ILIKE :client", { client: `%${filters.client}%` });
    if (filters.q) {
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where("client.fullName ILIKE :q", { q: `%${filters.q}%` })
            .orWhere("sp.method ILIKE :q", { q: `%${filters.q}%` })
            .orWhere("sp.operationNumber ILIKE :q", { q: `%${filters.q}%` })
            .orWhere("CAST(so.correlative AS TEXT) ILIKE :q", { q: `%${filters.q}%` })
            .orWhere("so.serie ILIKE :q", { q: `%${filters.q}%` });
        }),
      );
    }
    return qb;
  }

  private mapIncome(row: any): IncomeOutput {
    return {
      incomeId: row.incomeId,
      saleOrderId: row.saleOrderId,
      clientName: row.clientName,
      amount: numberFrom(row.amount),
      method: row.method,
      companyPaymentAccountId: row.companyPaymentAccountId ?? null,
      companyPaymentAccountLabel: row.companyPaymentAccountLabel ?? null,
      operationNumber: row.operationNumber ?? null,
      date: row.date instanceof Date ? row.date.toISOString() : String(row.date),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      evidenceUrl: row.evidenceUrl ?? null,
    };
  }
}
