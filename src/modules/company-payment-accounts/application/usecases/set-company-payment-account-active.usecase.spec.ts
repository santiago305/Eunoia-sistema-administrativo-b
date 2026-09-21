import { BadRequestException } from "@nestjs/common";
import { SetCompanyPaymentAccountActiveUsecase } from "./set-company-payment-account-active.usecase";

describe("SetCompanyPaymentAccountActiveUsecase", () => {
  it("does not deactivate the default account without a replacement", async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ isDefault: true }),
      setActive: jest.fn(),
    };
    const usecase = new SetCompanyPaymentAccountActiveUsecase(repository as any);

    await expect(usecase.execute({ id: "account-1", isActive: false }))
      .rejects.toThrow(BadRequestException);
    expect(repository.setActive).not.toHaveBeenCalled();
  });
});
