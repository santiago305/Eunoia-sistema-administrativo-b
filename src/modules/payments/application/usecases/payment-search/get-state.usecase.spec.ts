import { GetPaymentSearchStateUsecase } from "./get-state.usecase";
import { PaymentSearchRepository } from "../../../domain/ports/payment-search.repository";
import {
  PaymentSearchFields,
  PaymentSearchOperators,
} from "../../dtos/payment-search/payment-search-snapshot";

describe("GetPaymentSearchStateUsecase", () => {
  it("returns recent and saved searches with payment catalogs and labels", async () => {
    const repo: jest.Mocked<PaymentSearchRepository> = {
      touchRecentSearch: jest.fn(),
      listState: jest.fn().mockResolvedValue({
        recent: [
          {
            recentId: "recent-1",
            snapshot: {
              q: "bcp",
              filters: [
                {
                  field: PaymentSearchFields.COMPANY_PAYMENT_ACCOUNT_ID,
                  operator: PaymentSearchOperators.IN,
                  values: ["account-1"],
                },
              ],
            },
            lastUsedAt: new Date("2026-07-13T08:00:00.000Z"),
          },
        ],
        metrics: [
          {
            metricId: "metric-1",
            name: "Por aprobar",
            snapshot: {
              filters: [
                {
                  field: PaymentSearchFields.STATUS,
                  operator: PaymentSearchOperators.IN,
                  values: ["PENDING_APPROVAL"],
                },
              ],
            },
            updatedAt: new Date("2026-07-13T09:00:00.000Z"),
          },
        ],
        paymentMethods: [{ paymentMethodId: "method-1", label: "Transferencia" }],
        companyPaymentAccounts: [{ companyPaymentAccountId: "account-1", label: "BCP ****1234" }],
      }),
      createMetric: jest.fn(),
      deleteMetric: jest.fn(),
    };
    const usecase = new GetPaymentSearchStateUsecase(repo);

    const result = await usecase.execute("user-1");

    expect(repo.listState).toHaveBeenCalledWith({
      userId: "user-1",
      tableKey: "payments",
    });
    expect(result.recent[0].label).toBe("Busqueda: bcp | Cuenta empresa: BCP ****1234");
    expect(result.saved[0].label).toBe("Estado: Pendiente aprobacion");
    expect(result.catalogs.statuses.map((item) => item.id)).toContain("SCHEDULED");
    expect(result.catalogs.paymentMethods).toEqual([{ id: "method-1", label: "Transferencia" }]);
    expect(result.catalogs.companyPaymentAccounts).toEqual([{ id: "account-1", label: "BCP ****1234" }]);
  });
});
