import { SaleOrderEntity } from "src/modules/sale-orders/adapters/out/persistence/typeorm/entities/sale-order.entity";
import { EntityManager } from "typeorm";
import { DashboardSaleOrdersTypeormRepository } from "./dashboard-sale-orders.typeorm.repo";

function createQueryBuilderMock(rawRows: unknown[]) {
  const qb: any = {
    leftJoin: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawRows),
  };
  return qb;
}

describe("DashboardSaleOrdersTypeormRepository", () => {
  it("groups sale orders by department with month filter", async () => {
    const qb = createQueryBuilderMock([
      {
        id: "15",
        label: "LIMA",
        orders: "2",
        total: "150.50",
        deliveryCostSum: "10.00",
        collected: "100.00",
        pending: "50.50",
      },
    ]);
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      }),
    } as unknown as EntityManager;

    const repo = new DashboardSaleOrdersTypeormRepository(manager);

    await expect(repo.groupByDepartment({ month: "2026-06" })).resolves.toEqual({
      groups: [
        {
          id: "15",
          label: "LIMA",
          orders: 2,
          total: 150.5,
          deliveryCostSum: 10,
          collected: 100,
          pending: 50.5,
        },
      ],
      totals: {
        orders: 2,
        total: 150.5,
        deliveryCostSum: 10,
        collected: 100,
        pending: 50.5,
      },
    });
    expect(manager.getRepository).toHaveBeenCalledWith(SaleOrderEntity);
    expect(qb.andWhere).toHaveBeenCalledWith("so.createdAt >= :monthStart AND so.createdAt < :monthEnd", {
      monthStart: new Date("2026-06-01T00:00:00.000Z"),
      monthEnd: new Date("2026-07-01T00:00:00.000Z"),
    });
    expect(qb.select).toHaveBeenCalledWith("department.id", "id");
  });

  it("filters provinces by department id", async () => {
    const qb = createQueryBuilderMock([]);
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      }),
    } as unknown as EntityManager;

    const repo = new DashboardSaleOrdersTypeormRepository(manager);
    await repo.groupByProvince({ departmentId: "15" });

    expect(qb.andWhere).toHaveBeenCalledWith("client.departmentId = :departmentId", { departmentId: "15" });
    expect(qb.select).toHaveBeenCalledWith("province.id", "id");
  });

  it("filters districts by province id", async () => {
    const qb = createQueryBuilderMock([]);
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      }),
    } as unknown as EntityManager;

    const repo = new DashboardSaleOrdersTypeormRepository(manager);
    await repo.groupByDistrict({ provinceId: "1501" });

    expect(qb.andWhere).toHaveBeenCalledWith("client.provinceId = :provinceId", { provinceId: "1501" });
    expect(qb.select).toHaveBeenCalledWith("district.id", "id");
  });

  it("does not exclude cancelled orders when cancelBool is true", async () => {
    const qb = createQueryBuilderMock([]);
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      }),
    } as unknown as EntityManager;

    const repo = new DashboardSaleOrdersTypeormRepository(manager);
    await repo.groupByDepartment({ cancelBool: true });

    expect(qb.andWhere).not.toHaveBeenCalledWith(
      "(globalState.code IS NULL OR upper(globalState.code) <> :cancelCode)",
      { cancelCode: "CANCELLED" },
    );
  });
});
