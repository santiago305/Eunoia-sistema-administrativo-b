import { GetSaleOrdersUbigeoUsecase } from "src/modules/dashboard/application/usecases/get-sale-orders-ubigeo.usecase";
import { DashboardController } from "./dashboard.controller";

describe("DashboardController", () => {
  const output = {
    groups: [],
    totals: {
      orders: 0,
      total: 0,
      deliveryCostSum: 0,
      collected: 0,
      pending: 0,
    },
  };

  let usecase: jest.Mocked<GetSaleOrdersUbigeoUsecase>;
  let controller: DashboardController;

  beforeEach(() => {
    usecase = {
      byDepartment: jest.fn().mockResolvedValue(output),
      byProvince: jest.fn().mockResolvedValue(output),
      byDistrict: jest.fn().mockResolvedValue(output),
    } as unknown as jest.Mocked<GetSaleOrdersUbigeoUsecase>;
    controller = new DashboardController(usecase);
  });

  it("maps departments endpoint to the use case", async () => {
    await expect(controller.saleOrdersByDepartment({ month: "2026-06", cancelBool: true })).resolves.toEqual(output);
    expect(usecase.byDepartment).toHaveBeenCalledWith({ month: "2026-06", cancelBool: true });
  });

  it("maps provinces endpoint to the use case", async () => {
    await expect(controller.saleOrdersByProvince("15", { month: "2026-06", cancelBool: true })).resolves.toEqual(output);
    expect(usecase.byProvince).toHaveBeenCalledWith({ departmentId: "15", month: "2026-06", cancelBool: true });
  });

  it("maps districts endpoint to the use case", async () => {
    await expect(controller.saleOrdersByDistrict("1501", { month: "2026-06", cancelBool: true })).resolves.toEqual(output);
    expect(usecase.byDistrict).toHaveBeenCalledWith({ provinceId: "1501", month: "2026-06", cancelBool: true });
  });
});
