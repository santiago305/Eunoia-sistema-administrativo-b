import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  PaymentSearchRepository,
  PaymentSearchStateRecord,
} from "src/modules/payments/domain/ports/payment-search.repository";
import { PaymentSearchSnapshot } from "src/modules/payments/application/dtos/payment-search/payment-search-snapshot";
import { PaymentMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/payment-method.entity";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";

@Injectable()
export class PaymentSearchTypeormRepository implements PaymentSearchRepository {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly storage: ListingSearchStorageRepository,
    @InjectRepository(PaymentMethodEntity)
    private readonly paymentMethodRepo: Repository<PaymentMethodEntity>,
    @InjectRepository(CompanyPaymentAccountEntity)
    private readonly companyPaymentAccountRepo: Repository<CompanyPaymentAccountEntity>,
  ) {}

  async touchRecentSearch(params: Parameters<PaymentSearchRepository["touchRecentSearch"]>[0]): Promise<void> {
    await this.storage.touchRecentSearch(params);
  }

  async listState(params: { userId: string; tableKey: string }): Promise<PaymentSearchStateRecord> {
    const [state, paymentMethods, companyPaymentAccounts] = await Promise.all([
      this.storage.listState(params),
      this.paymentMethodRepo.find({ where: { isActive: true } }),
      this.companyPaymentAccountRepo.find({ where: { isActive: true } }),
    ]);

    const orderedMethods = [...paymentMethods].sort((left, right) =>
      left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
    );
    const orderedAccounts = [...companyPaymentAccounts].sort((left, right) =>
      this.companyAccountLabel(left).localeCompare(this.companyAccountLabel(right), "es", { sensitivity: "base" }),
    );

    return {
      recent: state.recent.map((item) => ({
        recentId: item.recentId,
        snapshot: item.snapshot as PaymentSearchSnapshot,
        lastUsedAt: item.lastUsedAt,
      })),
      metrics: state.metrics.map((item) => ({
        metricId: item.metricId,
        name: item.name,
        snapshot: item.snapshot as PaymentSearchSnapshot,
        updatedAt: item.updatedAt,
      })),
      paymentMethods: orderedMethods.map((row) => ({
        paymentMethodId: row.id,
        label: row.name,
      })),
      companyPaymentAccounts: orderedAccounts.map((row) => ({
        companyPaymentAccountId: row.id,
        label: this.companyAccountLabel(row),
      })),
    };
  }

  async createMetric(params: {
    userId: string;
    tableKey: string;
    name: string;
    snapshot: Parameters<PaymentSearchRepository["createMetric"]>[0]["snapshot"];
  }) {
    const metric = await this.storage.createMetric(params);
    return {
      metricId: metric.metricId,
      name: metric.name,
      snapshot: metric.snapshot as PaymentSearchSnapshot,
      updatedAt: metric.updatedAt,
    };
  }

  async deleteMetric(params: { userId: string; tableKey: string; metricId: string }) {
    return this.storage.deleteMetric(params);
  }

  private companyAccountLabel(row: CompanyPaymentAccountEntity) {
    const suffix = row.cardLastFour ?? row.accountLastFour;
    const masked = suffix ? ` ****${suffix}` : "";
    const bank = row.bankName ? `${row.bankName} - ` : "";
    return `${bank}${row.name}${masked}`.trim();
  }
}
