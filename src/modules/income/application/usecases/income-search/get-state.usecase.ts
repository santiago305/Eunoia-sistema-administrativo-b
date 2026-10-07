import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  LISTING_SEARCH_STORAGE,
  ListingSearchStorageRepository,
} from "src/shared/listing-search/domain/listing-search.repository";
import { PaymentMethodEntity } from "src/modules/payment-methods/adapters/out/persistence/typeorm/entities/payment-method.entity";
import { CompanyPaymentAccountEntity } from "src/modules/company-payment-accounts/adapters/out/persistence/typeorm/entities/company-payment-account.entity";
import { IncomeSearchStateOutput } from "../../dtos/income-search/output/income-search-state.output";
import { IncomeSearchSnapshot } from "../../dtos/income-search/income-search-snapshot";
import {
  buildIncomeSearchLabel,
  INCOME_EVIDENCE_SEARCH_OPTIONS,
  INCOME_STATUS_SEARCH_OPTIONS,
  sanitizeIncomeSearchSnapshot,
} from "../../support/income-search.utils";

const INCOME_SEARCH_TABLE_KEY = "income";

@Injectable()
export class GetIncomeSearchStateUsecase {
  constructor(
    @Inject(LISTING_SEARCH_STORAGE)
    private readonly searchStorage: ListingSearchStorageRepository,
    @InjectRepository(PaymentMethodEntity)
    private readonly paymentMethodRepo: Repository<PaymentMethodEntity>,
    @InjectRepository(CompanyPaymentAccountEntity)
    private readonly accountRepo: Repository<CompanyPaymentAccountEntity>,
  ) {}

  async execute(userId: string): Promise<IncomeSearchStateOutput> {
    const [state, methods, accounts] = await Promise.all([
      this.searchStorage.listState({ userId, tableKey: INCOME_SEARCH_TABLE_KEY }),
      this.paymentMethodRepo.find({ where: { isActive: true }, order: { name: "ASC" } }),
      this.accountRepo.find({ where: { isActive: true }, order: { name: "ASC" } }),
    ]);

    const methodOptions = methods.map((method) => ({
      id: method.id,
      label: method.name,
      keywords: [method.code].filter(Boolean),
    }));
    const accountOptions = accounts
      .map((account) => ({
        id: account.id,
        label: account.maskedLabel || account.name,
        keywords: [account.bankName, account.institutionName].filter(Boolean) as string[],
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "es", { sensitivity: "base" }));

    const maps = {
      statuses: new Map(INCOME_STATUS_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      evidenceStates: new Map(INCOME_EVIDENCE_SEARCH_OPTIONS.map((item) => [item.id, item.label])),
      methods: new Map(methodOptions.map((item) => [item.id, item.label])),
      accounts: new Map([
        ["__unassigned__", "Sin cuenta asignada"],
        ...accountOptions.map((item) => [item.id, item.label] as [string, string]),
      ]),
    };

    return {
      recent: state.recent.map((item) => {
        const snapshot = sanitizeIncomeSearchSnapshot(item.snapshot as IncomeSearchSnapshot);
        return {
          recentId: item.recentId,
          label: buildIncomeSearchLabel(snapshot, maps),
          snapshot,
          lastUsedAt: item.lastUsedAt,
        };
      }),
      saved: state.metrics.map((item) => {
        const snapshot = sanitizeIncomeSearchSnapshot(item.snapshot as IncomeSearchSnapshot);
        return {
          metricId: item.metricId,
          name: item.name,
          label: buildIncomeSearchLabel(snapshot, maps),
          snapshot,
          updatedAt: item.updatedAt,
        };
      }),
      catalogs: {
        methods: methodOptions,
        accounts: accountOptions,
      },
    };
  }
}
