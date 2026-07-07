import { ACTIONS } from 'src/modules/workflow/domain/constants/workflow-action.constants';
import { SaleOrderEditPolicyService } from './sale-order-edit-policy.service';

describe('SaleOrderEditPolicyService', () => {
  const tx = {} as any;

  function createFixture(
    actions: string[] = [],
    currentStateIsFinal = false,
  ) {
    const historyRepo = {
      listBySaleOrderId: jest.fn().mockResolvedValue(
        actions.map((_, index) => ({
          transitionId: `transition-${index}`,
          metadata: null,
        })),
      ),
    };
    const transitionRepo = {
      findDetailedById: jest.fn().mockImplementation((id: string) => {
        const index = Number(id.split('-')[1]);
        return Promise.resolve({
          actions: [
            { type: actions[index], branch: 'THEN', position: 0 },
          ],
        });
      }),
    };
    const workflowRepo = {
      findDetailedById: jest.fn().mockResolvedValue({
        states: [{ id: 'state-1', isFinal: currentStateIsFinal }],
      }),
    };
    return new SaleOrderEditPolicyService(
      historyRepo as any,
      transitionRepo as any,
      workflowRepo as any,
    );
  }

  const order = {
    id: 'order-1',
    workflowId: 'workflow-1',
    currentStateId: 'state-1',
  } as any;

  it.each([
    [[], 'NONE', true, true],
    [[ACTIONS.RESERVE_STOCK], 'RESERVED', false, false],
    [
      [ACTIONS.RESERVE_STOCK, ACTIONS.REVERT_STOCK],
      'REVERTED',
      true,
      true,
    ],
    [
      [ACTIONS.RESERVE_STOCK, ACTIONS.CONSUME_STOCK],
      'CONSUMED',
      true,
      false,
    ],
  ])(
    'maps stock history %j to %s',
    async (actions, stockStatus, productsEditable, warehouseEditable) => {
      const service = createFixture(actions as string[]);

      await expect(service.resolve(order, tx)).resolves.toEqual(
        expect.objectContaining({
          stockStatus,
          productsEditable,
          warehouseEditable,
        }),
      );
    },
  );

  it('makes commercial fields read-only in a final state while preserving stock status', async () => {
    const service = createFixture([ACTIONS.RESERVE_STOCK], true);

    await expect(service.resolve(order, tx)).resolves.toEqual({
      stockStatus: 'RESERVED',
      productsEditable: false,
      warehouseEditable: false,
      isFinal: true,
      reason: 'Pedido finalizado · Stock reservado',
    });
  });
});
