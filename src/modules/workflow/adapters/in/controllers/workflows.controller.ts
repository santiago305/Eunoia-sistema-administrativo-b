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
import { PermissionsGuard } from "src/modules/access-control/adapters/in/guards/permissions.guard";
import { RequirePermissions } from "src/modules/access-control/adapters/in/decorators/require-permissions.decorator";
import { CreateWorkflowDraftUseCase } from '../../../application/usecases/create-workflow-draft.usecase';
import { ListManagedWorkflowsUseCase } from '../../../application/usecases/list-managed-workflows.usecase';
import { UpdatePublishedWorkflowRulesDto } from '../dtos/update-published-workflow-rules.dto';

@Controller("workflows")
@UseGuards(JwtAuthGuard, CompanyConfiguredGuard, PermissionsGuard)
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
    private readonly createWorkflowDraft: CreateWorkflowDraftUseCase,
    private readonly listManagedWorkflows: ListManagedWorkflowsUseCase,
  ) {}

  @Post()
  @RequirePermissions("sale_orders.workflows.manage")
  create(@Body() dto: CreateWorkflowDto) {
    return this.createWorkflow.execute({
      name: dto.name,
      description: dto.description ?? null,
    });
  }

  @Patch(":id/states/positions")
  @RequirePermissions("sale_orders.workflows.manage")
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
  @RequirePermissions("sale_orders.workflows.manage")
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
  @RequirePermissions("sale_orders.workflows.view")
  list() {
    return this.listWorkflows.execute();
  }

  @Get('manage/revisions')
  @RequirePermissions('sale_orders.workflows.manage')
  listManaged() {
    return this.listManagedWorkflows.execute();
  }

  @Post(':id/drafts')
  @RequirePermissions('sale_orders.workflows.manage')
  createDraft(@Param('id', ParseUUIDPipe) workflowId: string) {
    return this.createWorkflowDraft.execute({ workflowId });
  }

  @Get("conditions")
  @RequirePermissions("sale_orders.workflows.view")
  listConditionTypes() {
    return [
      { type: CONDITIONS.IS_PAID, configSchema: {} },
      { type: CONDITIONS.IS_NOT_PAID, configSchema: {} },
      { type: CONDITIONS.HAS_STOCK, configSchema: {} },
      { type: CONDITIONS.NOT_CANCELLED, configSchema: {} },
      { type: CONDITIONS.DATE_AFTER, configSchema: { date: { type: "date", required: true } } },
      { type: CONDITIONS.DATE_BEFORE, configSchema: { date: { type: "date", required: true } } },
      { type: CONDITIONS.INVOICE_SENT, configSchema: {} },
      {
        type: CONDITIONS.SCHEDULE_DELIVERY_WINDOW,
        configSchema: {
          mode: {
            type: "select",
            required: true,
            options: [
              { label: "Dias anteriores", value: "BEFORE" },
              { label: "Dias de retraso", value: "AFTER" },
            ],
          },
          days: { type: "integer", required: true, min: 0 },
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
  @RequirePermissions("sale_orders.workflows.view")
  listActionTypes() {
    return [
      { type: ACTIONS.RESERVE_STOCK, configSchema: {} },
      { type: ACTIONS.CONSUME_STOCK, configSchema: {} },
      { type: ACTIONS.REVERT_STOCK, configSchema: {} },
      { type: ACTIONS.RESTORE_STOCK, configSchema: {} },
      { type: ACTIONS.MARK_INVOICE_SENT, configSchema: {} },
      { type: ACTIONS.MARK_PREGUIDE, configSchema: {} },
      { type: ACTIONS.MARK_PREPARED, configSchema: {} },
      { type: ACTIONS.UNMARK_PREGUIDE, configSchema: {} },
      { type: ACTIONS.UNMARK_PREPARED, configSchema: {} },
      {
        type: ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE,
        configSchema: {
          mode: { type: "select", required: true, options: ["INCLUDE", "EXCLUDE"] },
          provinceIds: { type: "province-multiselect", required: true },
          warehouseId: { type: "warehouse-select", required: true },
        },
      },
      {
        type: ACTIONS.ASSIGN_WAREHOUSE_BY_WORKFLOW,
        configSchema: {
          workflowId: { type: "workflow-select", required: true },
          warehouseId: { type: "warehouse-select", required: true },
        },
      },
    ];
  }

  @Post("full")
  @RequirePermissions("sale_orders.workflows.manage")
  createFull(@Body() dto: SaveFullWorkflowDto) {
    return this.saveFullWorkflow.execute(dto);
  }

  @Patch(":id/full")
  @RequirePermissions("sale_orders.workflows.manage")
  updateFull(@Param("id", ParseUUIDPipe) workflowId: string, @Body() dto: SaveFullWorkflowDto) {
    return this.saveFullWorkflow.execute({ ...dto, workflowId });
  }

  @Patch("full/:id")
  @RequirePermissions("sale_orders.workflows.manage")
  updateFullCanonical(@Param("id", ParseUUIDPipe) workflowId: string, @Body() dto: SaveFullWorkflowDto) {
    return this.saveFullWorkflow.execute({ ...dto, workflowId });
  }

  @Patch(":id/rules")
  @RequirePermissions("sale_orders.workflows.manage")
  updatePublishedRules(
    @Param("id", ParseUUIDPipe) workflowId: string,
    @Body() dto: UpdatePublishedWorkflowRulesDto,
  ) {
    return this.saveFullWorkflow.executePublishedRules({
      workflowId,
      transitions: dto.transitions,
    });
  }

  @Get(":id")
  @RequirePermissions("sale_orders.workflows.view")
  getById(@Param("id", ParseUUIDPipe) workflowId: string) {
    return this.getWorkflow.execute({ workflowId });
  }

  @Patch(":id")
  @RequirePermissions("sale_orders.workflows.manage")
  update(@Param("id", ParseUUIDPipe) workflowId: string, @Body() dto: UpdateWorkflowDto) {
    return this.updateWorkflow.execute({
      workflowId,
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
    });
  }

  @Post(":id/activate")
  @RequirePermissions("sale_orders.workflows.manage")
  activate(@Param("id", ParseUUIDPipe) workflowId: string) {
    return this.activateWorkflow.execute({ workflowId });
  }

  @Post(":id/states")
  @RequirePermissions("sale_orders.workflows.manage")
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
  @RequirePermissions("sale_orders.workflows.manage")
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
