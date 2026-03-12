export class PaymentMethod {
  constructor(
    public readonly methodId: string | undefined,
    public readonly name: string,
    public readonly number?: string,
    public readonly isActive: boolean = true,
  ) {}
}
