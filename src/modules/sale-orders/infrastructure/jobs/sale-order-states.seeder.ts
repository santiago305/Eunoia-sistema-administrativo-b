import { SaleOrderStatesEntity } from 'src/modules/workflow/adapters/out/persistence/typeorm/entities/sale-order-states.entity';
import { DataSource } from 'typeorm';

type SaleOrderStateSeed = {
  code: string;
  name: string;
  color: string;
};

const SALE_ORDER_STATES: SaleOrderStateSeed[] = [
  {
    code: 'CREATED',
    name: 'Creado',
    color: '#64748B',
  },
  {
    code: 'COORDINATED',
    name: 'Coordinado',
    color: '#2563EB',
  },
  {
    code: 'IN_PROGRESS',
    name: 'En curso',
    color: '#F59E0B',
  },
  {
    code: 'WAITING',
    name: 'Esperando',
    color: '#A855F7',
  },
  {
    code: 'DELIVERED',
    name: 'Entregado',
    color: '#16A34A',
  },
  {
    code: 'CANCELLED',
    name: 'Cancelado',
    color: '#DC2626',
  },
];

export async function seedSaleOrderStates(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(SaleOrderStatesEntity);

  await repository.upsert(SALE_ORDER_STATES, {
    conflictPaths: ['code'],
    skipUpdateIfNoValuesChanged: true,
  });

  console.log('Estados de pedidos sembrados correctamente');
}