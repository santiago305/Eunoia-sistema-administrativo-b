import "reflect-metadata";
import { SetTelephoneMainUsecase } from "./set-main.usecase";
import { TELEPHONE_REPOSITORY, TelephoneRepository } from "src/modules/clients/domain/ports/telephone.repository";
import { Test } from "@nestjs/testing";
import { Telephone } from "src/modules/clients/domain/entities/telephone";
import { ClientId } from "src/modules/clients/domain/value-objects/client-id.vo";
import { TelephoneId } from "src/modules/clients/domain/value-objects/telephone-id.vo";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";

describe("SetTelephoneMainUsecase", () => {
  it("unsets existing main and sets requested telephone as main", async () => {
    const repo: TelephoneRepository = {
      findById: jest.fn().mockResolvedValue(
        Telephone.create({
          telephoneId: new TelephoneId("tel-1"),
          clientId: new ClientId("client-1"),
          number: "999999999",
          isMain: true,
        }),
      ),
      unsetMainByClientId: jest.fn(),
      setMain: jest.fn(),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        SetTelephoneMainUsecase,
        { provide: UNIT_OF_WORK, useValue: { runInTransaction: (work: any) => work({}) } },
        { provide: TELEPHONE_REPOSITORY, useValue: repo },
      ],
    }).compile();

    try {
      const usecase = moduleRef.get(SetTelephoneMainUsecase);

      await usecase.execute({ telephoneId: "tel-1" });

      expect(repo.unsetMainByClientId).toHaveBeenCalledWith("client-1", expect.anything());
      expect(repo.setMain).toHaveBeenCalledWith("tel-1", expect.anything());
    } finally {
      await moduleRef.close();
    }
  });
});
