import { ConflictException } from "@nestjs/common";
import { SourceEntity } from "../../adapters/out/persistence/typeorm/entities/source.entity";
import { SourceRecognitionCodeService } from "./source-recognition-code.service";

describe("SourceRecognitionCodeService", () => {
  const build = () => {
    const codeRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const sourceRepository = {
      findOne: jest.fn().mockResolvedValue({ id: "source-facebook" }),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) =>
        callback({
          getRepository: (entity: unknown) =>
            entity === SourceEntity ? sourceRepository : codeRepository,
        }),
      ),
    };

    return {
      codeRepository,
      sourceRepository,
      service: new SourceRecognitionCodeService(
        codeRepository as never,
        sourceRepository as never,
        dataSource as never,
      ),
    };
  };

  it("restores and reassigns a deleted code when it is created again", async () => {
    const { codeRepository, service } = build();
    const deleted = {
      id: "code-id",
      sourceId: "source-old",
      code: "FB",
      description: "Anterior",
      isActive: false,
      isDeleted: true,
      deletedAt: new Date(),
      updatedBy: null,
    };
    codeRepository.findOne.mockResolvedValue(deleted);

    await expect(service.create({
      sourceId: "source-facebook",
      code: "fb",
      description: "Facebook",
      userId: "user-id",
    })).resolves.toMatchObject({
      id: "code-id",
      sourceId: "source-facebook",
      code: "FB",
      description: "Facebook",
      isActive: true,
      isDeleted: false,
      deletedAt: null,
    });
  });

  it("soft deletes a code only inside the requested source", async () => {
    const { codeRepository, service } = build();
    const current = {
      id: "code-id",
      sourceId: "source-facebook",
      code: "FB",
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      updatedBy: null,
    };
    codeRepository.findOne.mockResolvedValue(current);

    await expect(
      service.remove("source-facebook", "code-id", "user-id"),
    ).resolves.toEqual({ id: "code-id", deleted: true });
    expect(codeRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: "code-id",
        sourceId: "source-facebook",
        isDeleted: false,
      },
    });
    expect(current).toMatchObject({
      isActive: false,
      isDeleted: true,
      updatedBy: "user-id",
    });
  });

  it("requests confirmation when an edit targets a deleted global code", async () => {
    const { codeRepository, service } = build();
    codeRepository.findOne
      .mockResolvedValueOnce({
        id: "current-id",
        sourceId: "source-facebook",
        code: "FACEBOOK",
        isDeleted: false,
      })
      .mockResolvedValueOnce({
        id: "deleted-id",
        sourceId: "source-old",
        code: "FB",
        isDeleted: true,
      });

    await expect(service.update("current-id", {
      sourceId: "source-facebook",
      code: "FB",
      userId: "user-id",
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it("recognizes only active codes belonging to active sources", async () => {
    const { codeRepository, service } = build();
    codeRepository.find.mockResolvedValue([
      {
        sourceId: "source-facebook",
        source: { name: "FACEBOOK" },
        code: "FB",
      },
    ]);

    await expect(service.recognize("fb Recompra julio")).resolves.toEqual({
      sourceId: "source-facebook",
      sourceName: "FACEBOOK",
      code: "FB",
      advertisingCode: "Recompra julio",
    });
    expect(codeRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          isDeleted: false,
          source: { isActive: true },
        },
      }),
    );
  });
});
