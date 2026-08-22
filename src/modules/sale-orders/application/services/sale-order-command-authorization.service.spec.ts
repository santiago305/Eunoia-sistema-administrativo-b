import { ForbiddenException } from '@nestjs/common';
import { SaleOrderCommandAuthorizationService } from './sale-order-command-authorization.service';

describe('SaleOrderCommandAuthorizationService', () => {
  const access = { getEffectivePermissions: jest.fn() };
  let service: SaleOrderCommandAuthorizationService;

  beforeEach(() => {
    access.getEffectivePermissions.mockReset();
    service = new SaleOrderCommandAuthorizationService(access as any);
  });

  it('rejects a composed update that changes assignment with only update', async () => {
    access.getEffectivePermissions.mockResolvedValue(['sale_orders.update']);

    await expect(service.authorizeUpdate('u1', {
      assignedBy: 'u2',
      workflowId: 'wf-2',
      payments: [{ amount: 10 }],
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires all capabilities represented by a composed payload', async () => {
    access.getEffectivePermissions.mockResolvedValue([
      'sale_orders.update',
      'sale_orders.assign_adviser',
      'sale_orders.assign_workflow',
      'sale_orders.payments.create',
      'sale_orders.payments.update',
      'sale_orders.payments.delete',
      'sale_orders.attachments.upload',
      'sale_orders.attachments.delete',
      'sale_orders.products.view',
      'sale_orders.clients.manage',
    ]);

    await expect(service.authorizeUpdate('u1', {
      assignedBy: 'u2',
      workflowId: 'wf-2',
      payments: [{ id: 'p1', amount: 10 }],
      removedAttachmentIds: ['a1'],
      shippingPhoto: true,
      client: { mode: 'update', id: 'c1', data: {} },
      items: [{ components: [{ skuId: 'sku-1' }] }],
    })).resolves.toBeUndefined();
  });

  it('requires clients.manage for create/update client commands', async () => {
    access.getEffectivePermissions.mockResolvedValue(['sale_orders.create']);
    await expect(service.authorizeCreate('u1', { client: { mode: 'create', data: {} } }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires Pedidos avanzados for sensitive corrections', async () => {
    access.getEffectivePermissions.mockResolvedValue(['sale_orders.update']);

    await expect(
      service.authorizeAdvancedOrder('u1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    access.getEffectivePermissions.mockResolvedValue([
      'sale_orders.update',
      'sale_orders.advanced_orders',
    ]);
    await expect(
      service.authorizeAdvancedOrder('u1'),
    ).resolves.toBeUndefined();
  });
});
