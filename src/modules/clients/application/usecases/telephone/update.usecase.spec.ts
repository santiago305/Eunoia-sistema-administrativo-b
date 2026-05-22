import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { TELEPHONE_REPOSITORY } from "src/modules/clients/domain/ports/telephone.repository";
import { UpdateTelephoneUsecase } from "./update.usecase";
import { Telephone } from "src/modules/clients/domain/entities/telephone";
import { ClientId } from "src/modules/clients/domain/value-objects/client-id.vo";
import { TelephoneId } from "src/modules/clients/domain/value-objects/telephone-id.vo";

describe("UpdateTelephoneUsecase", () => {
  it("unsets existing main when setting isMain=true", async () => {
    const telRepo = {
      findById: jest.fn().mockResolvedValue(
        Telephone.create({
          telephoneId: new TelephoneId("tel-1"),
          clientId: new ClientId("client-1"),
          number: "999999999",
          isMain: false,
        }),
      ),
      unsetMainByClientId: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UpdateTelephoneUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: TELEPHONE_REPOSITORY, useValue: telRepo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(UpdateTelephoneUsecase);
      await usecase.execute({ telephoneId: "tel-1", isMain: true });
      expect(telRepo.unsetMainByClientId).toHaveBeenCalledWith("client-1", expect.anything());
      expect(telRepo.update).toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });
});
