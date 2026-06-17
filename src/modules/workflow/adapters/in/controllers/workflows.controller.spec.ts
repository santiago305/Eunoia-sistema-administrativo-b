import "reflect-metadata";
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { WorkflowsController } from "./workflows.controller";
import { CreateWorkflowUseCase } from "../../../application/usecases/create-workflow.usecase";
import { ListWorkflowsUseCase } from "../../../application/usecases/list-workflows.usecase";
import { GetWorkflowUseCase } from "../../../application/usecases/get-workflow.usecase";
import { UpdateWorkflowUseCase } from "../../../application/usecases/update-workflow.usecase";
import { ActivateWorkflowUseCase } from "../../../application/usecases/activate-workflow.usecase";
import { CreateWorkflowStateUseCase } from "../../../application/usecases/create-workflow-state.usecase";
import { CreateWorkflowTransitionUseCase } from "../../../application/usecases/create-workflow-transition.usecase";
import { UpdateWorkflowStateUseCase } from "../../../application/usecases/update-workflow-state.usecase";
import { UpdateWorkflowStatePositionsUseCase } from "../../../application/usecases/update-workflow-state-positions.usecase";
import { SaveFullWorkflowUseCase } from "../../../application/usecases/save-full-workflow.usecase";
import { ACTIONS } from "../../../domain/constants/workflow-action.constants";
import { CONDITIONS } from "../../../domain/constants/workflow-condition.constants";
import { TRANSITION_EFFECTS } from "../../../domain/constants/workflow-transition-effect.constants";

@Injectable()
class AllowGuard implements CanActivate {
  canActivate(_context: ExecutionContext) {
    return true;
  }
}

describe("WorkflowsController", () => {
  const createdGlobalStateId = "33333333-3333-4333-8333-333333333333";
  const deliveredGlobalStateId = "44444444-4444-4444-8444-444444444444";
  let app: INestApplication;
  const createWorkflow = { execute: jest.fn().mockResolvedValue({ id: "workflow-1" }) };
  const listWorkflows = { execute: jest.fn().mockResolvedValue([{ id: "workflow-1" }]) };
  const getWorkflow = { execute: jest.fn().mockResolvedValue({ workflow: { id: "workflow-1" }, states: [], transitions: [], conditions: [] }) };
  const updateWorkflow = { execute: jest.fn().mockResolvedValue({ id: "workflow-1" }) };
  const activateWorkflow = { execute: jest.fn().mockResolvedValue({ id: "workflow-1", isActive: true }) };
  const createWorkflowState = { execute: jest.fn().mockResolvedValue({ id: "state-1" }) };
  const updateWorkflowState = { execute: jest.fn().mockResolvedValue({ id: "state-1" }) };
  const updateWorkflowStatePositions = { execute: jest.fn().mockResolvedValue([{ id: "state-1" }]) };
  const saveFullWorkflow = { execute: jest.fn().mockResolvedValue({ workflow: { id: "workflow-1" } }) };
  const createWorkflowTransition = { execute: jest.fn().mockResolvedValue({ transition: { id: "transition-1" }, conditions: [] }) };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WorkflowsController],
      providers: [
        { provide: CreateWorkflowUseCase, useValue: createWorkflow },
        { provide: ListWorkflowsUseCase, useValue: listWorkflows },
        { provide: GetWorkflowUseCase, useValue: getWorkflow },
        { provide: UpdateWorkflowUseCase, useValue: updateWorkflow },
        { provide: ActivateWorkflowUseCase, useValue: activateWorkflow },
        { provide: CreateWorkflowStateUseCase, useValue: createWorkflowState },
        { provide: UpdateWorkflowStateUseCase, useValue: updateWorkflowState },
        { provide: UpdateWorkflowStatePositionsUseCase, useValue: updateWorkflowStatePositions },
        { provide: SaveFullWorkflowUseCase, useValue: saveFullWorkflow },
        { provide: CreateWorkflowTransitionUseCase, useValue: createWorkflowTransition },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AllowGuard)
      .overrideGuard(CompanyConfiguredGuard)
      .useClass(AllowGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
    jest.clearAllMocks();
  });

  it("creates a workflow", async () => {
    await request(app.getHttpServer())
      .post("/workflows")
      .send({ name: "ABONADO ENVIO", description: "Flujo base" })
      .expect(201);

    expect(createWorkflow.execute).toHaveBeenCalledWith({
      name: "ABONADO ENVIO",
      description: "Flujo base",
    });
  });

  it("lists workflows", async () => {
    await request(app.getHttpServer()).get("/workflows").expect(200);
    expect(listWorkflows.execute).toHaveBeenCalled();
  });

  it("lists every supported condition type with date schemas", async () => {
    const response = await request(app.getHttpServer()).get("/workflows/conditions").expect(200);

    expect(response.body).toEqual([
      { type: "IS_PAID", configSchema: {} },
      { type: "HAS_STOCK", configSchema: {} },
      { type: "NOT_CANCELLED", configSchema: {} },
      { type: "DATE_AFTER", configSchema: { date: { type: "date", required: true } } },
      { type: "DATE_BEFORE", configSchema: { date: { type: "date", required: true } } },
      { type: "INVOICE_SENT", configSchema: {} },
      {
        type: "SCHEDULE_DELIVERY_WINDOW",
        configSchema: {
          minDaysBefore: { type: "integer", required: true, min: 0 },
          maxDaysBefore: { type: "integer", required: true, min: 0 },
        },
      },
      {
        type: "SALE_ORDER_FIELD_REQUIRED",
        configSchema: {
          field: {
            type: "select",
            required: true,
            options: expect.arrayContaining([
              { label: "Cliente tiene DNI", value: "client.docNumber" },
              { label: "Cliente tiene direccion", value: "client.address" },
            ]),
          },
        },
      },
    ]);
  });

  it("lists every supported sale-order action type", async () => {
    const response = await request(app.getHttpServer()).get("/workflows/actions").expect(200);

    expect(response.body).toEqual([
      { type: "RESERVE_STOCK", configSchema: {} },
      { type: "CONSUME_STOCK", configSchema: {} },
      { type: "REVERT_STOCK", configSchema: {} },
      { type: "MARK_INVOICE_SENT", configSchema: {} },
    ]);
  });

  it("creates a state with optional node coordinates", async () => {
    const workflowId = "11111111-1111-4111-8111-111111111111";

    await request(app.getHttpServer())
      .post(`/workflows/${workflowId}/states`)
      .send({
        saleOrderStateId: createdGlobalStateId,
        positionX: 120.5,
        positionY: 240,
      })
      .expect(201);

    expect(createWorkflowState.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId,
        saleOrderStateId: createdGlobalStateId,
        positionX: 120.5,
        positionY: 240,
      }),
    );
  });

  it("creates a global run-actions transition without a target state", async () => {
    const workflowId = "11111111-1111-4111-8111-111111111111";

    await request(app.getHttpServer())
      .post(`/workflows/${workflowId}/transitions`)
      .send({
        code: "NOTIFY_CLIENT",
        name: "Notificar cliente",
        effect: TRANSITION_EFFECTS.RUN_ACTIONS,
        isGlobal: true,
        conditions: [{ type: CONDITIONS.NOT_CANCELLED }],
        actions: [{ type: ACTIONS.MARK_INVOICE_SENT }],
      })
      .expect(201);

    expect(createWorkflowTransition.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId,
        code: "NOTIFY_CLIENT",
        effect: TRANSITION_EFFECTS.RUN_ACTIONS,
        isGlobal: true,
        toStateId: undefined,
        conditions: [{ type: CONDITIONS.NOT_CANCELLED, config: {} }],
        actions: [{ type: ACTIONS.MARK_INVOICE_SENT, config: {}, position: undefined }],
      }),
    );
  });

  it("creates a complete workflow with a global run-actions transition", async () => {
    await request(app.getHttpServer())
      .post("/workflows/full")
      .send({
        name: "ABONADO ENVIO",
        states: [
          {
            clientId: "created",
            saleOrderStateId: createdGlobalStateId,
            isInitial: true,
          },
          {
            clientId: "delivered",
            saleOrderStateId: deliveredGlobalStateId,
            isFinal: true,
          },
        ],
        transitions: [
          {
            clientId: "notify",
            code: "NOTIFY_CLIENT",
            name: "Notificar cliente",
            effect: TRANSITION_EFFECTS.RUN_ACTIONS,
            isGlobal: true,
            conditions: [{ type: CONDITIONS.NOT_CANCELLED }],
            actions: [{ type: ACTIONS.MARK_INVOICE_SENT }],
          },
        ],
      })
      .expect(201);

    expect(saveFullWorkflow.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        transitions: [
          expect.objectContaining({
            effect: TRANSITION_EFFECTS.RUN_ACTIONS,
            conditions: [{ type: CONDITIONS.NOT_CANCELLED }],
            actions: [{ type: ACTIONS.MARK_INVOICE_SENT }],
          }),
        ],
      }),
    );
  });

  it("updates a workflow state and its node coordinates", async () => {
    const workflowId = "11111111-1111-4111-8111-111111111111";
    const stateId = "22222222-2222-4222-8222-222222222222";

    await request(app.getHttpServer())
      .patch(`/workflows/${workflowId}/states/${stateId}`)
      .send({ saleOrderStateId: deliveredGlobalStateId, positionX: 320, positionY: 180 })
      .expect(200);

    expect(updateWorkflowState.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId,
        stateId,
        saleOrderStateId: deliveredGlobalStateId,
        positionX: 320,
        positionY: 180,
      }),
    );
  });

  it("updates multiple node positions in one request", async () => {
    const workflowId = "11111111-1111-4111-8111-111111111111";
    const stateId = "22222222-2222-4222-8222-222222222222";

    await request(app.getHttpServer())
      .patch(`/workflows/${workflowId}/states/positions`)
      .send({
        positions: [{ stateId, positionX: 480, positionY: 220 }],
      })
      .expect(200);

    expect(updateWorkflowStatePositions.execute).toHaveBeenCalledWith({
      workflowId,
      positions: [{ stateId, positionX: 480, positionY: 220 }],
    });
  });

  it("creates a complete workflow in one request", async () => {
    await request(app.getHttpServer())
      .post("/workflows/full")
      .send({
        name: "ABONADO ENVIO",
        isActive: true,
        states: [
          {
            clientId: "created",
            saleOrderStateId: createdGlobalStateId,
            isInitial: true,
          },
          {
            clientId: "paid",
            saleOrderStateId: deliveredGlobalStateId,
          },
        ],
        transitions: [
          {
            clientId: "confirm-payment",
            code: "CONFIRM_PAYMENT",
            name: "Confirmar pago",
            fromStateRef: "created",
            toStateRef: "paid",
            sourceHandle: "bottom",
            targetHandle: "top",
            conditions: [{ type: "IS_PAID", config: {} }],
            actions: [{ type: "RESERVE_STOCK", config: {}, position: 0 }],
          },
        ],
      })
      .expect(201);

    expect(saveFullWorkflow.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ABONADO ENVIO",
        states: expect.arrayContaining([expect.objectContaining({ clientId: "created" })]),
        transitions: [
          expect.objectContaining({
            sourceHandle: "bottom",
            targetHandle: "top",
            actions: [{ type: "RESERVE_STOCK", config: {}, position: 0 }],
          }),
        ],
      }),
    );
  });

  it("updates a complete workflow in one request", async () => {
    const workflowId = "11111111-1111-4111-8111-111111111111";

    await request(app.getHttpServer())
      .patch(`/workflows/${workflowId}/full`)
      .send({
        name: "ABONADO ENVIO",
        states: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            clientId: "created",
            saleOrderStateId: createdGlobalStateId,
            isInitial: true,
          },
        ],
        transitions: [],
      })
      .expect(200);

    expect(saveFullWorkflow.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId,
        name: "ABONADO ENVIO",
      }),
    );
  });

  it("updates a complete workflow through PATCH /workflows/full/:id", async () => {
    const workflowId = "11111111-1111-4111-8111-111111111111";

    await request(app.getHttpServer())
      .patch(`/workflows/full/${workflowId}`)
      .send({
        name: "ABONADO ENVIO",
        states: [
          {
            clientId: "created",
            saleOrderStateId: createdGlobalStateId,
            isInitial: true,
          },
        ],
        transitions: [],
      })
      .expect(200);

    expect(saveFullWorkflow.execute).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId, name: "ABONADO ENVIO" }),
    );
  });
});
