import { BadRequestException } from "@nestjs/common";
import { UploadPurchaseAttachmentUsecase } from "./upload-purchase-attachment.usecase";
import { PurchaseAttachment } from "../../domain/entity/purchase-attachment";
import { PurchaseAttachmentType } from "../../domain/value-objects/purchase-attachment-type";
import { VoucherDocType } from "src/modules/purchases/domain/value-objects/voucher-doc-type";
import { FileStorage } from "src/shared/application/ports/file-storage.port";
import { SaveStoredFileInput } from "src/shared/application/ports/storage-file";

const file = {
  buffer: Buffer.from("file"),
  originalname: "factura.pdf",
  mimetype: "application/pdf",
  size: 4,
} as Express.Multer.File;

describe("UploadPurchaseAttachmentUsecase", () => {
  const buildUsecase = (existing: PurchaseAttachment[] = []) => {
    const attachmentRepo = {
      create: jest.fn(async (attachment: PurchaseAttachment) => attachment),
      findActiveById: jest.fn(),
      list: jest.fn(async () => existing),
      markDeleted: jest.fn(),
    };
    const savedFile = {
      area: "public" as const,
      key: "public/purchase-attachments/purchase-1/factura.pdf",
      filename: "factura.pdf",
      relativePath: "purchase-attachments/purchase-1/factura.pdf",
      publicUrl: "purchase-attachments/purchase-1/factura.pdf",
      absolutePath: "storage/public/purchase-attachments/purchase-1/factura.pdf",
    };
    const fileStorage: jest.Mocked<FileStorage> = {
      save: jest.fn(async (_params: SaveStoredFileInput) => ({
        ...savedFile,
      })),
      read: jest.fn(async (_keyOrPath: string) => Buffer.from("")),
      exists: jest.fn(async (_keyOrPath: string) => true),
      delete: jest.fn(async (_keyOrPath: string) => true),
      moveToDeleted: jest.fn(async (_keyOrPath: string, _targetDirectory: string) => savedFile),
      resolve: jest.fn((_keyOrPath: string) => savedFile),
    };
    const imageProcessor = {
      toWebp: jest.fn(async () => ({
        buffer: Buffer.from("webp"),
        extension: "webp" as const,
        mimeType: "image/webp" as const,
        sizeBytes: 4,
      })),
    };
    const purchaseRepository = {
      findOne: jest.fn(async () => ({ id: "purchase-1", documentType: VoucherDocType.FACTURA })),
    };
    const paymentRepository = {
      findOne: jest.fn(async () => ({ id: "payment-1", poId: "purchase-1" })),
    };
    const historyRepository = {
      save: jest.fn(),
    };
    const entityManager = {
      getRepository: jest.fn((entity: { name?: string }) => {
        if (entity.name === "PurchaseOrderEntity") return purchaseRepository;
        if (entity.name === "PaymentDocumentEntity") return paymentRepository;
        return historyRepository;
      }),
    };

    const usecase = new UploadPurchaseAttachmentUsecase(
      attachmentRepo,
      fileStorage,
      entityManager as never,
      imageProcessor,
    );

    return { usecase, attachmentRepo, fileStorage, imageProcessor };
  };

  it("rejects a second fiscal document for the same purchase", async () => {
    const existing = PurchaseAttachment.create({
      attachmentId: "attachment-1",
      purchaseId: "purchase-1",
      type: PurchaseAttachmentType.FISCAL_DOCUMENT,
      fiscalDocumentType: VoucherDocType.FACTURA,
      filename: "old.pdf",
      originalName: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4,
      url: "purchase-attachments/purchase-1/old.pdf",
      storagePath: "purchase-attachments/purchase-1/old.pdf",
    });
    const { usecase } = buildUsecase([existing]);

    await expect(usecase.execute({
      purchaseId: "purchase-1",
      type: PurchaseAttachmentType.FISCAL_DOCUMENT,
      fiscalDocumentType: VoucherDocType.BOLETA,
      file,
    }, "user-1")).rejects.toThrow(BadRequestException);
  });

  it("stores fiscal document type when uploading a fiscal document", async () => {
    const { usecase, attachmentRepo } = buildUsecase();

    await usecase.execute({
      purchaseId: "purchase-1",
      paymentId: "payment-1",
      type: PurchaseAttachmentType.FISCAL_DOCUMENT,
      fiscalDocumentType: VoucherDocType.BOLETA,
      file,
    }, "user-1");

    expect(attachmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PurchaseAttachmentType.FISCAL_DOCUMENT,
        fiscalDocumentType: VoucherDocType.BOLETA,
        paymentId: "payment-1",
      }),
    );
  });

  it("converts non-PNG image attachments to WEBP before saving", async () => {
    const { usecase, attachmentRepo, fileStorage, imageProcessor } = buildUsecase();
    const jpg = {
      buffer: Buffer.from("jpg"),
      originalname: "voucher.jpg",
      mimetype: "image/jpeg",
      size: 3,
    } as Express.Multer.File;

    await usecase.execute({
      purchaseId: "purchase-1",
      paymentId: "payment-1",
      type: PurchaseAttachmentType.PAYMENT_PROOF,
      file: jpg,
    }, "user-1");

    expect(imageProcessor.toWebp).toHaveBeenCalledWith(expect.objectContaining({
      buffer: jpg.buffer,
    }));
    expect(fileStorage.save).toHaveBeenCalledWith(expect.objectContaining({
      buffer: Buffer.from("webp"),
      extension: "webp",
    }));
    expect(attachmentRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      filename: "factura.pdf",
      mimeType: "image/webp",
      sizeBytes: 4,
    }));
  });

  it("keeps PNG image attachments without converting them", async () => {
    const { usecase, fileStorage, imageProcessor } = buildUsecase();
    const png = {
      buffer: Buffer.from("png"),
      originalname: "voucher.png",
      mimetype: "image/png",
      size: 3,
    } as Express.Multer.File;

    await usecase.execute({
      purchaseId: "purchase-1",
      paymentId: "payment-1",
      type: PurchaseAttachmentType.PAYMENT_PROOF,
      file: png,
    }, "user-1");

    expect(imageProcessor.toWebp).not.toHaveBeenCalled();
    expect(fileStorage.save).toHaveBeenCalledWith(expect.objectContaining({
      buffer: png.buffer,
      extension: "png",
    }));
  });
});
