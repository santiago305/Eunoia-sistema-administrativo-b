import { ListImportLotesUsecase } from "./list-import-lotes.usecase";

describe("ListImportLotesUsecase", () => {
  it("includes creator email when listing import lotes", async () => {
    const loteRepo = {
      list: jest.fn().mockResolvedValue([
        {
          id: "lote-id",
          lote: 3,
          createdAt: new Date("2026-07-30T10:00:00.000Z"),
          createdBy: "user-1",
          createdByName: "Admin",
          createdByEmail: "admin@example.test",
          isActive: true,
        },
      ]),
    };
    const usecase = new ListImportLotesUsecase(loteRepo as any);

    await expect(usecase.execute()).resolves.toEqual([
      expect.objectContaining({
        createdBy: {
          id: "user-1",
          name: "Admin",
          email: "admin@example.test",
        },
      }),
    ]);
  });
});
