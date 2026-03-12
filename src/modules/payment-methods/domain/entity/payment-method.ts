export class PaymentMethod {
  constructor(
    public readonly methodId: string | undefined,
    public readonly name: string,
    public readonly isActive: boolean = true,
  ) {}
}
