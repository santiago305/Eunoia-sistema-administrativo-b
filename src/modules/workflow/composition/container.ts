import { WORKFLOW_REPOSITORY } from "../domain/ports/workflow.repository";
import { WORKFLOW_STATE_REPOSITORY } from "../domain/ports/workflow-state.repository";
import { WORKFLOW_TRANSITION_REPOSITORY } from "../domain/ports/workflow-transition.repository";
import { SALE_ORDER_STATE_HISTORY_REPOSITORY } from "../domain/ports/sale-order-state-history.repository";
import { SALE_ORDER_STATES_REPOSITORY } from "../domain/ports/sale-order-states.repository";
import { WorkflowTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/workflow.typeorm.repo";
import { WorkflowStateTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/workflow-state.typeorm.repo";
import { WorkflowTransitionTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/workflow-transition.typeorm.repo";
import { SaleOrderStateHistoryTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/sale-order-state-history.typeorm.repo";
import { SaleOrderStatesTypeormRepository } from "../adapters/out/persistence/typeorm/repositories/sale-order-states.typeorm.repo";
import { CreateWorkflowUseCase } from "../application/usecases/create-workflow.usecase";
import { ListWorkflowsUseCase } from "../application/usecases/list-workflows.usecase";
import { GetWorkflowUseCase } from "../application/usecases/get-workflow.usecase";
import { UpdateWorkflowUseCase } from "../application/usecases/update-workflow.usecase";
import { ActivateWorkflowUseCase } from "../application/usecases/activate-workflow.usecase";
import { CreateWorkflowStateUseCase } from "../application/usecases/create-workflow-state.usecase";
import { CreateWorkflowTransitionUseCase } from "../application/usecases/create-workflow-transition.usecase";
import { UpdateWorkflowStateUseCase } from "../application/usecases/update-workflow-state.usecase";
import { UpdateWorkflowStatePositionsUseCase } from "../application/usecases/update-workflow-state-positions.usecase";
import { SaveFullWorkflowUseCase } from "../application/usecases/save-full-workflow.usecase";
import { CreateSaleOrderStateUseCase } from "../application/usecases/create-sale-order-state.usecase";
import { GetSaleOrderStateUseCase } from "../application/usecases/get-sale-order-state.usecase";
import { ListSaleOrderStatesUseCase } from "../application/usecases/list-sale-order-states.usecase";
import { UpdateSaleOrderStateUseCase } from "../application/usecases/update-sale-order-state.usecase";

export const workflowModuleProviders = [
  { provide: WORKFLOW_REPOSITORY, useClass: WorkflowTypeormRepository },
  { provide: WORKFLOW_STATE_REPOSITORY, useClass: WorkflowStateTypeormRepository },
  { provide: WORKFLOW_TRANSITION_REPOSITORY, useClass: WorkflowTransitionTypeormRepository },
  { provide: SALE_ORDER_STATE_HISTORY_REPOSITORY, useClass: SaleOrderStateHistoryTypeormRepository },
  { provide: SALE_ORDER_STATES_REPOSITORY, useClass: SaleOrderStatesTypeormRepository },
  CreateWorkflowUseCase,
  ListWorkflowsUseCase,
  GetWorkflowUseCase,
  UpdateWorkflowUseCase,
  ActivateWorkflowUseCase,
  CreateWorkflowStateUseCase,
  UpdateWorkflowStateUseCase,
  UpdateWorkflowStatePositionsUseCase,
  SaveFullWorkflowUseCase,
  CreateWorkflowTransitionUseCase,
  CreateSaleOrderStateUseCase,
  ListSaleOrderStatesUseCase,
  GetSaleOrderStateUseCase,
  UpdateSaleOrderStateUseCase,
];
