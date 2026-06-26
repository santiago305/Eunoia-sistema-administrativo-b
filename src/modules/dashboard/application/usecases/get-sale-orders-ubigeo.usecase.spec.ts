import { DashboardSaleOrdersRepository } from "src/modules/dashboard/domain/ports/dashboard-sale-orders.repository";
import { GetSaleOrdersUbigeoUsecase } from "./get-sale-orders-ubigeo.usecase";

describe("GetSaleOrdersUbigeoUsecase", () => {
  const output = {
    groups: [
      {
        id: "15",
        label: "LIMA",
        orders: 2,
        total: 150,
        deliveryCostSum: 10,
        collected: 100,
        pending: 50,
      },
    ],
    totals: {
      orders: 2,
      total: 150,
      deliveryCostSum: 10,
      collected: 100,
      pending: 50,
    },
  };

  let repo: jest.Mocked<DashboardSaleOrdersRepository>;
  let usecase: GetSaleOrdersUbigeoUsecase;

  beforeEach(() => {
    repo = {
      groupByDepartment: jest.fn().mockResolvedValue(output),
      groupByProvince: jest.fn().mockResolvedValue(output),
      groupByDistrict: jest.fn().mockResolvedValue(output),
    };
    usecase = new GetSaleOrdersUbigeoUsecase(repo);
  });

  it("delegates department grouping to the repository", async () => {
    await expect(usecase.byDepartment({ month: "2026-06", cancelBool: true })).resolves.toEqual(output);
    expect(repo.groupByDepartment).toHaveBeenCalledWith({ month: "2026-06", cancelBool: true });
  });

  it("delegates province grouping to the repository with department id", async () => {
    await expect(usecase.byProvince({ departmentId: "15", month: "2026-06", cancelBool: true })).resolves.toEqual(output);
    expect(repo.groupByProvince).toHaveBeenCalledWith({ departmentId: "15", month: "2026-06", cancelBool: true });
  });

  it("delegates district grouping to the repository with province id", async () => {
    await expect(usecase.byDistrict({ provinceId: "1501", month: "2026-06", cancelBool: true })).resolves.toEqual(output);
    expect(repo.groupByDistrict).toHaveBeenCalledWith({ provinceId: "1501", month: "2026-06", cancelBool: true });
  });
});
