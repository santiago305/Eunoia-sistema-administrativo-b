import { WorkflowActionExecutionRecorderService } from './workflow-action-execution-recorder.service';

describe('WorkflowActionExecutionRecorderService', () => {
  it('persists one execution for an idempotency key and reuses it on retry', async () => {
    const rows = new Map<string, any>();
    const repository = {
      findByIdempotencyKey: jest.fn(async (key: string) => rows.get(key) ?? null),
      save: jest.fn(async (execution: any) => rows.set(execution.idempotencyKey, execution)),
    };
    const service = new WorkflowActionExecutionRecorderService(repository as any);
    const input = {
      saleOrderId: 'order-1',
      transitionId: 'transition-1',
      actionId: 'action-1',
      actionType: 'SEND_NOTIFICATION',
      idempotencyKey: 'request-1:action-1',
      status: 'COMPLETED' as const,
      evidence: { providerMessageId: 'message-1' },
      now: new Date('2026-09-23T12:00:00.000Z'),
      tx: {},
    };

    const first = await service.record(input);
    const second = await service.record(input);

    expect(second.id).toBe(first.id);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(first.status).toBe('COMPLETED');
    expect(first.evidence).toEqual({ providerMessageId: 'message-1' });
  });

  it('supports STARTED followed by a terminal result', async () => {
    const rows = new Map<string, any>();
    const repository = {
      findByIdempotencyKey: jest.fn(async (key: string) => rows.get(key) ?? null),
      save: jest.fn(async (execution: any) => rows.set(execution.idempotencyKey, execution)),
    };
    const service = new WorkflowActionExecutionRecorderService(repository as any);
    const now = new Date('2026-09-23T12:00:00.000Z');
    const started = await service.start({
      saleOrderId: 'order-1',
      actionType: 'SEND_NOTIFICATION',
      idempotencyKey: 'request-2:action-1',
      now,
      tx: {},
    });
    const finished = await service.finish({
      idempotencyKey: started.idempotencyKey,
      status: 'FAILED',
      error: { provider: 'timeout' },
      now,
      tx: {},
    });

    expect(started.status).toBe('STARTED');
    expect(finished?.status).toBe('FAILED');
    expect(finished?.attempts).toBe(2);
    expect(finished?.error).toEqual({ provider: 'timeout' });
  });
});
