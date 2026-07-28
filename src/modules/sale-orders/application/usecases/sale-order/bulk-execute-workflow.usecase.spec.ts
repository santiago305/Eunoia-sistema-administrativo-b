import { BadRequestException, UnprocessableEntityException } from "@nestjs/common";
import { BulkExecuteSaleOrderWorkflowUsecase } from "./bulk-execute-workflow.usecase";

describe("BulkExecuteSaleOrderWorkflowUsecase", () => {
  const buildUsecase = ({
    bulkChangeState = { execute: jest.fn() },
    advanceState = { execute: jest.fn() },
    saleOrderRepo = { findByIdForUpdate: jest.fn() },
    workflowTransitionRepo = { listFromState: jest.fn() },
    uow = { runInTransaction: jest.fn((work) => work("tx-1")) },
  } = {}) =>
    new BulkExecuteSaleOrderWorkflowUsecase(
      bulkChangeState as any,
      advanceState as any,
      uow as any,
      saleOrderRepo as any,
      workflowTransitionRepo as any,
    );

  it("delegates state mode to the existing bulk change state usecase", async () => {
    const bulkChangeState = {
      execute: jest.fn().mockResolvedValue({
        type: "success",
        message: "Operacion masiva procesada",
        data: { requested: 1, succeeded: 1, failed: 0, results: [] },
      }),
    };
    const advanceState = { execute: jest.fn() };
    const usecase = buildUsecase({ bulkChangeState, advanceState });

    const result = await usecase.execute({
      saleOrderIds: ["11111111-1111-4111-8111-111111111111"],
      mode: "state",
      targetStateId: "22222222-2222-4222-8222-222222222222",
      executedBy: "user-1",
    });

    expect(bulkChangeState.execute).toHaveBeenCalledWith({
      saleOrderIds: ["11111111-1111-4111-8111-111111111111"],
      targetStateId: "22222222-2222-4222-8222-222222222222",
      executedBy: "user-1",
    });
    expect(advanceState.execute).not.toHaveBeenCalled();
    expect(result.data.requested).toBe(1);
  });

  it("executes one global action transition per order and summarizes success", async () => {
    const bulkChangeState = { execute: jest.fn() };
    const advanceState = {
      execute: jest.fn().mockResolvedValue({
        order: { id: "11111111-1111-4111-8111-111111111111" },
        warnings: ["Marcado como preparado"],
        actionOutcomes: [{ type: "MARK_PREPARED", status: "success" }],
      }),
    };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        workflowId: "workflow-1",
        currentStateId: "state-1",
      }),
    };
    const workflowTransitionRepo = {
      listFromState: jest.fn().mockResolvedValue([
        {
          transition: {
            id: "33333333-3333-4333-8333-333333333333",
            name: "Preparado",
            code: "GLOBAL_ACTION_1",
            isGlobal: true,
            effect: "RUN_ACTIONS",
            isActive: true,
          },
        },
      ]),
    };
    const usecase = buildUsecase({ bulkChangeState, advanceState, saleOrderRepo, workflowTransitionRepo });

    const result = await usecase.execute({
      saleOrderIds: ["11111111-1111-4111-8111-111111111111"],
      mode: "global_action",
      transitionId: "33333333-3333-4333-8333-333333333333",
      executedBy: "user-1",
    });

    expect(advanceState.execute).toHaveBeenCalledWith({
      saleOrderId: "11111111-1111-4111-8111-111111111111",
      transitionId: "33333333-3333-4333-8333-333333333333",
      executedBy: "user-1",
      metadata: { source: "sale-orders-bulk-global-action" },
    });
    expect(result.data).toMatchObject({
      mode: "global_action",
      transitionId: "33333333-3333-4333-8333-333333333333",
      requested: 1,
      succeeded: 1,
      failed: 0,
    });
  });

  it("keeps processing when one global action fails", async () => {
    const bulkChangeState = { execute: jest.fn() };
    const advanceState = {
      execute: jest
        .fn()
        .mockRejectedValueOnce(
          new UnprocessableEntityException({
            message: "La transicion no cumple sus condiciones",
            details: { code: "CONDITION_FAILED" },
          }),
        )
        .mockResolvedValueOnce({
          order: { id: "22222222-2222-4222-8222-222222222222" },
          warnings: [],
          actionOutcomes: [],
        }),
    };
    const saleOrderRepo = {
      findByIdForUpdate: jest
        .fn()
        .mockResolvedValueOnce({
          id: "11111111-1111-4111-8111-111111111111",
          workflowId: "workflow-1",
          currentStateId: "state-1",
        })
        .mockResolvedValueOnce({
          id: "22222222-2222-4222-8222-222222222222",
          workflowId: "workflow-1",
          currentStateId: "state-1",
        }),
    };
    const workflowTransitionRepo = {
      listFromState: jest.fn().mockResolvedValue([
        {
          transition: {
            id: "33333333-3333-4333-8333-333333333333",
            name: "Preparado",
            code: "GLOBAL_ACTION_1",
            isGlobal: true,
            effect: "RUN_ACTIONS",
            isActive: true,
          },
        },
      ]),
    };
    const usecase = buildUsecase({ bulkChangeState, advanceState, saleOrderRepo, workflowTransitionRepo });

    const result = await usecase.execute({
      saleOrderIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
      mode: "global_action",
      transitionId: "33333333-3333-4333-8333-333333333333",
      executedBy: "user-1",
    });

    expect(result.data.succeeded).toBe(1);
    expect(result.data.failed).toBe(1);
    expect(result.data.results[0]).toMatchObject({
      saleOrderId: "11111111-1111-4111-8111-111111111111",
      status: "failed",
      failure: { code: "CONDITION_FAILED" },
    });
  });

  it("rejects missing targetStateId for state mode", async () => {
    const usecase = buildUsecase();

    await expect(
      usecase.execute({
        saleOrderIds: ["11111111-1111-4111-8111-111111111111"],
        mode: "state",
        executedBy: "user-1",
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it("resolves a deduplicated global action name to the enabled transition for each order", async () => {
    const advanceState = {
      execute: jest.fn().mockResolvedValue({
        order: { id: "11111111-1111-4111-8111-111111111111" },
        warnings: [],
        actionOutcomes: [],
      }),
    };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        workflowId: "workflow-1",
        currentStateId: "state-1",
      }),
    };
    const workflowTransitionRepo = {
      listFromState: jest.fn().mockResolvedValue([
        {
          transition: {
            id: "transition-action-1",
            name: "Preguia",
            code: "GLOBAL_ACTION_1",
            isGlobal: true,
            effect: "RUN_ACTIONS",
          },
        },
      ]),
    };
    const uow = { runInTransaction: jest.fn((work) => work("tx-1")) };
    const usecase = buildUsecase({ advanceState, saleOrderRepo, workflowTransitionRepo, uow });

    const result = await usecase.execute({
      saleOrderIds: ["11111111-1111-4111-8111-111111111111"],
      mode: "global_action",
      globalActionName: "preguia",
      executedBy: "user-1",
    });

    expect(uow.runInTransaction).toHaveBeenCalled();
    expect(saleOrderRepo.findByIdForUpdate).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "tx-1",
    );
    expect(workflowTransitionRepo.listFromState).toHaveBeenCalledWith("workflow-1", "state-1", "tx-1");
    expect(advanceState.execute).toHaveBeenCalledWith({
      saleOrderId: "11111111-1111-4111-8111-111111111111",
      transitionId: "transition-action-1",
      executedBy: "user-1",
      metadata: { source: "sale-orders-bulk-global-action" },
    });
    expect(result.data).toMatchObject({
      mode: "global_action",
      globalActionName: "preguia",
      requested: 1,
      succeeded: 1,
      failed: 0,
    });
    expect(result.data.results[0]).toMatchObject({
      saleOrderId: "11111111-1111-4111-8111-111111111111",
      transitionId: "transition-action-1",
      status: "success",
    });
  });

  it("fails a row when the selected global action is not enabled for the order state", async () => {
    const advanceState = { execute: jest.fn() };
    const saleOrderRepo = {
      findByIdForUpdate: jest.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        workflowId: "workflow-1",
        currentStateId: "state-1",
      }),
    };
    const workflowTransitionRepo = {
      listFromState: jest.fn().mockResolvedValue([
        {
          transition: {
            id: "transition-move-1",
            name: "Preguia",
            code: "GLOBAL_ACTION_1",
            isGlobal: true,
            effect: "MOVE_STATE",
          },
        },
      ]),
    };
    const usecase = buildUsecase({ advanceState, saleOrderRepo, workflowTransitionRepo });

    const result = await usecase.execute({
      saleOrderIds: ["11111111-1111-4111-8111-111111111111"],
      mode: "global_action",
      globalActionName: "Preguia",
      executedBy: "user-1",
    });

    expect(advanceState.execute).not.toHaveBeenCalled();
    expect(result.data).toMatchObject({ succeeded: 0, failed: 1 });
    expect(result.data.results[0]).toMatchObject({
      saleOrderId: "11111111-1111-4111-8111-111111111111",
      status: "failed",
      failure: { code: "GLOBAL_ACTION_NOT_AVAILABLE" },
    });
  });
});
