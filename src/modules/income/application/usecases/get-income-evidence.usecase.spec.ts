import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { GetIncomeEvidenceUsecase, UploadIncomeEvidenceUsecase } from "./get-income-evidence.usecase";

describe("income evidence usecases", () => {
  const uploadKey = "11111111-1111-4111-8111-111111111111";
  const payment = { id: "income-1", saleOrderId: "order-1", status: "PENDING_CONFIRMATION", paymentPhoto: null, createdAt: new Date("2026-10-01T10:00:00.000Z") } as any;
  const manager = { getRepository: jest.fn(() => ({ findOne: jest.fn(async () => payment), save: jest.fn(async (value) => value) })) } as any;
  const list = { execute: jest.fn(async () => []) } as any;
  const upload = { execute: jest.fn(async () => ({ id: "attachment-1" })) } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    list.execute.mockReset().mockResolvedValue([]);
    manager.getRepository.mockImplementation(() => ({ findOne: jest.fn(async () => payment), save: jest.fn(async (value) => value) }));
  });

  it("reports missing evidence as required for a pending income", async () => {
    const result = await new GetIncomeEvidenceUsecase(manager, list).execute("income-1");
    expect(result.available).toBe(false);
    expect(result.status).toBe("MISSING_REQUIRED");
    expect(result.canUpload).toBe(true);
  });

  it("requires a UUID idempotency key before accepting a file upload", async () => {
    const getEvidence = new GetIncomeEvidenceUsecase(manager, list);
    const usecase = new UploadIncomeEvidenceUsecase(manager, getEvidence, upload);
    await expect(usecase.execute(
      "income-1",
      { buffer: Buffer.from("image"), mimetype: "image/png", size: 5, originalname: "proof.png" } as any,
      "user-1",
      "",
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it("replaces an existing evidence while the income is pending confirmation", async () => {
    list.execute.mockResolvedValueOnce([{ id: "existing", type: "PAYMENT_PROOF", url: "/api/assets/proof.webp", originalName: "proof.webp", mimeType: "image/webp", sizeBytes: 10, createdAt: "2026-10-01T10:00:00.000Z" }]);
    const getEvidence = new GetIncomeEvidenceUsecase(manager, list);
    const usecase = new UploadIncomeEvidenceUsecase(manager, getEvidence, upload);
    await usecase.execute("income-1", { buffer: Buffer.from("image"), mimetype: "image/png", size: 5, originalname: "proof.png" } as any, "user-1", uploadKey);
    expect(upload.execute).toHaveBeenCalled();
  });

  it("keeps reversed incomes read-only", async () => {
    manager.getRepository.mockReturnValue({ findOne: jest.fn(async () => ({ ...payment, status: "REVERSED" })) });
    const getEvidence = new GetIncomeEvidenceUsecase(manager, list);
    const usecase = new UploadIncomeEvidenceUsecase(manager, getEvidence, upload);
    await expect(usecase.execute("income-1", { buffer: Buffer.from("image"), mimetype: "image/png", size: 5, originalname: "proof.png" } as any, "user-1", uploadKey)).rejects.toBeInstanceOf(ConflictException);
  });

  it("preserves the original evidence on the corrected income without sharing its storage key for replacement", async () => {
    const corrected = { ...payment, status: "POSTED", correctedFromPaymentId: "income-original", paymentPhoto: null };
    const original = { ...payment, id: "income-original", status: "REVERSED", paymentPhoto: null };
    const repository = { findOne: jest.fn(async ({ where }: any) => where.id === corrected.id ? corrected : original) };
    manager.getRepository.mockReturnValue(repository);
    list.execute.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "historical-evidence", type: "PAYMENT_PROOF", url: "private/original.webp", originalName: "original.webp", mimeType: "image/webp", sizeBytes: 10, createdAt: "2026-10-01T10:00:00.000Z" }]);
    const result = await new GetIncomeEvidenceUsecase(manager, list).execute(corrected.id);
    expect(result.url).toBe("private/original.webp");
    expect(result.inherited).toBe(true);
    expect(result.canUpload).toBe(true);
  });

  it("allows evidence replacement only for a posted correction successor", async () => {
    const corrected = { ...payment, status: "POSTED", correctedFromPaymentId: "income-original" };
    manager.getRepository.mockReturnValue({ findOne: jest.fn(async () => corrected), save: jest.fn(async (value) => value) });
    const usecase = new UploadIncomeEvidenceUsecase(manager, new GetIncomeEvidenceUsecase(manager, list), upload);
    const file = { buffer: Buffer.from("image"), mimetype: "image/png", size: 5, originalname: "proof.png" } as any;
    await expect(usecase.execute(corrected.id, file, "user-1", uploadKey)).rejects.toBeInstanceOf(ConflictException);
    await expect(usecase.execute(corrected.id, file, "user-1", uploadKey, true)).resolves.toMatchObject({ id: "attachment-1" });
  });

  it("returns not found for unknown income", async () => {
    manager.getRepository.mockReturnValue({ findOne: jest.fn(async () => null) });
    await expect(new GetIncomeEvidenceUsecase(manager, list).execute("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("audits a new evidence and emits realtime synchronization events", async () => {
    const paymentRepo = { findOne: jest.fn(async () => payment) };
    const persistenceManager = { query: jest.fn().mockResolvedValue([]) };
    const scopedManager = { getRepository: jest.fn(() => paymentRepo) } as any;
    const uploadWithTransactionalAudit = {
      execute: jest.fn(async (input) => {
        await input.onPersisted({
          tx: { manager: persistenceManager },
          created: { id: "attachment-new" },
          previous: [{ id: "attachment-old" }],
        });
        return { id: "attachment-new" };
      }),
    } as any;
    const getEvidence = new GetIncomeEvidenceUsecase(scopedManager, list);
    const realtime = { emitToAllConnected: jest.fn() } as any;
    const usecase = new UploadIncomeEvidenceUsecase(scopedManager, getEvidence, uploadWithTransactionalAudit, realtime);

    await usecase.execute("income-1", { buffer: Buffer.from("image"), mimetype: "image/png", size: 5, originalname: "proof.png" } as any, "user-1", uploadKey);

    expect(persistenceManager.query).toHaveBeenNthCalledWith(1,
      expect.stringContaining("INSERT INTO sale_order_auditory"),
      ["order-1", "user-1"],
    );
    expect(persistenceManager.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining("INSERT INTO financial_outbox_events"),
      ["income-1", JSON.stringify({
        incomeId: "income-1",
        saleOrderId: "order-1",
        actorId: "user-1",
        attachmentId: "attachment-new",
        replacedAttachmentIds: ["attachment-old"],
      })],
    );
    expect(realtime.emitToAllConnected).toHaveBeenCalledWith("income.updated", expect.objectContaining({ incomeId: "income-1", reason: "payment_evidence_attached" }));
  });

  it("maps a concurrent unique-evidence conflict to a controlled 409", async () => {
    const paymentRepo = { findOne: jest.fn(async () => payment) };
    const scopedManager = { getRepository: jest.fn(() => paymentRepo) } as any;
    const racingUpload = { execute: jest.fn(async () => { throw { driverError: { code: "23505" } }; }) } as any;
    const getEvidence = new GetIncomeEvidenceUsecase(scopedManager, list);
    const usecase = new UploadIncomeEvidenceUsecase(scopedManager, getEvidence, racingUpload);
    await expect(usecase.execute("income-1", { buffer: Buffer.from("image"), mimetype: "image/png", size: 5, originalname: "proof.png" } as any, "user-1", uploadKey)).rejects.toBeInstanceOf(ConflictException);
  });
});
