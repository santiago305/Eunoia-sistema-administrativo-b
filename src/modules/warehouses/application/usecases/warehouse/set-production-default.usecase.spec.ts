import { BadRequestException } from "@nestjs/common";
import { Warehouse } from "src/modules/warehouses/domain/entities/warehouse";
import { WarehouseId } from "src/modules/warehouses/domain/value-objects/warehouse-id.vo";
import { SetProductionDefaultWarehouseUsecase } from "./set-production-default.usecase";

describe("SetProductionDefaultWarehouseUsecase", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const tx = {} as any;
  const uow = { runInTransaction: (work: (value: typeof tx) => unknown) => work(tx) } as any;

  it("marks one active warehouse as production default", async () => {
    const active = Warehouse.create({ warehouseId: new WarehouseId(id), name: "Principal", department: "Lima", province: "Lima", district: "Lima", isActive: true });
    const updated = Warehouse.create({ warehouseId: new WarehouseId(id), name: "Principal", department: "Lima", province: "Lima", district: "Lima", isActive: true, isProductionDefault: true });
    const repo = { findById: jest.fn().mockResolvedValueOnce(active).mockResolvedValueOnce(updated), setProductionDefault: jest.fn() } as any;
    await expect(new SetProductionDefaultWarehouseUsecase(uow, repo).execute(id)).resolves.toMatchObject({ warehouseId: id, isProductionDefault: true });
    expect(repo.setProductionDefault).toHaveBeenCalledWith(new WarehouseId(id), tx);
  });

  it("rejects inactive warehouses", async () => {
    const inactive = Warehouse.create({ warehouseId: new WarehouseId(id), name: "Inactivo", department: "Lima", province: "Lima", district: "Lima", isActive: false });
    const repo = { findById: jest.fn().mockResolvedValue(inactive), setProductionDefault: jest.fn() } as any;
    await expect(new SetProductionDefaultWarehouseUsecase(uow, repo).execute(id)).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.setProductionDefault).not.toHaveBeenCalled();
  });
});
