import { ACTIONS } from 'src/modules/workflow/domain/constants/workflow-action.constants';
import { WorkflowRevisionLifecycleService } from './workflow-revision-lifecycle.service';

describe('WorkflowRevisionLifecycleService stock migration plan', () => {
  const service = new WorkflowRevisionLifecycleService(
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
    undefined as any,
  );

  const plan = (from: string, to: string) =>
    (service as any).planStockActions(from, to) as string[];
  const migrationPlan = (
    from: string,
    to: string,
    fromWarehouseId: string | null,
    toWarehouseId: string | null,
  ) =>
    (service as any).planMigrationStockActions(
      from,
      to,
      fromWarehouseId,
      toWarehouseId,
    ) as string[];

  it.each([
    ['NONE', 'RESERVED', [ACTIONS.RESERVE_STOCK]],
    ['NONE', 'CONSUMED', [ACTIONS.RESERVE_STOCK, ACTIONS.CONSUME_STOCK]],
    ['RESERVED', 'NONE', [ACTIONS.REVERT_STOCK]],
    ['RESERVED', 'CONSUMED', [ACTIONS.CONSUME_STOCK]],
    ['CONSUMED', 'NONE', [ACTIONS.RESTORE_STOCK]],
    ['CONSUMED', 'RESERVED', [ACTIONS.RESTORE_STOCK, ACTIONS.RESERVE_STOCK]],
    ['REVERTED', 'NONE', []],
  ])('maps %s -> %s to the required stock actions', (from, to, expected) => {
    expect(plan(from, to)).toEqual(expected);
  });

  it('releases in the old warehouse before reserving in a different warehouse', () => {
    expect(migrationPlan('RESERVED', 'RESERVED', 'warehouse-a', 'warehouse-b')).toEqual([
      ACTIONS.REVERT_STOCK,
      ACTIONS.RESERVE_STOCK,
    ]);
  });
});
