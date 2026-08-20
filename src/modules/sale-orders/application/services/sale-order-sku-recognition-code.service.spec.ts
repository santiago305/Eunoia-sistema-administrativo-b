import { ConflictException } from "@nestjs/common";
import { SaleOrderSkuRecognitionCodeService } from "./sale-order-sku-recognition-code.service";

describe("SaleOrderSkuRecognitionCodeService", () => {
  const build = () => {
    const repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) =>
        callback({ getRepository: () => repository }),
      ),
    };
    return {
      repository,
      service: new SaleOrderSkuRecognitionCodeService(
        repository as never,
        dataSource as never,
      ),
    };
  };

  it("restores the original record when a deleted code is created again", async () => {
    const { repository, service } = build();
    const deleted = {
      id: "rod-id",
      code: "ROD",
      isActive: false,
      isDeleted: true,
      deletedAt: new Date(),
      updatedBy: null,
    };
    repository.findOne.mockResolvedValue(deleted);

    const result = await service.create({
      code: "rod",
      userId: "user-id",
    });

    expect(result).toMatchObject({
      id: "rod-id",
      code: "ROD",
      isActive: true,
      isDeleted: false,
      deletedAt: null,
    });
  });

  it("requests confirmation when an edit targets a deleted code", async () => {
    const { repository, service } = build();
    repository.findOne
      .mockResolvedValueOnce({ id: "rode-id", code: "RODE", isDeleted: false })
      .mockResolvedValueOnce({ id: "rod-id", code: "ROD", isDeleted: true });

    await expect(service.update("rode-id", {
      code: "ROD",
      userId: "user-id",
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it("restores ROD and deletes RODE after the edit is confirmed", async () => {
    const { repository, service } = build();
    const current = {
      id: "rode-id",
      code: "RODE",
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      updatedBy: null,
    };
    const deletedTarget = {
      id: "rod-id",
      code: "ROD",
      isActive: false,
      isDeleted: true,
      deletedAt: new Date(),
      updatedBy: null,
    };
    repository.findOne
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(deletedTarget);

    const result = await service.update("rode-id", {
      code: "ROD",
      replaceDeleted: true,
      userId: "user-id",
    });

    expect(current).toMatchObject({ isActive: false, isDeleted: true });
    expect(result).toMatchObject({
      id: "rod-id",
      code: "ROD",
      isActive: true,
      isDeleted: false,
      deletedAt: null,
    });
  });
});
