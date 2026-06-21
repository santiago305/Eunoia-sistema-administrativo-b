import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CreateSaleOrderStateUseCase } from "./create-sale-order-state.usecase";
import { GetSaleOrderStateUseCase } from "./get-sale-order-state.usecase";
import { ListSaleOrderStatesUseCase } from "./list-sale-order-states.usecase";
import { UpdateSaleOrderStateUseCase } from "./update-sale-order-state.usecase";

describe("SaleOrderState use cases", () => {
  const tx = {};
  const uow = { runInTransaction: jest.fn((callback) => callback(tx)) };
  const clock = { now: jest.fn(() => new Date("2026-06-08T10:00:00.000Z")) };
  const repo = {
    create: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a sale order state with a trimmed name and color", async () => {
    repo.create.mockImplementationOnce(async (state) => state);
    const useCase = new CreateSaleOrderStateUseCase(uow as any, repo as any, clock);

    const result = await useCase.execute({ name: "  En reparto  ", color: "  #2563eb  " });

    expect(result).toEqual(
      expect.objectContaining({
        name: "En reparto",
        color: "#2563eb",
        createdAt: new Date("2026-06-08T10:00:00.000Z"),
        updatedAt: null,
      }),
    );
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: "En reparto", color: "#2563eb" }), tx);
  });

  it("rejects creating a sale order state without a name", async () => {
    const useCase = new CreateSaleOrderStateUseCase(uow as any, repo as any, clock);

    await expect(useCase.execute({ name: "   ", color: "#64748b" })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("rejects creating a sale order state without a color", async () => {
    const useCase = new CreateSaleOrderStateUseCase(uow as any, repo as any, clock);

    await expect(useCase.execute({ name: "Creado", color: "   " })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("lists sale order states through the repository", async () => {
    repo.list.mockResolvedValueOnce([{ id: "state-1", name: "Creado", color: "#64748b" }]);
    const useCase = new ListSaleOrderStatesUseCase(repo as any);

    await expect(useCase.execute()).resolves.toEqual([{ id: "state-1", name: "Creado", color: "#64748b" }]);
  });

  it("returns a sale order state by id", async () => {
    repo.findById.mockResolvedValueOnce({ id: "state-1", name: "Creado", color: "#64748b" });
    const useCase = new GetSaleOrderStateUseCase(repo as any);

    await expect(useCase.execute({ saleOrderStateId: "state-1" })).resolves.toEqual({
      id: "state-1",
      name: "Creado",
      color: "#64748b",
    });
  });

  it("throws when getting a missing sale order state", async () => {
    repo.findById.mockResolvedValueOnce(null);
    const useCase = new GetSaleOrderStateUseCase(repo as any);

    await expect(useCase.execute({ saleOrderStateId: "missing" })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("updates an existing sale order state", async () => {
    repo.findById.mockResolvedValueOnce({
      id: "state-1",
      name: "Creado",
      color: "#64748b",
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
      updatedAt: null,
    });
    repo.update.mockImplementationOnce(async (state) => state);
    const useCase = new UpdateSaleOrderStateUseCase(uow as any, repo as any, clock);

    const result = await useCase.execute({
      saleOrderStateId: "state-1",
      code: "PREPARING",
      name: "  Preparando  ",
      color: "  #f97316  ",
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: "state-1",
        name: "Preparando",
        color: "#f97316",
        createdAt: new Date("2026-06-01T10:00:00.000Z"),
        updatedAt: new Date("2026-06-08T10:00:00.000Z"),
      }),
    );
    expect(repo.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "state-1", name: "Preparando", color: "#f97316" }),
      tx,
    );
  });

  it("throws when updating a missing sale order state", async () => {
    repo.findById.mockResolvedValueOnce(null);
    const useCase = new UpdateSaleOrderStateUseCase(uow as any, repo as any, clock);

    await expect(useCase.execute({ saleOrderStateId: "missing", code: "PREPARING", name: "Preparando" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
