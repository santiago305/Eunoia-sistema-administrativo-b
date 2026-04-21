export class UbigeoDistrict {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly provinceId: string,
    public readonly departmentId: string,
  ) {}
}
