import { ConflictException, NotFoundException } from "@nestjs/common";
import { GetIncomeEvidenceUsecase, UploadIncomeEvidenceUsecase } from "./get-income-evidence.usecase";
import { SaleOrderAuditEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order-audit.entity";

describe("income evidence usecases", () => {
  const payment = { id: "income-1", saleOrderId: "order-1", status: "PENDING_CONFIRMATION", paymentPhoto: null, createdAt: new Date("2026-10-01T10:00:00.000Z") } as any;
  const manager = { getRepository: jest.fn(() => ({ findOne: jest.fn(async () => payment), save: jest.fn(async (value) => value) })) } as any;
  const list = { execute: jest.fn(async () => []) } as any;
  const upload = { execute: jest.fn(async () => ({ id: "attachment-1" })) } as any;

  beforeEach(() => jest.clearAllMocks());

  it("reports missing evidence as required for a pending income", async () => {
    const result = await new GetIncomeEvidenceUsecase(manager, list).execute("income-1");
    expect(result.available).toBe(false);
    expect(result.status).toBe("MISSING_REQUIRED");
    expect(result.canUpload).toBe(true);
  });

  it("replaces an existing evidence while the income is pending confirmation", async () => {
    list.execute.mockResolvedValueOnce([{ id: "existing", type: "PAYMENT_PROOF", url: "/api/assets/proof.webp", originalName: "proof.webp", mimeType: "image/webp", sizeBytes: 10, createdAt: "2026-10-01T10:00:00.000Z" }]);
    const getEvidence = new GetIncomeEvidenceUsecase(manager, list);
    const usecase = new UploadIncomeEvidenceUsecase(manager, getEvidence, upload);
    await usecase.execute("income-1", { buffer: Buffer.from("image"), mimetype: "image/png", size: 5, originalname: "proof.png" } as any, "user-1");
    expect(upload.execute).toHaveBeenCalled();
  });

  it("keeps reversed incomes read-only", async () => {
    manager.getRepository.mockReturnValue({ findOne: jest.fn(async () => ({ ...payment, status: "REVERSED" })) });
    const getEvidence = new GetIncomeEvidenceUsecase(manager, list);
    const usecase = new UploadIncomeEvidenceUsecase(manager, getEvidence, upload);
    await expect(usecase.execute("income-1", { buffer: Buffer.from("image"), mimetype: "image/png", size: 5, originalname: "proof.png" } as any, "user-1")).rejects.toBeInstanceOf(ConflictException);
  });

  it("returns not found for unknown income", async () => {
    manager.getRepository.mockReturnValue({ findOne: jest.fn(async () => null) });
    await expect(new GetIncomeEvidenceUsecase(manager, list).execute("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("audits a new evidence and emits realtime synchronization events", async () => {
    const paymentRepo = { findOne: jest.fn(async () => payment) };
    const auditRepo = { save: jest.fn(async (value) => value) };
    const scopedManager = { getRepository: jest.fn((entity) => entity === SaleOrderAuditEntity ? auditRepo : paymentRepo) } as any;
    const getEvidence = new GetIncomeEvidenceUsecase(scopedManager, list);
    const realtime = { emitToAllConnected: jest.fn() } as any;
    const usecase = new UploadIncomeEvidenceUsecase(scopedManager, getEvidence, upload, realtime);

    await usecase.execute("income-1", { buffer: Buffer.from("image"), mimetype: "image/png", size: 5, originalname: "proof.png" } as any, "user-1");

    expect(auditRepo.save).toHaveBeenCalledWith(expect.objectContaining({ saleOrderId: "order-1", executedBy: "user-1", actionExecution: "payment_evidence_attached" }));
    expect(realtime.emitToAllConnected).toHaveBeenCalledWith("income.updated", expect.objectContaining({ incomeId: "income-1", reason: "payment_evidence_attached" }));
  });

  it("maps a concurrent unique-evidence conflict to a controlled 409", async () => {
    const paymentRepo = { findOne: jest.fn(async () => payment) };
    const scopedManager = { getRepository: jest.fn(() => paymentRepo) } as any;
    const racingUpload = { execute: jest.fn(async () => { throw { driverError: { code: "23505" } }; }) } as any;
    const getEvidence = new GetIncomeEvidenceUsecase(scopedManager, list);
    const usecase = new UploadIncomeEvidenceUsecase(scopedManager, getEvidence, racingUpload);
    await expect(usecase.execute("income-1", { buffer: Buffer.from("image"), mimetype: "image/png", size: 5, originalname: "proof.png" } as any, "user-1")).rejects.toBeInstanceOf(ConflictException);
  });
});
