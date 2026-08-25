import { ForbiddenException, Injectable } from '@nestjs/common';
import { AccessControlService } from 'src/modules/access-control/application/services/access-control.service';

type PermissionInput = Record<string, any>;

/** Centralizes field-level capabilities for the composite sale-order commands. */
@Injectable()
export class SaleOrderCommandAuthorizationService {
  constructor(private readonly accessControl: AccessControlService) {}

  private async permissions(userId: string): Promise<Set<string>> {
    return new Set(await this.accessControl.getEffectivePermissions(userId));
  }

  private assert(available: Set<string>, required: string[]) {
    if (available.has('*')) return;
    const missing = [...new Set(required)].filter((code) => !available.has(code));
    if (missing.length) {
      throw new ForbiddenException(
        `No tienes permisos para ejecutar todos los cambios del pedido: ${missing.join(', ')}`,
      );
    }
  }

  private collect(input: PermissionInput, base: string): string[] {
    const required = [base];
    if (input.client) required.push('sale_orders.clients.manage');
    if (input.assignedBy !== undefined) required.push('sale_orders.assign_adviser');
    if (input.workflowId !== undefined) required.push('sale_orders.assign_workflow');
    if (input.items !== undefined) required.push('sale_orders.products.view');

    const payments = Array.isArray(input.payments) ? input.payments : [];
    if (payments.length) {
      required.push(
        ...payments.map((payment: any) =>
          payment?.id ? 'sale_orders.payments.update' : 'sale_orders.payments.create',
        ),
      );
    }
    if (
      (Array.isArray(input.removedPaymentIds) && input.removedPaymentIds.length) ||
      (Array.isArray(input.deletedPaymentIds) && input.deletedPaymentIds.length)
    ) {
      required.push('sale_orders.payments.delete');
    }
    if (input.shippingPhoto || input.paymentPhotoByClientKey) {
      required.push('sale_orders.attachments.upload');
    }
    if (Array.isArray(input.removedAttachmentIds) && input.removedAttachmentIds.length) {
      required.push('sale_orders.attachments.delete');
    }
    return required;
  }

  async authorizeCreate(userId: string, input: PermissionInput): Promise<void> {
    const available = await this.permissions(userId);
    this.assert(available, this.collect(input, 'sale_orders.create'));
  }

  async authorizeUpdate(userId: string, input: PermissionInput): Promise<void> {
    const available = await this.permissions(userId);
    this.assert(available, this.collect(input, 'sale_orders.update'));
  }

  async authorizeAdvancedOrder(userId: string): Promise<void> {
    const available = await this.permissions(userId);
    this.assert(available, ['sale_orders.advanced_orders']);
  }

  async authorizeWithClient(
    userId: string,
    input: PermissionInput,
    operation: 'create' | 'update',
  ): Promise<void> {
    const required = this.collect(input, `sale_orders.${operation}`);
    if (input.client) required.push('sale_orders.clients.manage');
    const available = await this.permissions(userId);
    this.assert(available, required);
  }
}
