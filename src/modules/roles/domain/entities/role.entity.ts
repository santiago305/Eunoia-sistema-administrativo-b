export class Role {
  constructor(
    public readonly id: string | undefined,
    public description: string,
    public deleted: boolean,
    public createdAt?: Date,
  ) {}
}
