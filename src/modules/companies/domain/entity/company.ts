export class Company {
  constructor(
    public readonly companyId: string | undefined,
    public readonly name: string,
    public readonly ruc: string,
    public readonly ubigeo?: string,
    public readonly department?: string,
    public readonly province?: string,
    public readonly district?: string,
    public readonly urbanization?: string,
    public readonly address?: string,
    public readonly phone?: string,
    public readonly email?: string,
    public readonly codLocal?: string,
    public readonly solUser?: string,
    public readonly solPass?: string,
    public readonly logoPath?: string,
    public readonly certPath?: string,
    public readonly production: boolean = true,
    public readonly isActive: boolean = true,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
