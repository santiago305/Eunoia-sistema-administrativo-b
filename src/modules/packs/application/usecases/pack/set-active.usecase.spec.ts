import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { PACK_REPOSITORY } from "src/modules/packs/domain/ports/pack.repository";
import { SetPackActiveUsecase } from "./set-active.usecase";

describe("SetPackActiveUsecase", () => {
  it("throws NotFound when pack does not exist", async () => {
    const packRepo = {
      findById: jest.fn().mockResolvedValue(null),
      setActive: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SetPackActiveUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: PACK_REPOSITORY, useValue: packRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(SetPackActiveUsecase);
      await expect(usecase.execute({ packId: "pack-1", isActive: false })).rejects.toThrow(
        NotFoundException,
      );
      expect(packRepo.setActive).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });
});

