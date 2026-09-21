import {
  decryptPaymentAccountSensitiveData,
  encryptPaymentAccountSensitiveData,
  hashPaymentAccountIdentifier,
} from "./payment-account-sensitive-data";

describe("payment account sensitive data", () => {
  beforeAll(() => {
    process.env.PAYMENT_ACCOUNT_ENCRYPTION_KEY = "test-payment-account-encryption-key-123456";
  });

  it("encrypts and decrypts identifiers without exposing plaintext", () => {
    const encrypted = encryptPaymentAccountSensitiveData({
      accountNumber: "1912345678901",
      cci: "00219100123456789012",
    });

    expect(encrypted).not.toContain("1912345678901");
    expect(decryptPaymentAccountSensitiveData(encrypted)).toEqual({
      accountNumber: "1912345678901",
      cci: "00219100123456789012",
      walletPhone: null,
    });
  });

  it("creates stable hashes for duplicate detection", () => {
    const input = { type: "BANK_ACCOUNT", accountNumber: "191 234" };
    expect(hashPaymentAccountIdentifier(input)).toBe(hashPaymentAccountIdentifier(input));
  });
});
