import { BulkChangeSaleOrderStateUsecase } from "./bulk-change-state.usecase";

describe("BulkChangeSaleOrderStateUsecase", () => {
  const state = (suffix: string) => ({
    workflowStateId: `workflow-state-${suffix}`,
    saleOrderStateId: `global-state-${suffix}`,
    code: suffix.toUpperCase(),
    name: suffix,
  });

  const completed = (suffix: string) => ({
    transitionId: `transition-${suffix}`,
    code: suffix.toUpperCase(),
    name: suffix,
    fromState: state("created"),
    toState: state(suffix),
    warnings: [],
    actionOutcomes: [],
  });

  it("processes every order independently toward one global target", async () => {
    const advanceToTarget = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({
          saleOrderId: "order-1",
          targetStateId: "global-state-delivered",
          status: "success",
          initialState: state("created"),
          finalState: state("delivered"),
          completedTransitions: [completed("delivered")],
          warnings: ["w1"],
        })
        .mockResolvedValueOnce({
          saleOrderId: "order-2",
          targetStateId: "global-state-delivered",
          status: "failed",
          message: "No existe una ruta al estado destino en el flujo del pedido",
          initialState: state("created"),
          finalState: state("created"),
          completedTransitions: [],
          warnings: [],
          failure: {
            code: "ROUTE_NOT_FOUND",
            message: "No existe una ruta al estado destino en el flujo del pedido",
          },
        }),
    };
    const usecase = new BulkChangeSaleOrderStateUsecase(advanceToTarget as any);

    const result = await usecase.execute({
      saleOrderIds: ["order-1", "order-2"],
      targetStateId: "global-state-delivered",
      executedBy: "user-1",
    });

    expect(advanceToTarget.execute).toHaveBeenNthCalledWith(1, {
      saleOrderId: "order-1",
      targetStateId: "global-state-delivered",
      executedBy: "user-1",
    });
    expect(advanceToTarget.execute).toHaveBeenNthCalledWith(2, {
      saleOrderId: "order-2",
      targetStateId: "global-state-delivered",
      executedBy: "user-1",
    });
    expect(result.data).toEqual({
      targetStateId: "global-state-delivered",
      requested: 2,
      succeeded: 1,
      failed: 1,
      partiallyCompleted: 0,
      results: [
        {
          saleOrderId: "order-1",
          targetStateId: "global-state-delivered",
          status: "success",
          initialState: state("created"),
          finalState: state("delivered"),
          completedTransitions: [completed("delivered")],
          warnings: ["w1"],
        },
        {
          saleOrderId: "order-2",
          targetStateId: "global-state-delivered",
          status: "failed",
          message: "No existe una ruta al estado destino en el flujo del pedido",
          initialState: state("created"),
          finalState: state("created"),
          completedTransitions: [],
          warnings: [],
          failure: {
            code: "ROUTE_NOT_FOUND",
            message: "No existe una ruta al estado destino en el flujo del pedido",
          },
        },
      ],
    });
  });

  it("counts partially completed failed routes separately", async () => {
    const advanceToTarget = {
      execute: jest.fn().mockResolvedValueOnce({
        saleOrderId: "order-1",
        targetStateId: "global-state-delivered",
        status: "failed",
        message: "El DNI del cliente es obligatorio",
        initialState: state("created"),
        finalState: state("packed"),
        completedTransitions: [completed("packed")],
        warnings: [],
        failure: {
          code: "CONDITION_FAILED",
          message: "El DNI del cliente es obligatorio",
        },
      }),
    };
    const usecase = new BulkChangeSaleOrderStateUsecase(advanceToTarget as any);

    const result = await usecase.execute({
      saleOrderIds: ["order-1"],
      targetStateId: "global-state-delivered",
      executedBy: "user-1",
    });

    expect(result.data).toMatchObject({
      requested: 1,
      succeeded: 0,
      failed: 1,
      partiallyCompleted: 1,
      results: [
        {
          saleOrderId: "order-1",
          status: "failed",
          completedTransitions: [completed("packed")],
        },
      ],
    });
  });
});
