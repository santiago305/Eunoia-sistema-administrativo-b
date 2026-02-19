import { Inject } from "@nestjs/common";
import { UNIT_REPOSITORY, UnitRepository } from "src/modules/catalog/domain/ports/unit.repository";
import { UnitOutput } from "src/modules/catalog/application/dto/units/output/unit-out";

export class ListUnits {
  constructor(
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepo: UnitRepository
  ) {}

  async execute(): Promise<UnitOutput[]> {
    const rows = await this.unitRepo.list();
    return rows.map((u) => ({
      id: u.unitId,
      code: u.code,
      name: u.name,
    }));
  }
}
