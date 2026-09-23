import { Injectable } from '@nestjs/common';
import { WorkflowActionType } from '../../../domain/constants/workflow-action.constants';
import { IdempotentWorkflowActionHandler } from './idempotent-workflow-action-handler';
import { MarkerWorkflowActionHandler } from './marker-workflow-action-handler';
import { WarehouseWorkflowActionHandler } from './warehouse-workflow-action-handler';
import { StockWorkflowActionHandler } from './stock-workflow-action-handler';

@Injectable()
export class WorkflowActionHandlerRegistry {
  private readonly handlers: IdempotentWorkflowActionHandler[];

  constructor(
    markerHandler: MarkerWorkflowActionHandler,
    warehouseHandler: WarehouseWorkflowActionHandler,
    stockHandler: StockWorkflowActionHandler,
  ) {
    this.handlers = [markerHandler, warehouseHandler, stockHandler];
  }

  get(type: WorkflowActionType): IdempotentWorkflowActionHandler | undefined {
    return this.handlers.find((handler) => handler.supports(type));
  }
}
