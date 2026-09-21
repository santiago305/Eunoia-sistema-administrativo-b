import { BadRequestException } from "@nestjs/common";
import { assertDestinationCompatible } from "./supplier-payment-destination-policy";

describe("supplier payment destination policy", () => {
  it("allows bank destinations for bank transfers", () => {
    expect(() => assertDestinationCompatible("BANK_TRANSFER", "BANK_ACCOUNT")).not.toThrow();
  });

  it("rejects a wallet destination for a bank transfer", () => {
    expect(() => assertDestinationCompatible("BANK_TRANSFER", "DIGITAL_WALLET")).toThrow(BadRequestException);
  });
});
