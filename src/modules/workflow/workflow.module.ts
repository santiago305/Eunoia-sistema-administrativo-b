import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WorkflowEntity } from "./adapters/out/persistence/typeorm/entities/workflow.entity";
import { WorkflowStateEntity } from "./adapters/out/persistence/typeorm/entities/workflow-state.entity";
import { WorkflowTransitionEntity } from "./adapters/out/persistence/typeorm/entities/workflow-transition.entity";
import { WorkflowConditionEntity } from "./adapters/out/persistence/typeorm/entities/workflow-condition.entity";
import { SaleOrderStateHistoryEntity } from "./adapters/out/persistence/typeorm/entities/sale-order-state-history.entity";
import { SaleOrderStatesEntity } from "./adapters/out/persistence/typeorm/entities/sale-order-states.entity";
import { WorkflowActionEntity } from "./adapters/out/persistence/typeorm/entities/workflow-action.entity";
import { workflowModuleProviders } from "./composition/container";
import { WorkflowsController } from "./adapters/in/controllers/workflows.controller";
import { SaleOrderStatesController } from "./adapters/in/controllers/sale-order-states.controller";
import { TypeormUnitOfWork } from "src/shared/infrastructure/typeorm/typeorm.unit-of-work";
import { UNIT_OF_WORK } from "src/shared/domain/ports/unit-of-work.port";
import { CLOCK } from "src/shared/application/ports/clock.port";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowEntity,
      WorkflowStateEntity,
      WorkflowTransitionEntity,
      WorkflowConditionEntity,
      SaleOrderStateHistoryEntity,
      SaleOrderStatesEntity,
      WorkflowActionEntity,
    ]),
  ],
  controllers: [WorkflowsController, SaleOrderStatesController],
  providers: [
    ...workflowModuleProviders,
    { provide: UNIT_OF_WORK, useClass: TypeormUnitOfWork },
    { provide: CLOCK, useValue: { now: () => new Date() } },
  ],
  exports: [...workflowModuleProviders],
})
export class WorkflowModule {}
