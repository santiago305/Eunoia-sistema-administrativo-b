import { Repository } from "typeorm";
import { CurrencyType } from "src/modules/payments/domain/value-objects/currency-type";
import { PayDocType } from "src/modules/payments/domain/value-objects/pay-doc-type";
import { PaymentDocumentEntity } from "../entities/payment-document.entity";
import { PaymentDocumentTypeormRepository } from "./payment-document.typeorm.repo";

describe("PaymentDocumentTypeormRepository", () => {
  const makeRow = (overrides?: Partial<PaymentDocumentEntity>) =>
    ({
      id: "11111111-1111-1111-1111-111111111111",
      method: "Transferencia",
      date: new Date("2026-01-10T00:00:00.000Z"),
      operationNumber: "OP-900",
      currency: CurrencyType.PEN,
      amount: 250,
      note: "Pago de factura",
      fromDocumentType: PayDocType.PURCHASE,
      poId: "22222222-2222-2222-2222-222222222222",
      quotaId: null,
      accountPayableId: "33333333-3333-3333-3333-333333333333",
      companyPaymentAccountId: "44444444-4444-4444-4444-444444444444",
      paymentMethodId: "55555555-5555-5555-5555-555555555555",
      status: "APPROVED",
      requestedByUserId: "66666666-6666-6666-6666-666666666666",
      approvedByUserId: "77777777-7777-7777-7777-777777777777",
      rejectedByUserId: null,
      approvedAt: new Date("2026-01-11T00:00:00.000Z"),
      rejectedAt: null,
      rejectionReason: null,
      paidByUserId: "77777777-7777-7777-7777-777777777777",
      scheduledByUserId: null,
      scheduledAt: null,
      paidAt: new Date("2026-01-11T00:00:00.000Z"),
      paymentEvidenceFileId: "88888888-8888-8888-8888-888888888888",
      bankName: "BCP",
      cardLastFour: "1234",
      operationCode: "TRX-900",
      isPartial: false,
      ...overrides,
    }) as PaymentDocumentEntity;

  const createQueryBuilder = (rows: PaymentDocumentEntity[] = [makeRow()]) => {
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([rows, rows.length]),
    };

    return qb;
  };

  const makeRepository = (qb = createQueryBuilder(), evidenceRows: Array<{ paymentId: string; count: number }> = []) => {
    const baseRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as Repository<PaymentDocumentEntity>;
    const manager = {
      getRepository: jest.fn().mockReturnValue(baseRepo),
      query: jest.fn().mockResolvedValue(evidenceRows),
    };
    (baseRepo as any).manager = manager;

    return { repo: new PaymentDocumentTypeormRepository(baseRepo), qb };
  };

  it("applies advanced filters and keeps server-side pagination", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({
      q: "op-900 banco",
      poId: "22222222-2222-2222-2222-222222222222",
      quotaId: "99999999-9999-9999-9999-999999999999",
      accountPayableId: "33333333-3333-3333-3333-333333333333",
      statuses: ["SCHEDULED", "APPROVED"],
      currency: CurrencyType.PEN,
      paymentMethodIds: [
        "55555555-5555-5555-5555-555555555555",
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      ],
      companyPaymentAccountIds: [
        "44444444-4444-4444-4444-444444444444",
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      ],
      fromDocumentType: PayDocType.PURCHASE,
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      scheduledFrom: "2026-02-01",
      scheduledTo: "2026-02-28",
      paidFrom: "2026-03-01",
      paidTo: "2026-03-31",
      amountMin: 100,
      amountMax: 500,
      requestedByUserId: "66666666-6666-6666-6666-666666666666",
      approvedByUserId: "77777777-7777-7777-7777-777777777777",
      hasEvidence: true,
      page: 3,
      limit: 25,
    });

    expect(qb.andWhere).toHaveBeenCalledWith("pd.poId = :poId", {
      poId: "22222222-2222-2222-2222-222222222222",
    });
    expect(qb.andWhere).toHaveBeenCalledWith("pd.quotaId = :quotaId", {
      quotaId: "99999999-9999-9999-9999-999999999999",
    });
    expect(qb.andWhere).toHaveBeenCalledWith("pd.accountPayableId = :accountPayableId", {
      accountPayableId: "33333333-3333-3333-3333-333333333333",
    });
    expect(qb.andWhere).toHaveBeenCalledWith("pd.status IN (:...statuses)", {
      statuses: ["SCHEDULED", "APPROVED"],
    });
    expect(qb.andWhere).toHaveBeenCalledWith("pd.currency = :currency", { currency: CurrencyType.PEN });
    expect(qb.andWhere).toHaveBeenCalledWith("pd.paymentMethodId IN (:...paymentMethodIds)", {
      paymentMethodIds: [
        "55555555-5555-5555-5555-555555555555",
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      ],
    });
    expect(qb.andWhere).toHaveBeenCalledWith("pd.companyPaymentAccountId IN (:...companyPaymentAccountIds)", {
      companyPaymentAccountIds: [
        "44444444-4444-4444-4444-444444444444",
        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      ],
    });
    expect(qb.andWhere).toHaveBeenCalledWith("pd.fromDocumentType = :fromDocumentType", {
      fromDocumentType: PayDocType.PURCHASE,
    });
    expect(qb.andWhere).toHaveBeenCalledWith("DATE(pd.date) >= :dateFrom", { dateFrom: "2026-01-01" });
    expect(qb.andWhere).toHaveBeenCalledWith("DATE(pd.date) <= :dateTo", { dateTo: "2026-01-31" });
    expect(qb.andWhere).toHaveBeenCalledWith("DATE(pd.scheduledAt) >= :scheduledFrom", { scheduledFrom: "2026-02-01" });
    expect(qb.andWhere).toHaveBeenCalledWith("DATE(pd.scheduledAt) <= :scheduledTo", { scheduledTo: "2026-02-28" });
    expect(qb.andWhere).toHaveBeenCalledWith("DATE(pd.paidAt) >= :paidFrom", { paidFrom: "2026-03-01" });
    expect(qb.andWhere).toHaveBeenCalledWith("DATE(pd.paidAt) <= :paidTo", { paidTo: "2026-03-31" });
    expect(qb.andWhere).toHaveBeenCalledWith("pd.amount >= :amountMin", { amountMin: 100 });
    expect(qb.andWhere).toHaveBeenCalledWith("pd.amount <= :amountMax", { amountMax: 500 });
    expect(qb.andWhere).toHaveBeenCalledWith("pd.requestedByUserId = :requestedByUserId", {
      requestedByUserId: "66666666-6666-6666-6666-666666666666",
    });
    expect(qb.andWhere).toHaveBeenCalledWith("pd.approvedByUserId = :approvedByUserId", {
      approvedByUserId: "77777777-7777-7777-7777-777777777777",
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      "(pd.paymentEvidenceFileId IS NOT NULL OR EXISTS (SELECT 1 FROM purchase_attachments pa WHERE pa.payment_id = pd.id AND pa.type = :paymentProofType AND pa.deleted_at IS NULL))",
      { paymentProofType: "PAYMENT_PROOF" },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      `(${[
        "pd.method ILIKE :q",
        "pd.operationNumber ILIKE :q",
        "pd.operationCode ILIKE :q",
        "pd.note ILIKE :q",
        "pd.bankName ILIKE :q",
      ].join(" OR ")})`,
      { q: "%op-900 banco%" },
    );
    expect(qb.skip).toHaveBeenCalledWith(50);
    expect(qb.take).toHaveBeenCalledWith(25);
  });

  it("filters payments without evidence", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({ hasEvidence: false });

    expect(qb.andWhere).toHaveBeenCalledWith(
      "NOT (pd.paymentEvidenceFileId IS NOT NULL OR EXISTS (SELECT 1 FROM purchase_attachments pa WHERE pa.payment_id = pd.id AND pa.type = :paymentProofType AND pa.deleted_at IS NULL))",
      { paymentProofType: "PAYMENT_PROOF" },
    );
  });

  it("treats purchase attachment payment proofs as payment evidence", async () => {
    const { repo, qb } = makeRepository();

    await repo.list({ hasEvidence: true });

    expect(qb.andWhere).toHaveBeenCalledWith(
      "(pd.paymentEvidenceFileId IS NOT NULL OR EXISTS (SELECT 1 FROM purchase_attachments pa WHERE pa.payment_id = pd.id AND pa.type = :paymentProofType AND pa.deleted_at IS NULL))",
      { paymentProofType: "PAYMENT_PROOF" },
    );
  });

  it("hydrates payment evidence count from purchase attachments", async () => {
    const { repo } = makeRepository(createQueryBuilder([makeRow({ paymentEvidenceFileId: null })]), [
      { paymentId: "11111111-1111-1111-1111-111111111111", count: 2 },
    ]);

    const result = await repo.list({});

    expect(result.items[0].paymentEvidenceCount).toBe(2);
  });
});
