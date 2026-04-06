export class PaymentsDomainService {
  static normalizeMethod(method: string) {
    return method.trim();
  }

  static isPositiveAmount(amount: number) {
    return amount > 0;
  }
}
