import { SaleOrderImportAdviserResolverService } from "./sale-order-import-adviser-resolver.service";

function makeQueryBuilder(rows: Array<{ id: string; name: string }>) {
  return {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
}

describe("SaleOrderImportAdviserResolverService", () => {
  it("resolves an active adviser user id by normalized user name", async () => {
    const queryBuilder = makeQueryBuilder([
      { id: "adviser-user-1", name: "Analucia Pazos Arroyo" },
    ]);
    const service = new SaleOrderImportAdviserResolverService({
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      exist: jest.fn(),
    } as any);

    await expect(service.resolveByName(" analucía   pazos arroyo ")).resolves.toBe("adviser-user-1");
  });

  it("returns null when no active adviser name matches", async () => {
    const queryBuilder = makeQueryBuilder([
      { id: "adviser-user-1", name: "Otra Persona" },
    ]);
    const service = new SaleOrderImportAdviserResolverService({
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      exist: jest.fn(),
    } as any);

    await expect(service.resolveByName("Analucia Pazos Arroyo")).resolves.toBeNull();
  });

  it("returns an imported uuid only when it belongs to an adviser", async () => {
    const userId = "33333333-3333-4333-8333-333333333333";
    const repo = {
      createQueryBuilder: jest.fn(),
      exist: jest.fn().mockResolvedValue(true),
    };
    const service = new SaleOrderImportAdviserResolverService(repo as any);

    await expect(service.resolveByName(userId)).resolves.toBe(userId);
    expect(repo.exist).toHaveBeenCalledWith({ where: { userId } });
    expect(repo.createQueryBuilder).not.toHaveBeenCalled();
  });
});
