import { DataSource } from 'typeorm';
import { getMigrationDataSourceOptions } from './typeorm.config';
import { WarehouseEntity } from '../../modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse';
import { WarehouseLocationEntity } from '../../modules/warehouses/adapters/out/persistence/typeorm/entities/warehouse-location';
import { seedWarehouses } from '../../modules/warehouses/infrastructure/seed/warehouse.seeder';
import { SaleOrderStatesEntity } from '../../modules/workflow/adapters/out/persistence/typeorm/entities/sale-order-states.entity';
import { WorkflowEntity } from '../../modules/workflow/adapters/out/persistence/typeorm/entities/workflow.entity';
import { WorkflowStateEntity } from '../../modules/workflow/adapters/out/persistence/typeorm/entities/workflow-state.entity';
import { WorkflowTransitionEntity } from '../../modules/workflow/adapters/out/persistence/typeorm/entities/workflow-transition.entity';
import { WorkflowConditionEntity } from '../../modules/workflow/adapters/out/persistence/typeorm/entities/workflow-condition.entity';
import { WorkflowActionEntity } from '../../modules/workflow/adapters/out/persistence/typeorm/entities/workflow-action.entity';
import { seedSaleOrderStates } from '../../modules/sale-orders/infrastructure/jobs/sale-order-states.seeder';
import { seedWorkflows } from '../../modules/workflow/infrastructure/seed/workflow.seeder';

const orderSeedEntities = [
  WarehouseEntity,
  WarehouseLocationEntity,
  SaleOrderStatesEntity,
  WorkflowEntity,
  WorkflowStateEntity,
  WorkflowTransitionEntity,
  WorkflowConditionEntity,
  WorkflowActionEntity,
];

export const createOrdersSeedDataSource = (): DataSource =>
  new DataSource({
    ...getMigrationDataSourceOptions(),
    entities: orderSeedEntities,
  });

export async function runOrdersSeed(dataSource = createOrdersSeedDataSource()): Promise<void> {
  const mustDestroy = !dataSource.isInitialized;

  if (mustDestroy) {
    await dataSource.initialize();
  }

  try {
    await seedWarehouses(dataSource);
    await seedSaleOrderStates(dataSource);
    await seedWorkflows(dataSource);
    console.log('Almacenes, estados y workflows de pedidos cargados correctamente.');
  } finally {
    if (mustDestroy && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  runOrdersSeed().catch((error) => {
    console.error('Error al cargar almacenes, estados y workflows de pedidos:', error);
    process.exitCode = 1;
  });
}
