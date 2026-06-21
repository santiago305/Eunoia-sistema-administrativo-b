import { SaleOrderStatesEntity } from 'src/modules/workflow/adapters/out/persistence/typeorm/entities/sale-order-states.entity';
import { DataSource } from 'typeorm';

type SaleOrderStateSeed = {
  id: string;
  code: string;
  name: string;
  color: string;
};

const SALE_ORDER_STATES: SaleOrderStateSeed[] = [
  {
    id: 'ae9b51d9-9324-4d15-a648-626a5eabda3d',
    code: 'CREATED',
    name: 'Creado',
    color: '#64748B',
  },
  {
    id: 'f779f1bd-4c20-4fd9-abe5-dfb065b4f1f3',
    code: 'COORDINATED',
    name: 'Coordinado',
    color: '#2563EB',
  },
  {
    id: '2b2b266c-fee2-447d-9bb6-45d90f4d2cc2',
    code: 'PROGRAMADO',
    name: 'Programado',
    color: '#44C8F8',
  },
  {
    id: 'af85cf11-7af0-46bf-8596-d52fa57b70d7',
    code: 'IN_PROGRESS',
    name: 'En curso',
    color: '#F59E0B',
  },
  {
    id: '2f512296-827a-42cb-a6cf-5afa2e64798b',
    code: 'WAITING',
    name: 'Esperando',
    color: '#A855F7',
  },
  {
    id: 'b0ae3f76-f6cd-4f34-88b2-3d4c29aca53f',
    code: 'DELIVERED',
    name: 'Entregado',
    color: '#16A34A',
  },
  {
    id: '21b5669b-fc3a-4bf2-9363-4b2d99c4c734',
    code: 'CANCELLED',
    name: 'Cancelado',
    color: '#DC2626',
  },
];

export async function seedSaleOrderStates(
  dataSource: DataSource,
): Promise<void> {
  const repository = dataSource.getRepository(
    SaleOrderStatesEntity,
  );

  await repository.upsert(SALE_ORDER_STATES, {
    conflictPaths: ['code'],
    skipUpdateIfNoValuesChanged: true,
  });

  console.log(
    'Estados de pedidos sembrados correctamente',
  );
}