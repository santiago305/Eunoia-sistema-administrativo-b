import { existsSync } from 'fs';
import { join } from 'path';

const servicePath = join(__dirname, 'sale-order-client-command.service');

describe('SaleOrderClientCommandService', () => {
  it('resolves existing, create and update modes in the caller transaction', async () => {
    expect(existsSync(`${servicePath}.ts`)).toBe(true);
    if (!existsSync(`${servicePath}.ts`)) return;

    const { SaleOrderClientCommandService } = require(servicePath) as {
      SaleOrderClientCommandService: new (
        clients: unknown,
        createClient: unknown,
        updateClient: unknown,
      ) => {
        execute(command: unknown, tx: unknown): Promise<unknown>;
      };
    };
    const tx = { id: 'shared-tx' };
    const clients = {
      findById: jest
        .fn()
        .mockResolvedValue({ clientId: { value: 'client-existing' }, isActive: true }),
    };
    const createClient = {
      executeInTransaction: jest.fn().mockResolvedValue('client-created'),
    };
    const updateClient = {
      executeInTransaction: jest.fn().mockResolvedValue({
        clientId: 'client-updated',
        event: { clientId: 'client-updated', changedFields: [] },
      }),
    };
    const service = new SaleOrderClientCommandService(
      clients,
      createClient,
      updateClient,
    );

    await expect(
      service.execute({ mode: 'existing', id: 'client-existing' }, tx),
    ).resolves.toEqual({ clientId: 'client-existing', event: null });
    await expect(
      service.execute({ mode: 'create', data: { fullName: 'Nuevo' } }, tx),
    ).resolves.toEqual({ clientId: 'client-created', event: null });
    await expect(
      service.execute(
        {
          mode: 'update',
          id: 'client-updated',
          data: { fullName: 'Actualizado' },
        },
        tx,
      ),
    ).resolves.toEqual({
      clientId: 'client-updated',
      event: { clientId: 'client-updated', changedFields: [] },
    });

    expect(createClient.executeInTransaction).toHaveBeenCalledWith(
      { fullName: 'Nuevo' },
      tx,
    );
    expect(updateClient.executeInTransaction).toHaveBeenCalledWith(
      { clientId: 'client-updated', fullName: 'Actualizado' },
      tx,
    );
  });
});
