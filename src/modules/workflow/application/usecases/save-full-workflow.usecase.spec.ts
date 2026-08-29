import { SaveFullWorkflowUseCase } from './save-full-workflow.usecase';
import { ACTIONS } from '../../domain/constants/workflow-action.constants';
import { CONDITIONS } from '../../domain/constants/workflow-condition.constants';
import { TRANSITION_EFFECTS } from '../../domain/constants/workflow-transition-effect.constants';

describe('SaveFullWorkflowUseCase', () => {
  function createUseCase() {
    return new SaveFullWorkflowUseCase(
      { runInTransaction: (callback: any) => callback({}) } as any,
      {
        findDetailedById: jest.fn(),
        saveFull: jest.fn(async (aggregate) => aggregate),
      } as any,
      { now: () => new Date('2026-06-06T00:00:00.000Z') } as any,
    );
  }

  it('resolves workflow node display data from the global sale-order state', async () => {
    const useCase = new SaveFullWorkflowUseCase(
      { runInTransaction: (callback: any) => callback({}) } as any,
      {
        findDetailedById: jest.fn(),
        saveFull: jest.fn(async (aggregate) => aggregate),
      } as any,
      { now: () => new Date('2026-06-06T00:00:00.000Z') } as any,
      {
        findById: jest.fn(async (id) =>
          id === 'global-created'
            ? { id, code: 'CREATED', name: 'Creado', color: '#123456' }
            : { id, code: 'DELIVERED', name: 'Entregado', color: '#00ff00' },
        ),
      } as any,
    );

    const result = await useCase.execute({
      name: 'Pedidos',
      states: [
        {
          clientId: 'created',
          saleOrderStateId: 'global-created',
          isInitial: true,
        },
        {
          clientId: 'delivered',
          saleOrderStateId: 'global-delivered',
          isFinal: true,
        },
      ],
      transitions: [],
    });

    expect(result.states[0]).toEqual(
      expect.objectContaining({
        saleOrderStateId: 'global-created',
        code: 'CREATED',
        name: 'Creado',
        color: '#123456',
      }),
    );
  });

  it('rejects a workflow without an active final state', async () => {
    await expect(
      createUseCase().execute({
        name: 'Pedidos',
        states: [
          {
            clientId: 'created',
            code: 'CREATED',
            name: 'Creado',
            color: '#000000',
            isInitial: true,
          },
        ],
        transitions: [],
      }),
    ).rejects.toThrow('El workflow requiere al menos un estado final activo');
  });

  it('resolves global transition exclusions and persists no source state', async () => {
    const useCase = createUseCase();

    const result = await useCase.execute({
      name: 'Pedidos',
      states: [
        {
          clientId: 'created',
          code: 'CREATED',
          name: 'Creado',
          color: '#000000',
          isInitial: true,
        },
        {
          clientId: 'delivered',
          code: 'DELIVERED',
          name: 'Entregado',
          color: '#00ff00',
          isFinal: true,
        },
        {
          clientId: 'cancelled',
          code: 'CANCELLED',
          name: 'Cancelado',
          color: '#ff0000',
          isFinal: true,
        },
      ],
      transitions: [
        {
          clientId: 'cancel',
          code: 'CANCEL',
          name: 'Cancelar',
          isGlobal: true,
          toStateRef: 'cancelled',
          excludedStateRefs: ['delivered'],
        },
      ],
    });

    const deliveredState = result.states.find(
      (state) => state.code === 'DELIVERED',
    );
    const cancelledState = result.states.find(
      (state) => state.code === 'CANCELLED',
    );
    expect(result.transitions[0]).toEqual(
      expect.objectContaining({
        isGlobal: true,
        fromStateId: null,
        toStateId: cancelledState?.id,
        excludedStateIds: [deliveredState?.id],
      }),
    );
  });

  it('persists a global run-actions transition without a target state', async () => {
    const useCase = createUseCase();

    const result = await useCase.execute({
      name: 'Pedidos',
      states: [
        {
          clientId: 'created',
          code: 'CREATED',
          name: 'Creado',
          color: '#000000',
          isInitial: true,
        },
        {
          clientId: 'delivered',
          code: 'DELIVERED',
          name: 'Entregado',
          color: '#00ff00',
          isFinal: true,
        },
      ],
      transitions: [
        {
          clientId: 'notify',
          code: 'NOTIFY_CLIENT',
          name: 'Notificar cliente',
          effect: TRANSITION_EFFECTS.RUN_ACTIONS,
          isGlobal: true,
          conditions: [{ type: CONDITIONS.NOT_CANCELLED }],
          actions: [{ type: ACTIONS.MARK_INVOICE_SENT }],
        },
      ],
    });

    expect(result.transitions[0]).toEqual(
      expect.objectContaining({
        effect: TRANSITION_EFFECTS.RUN_ACTIONS,
        isGlobal: true,
        fromStateId: null,
        toStateId: null,
      }),
    );
    expect(result.conditions[0]).toEqual(
      expect.objectContaining({ type: CONDITIONS.NOT_CANCELLED }),
    );
    expect(result.actions[0]).toEqual(
      expect.objectContaining({ type: ACTIONS.MARK_INVOICE_SENT }),
    );
  });

  it('persists transition node coordinates', async () => {
    const useCase = createUseCase();

    const result = await useCase.execute({
      name: 'Pedidos',
      states: [
        {
          clientId: 'created',
          code: 'CREATED',
          name: 'Creado',
          color: '#000000',
          isInitial: true,
        },
        {
          clientId: 'delivered',
          code: 'DELIVERED',
          name: 'Entregado',
          color: '#00ff00',
          isFinal: true,
        },
      ],
      transitions: [
        {
          clientId: 'notify',
          code: 'NOTIFY_CLIENT',
          name: 'Notificar cliente',
          effect: TRANSITION_EFFECTS.RUN_ACTIONS,
          isGlobal: true,
          positionX: -240.5,
          positionY: 160,
          actions: [{ type: ACTIONS.MARK_INVOICE_SENT }],
        },
      ],
    });

    expect(result.transitions[0]).toEqual(
      expect.objectContaining({
        positionX: -240.5,
        positionY: 160,
      }),
    );
  });

  it('rejects a non-global cancellation transition', async () => {
    await expect(
      createUseCase().execute({
        name: 'Pedidos',
        states: [
          {
            clientId: 'created',
            code: 'CREATED',
            name: 'Creado',
            color: '#000',
            isInitial: true,
          },
          {
            clientId: 'done',
            code: 'DONE',
            name: 'Final',
            color: '#0f0',
            isFinal: true,
          },
        ],
        transitions: [
          {
            clientId: 'cancel',
            code: 'VOID',
            name: 'Anular',
            purpose: 'CANCEL' as any,
            isGlobal: false,
            fromStateRef: 'created',
            toStateRef: 'done',
          },
        ],
      }),
    ).rejects.toThrow('La transicion de cancelacion debe ser global');
  });

  it('rejects warehouse assignment after a stock action', async () => {
    await expect(
      createUseCase().execute({
        name: 'Pedidos',
        states: [
          {
            clientId: 'created',
            code: 'CREATED',
            name: 'Creado',
            color: '#000',
            isInitial: true,
          },
          {
            clientId: 'done',
            code: 'DONE',
            name: 'Final',
            color: '#0f0',
            isFinal: true,
          },
        ],
        transitions: [
          {
            clientId: 'schedule',
            code: 'SCHEDULE',
            name: 'Programar',
            fromStateRef: 'created',
            toStateRef: 'done',
            actions: [
              { type: ACTIONS.RESERVE_STOCK, position: 0 },
              {
                type: ACTIONS.ASSIGN_WAREHOUSE_BY_PROVINCE,
                position: 1,
                config: {
                  mode: 'INCLUDE',
                  provinceIds: ['1501'],
                  warehouseId: '22222222-2222-4222-8222-222222222222',
                },
              },
            ],
          },
        ],
      } as any),
    ).rejects.toThrow(
      'La asignacion de almacen debe ejecutarse antes de las acciones de stock',
    );
  });

  it('rejects more than one cancellation transition', async () => {
    await expect(
      createUseCase().execute({
        name: 'Pedidos',
        states: [
          {
            clientId: 'created',
            code: 'CREATED',
            name: 'Creado',
            color: '#000',
            isInitial: true,
          },
          {
            clientId: 'done',
            code: 'DONE',
            name: 'Final',
            color: '#0f0',
            isFinal: true,
          },
          {
            clientId: 'cancelled',
            code: 'CANCELLED',
            name: 'Cancelado',
            color: '#f00',
          },
        ],
        transitions: ['VOID', 'ABORT'].map((code) => ({
          clientId: code,
          code,
          name: code,
          purpose: 'CANCEL' as any,
          isGlobal: true,
          toStateRef: 'cancelled',
        })),
      }),
    ).rejects.toThrow(
      'El workflow solo puede tener una transicion de cancelacion',
    );
  });

  it('accepts multiple automatic transitions from one state with distinct priorities', async () => {
    const result = await createUseCase().execute({
      name: 'Pedidos',
      states: [
        {
          clientId: 'in-progress',
          code: 'IN_PROGRESS',
          name: 'En curso',
          color: '#000',
          isInitial: true,
        },
        {
          clientId: 'to-send',
          code: 'TO_SEND',
          name: 'Por enviar',
          color: '#0f0',
          isFinal: true,
        },
        {
          clientId: 'waiting',
          code: 'WAITING',
          name: 'Esperando',
          color: '#f00',
          isFinal: true,
        },
      ],
      transitions: [
        {
          clientId: 'paid',
          code: 'PAID',
          name: 'Por enviar',
          fromStateRef: 'in-progress',
          toStateRef: 'to-send',
          autoTrigger: true,
          priority: 0,
          conditions: [{ type: CONDITIONS.IS_PAID }],
        },
        {
          clientId: 'overdue',
          code: 'OVERDUE',
          name: 'Esperando',
          fromStateRef: 'in-progress',
          toStateRef: 'waiting',
          autoTrigger: true,
          priority: 1,
          conditions: [{ type: CONDITIONS.IS_NOT_PAID }],
        },
      ],
    });

    expect(result.transitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'PAID', priority: 0 }),
        expect.objectContaining({ code: 'OVERDUE', priority: 1 }),
      ]),
    );
  });

  it('rejects duplicate automatic priorities from the same state', async () => {
    await expect(
      createUseCase().execute({
        name: 'Pedidos',
        states: [
          {
            clientId: 'in-progress',
            code: 'IN_PROGRESS',
            name: 'En curso',
            color: '#000',
            isInitial: true,
          },
          {
            clientId: 'done',
            code: 'DONE',
            name: 'Final',
            color: '#0f0',
            isFinal: true,
          },
        ],
        transitions: ['PAID', 'OVERDUE'].map((code) => ({
          clientId: code,
          code,
          name: code,
          fromStateRef: 'in-progress',
          toStateRef: 'done',
          autoTrigger: true,
          priority: 0,
          conditions: [{ type: CONDITIONS.IS_PAID }],
        })),
      }),
    ).rejects.toThrow(
      'Las transiciones automaticas del mismo estado deben tener prioridades diferentes',
    );
  });

  it('rejects a cancellation transition targeting a final state', async () => {
    await expect(
      createUseCase().execute({
        name: 'Pedidos',
        states: [
          {
            clientId: 'created',
            code: 'CREATED',
            name: 'Creado',
            color: '#000',
            isInitial: true,
          },
          {
            clientId: 'cancelled',
            code: 'CANCELLED',
            name: 'Cancelado',
            color: '#f00',
            isFinal: true,
          },
        ],
        transitions: [
          {
            clientId: 'cancel',
            code: 'VOID',
            name: 'Anular',
            purpose: 'CANCEL',
            isGlobal: true,
            toStateRef: 'cancelled',
          },
        ],
      }),
    ).rejects.toThrow('El estado destino de cancelacion no puede ser final');
  });

  it('updates published rules without creating a new revision or changing structure', async () => {
    const current = {
      workflow: {
        id: 'workflow-v1',
        name: 'Abonado envio',
        normalizedName: 'ABONADO ENVIO',
        description: null,
        isActive: true,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: null,
        familyId: 'workflow-family',
        revision: 1,
        lifecycleStatus: 'PUBLISHED',
        isCurrent: true,
        basedOnWorkflowId: null,
        publishedAt: new Date('2026-06-02T00:00:00.000Z'),
        publishedBy: 'user-1',
      },
      states: [
        {
          id: 'state-created',
          workflowId: 'workflow-v1',
          saleOrderStateId: 'global-created',
          code: 'CREATED',
          name: 'Creado',
          color: '#000000',
          position: 0,
          positionX: 10,
          positionY: 20,
          isInitial: true,
          isFinal: false,
          isActive: true,
        },
        {
          id: 'state-done',
          workflowId: 'workflow-v1',
          saleOrderStateId: 'global-done',
          code: 'DONE',
          name: 'Final',
          color: '#00ff00',
          position: 1,
          positionX: 200,
          positionY: 20,
          isInitial: false,
          isFinal: true,
          isActive: true,
        },
      ],
      transitions: [
        {
          id: 'transition-pay',
          workflowId: 'workflow-v1',
          code: 'PAY',
          name: 'Pago completo',
          effect: 'MOVE_STATE',
          purpose: 'STANDARD',
          fromStateId: 'state-created',
          toStateId: 'state-done',
          isGlobal: false,
          excludedStateIds: [],
          sourceHandle: 'right',
          targetHandle: 'left',
          positionX: null,
          positionY: null,
          isActive: true,
          autoTrigger: false,
          priority: 0,
          elseEffect: null,
          elseToStateId: null,
        },
      ],
      conditions: [
        {
          id: 'condition-old',
          transitionId: 'transition-pay',
          type: CONDITIONS.IS_NOT_PAID,
          config: {},
          position: 0,
        },
      ],
      actions: [],
    } as any;
    const workflowRepo = {
      findDetailedById: jest.fn().mockResolvedValue(current),
      saveFull: jest.fn(async (aggregate) => aggregate),
    };
    const useCase = new SaveFullWorkflowUseCase(
      { runInTransaction: (callback: any) => callback({}) } as any,
      workflowRepo as any,
      { now: () => new Date('2026-06-06T00:00:00.000Z') } as any,
      {
        findById: jest.fn(async (id) => {
          const state = current.states.find(
            (item: any) => item.saleOrderStateId === id,
          );
          return state
            ? { id, code: state.code, name: state.name, color: state.color }
            : null;
        }),
      } as any,
    );

    const result = await useCase.executePublishedRules({
      workflowId: 'workflow-v1',
      transitions: [
        {
          transitionId: 'transition-pay',
          conditions: [{ type: CONDITIONS.IS_PAID, config: {}, position: 0 }],
          actions: [
            { type: ACTIONS.MARK_INVOICE_SENT, config: {}, position: 0 },
          ],
          elseActions: [],
        },
      ],
    });

    expect(result.workflow).toEqual(
      expect.objectContaining({
        id: 'workflow-v1',
        revision: 1,
        lifecycleStatus: 'PUBLISHED',
        isCurrent: true,
      }),
    );
    expect(result.states.map((state) => state.id)).toEqual([
      'state-created',
      'state-done',
    ]);
    expect(result.transitions[0]).toEqual(
      expect.objectContaining({
        id: 'transition-pay',
        name: 'Pago completo',
        fromStateId: 'state-created',
        toStateId: 'state-done',
        sourceHandle: 'right',
        targetHandle: 'left',
      }),
    );
    expect(result.conditions).toEqual([
      expect.objectContaining({ type: CONDITIONS.IS_PAID }),
    ]);
    expect(result.actions).toEqual([
      expect.objectContaining({
        type: ACTIONS.MARK_INVOICE_SENT,
        branch: 'THEN',
      }),
    ]);
    expect(workflowRepo.saveFull).toHaveBeenCalledWith(
      expect.anything(),
      { synchronize: true },
      {},
    );
  });

  it('rejects rules updates for a transition outside the published workflow', async () => {
    const useCase = new SaveFullWorkflowUseCase(
      { runInTransaction: (callback: any) => callback({}) } as any,
      {
        findDetailedById: jest.fn().mockResolvedValue({
          workflow: { lifecycleStatus: 'PUBLISHED' },
          transitions: [{ id: 'transition-owned' }],
        }),
      } as any,
      { now: () => new Date() } as any,
    );

    await expect(
      useCase.executePublishedRules({
        workflowId: 'workflow-v1',
        transitions: [
          {
            transitionId: 'transition-foreign',
            conditions: [],
            actions: [],
            elseActions: [],
          },
        ],
      }),
    ).rejects.toThrow(
      'La transicion transition-foreign no pertenece al workflow',
    );
  });
});
