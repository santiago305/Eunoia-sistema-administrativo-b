import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/auth/adapters/in/guards/jwt-auth.guard";
import { CompanyConfiguredGuard } from "src/shared/utilidades/guards/company-configured.guard";
import { CreateWorkflowUseCase } from "../../../application/usecases/create-workflow.usecase";
import { ListWorkflowsUseCase } from "../../../application/usecases/list-workflows.usecase";
import { GetWorkflowUseCase } from "../../../application/usecases/get-workflow.usecase";
import { UpdateWorkflowUseCase } from "../../../application/usecases/update-workflow.usecase";
import { ActivateWorkflowUseCase } from "../../../application/usecases/activate-workflow.usecase";
import { CreateWorkflowStateUseCase } from "../../../application/usecases/create-workflow-state.usecase";
import { CreateWorkflowTransitionUseCase } from "../../../application/usecases/create-workflow-transition.usecase";
import { CreateWorkflowDto } from "../dtos/create-workflow.dto";
import { UpdateWorkflowDto } from "../dtos/update-workflow.dto";
import { CreateWorkflowStateDto } from "../dtos/create-workflow-state.dto";
import { CreateWorkflowTransitionDto } from "../dtos/create-workflow-transition.dto";
import { CONDITIONS } from "../../../domain/constants/workflow-condition.constants";
import { ACTIONS } from "../../../domain/constants/workflow-action.constants";
import { SALE_ORDER_FIELD_OPTIONS } from "../../../domain/conditions/sale-order-field-options";
import { UpdateWorkflowStateUseCase } from "../../../application/usecases/update-workflow-state.usecase";
import { UpdateWorkflowStatePositionsUseCase } from "../../../application/usecases/update-workflow-state-positions.usecase";
import { UpdateWorkflowStateDto } from "../dtos/update-workflow-state.dto";
import { UpdateWorkflowStatePositionsDto } from "../dtos/update-workflow-state-positions.dto";
import { SaveFullWorkflowUseCase } from "../../../application/usecases/save-full-workflow.usecase";
import { SaveFullWorkflowDto } from "../dtos/save-full-workflow.dto";

@Controller("workflows")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard)
export class WorkflowsController {
  constructor(
    private readonly createWorkflow: CreateWorkflowUseCase,
    private readonly listWorkflows: ListWorkflowsUseCase,
    private readonly getWorkflow: GetWorkflowUseCase,
    private readonly updateWorkflow: UpdateWorkflowUseCase,
    private readonly activateWorkflow: ActivateWorkflowUseCase,
    private readonly createWorkflowState: CreateWorkflowStateUseCase,
    private readonly updateWorkflowState: UpdateWorkflowStateUseCase,
    private readonly updateWorkflowStatePositions: UpdateWorkflowStatePositionsUseCase,
    private readonly saveFullWorkflow: SaveFullWorkflowUseCase,
    private readonly createWorkflowTransition: CreateWorkflowTransitionUseCase,
  ) {}

  @Post()
  create(@Body() dto: CreateWorkflowDto) {
    return this.createWorkflow.execute({
      name: dto.name,
      description: dto.description ?? null,
    });
  }

  @Patch(":id/states/positions")
  updateStatePositions(
    @Param("id", ParseUUIDPipe) workflowId: string,
    @Body() dto: UpdateWorkflowStatePositionsDto,
  ) {
    return this.updateWorkflowStatePositions.execute({
      workflowId,
      positions: dto.positions,
    });
  }

  @Patch(":id/states/:stateId")
  updateState(
    @Param("id", ParseUUIDPipe) workflowId: string,
    @Param("stateId", ParseUUIDPipe) stateId: string,
    @Body() dto: UpdateWorkflowStateDto,
  ) {
    return this.updateWorkflowState.execute({
      workflowId,
      stateId,
      saleOrderStateId: dto.saleOrderStateId,
      position: dto.position,
      positionX: dto.positionX,
      positionY: dto.positionY,
      isInitial: dto.isInitial,
      isFinal: dto.isFinal,
      isActive: dto.isActive,
    });
  }

  @Get()
  list() {
    return this.listWorkflows.execute();
  }

  @Get("conditions")
  listConditionTypes() {
    return [
      { type: CONDITIONS.IS_PAID, configSchema: {} },
      { type: CONDITIONS.HAS_STOCK, configSchema: {} },
      { type: CONDITIONS.NOT_CANCELLED, configSchema: {} },
      { type: CONDITIONS.INVOICE_SENT, configSchema: {} },
      {
        type: CONDITIONS.SCHEDULE_DELIVERY_WINDOW,
        configSchema: {
          minDaysBefore: { type: "integer", required: true, min: 0 },
          maxDaysBefore: { type: "integer", required: true, min: 0 },
        },
      },
      {
        type: CONDITIONS.SALE_ORDER_FIELD_REQUIRED,
        configSchema: {
          field: {
            type: "select",
            required: true,
            options: SALE_ORDER_FIELD_OPTIONS,
          },
        },
      },
    ];
  }

  @Get("actions")
  listActionTypes() {
    return [
      { type: ACTIONS.RESERVE_STOCK, configSchema: {} },
      { type: ACTIONS.CONSUME_STOCK, configSchema: {} },
      { type: ACTIONS.REVERT_STOCK, configSchema: {} },
      { type: ACTIONS.MARK_INVOICE_SENT, configSchema: {} },
    ];
  }

  @Post("full")
  createFull(@Body() dto: SaveFullWorkflowDto) {
    return this.saveFullWorkflow.execute(dto);
  }

  @Patch(":id/full")
  updateFull(@Param("id", ParseUUIDPipe) workflowId: string, @Body() dto: SaveFullWorkflowDto) {
    return this.saveFullWorkflow.execute({ ...dto, workflowId });
  }

  @Patch("full/:id")
  updateFullCanonical(@Param("id", ParseUUIDPipe) workflowId: string, @Body() dto: SaveFullWorkflowDto) {
    return this.saveFullWorkflow.execute({ ...dto, workflowId });
  }

  @Get(":id")
  getById(@Param("id", ParseUUIDPipe) workflowId: string) {
    return this.getWorkflow.execute({ workflowId });
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) workflowId: string, @Body() dto: UpdateWorkflowDto) {
    return this.updateWorkflow.execute({
      workflowId,
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
    });
  }

  @Post(":id/activate")
  activate(@Param("id", ParseUUIDPipe) workflowId: string) {
    return this.activateWorkflow.execute({ workflowId });
  }

  @Post(":id/states")
  createState(@Param("id", ParseUUIDPipe) workflowId: string, @Body() dto: CreateWorkflowStateDto) {
    return this.createWorkflowState.execute({
      workflowId,
      saleOrderStateId: dto.saleOrderStateId,
      position: dto.position,
      positionX: dto.positionX,
      positionY: dto.positionY,
      isInitial: dto.isInitial,
      isFinal: dto.isFinal,
      isActive: dto.isActive,
    });
  }

  @Post(":id/transitions")
  createTransition(@Param("id", ParseUUIDPipe) workflowId: string, @Body() dto: CreateWorkflowTransitionDto) {
    return this.createWorkflowTransition.execute({
      workflowId,
      code: dto.code,
      name: dto.name,
      effect: dto.effect,
      purpose: dto.purpose,
      fromStateId: dto.fromStateId,
      toStateId: dto.toStateId,
      isGlobal: dto.isGlobal,
      excludedStateIds: dto.excludedStateIds,
      sourceHandle: dto.sourceHandle,
      targetHandle: dto.targetHandle,
      isActive: dto.isActive,
      autoTrigger: dto.autoTrigger,
      priority: dto.priority,
      elseEffect: dto.elseEffect,
      elseToStateId: dto.elseToStateId,
      conditions: dto.conditions?.map((condition) => ({
        type: condition.type as any,
        config: condition.config ?? {},
      })),
      actions: dto.actions?.map((action) => ({
        type: action.type,
        config: action.config ?? {},
        position: action.position,
      })),
      elseActions: dto.elseActions?.map((action) => ({
        type: action.type,
        config: action.config ?? {},
        position: action.position,
      })),
    });
  }
}
